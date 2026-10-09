import assert from 'node:assert/strict';
import * as d from '../domain.mjs';
import {validateProductionCaptions,CAPTION_SCHEMA} from '../production-captions.mjs';
import {DEFAULT_SCHEDULE,dailySlots,previewQueueSchedule,applyQueueSchedule} from '../queue-schedule.mjs';
import {offlinePlan} from '../adapter.mjs';
const row={id:'p',title:'원제목',sourceFingerprint:'source',sourceUrl:'https://example.invalid/source'};
const authored=(v='v1',ig='본문 1')=>({schema:CAPTION_SCHEMA,postId:'p',outputVersion:v,sourceFingerprint:'source',originalTitle:'원제목',sourceUrl:row.sourceUrl,publicationTitle:'게시 제목',platformCaptions:{instagram:'[ 게시 제목 ]\n\n'+ig+'\n\n본문 2\n\n실제 결말',threads:'짧은 핵심과 실제 결말'}});
const fields=validateProductionCaptions(authored(),row,'v1');
assert.notEqual(fields.platform_captions.instagram,fields.platform_captions.threads);
assert.throws(()=>validateProductionCaptions({...authored(),outputVersion:'v0'},row,'v1'),/identity_changed/);
assert.throws(()=>validateProductionCaptions({...authored(),originalTitle:'다른 제목'},row,'v1'),/identity_changed/);
assert.throws(()=>validateProductionCaptions({...authored(),platformCaptions:{instagram:'[게시 제목]\n\n본문',threads:'요약'}},row,'v1'),/structure_invalid/);
let s=d.syncProductionBundle(d.createState(),{posts:[{post_id:'p',output_version:'v1',...fields}]});
s=d.editPost(s,'p',{platform_captions:{threads:'사용자 직접 수정'}},1);
const changed=validateProductionCaptions(authored('v1','수정된 원문 본문'),row,'v1');
s=d.syncProductionBundle(s,{posts:[{post_id:'p',output_version:'v1',...changed}]});
assert.equal(s.posts[0].platform_captions.threads,'사용자 직접 수정');assert.equal(s.posts[0].platform_captions.instagram,changed.caption);assert.equal(s.posts[0].review,null);
const revision=s.revision;s=d.syncProductionBundle(s,{posts:[{post_id:'p',output_version:'v1',...changed}]});assert.equal(s.revision,revision);
s=d.syncProductionBundle(s,{posts:[{post_id:'p',output_version:'v2',...validateProductionCaptions(authored('v2','새 버전 본문'),row,'v2')}]});
assert.equal(s.posts[0].platform_captions.threads,'사용자 직접 수정');assert.match(s.posts[0].platform_captions.instagram,/새 버전 본문/);assert.equal(s.jobs.length,0);assert.equal(s.posts[0].approval,null);
const before=s.posts[0].platform_captions.instagram;s=d.syncProductionBundle(s,{posts:[{post_id:'p',output_version:'v2',source:s.posts[0].source}]});assert.equal(s.posts[0].platform_captions.instagram,before);
const p={...s.posts[0],tags:'',images:[{asset_id:'a'.repeat(64),order:1,mime:'image/jpeg'}]};
const plans=await offlinePlan(p);assert.equal(plans[0].steps[0].params.caption,p.platform_captions.instagram);assert.equal(plans[1].captionText,p.platform_captions.threads);assert.ok(plans.every(x=>x.externalCalls===0));
const exported={post_id:'p',output_version:'v2',platform_captions:p.platform_captions,platform_caption_edited:p.platform_caption_edited};
assert.equal(d.importBundle(d.createState(),{bundle_id:'restore',posts:[exported]}).posts[0].platform_caption_edited.threads,true);
const config={...DEFAULT_SCHEDULE,date:'2026-10-10'},slots=dailySlots(config);assert.equal(slots.length,18);assert.equal(slots[0].local,'2026-10-10T08:00');assert.equal(slots.at(-1).local,'2026-10-10T20:30');assert.equal(slots[0].due_at,'2026-10-09T23:00:00.000Z');assert.ok(!slots.some(x=>['11:00','14:00','21:00'].some(t=>x.local.endsWith(t))));
let queue=d.createState();for(let n=0;n<20;n++){queue=d.importBundle(queue,{bundle_id:'q',posts:[{post_id:'q'+n,output_version:'v1',caption:'문안'}]});queue=d.queuePost(queue,'q'+n,1);}
const preview=previewQueueSchedule(queue,config);assert.equal(preview.counts.instagram.assigned,18);assert.equal(preview.counts.threads.assigned,18);assert.equal(preview.overflow.length,4);assert.equal(queue.jobs[0].state,'waiting');
const assigned=applyQueueSchedule(queue,config,queue.revision);assert.equal(assigned.jobs[17].planned_slots.instagram.local,'2026-10-10T20:30');assert.equal(assigned.jobs[18].state,'waiting');assert.equal(assigned.publications.length,0);assert.equal(assigned.dry_runs.length,0);assert.equal(assigned.posts[0].approval,null);assert.throws(()=>applyQueueSchedule(assigned,config,queue.revision),/revision_conflict/);

const userBundle=d.importBundle(d.createState(),{bundle_id:'user-export',posts:[{post_id:'p',output_version:'v1',caption:'사용자 가져온 문안'}]});assert.equal(d.syncProductionBundle(userBundle,{posts:[{post_id:'p',output_version:'v1',...fields}]}).posts[0].caption,'사용자 가져온 문안');
const legacy=d.importBundle(d.createState(),{bundle_id:'legacy',posts:[{post_id:'p',output_version:'v1',caption:'old text'}]});
delete legacy.posts[0].platform_captions;delete legacy.posts[0].platform_caption_edited;legacy.posts[0].caption='';legacy.posts[0].revision=2;
const migrated=d.syncProductionBundle(legacy,{posts:[{post_id:'p',output_version:'v1',...fields}]});assert.equal(migrated.posts[0].platform_captions.instagram,'');assert.equal(migrated.posts[0].platform_captions.threads,'');assert.equal(migrated.posts[0].platform_caption_edited.instagram,true);
let mixed=d.createState();for(let n=0;n<18;n++){mixed=d.importBundle(mixed,{bundle_id:'mixed',posts:[{post_id:'ig'+n,output_version:'v1',caption:'문안',local_settings:{targets:['instagram']}}]});mixed=d.queuePost(mixed,'ig'+n,1);}
mixed=d.importBundle(mixed,{bundle_id:'mixed',posts:[{post_id:'both',output_version:'v1',caption:'문안'}]});mixed=d.queuePost(mixed,'both',1);
const mixedPlan=previewQueueSchedule(mixed,config);assert.equal(mixedPlan.counts.instagram.assigned,18);assert.equal(mixedPlan.counts.threads.assigned,0);assert.equal(mixedPlan.overflow.length,2);const mixedApplied=applyQueueSchedule(mixed,config,mixed.revision);assert.equal(mixedApplied.jobs.at(-1).state,'waiting');assert.equal(mixedApplied.jobs.at(-1).planned_slots,undefined);

console.log('Platform caption contract/preservation/dry-run and Seoul 18-slot schedules: passed');
