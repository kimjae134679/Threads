import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{prepareReviewRelease,activateReviewRelease}=require('../desktop/review-release.cjs'),{createPostReviewStore,version}=require('../desktop/post-review-store.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const base=await fs.mkdtemp(path.join(os.tmpdir(),'threads-review-release-'));
const source=path.join(base,'source'),root=path.join(base,'active'),out='06_자동 제작 결과',feedback='07_사용자 평가',png=Buffer.alloc(24);
Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1080,16);png.writeUInt32BE(1350,20);
async function json(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value));}
async function digest(file){return hash(await fs.readFile(file));}
const rows=['one','two'].map(id=>({id,title:'Fixture '+id,status:'generated',outputFolder:'현재 결과/'+id,sourceFingerprint:'fixture-'+id,outputSha256:'fixture-output-'+id,ruleVersion:'fixture.5',images:[{name:'rendered/slide-001.png',sha256:hash(png),width:1080,height:1350}]}));
try{
 for(const row of rows){const p=path.join(source,out,row.outputFolder);await json(path.join(p,'production-plan.json'),{coverTitle:row.title,ruleVersion:row.ruleVersion,pages:[{role:'cover'}]});await fs.mkdir(path.join(p,'rendered'));await fs.writeFile(path.join(p,row.images[0].name),png);}
 await json(path.join(source,out,'status.json'),{processed:2,entries:rows});await fs.mkdir(root);await fs.cp(path.join(source,out),path.join(root,out),{recursive:true});
 const oldData={schemaVersion:1,recordType:'user_post_quality_feedback',evaluations:[{id:'one',outputVersion:version(rows[0]),score:9,note:'PAST FIXTURE ONLY',updatedAt:'2026-01-01T00:00:00Z'}]};
 await json(path.join(root,feedback,'평가 기록.json'),oldData);const oldRating=await fs.readFile(path.join(root,feedback,'평가 기록.json'));const oldStatusSha=await digest(path.join(root,out,'status.json'));
 for(const name of ['08_재검토_20261007','09_개별 보완_20261007'])await json(path.join(root,name,'preserved.json'),{fixture:true});
 const stage=path.join(base,'staging-1'),ready=await prepareReviewRelease(source,stage,{reviewRound:'fixture-round-one',expectedPosts:2});assert.equal(ready.posts,2);assert.equal(ready.pages,2);
 const applied=await activateReviewRelease(root,stage,{expectedStatusSha256:oldStatusSha,expectedFeedbackSha256:hash(oldRating)});assert(applied.oldBytesPreserved);
 assert.equal(await digest(path.join(applied.archive,feedback,'평가 기록.json')),hash(oldRating));assert.equal(await digest(path.join(applied.archive,out,'status.json')),oldStatusSha);
 assert.equal(await digest(path.join(root,out,rows[0].outputFolder,rows[0].images[0].name)),hash(png));
 assert.equal((await fs.readdir(root)).includes('09_개별 보완_20261007'),false);
 const store=createPostReviewStore(root,{legacyFeedbackFile:path.join(applied.archive,feedback,'평가 기록.json')});let list=await store.list();assert.equal(list.reviewRound,'fixture-round-one');assert(list.entries.every(e=>e.current===null&&e.previous===null));assert.equal(JSON.parse(await fs.readFile(store.file)).evaluations.length,0);assert.notEqual(list.entries[0].outputVersion,version(rows[0]));
 await assert.rejects(store.save({id:'one',outputVersion:version(rows[0]),score:10,note:'STALE'}),/바뀌/);
 const current=list.entries.find(e=>e.id==='one');await store.save({id:current.id,outputVersion:current.outputVersion,score:4,note:'NEW FIXTURE ONLY'});assert.equal((await store.list()).entries.find(e=>e.id==='one').current.score,4);
 const stage2=path.join(base,'staging-2');await prepareReviewRelease(source,stage2,{reviewRound:'fixture-round-two',expectedPosts:2});const prior=await fs.readFile(store.file),priorStatus=await digest(path.join(root,out,'status.json'));
 await assert.rejects(activateReviewRelease(root,stage2,{expectedStatusSha256:priorStatus,expectedFeedbackSha256:hash(oldRating)}),/변경/);assert.equal((await store.list()).reviewRound,'fixture-round-one');
 const applied2=await activateReviewRelease(root,stage2,{expectedStatusSha256:priorStatus,expectedFeedbackSha256:hash(prior)});assert.equal(await digest(path.join(applied2.archive,feedback,'평가 기록.json')),hash(prior));list=await store.list();assert(list.entries.every(e=>e.current===null&&e.previous===null));assert.notEqual(list.entries[0].outputVersion,current.outputVersion);
 assert((await activateReviewRelease(root,stage2,{expectedStatusSha256:'ignored',expectedFeedbackSha256:'ignored'})).alreadyActive);
 await assert.rejects(store.save({id:'one',outputVersion:current.outputVersion,score:7,note:'STALE SECOND ROUND'}),/바뀌/);
 const sourceStatus=JSON.parse(await fs.readFile(path.join(source,out,'status.json')));sourceStatus.entries[0].status='already_done';await json(path.join(source,out,'status.json'),sourceStatus);await assert.rejects(prepareReviewRelease(source,path.join(base,'staging-cached'),{reviewRound:'fixture-cached',expectedPosts:2}),/새 제작/);
 sourceStatus.entries[0].status='generated';await json(path.join(source,out,'status.json'),sourceStatus);await fs.writeFile(path.join(source,out,rows[0].outputFolder,rows[0].images[0].name),Buffer.from('corrupt'));await assert.rejects(prepareReviewRelease(source,path.join(base,'staging-corrupt'),{reviewRound:'fixture-corrupt',expectedPosts:2}),/무결성/);assert.equal((await store.list()).reviewRound,'fixture-round-two');
 console.log('Full review release: entire collection, archived original bytes/ratings, blank fresh rounds, legacy import suppression, stale-save protection, CAS rejection, idempotence, cache/corruption rejection PASS');
}finally{assert(path.resolve(base).startsWith(path.resolve(os.tmpdir())+path.sep));assert(path.basename(base).startsWith('threads-review-release-'));await fs.rm(base,{recursive:true,force:true});}
