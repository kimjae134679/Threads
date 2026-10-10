import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanCaptionFirstLine,cleanDisplayTitle} from '../title-normalization.mjs';
import {migrateTitleFormat} from '../title-format.mjs';

const post=patch=>({
 post_id:'changed',revision:4,output_version:'v2',
 caption:'[  제목  ]\r\n본문 [의미 있는 괄호]\r\n끝',
 platform_captions:{instagram:'[ 제목 ]\n본문 [유지]',threads:'[ 제목 ]'},
 platform_caption_edited:{instagram:true,threads:false},publication_title:'[ 제목 ]',
 source:{cover_title:'[ 제목 ]',original_title:'[판] 원문 제목',url:'https://example.test'},
 safety:{fact:'UNKNOWN'},review:{decision:'approved',note:'사용자 메모'},
 final_review:{decision:'passed'},approval:{basis:'old'},publication_approval:{basis:'old'},
 producer_bytes:'[ 원문 제작 바이트 ]',...patch
});
test('plain title helpers remove whole title wrappers and preserve body and meaningful inline brackets',()=>{
 assert.equal(cleanCaptionFirstLine('[  제목  ]\r\n본문 [유지]'),'제목\r\n본문 [유지]');
 assert.equal(cleanCaptionFirstLine('[제목]\n본문'),'제목\n본문');
 assert.equal(cleanCaptionFirstLine('평범한 제목\n[ 본문 괄호 ]'),'평범한 제목\n[ 본문 괄호 ]');
 assert.equal(cleanCaptionFirstLine('제목 [중요] 내용\n본문'),'제목 [중요] 내용\n본문');
 assert.equal(cleanCaptionFirstLine('[첫째] [둘째]\n본문'),'[첫째] [둘째]\n본문');
 assert.equal(cleanDisplayTitle('[ 제목 ]'),'제목');
 assert.equal(cleanCaptionFirstLine('[판] [ 제목 ]\n본문'),'제목\n본문');
});
test('title migration invalidates only affected posts and preserves user notes and producer bytes',()=>{
 const changed=post({post_id:'source-bc68d36df194df'});
 const plain=post({post_id:'source-8250759636e0f1',caption:'이미 평문\n본문',platform_captions:{instagram:'이미 평문\n본문',threads:'이미 평문'},publication_title:'이미 평문',source:{cover_title:'이미 평문',original_title:'[원문]'}});
 const jobs=['queued','running','reconciliation','cancelled','dry_run_complete'].map((state,i)=>({id:String(i),post_id:changed.post_id,state}));
 const original={revision:9,posts:[changed,plain],jobs},before=JSON.stringify(original);
 const result=migrateTitleFormat(original);
 assert.equal(JSON.stringify(original),before);
 assert.deepEqual(result.summary.affected_post_ids,[changed.post_id]);
 assert.deepEqual(result.summary.previous_pass_post_ids,[]); // The fixture lacks current review evidence.
 assert.equal(result.state.posts[0].caption,'제목\r\n본문 [의미 있는 괄호]\r\n끝');
 assert.equal(result.state.posts[0].source.cover_title,'제목');
 assert.equal(result.state.posts[0].source.original_title,changed.source.original_title);
 assert.equal(result.state.posts[0].review_note,'사용자 메모');
 assert.deepEqual(result.state.posts[0].platform_caption_edited,changed.platform_caption_edited);
 assert.equal(result.state.posts[0].producer_bytes,changed.producer_bytes);
 assert.deepEqual(result.state.posts[0].safety,changed.safety);
 assert.equal(result.state.posts[0].revision,5);
 for(const field of ['review','final_review','approval','publication_approval'])assert.equal(result.state.posts[0][field],null);
 assert.deepEqual(result.state.posts[1],plain);
 assert.equal(result.state.revision,10);
 assert.equal(result.state.jobs[0].state,'waiting');
 assert.equal(result.state.jobs[0].stale,true);
 assert.equal(result.state.jobs[1].state,'running');
 assert.equal(result.state.jobs[1].stale,true);
 assert.equal(result.state.jobs[2].state,'reconciliation');
 assert.deepEqual(result.state.jobs.slice(3),original.jobs.slice(3));
});
test('a cover-only change invalidates its record and preserves an existing review note',()=>{
 const p=post({caption:'평문',platform_captions:{instagram:'평문',threads:'평문'},publication_title:'평문',review_note:'기존 메모'});
 const result=migrateTitleFormat({revision:1,posts:[p],jobs:[]});
 assert.equal(result.state.posts[0].revision,5);
 assert.equal(result.state.posts[0].review_note,'기존 메모');
 assert.equal(result.state.posts[0].source.cover_title,'제목');
 assert.equal(result.state.posts[0].final_review,null);
});
test('initialization marker prevents repeat edits and reports no newly affected passes',()=>{
 const first=migrateTitleFormat({revision:1,posts:[post({})],jobs:[]});
 const second=migrateTitleFormat(first.state);
 assert.deepEqual(second.state,first.state);
 assert.deepEqual(second.summary.affected_post_ids,[]);
 assert.deepEqual(second.summary.previous_pass_post_ids,[]);
 assert.equal(second.state.title_format_initialized,true);
 assert.deepEqual(second.state.title_format_migration,first.summary);
});

test('legacy review notes survive when the editable note is an empty default',()=>{
 const result=migrateTitleFormat({revision:1,posts:[post({review_note:''})],jobs:[]});
 assert.equal(result.state.posts[0].review_note,'사용자 메모');
});

test('an explicitly cleared note with an update timestamp wins over the legacy review note',()=>{
 const updatedAt='2026-10-09T15:45:00.000Z';
 const result=migrateTitleFormat({revision:1,posts:[post({review_note:'',review_note_updated_at:updatedAt})],jobs:[]});
 assert.equal(result.state.posts[0].review_note,'');
 assert.equal(result.state.posts[0].review_note_updated_at,updatedAt);
 assert.equal(result.state.posts[0].review,null);
});
