import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';const require=createRequire(import.meta.url),{createPostReviewStore,version}=require('../desktop/post-review-store.cjs');
test('numeric feedback reuses actual store contract with a pinned current-bank row, separate from old round',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'quality-bank-'));try{
  const sha='a'.repeat(64),row={id:'existing',title:'현재 글',status:'generated',outputFolder:'existing',images:[{name:'rendered/slide-001.png',sha256:'b'.repeat(64)}],sourceFingerprint:'source',outputSha256:'output',ruleVersion:'rule',reviewRound:'round-current',coverRefresh:{consumedGeneratedRecordSha256:sha}};
  await fs.mkdir(path.join(root,'outputs/existing'),{recursive:true});await fs.writeFile(path.join(root,'outputs/existing/production-plan.json'),JSON.stringify({pages:[{role:'cover'}],universalCover:{aiAsset:{sourceId:row.id,generationRecordSha256:sha}}}));
  const store=createPostReviewStore(root,{reportProvider:async()=>[row],roundProvider:async()=>({reviewRound:'round-current'}),outputDirectory:'outputs'});
  const data=await store.save({id:row.id,outputVersion:version(row),score:8,note:'현재 버전 메모'});assert.equal(data.reviewRound,'round-current');assert.equal(data.score,8);assert.equal(data.outputVersion,version(row));assert.equal((await store.list()).entries[0].current.note,'현재 버전 메모');
  await assert.rejects(store.save({id:row.id,outputVersion:'old-version',score:9,note:'잘못된 이전 판'}),/바뀌었습니다/);assert.equal((await store.list()).entries[0].current.score,8);
  const recorded=JSON.parse(await fs.readFile(store.file,'utf8'));assert.equal(recorded.recordType,'user_post_quality_feedback');assert.equal(recorded.evaluations[0].publicationAllowed,undefined);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
