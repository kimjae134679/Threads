import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestReviewTags,seedReviewTags} from '../review-tags.mjs';

const post = (patch={}) => ({
  post_id:'p1',revision:3,output_version:'v1',caption:'고양이의 하루',
  platform_captions:{instagram:'고양이의 하루',threads:'고양이의 하루'},
  source:{label:'고양이의 하루',cover_title:'고양이의 하루'},tags:'',
  common_tags:[],topic_tags:[],threads_topic_tag:'',topic_tags_edited:false,
  safety:{fact:'UNKNOWN',rights:'WARN',warn_note:'확인 필요'},
  review:{decision:'approved',output_version:'v1'},final_review:{decision:'approved'},
  approval:{basis:'old'},publication_approval:{basis:'old'},
  production_feedback:{current:{score:8}},producer_field:{keep:true},...patch
});
const state = (posts=[post()],patch={}) => ({
  revision:8,common_tags:[],posts,jobs:[],dry_runs:[],publications:[],...patch
});

test('existing production topics are reused before inferring content',()=>{
  const p=post({topic_tags:['일상기록','생각정리'],threads_topic_tag:''});
  const result=suggestReviewTags(p);
  assert.deepEqual(result.topic_tags,['일상기록','생각정리']);
  assert.equal(result.threads_topic_tag,'일상기록');
  assert.deepEqual(p.topic_tags,['일상기록','생각정리']);
});

test('explicit user topic edits preserve both nonempty and deliberately empty values',()=>{
  for(const topics of [[],['사용자선택','원문기록']]){
    const p=post({topic_tags:topics,threads_topic_tag:'',topic_tags_edited:true});
    const result=suggestReviewTags(p);
    assert.deepEqual(result.topic_tags,topics);
    assert.equal(result.threads_topic_tag,'');
  }
});

test('legacy tags and caption hashtags suppress topic inference without altering writing',()=>{
  for(const patch of [{tags:'#기존태그'},{caption:'고양이의 하루 #기존태그'},{platform_captions:{instagram:'고양이 #원문태그',threads:'표지'}}]){
    const p=post(patch),before=JSON.stringify(p),result=suggestReviewTags(p);
    assert.deepEqual(result.topic_tags,[]);
    assert.equal(result.threads_topic_tag,'');
    assert.equal(result.reason,'existing_hashtags_preserved');
    assert.equal(JSON.stringify(p),before);
  }
});

test('semantic rules use explicit content and title terms stay within the source',()=>{
  const pet=suggestReviewTags(post());
  assert.deepEqual(pet.topic_tags,['고양이','반려동물']);
  assert.equal(pet.threads_topic_tag,'고양이');
  const title=suggestReviewTags(post({caption:'',platform_captions:{},source:{label:'도자기 공방'}}));
  assert.deepEqual(title.topic_tags,['도자기','공방']);
  assert.equal(title.reason,'title_terms');
});

test('ambiguous short or promotional titles do not invent tags',()=>{
  for(const label of ['', '이것', '충격 실화', '100만 조회수']){
    const result=suggestReviewTags(post({caption:'',platform_captions:{},source:{label}}));
    assert.deepEqual(result.topic_tags,[]);
    assert.equal(result.threads_topic_tag,'');
    assert.equal(result.reason,'ambiguous_content');
  }
});

test('seeding preserves user common choices and only fills missing post values',()=>{
  const custom=post({post_id:'custom',common_tags:['읽을거리'],topic_tags:['고양이','반려동물'],threads_topic_tag:'나의 주제'});
  const empty=post({post_id:'empty',topic_tags_edited:true});
  const result=seedReviewTags(state([custom,empty]));
  assert.deepEqual(result.common_tags,[]);
  assert.deepEqual(result.posts[0].common_tags,['읽을거리']);
  assert.equal(result.posts[0].threads_topic_tag,'나의 주제');
  assert.equal(result.posts[0].revision,3);
  assert.deepEqual(result.posts[1].common_tags,[]);
  const inherited=seedReviewTags(state([empty],{common_tags:['읽을거리']}));
  assert.deepEqual(inherited.posts[0].common_tags,['읽을거리']);
});

test('changed tags invalidate approvals and queued jobs without automatically passing safety',()=>{
  const jobs=['queued','running','reconciliation','cancelled','dry_run_complete'].map((jobState,i)=>({id:String(i),post_id:'p1',state:jobState}));
  jobs.push({id:'other',post_id:'p2',state:'queued'});
  const original=state([post()],{jobs}),before=JSON.stringify(original),result=seedReviewTags(original);
  assert.equal(JSON.stringify(original),before);
  assert.deepEqual(result.common_tags,['이야기','읽을거리']);
  assert.deepEqual(result.posts[0].common_tags,['이야기','읽을거리']);
  assert.equal(result.revision,9);
  assert.equal(result.posts[0].revision,4);
  for(const key of ['review','final_review','approval','publication_approval'])assert.equal(result.posts[0][key],null);
  for(const key of ['caption','platform_captions','source','safety','production_feedback','producer_field'])assert.deepEqual(result.posts[0][key],original.posts[0][key]);
  assert.equal(result.jobs[0].state,'waiting');
  assert.equal(result.jobs[0].stale,true);
  assert.equal(result.jobs[1].state,'running');
  assert.equal(result.jobs[1].stale,true);
  assert.equal(result.jobs[2].state,'reconciliation');
  assert.equal(result.jobs[2].stale,true);
  assert.deepEqual(result.jobs.slice(3),original.jobs.slice(3));
});

test('migration is idempotent and preserves existing approvals when nothing changes',()=>{
  const once=seedReviewTags(state()),twice=seedReviewTags(once);
  assert.deepEqual(twice,once);
  assert.notEqual(twice,once);
  const ready=state([post({common_tags:['이야기','읽을거리'],topic_tags:['고양이','반려동물'],threads_topic_tag:'고양이'})],{common_tags:['이야기','읽을거리']});
  assert.deepEqual(seedReviewTags(ready),ready);
});
