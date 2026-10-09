import test from 'node:test';
import assert from 'node:assert/strict';
import {previewBufferPost,approveBufferPlan,refillBufferPlans,reserveBufferPlan,finishBufferAttempt,recoverBufferAttempts,bufferRequestBudget,bufferQueueSnapshot,refreshBufferStatus,BUFFER_CREATE_QUERY} from '../buffer.mjs';
import {createState,importBundle,editPost} from '../domain.mjs';
const now=Date.parse('2026-10-09T17:00:00Z'),due='2026-10-09T23:00:00.000Z';
function fixture(id='p1'){
 let s=importBundle(createState(),{bundle_id:'mock',posts:[{post_id:id,output_version:'v1',caption:'기사 제목\n\n원문에서 확인한 내용입니다.',source:{url:'https://example.org/article',label:'제목',cover_title:'표지 제목',verified:true},images:[{asset_id:'a'.repeat(64),order:1,mime:'image/jpeg'},{asset_id:'b'.repeat(64),order:2,mime:'image/jpeg'}],local_settings:{targets:['instagram','threads']},threads_title_only:true}]});
 s=editPost(s,id,{safety:{fact:'PASS',rights:'PASS',privacy:'PASS',defamation:'PASS',platform_policy:'PASS'},review:{output_version:'v1',score:8,decision:'approved'}},1);
 return s;
}
const media={['a'.repeat(64)]:{url:'https://media.example.org/01.jpg',public_verified:true,stable:true},['b'.repeat(64)]:{url:'https://media.example.org/02.jpg',public_verified:true,stable:true}};
const options={platform:'instagram',channel_id:'ig1',due_at:due,media,now};
const snap={complete:true,observed_at:now,channels:{ig1:8,th1:0},provider_ids:[]};
const approved=s=>{let p=previewBufferPost(s.posts[0],options);s=approveBufferPlan(s,p,s.revision,now);return{s,plan:previewBufferPost(s.posts[0],options)};};
test('Buffer preview preserves ordered images and only cover title on Threads',()=>{
 const s=fixture(),ig=previewBufferPost(s.posts[0],options),th=previewBufferPost(s.posts[0],{...options,platform:'threads',channel_id:'th1'});
 assert.deepEqual(ig.input.assets,[{image:{url:'https://media.example.org/01.jpg'}},{image:{url:'https://media.example.org/02.jpg'}}]);
 assert.equal(th.input.text,'표지 제목');assert.equal(ig.input.mode,'customScheduled');assert.equal(ig.input.dueAt,due);
 assert.equal(ig.ready,false);assert.ok(ig.blockers.includes('buffer_publication_approval_required'));assert.equal(ig.external_calls,0);
});
test('Dry-run approval cannot authorize Buffer and edits invalidate explicit approval',()=>{
 let s=fixture();s.posts[0].approval={scope:'dry-run'};
 assert.equal(previewBufferPost(s.posts[0],options).ready,false);
 const a=approved(s);assert.equal(a.plan.ready,true);
 s=editPost(a.s,'p1',{platform_captions:{instagram:'변경'}},a.s.posts[0].revision);
 assert.equal(previewBufferPost(s.posts[0],options).ready,false);
 assert.notEqual(previewBufferPost(s.posts[0],{...options,due_at:'2026-10-10T00:00:00.000Z'}).approval_basis,a.plan.approval_basis);
});
test('Pending source rights review and held production all block Buffer handoff',()=>{
 for(const change of [p=>p.source.verified=false,p=>p.safety.rights='UNKNOWN',p=>p.review=null,p=>p.inactive_for_this_batch=true]){
  const s=fixture();change(s.posts[0]);const p=previewBufferPost(s.posts[0],options);assert.ok(p.blockers.some(x=>x!=='buffer_publication_approval_required'));
  assert.throws(()=>approveBufferPlan(s,p,s.revision,now));
 }
});
test('Only stable verified public URLs enter request payload',()=>{
 for(const url of ['http://127.0.0.1/a.jpg','https://localhost/a','https://user:pass@example.org/a','https://media.example.org/a?token=abc','https://10.1.1.1/a','https://drive.google.com/file/d/id']){
  const p=previewBufferPost(fixture().posts[0],{...options,media:{...media,['a'.repeat(64)]:{url,public_verified:true,stable:true}}});assert.ok(p.blockers.includes('public_media_required'));
 }
 const p=previewBufferPost(fixture().posts[0],{...options,media:{}});assert.equal(p.input.assets.length,0);assert.ok(p.blockers.includes('public_media_required'));
});
test('Instagram carousel above 10 is held without truncating original images',()=>{
 const s=fixture();s.posts[0].images=Array.from({length:11},(_,i)=>({asset_id:'a'.repeat(64),order:i+1,mime:'image/jpeg'}));
 assert.ok(previewBufferPost(s.posts[0],options).blockers.includes('instagram_image_limit'));assert.equal(s.posts[0].images.length,11);
});
test('Refill counts remote queue and pending reservations and rejects incomplete or stale snapshots',()=>{
 const a=approved(fixture()),r=reserveBufferPlan(a.s,a.plan,snap,a.s.revision,now);
 const plans=[a.plan,{...a.plan,key:'another',post_id:'p2'}];
 assert.equal(refillBufferPlans(plans,snap,r,now).selected.length,1);
 assert.equal(refillBufferPlans(plans,{...snap,channels:{ig1:10}},a.s,now).selected.length,0);
 assert.throws(()=>refillBufferPlans(plans,{...snap,complete:false},a.s,now),/queue_snapshot_required/);
 assert.throws(()=>refillBufferPlans(plans,{...snap,observed_at:now-300001},a.s,now),/queue_snapshot_required/);
});
test('Reservation persists duplicate fence across versions and CAS races',()=>{
 const a=approved(fixture()),r=reserveBufferPlan(a.s,a.plan,snap,a.s.revision,now);
 assert.throws(()=>reserveBufferPlan(r,a.plan,snap,r.revision,now),/duplicate_buffer_handoff/);
 assert.throws(()=>reserveBufferPlan(r,{...a.plan,key:'new-version'},snap,r.revision,now),/duplicate_buffer_handoff/);
 assert.throws(()=>reserveBufferPlan(r,a.plan,snap,a.s.revision,now),/revision_conflict/);
});
test('Ambiguous create and interrupted restart hold reconciliation without raw error logging',()=>{
 const a=approved(fixture()),r=reserveBufferPlan(a.s,a.plan,snap,a.s.revision,now);
 const restarted=recoverBufferAttempts(JSON.parse(JSON.stringify(r)));
 assert.equal(restarted.buffer_attempts[0].state,'reconciliation');
 const f=finishBufferAttempt(r,a.plan.key,{transport_error:true,message:'secret in upstream text'},now);
 assert.equal(f.buffer_attempts[0].state,'reconciliation');assert.equal(JSON.stringify(f).includes('secret in upstream text'),false);
});
test('Confirmed scheduled, draft, sent URL and failed publishing remain distinct',()=>{
 const a=approved(fixture()),r=reserveBufferPlan(a.s,a.plan,snap,a.s.revision,now);
 for(const [status,want] of [['scheduled','scheduled'],['draft','provider_draft'],['sent','published'],['error','publication_failed']]){
  const f=finishBufferAttempt(r,a.plan.key,{data:{createPost:{__typename:'PostActionSuccess',post:{id:'buffer1',channelId:'ig1',status,dueAt:due,externalLink:status==='sent'?'https://www.instagram.com/p/example/':null}}}},now);
  assert.equal(f.buffer_attempts[0].state,want);assert.equal(f.buffer_attempts[0].success_url,status==='sent'?'https://www.instagram.com/p/example/':null);
 }
});
test('GraphQL partial success keeps provider id; unknown failures never blind retry',()=>{
 const a=approved(fixture()),r=reserveBufferPlan(a.s,a.plan,snap,a.s.revision,now);
 const f=finishBufferAttempt(r,a.plan.key,{errors:[{message:'private',extensions:{code:'UNEXPECTED'}}],data:{createPost:{post:{id:'b1',channelId:'ig1',status:'scheduled'}}}},now);
 assert.equal(f.buffer_attempts[0].provider_id,'b1');assert.equal(f.buffer_attempts[0].state,'reconciliation');
 const bad=finishBufferAttempt(r,a.plan.key,{data:{createPost:{__typename:'InvalidInputError',message:'private'}}},now);
 assert.equal(bad.buffer_attempts[0].state,'rejected');assert.equal(bad.buffer_attempts[0].retry_allowed,false);
});
test('Rolling request budget enforces all three Free windows',()=>{
 assert.equal(bufferRequestBudget(Array(100).fill(now-1),now).allowed,false);
 assert.equal(bufferRequestBudget(Array(250).fill(now-900001),now).allowed,false);
 assert.equal(bufferRequestBudget(Array(3000).fill(now-86400001),now).allowed,false);
 assert.equal(bufferRequestBudget(Array(2999).fill(now-86400001),now).allowed,true);
});
test('Queue snapshot fails closed until every provider page is complete',()=>{
 const page={data:{posts:{edges:[{node:{id:'remote1',channelId:'ig1',status:'scheduled'}}],pageInfo:{hasNextPage:false,endCursor:'end'}}}};
 const s=bufferQueueSnapshot([page],['ig1','th1'],now);assert.deepEqual(s.channels,{ig1:1,th1:0});assert.equal(s.complete,true);
 assert.equal(bufferQueueSnapshot([{data:{posts:{...page.data.posts,pageInfo:{hasNextPage:true,endCursor:'next'}}}}],['ig1'],now).complete,false);
 assert.ok(BUFFER_CREATE_QUERY.includes('externalLink'));
});
test('Reels use reviewed real video and never silently add app music',()=>{
 const s=fixture();Object.assign(s.posts[0],{media_format:'reel',reel_video:{asset_id:'c'.repeat(64),mime:'video/mp4',metadata:{codec:'h264'}},reel_playback_reviewed:true,music:{mode:'silent'}});
 const p=previewBufferPost(s.posts[0],{...options,media:{['c'.repeat(64)]:{url:'https://media.example.org/v.mp4',public_verified:true,stable:true}}});
 assert.equal(p.input.metadata.instagram.type,'reel');assert.deepEqual(p.input.assets,[{video:{url:'https://media.example.org/v.mp4'}}]);
 s.posts[0].music.mode='manual-app';assert.ok(previewBufferPost(s.posts[0],options).blockers.includes('manual_music_required'));
});

test('Caller cannot remove blockers to approve an unreviewed source',()=>{
 const s=fixture();s.posts[0].safety.rights='UNKNOWN';
 const p=previewBufferPost(s.posts[0],options);p.blockers=[];p.ready=true;
 assert.throws(()=>approveBufferPlan(s,p,s.revision,now),/buffer_review_required/);
});
test('Local HTTP Buffer preview is readable but approval and execution routes stay disabled',async()=>{
 const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');
 const {StateStore}=await import('../store.mjs'),{createStudioServer}=await import('../server.mjs');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-buffer-'));
 let app;
 try{
  await new StateStore(root).mutate(()=>fixture());
  app=await createStudioServer({root,port:0,materialRoot:path.join(root,'missing-materials')});
  const status=await fetch(app.url+'/api/buffer/status').then(r=>r.json());assert.equal(status.apiConnected,false);assert.equal(status.externalCalls,0);
  const state=(await fetch(app.url+'/api/state').then(r=>r.json())).state;
  const request=(route,body)=>fetch(app.url+route,{method:'POST',headers:{'content-type':'application/json','x-studio-local':'1'},body:JSON.stringify(body)});
  const response=await request('/api/buffer/preview',{post_id:'p1',expected_revision:state.posts[0].revision,options:{...options,platform:'threads',channel_id:'th1'}});
  assert.equal(response.status,200);const p=await response.json();assert.equal(p.input.text,'표지 제목');assert.equal(p.external_calls,0);assert.equal(p.ready,false);
  assert.equal((await request('/api/buffer/approve',{})).status,405);
  assert.equal((await request('/api/buffer/send',{})).status,405);
  assert.equal((await request('/api/buffer/preview',{post_id:'p1',expected_revision:0})).status,409);
 }finally{await app?.close();await fs.rm(root,{recursive:true,force:true});}
});

test('Reservation rechecks future date and current source/review/production gates',()=>{
 const a=approved(fixture());
 assert.throws(()=>reserveBufferPlan(a.s,a.plan,{...snap,observed_at:now+86400000},a.s.revision,now+86400000),/buffer_review_required/);
 for(const change of [p=>p.inactive_for_this_batch=true,p=>p.production_caption_status='held-version-mismatch',p=>p.source.verified=false,p=>p.safety.rights='UNKNOWN',p=>p.review=null,p=>p.targets=['threads']]){
  const changed=JSON.parse(JSON.stringify(a.s));change(changed.posts[0]);
  assert.throws(()=>reserveBufferPlan(changed,a.plan,snap,changed.revision,now),/buffer_review_required/);
 }
});
test('Official sending and needs_approval statuses hold capacity without marking sent',()=>{
 const a=approved(fixture()),r=reserveBufferPlan(a.s,a.plan,snap,a.s.revision,now);
 for(const [status,want] of [['sending','sending'],['needs_approval','awaiting_provider_approval']]){
  const f=finishBufferAttempt(r,a.plan.key,{data:{createPost:{post:{id:'b1',channelId:'ig1',status}}}},now);
  assert.equal(f.buffer_attempts[0].state,want);assert.equal(f.buffer_attempts[0].success_url,null);
 }
 const edges=['draft','error','needs_approval','scheduled','sending','sent'].map((status,i)=>({node:{id:'remote'+i,channelId:'ig1',status}}));
 const f=bufferQueueSnapshot([{data:{posts:{edges,pageInfo:{hasNextPage:false}}}}],['ig1'],now);
 assert.equal(f.complete,true);assert.equal(f.channels.ig1,5);assert.equal(f.provider_ids.includes('remote5'),false);
 assert.equal(bufferQueueSnapshot([{data:{posts:{edges:[{node:{id:'bad',channelId:'ig1',status:'processing'}}],pageInfo:{hasNextPage:false}}}}],['ig1'],now).complete,false);
});
test('Verified provider status frees a sent slot while retaining durable duplicate fence',()=>{
 const a=approved(fixture()),local=JSON.parse(JSON.stringify(a.s));
 local.buffer_attempts=Array.from({length:10},(_,i)=>({key:'k'+i,post_id:'old'+i,channel_id:'ig1',platform:'instagram',provider_id:'b'+i,state:'scheduled',retry_allowed:false}));
 const empty={complete:true,observed_at:now,channels:{ig1:0},provider_ids:[]};
 assert.equal(refillBufferPlans([a.plan],empty,local,now).selected.length,0);
 const sent=refreshBufferStatus(local,'k0',{data:{post:{id:'b0',channelId:'ig1',status:'sent',externalLink:'https://www.instagram.com/p/result/'}}},now);
 assert.equal(sent.buffer_attempts[0].state,'published');
 assert.equal(sent.buffer_attempts[0].success_url,'https://www.instagram.com/p/result/');
 const restart=JSON.parse(JSON.stringify(sent));
 assert.equal(refillBufferPlans([a.plan],empty,restart,now).selected.length,1);
 assert.equal(refillBufferPlans([{...a.plan,post_id:'old0'}],empty,restart,now).held[0].reason,'duplicate_buffer_handoff');
 const remote={...empty,channels:{ig1:9},provider_ids:Array.from({length:9},(_,i)=>'b'+(i+1))};
 assert.equal(refillBufferPlans([a.plan],remote,restart,now).occupied.ig1,10);
});
test('Unknown, partial, mismatched and out-of-order status reads never free a held slot',()=>{
 const a=approved(fixture()),r=reserveBufferPlan(a.s,a.plan,snap,a.s.revision,now);
 const scheduled=finishBufferAttempt(r,a.plan.key,{data:{createPost:{post:{id:'b1',channelId:'ig1',status:'scheduled'}}}},now);
 for(const response of [{},{errors:[{message:'private credential'}],data:{post:{id:'b1',channelId:'ig1',status:'sent'}}},{data:{post:{id:'wrong',channelId:'ig1',status:'sent'}}},{data:{post:{id:'b1',channelId:'wrong',status:'sent'}}},{data:{post:{id:'b1',channelId:'ig1',status:'processing'}}}]){
  const f=refreshBufferStatus(scheduled,a.plan.key,response,now+1);
  assert.equal(f.buffer_attempts[0].state,'reconciliation');assert.equal(f.buffer_attempts[0].provider_id,'b1');assert.equal(f.buffer_attempts[0].retry_allowed,false);
  assert.equal(JSON.stringify(f).includes('private credential'),false);
 }
 const sent=refreshBufferStatus(scheduled,a.plan.key,{data:{post:{id:'b1',channelId:'ig1',status:'sent'}}},now+2);
 assert.throws(()=>refreshBufferStatus(sent,a.plan.key,{data:{post:{id:'b1',channelId:'ig1',status:'scheduled'}}},now+1),/buffer_status_stale/);
 assert.equal(refreshBufferStatus(sent,a.plan.key,{data:{post:{id:'b1',channelId:'ig1',status:'scheduled'}}},now+3).buffer_attempts[0].state,'published');
});

test('Prototype-shaped unknown statuses retain the duplicate fence through restart',()=>{
 const a=approved(fixture()),r=reserveBufferPlan(a.s,a.plan,snap,a.s.revision,now);
 for(const status of ['constructor','toString','__proto__']){
  const f=JSON.parse(JSON.stringify(finishBufferAttempt(r,a.plan.key,{data:{createPost:{post:{id:'b1',channelId:'ig1',status}}}},now)));
  assert.equal(f.buffer_attempts[0].state,'reconciliation');assert.equal(f.buffer_attempts[0].provider_status,null);
  assert.equal(refillBufferPlans([a.plan],snap,f,now).selected.length,0);
 }
});
