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
 const oldWorkflow=Buffer.from(' {"schemaVersion":1,"recordType":"user_review_workflow","entries":[{"id":"one","outputVersion":"past","seenAt":"2026-01-01","pagesSeen":[1],"disposition":"held","note":"PAST WORKFLOW ONLY"}]}\n');
 await fs.writeFile(path.join(root,feedback,'검토 진행.json'),oldWorkflow);await json(path.join(root,feedback,'attachments','preserved.json'),{memo:'ANCILLARY FIXTURE ONLY'});const ancillary=await fs.readFile(path.join(root,feedback,'attachments','preserved.json'));
 for(const name of ['08_재검토_20261007','09_개별 보완_20261007'])await json(path.join(root,name,'preserved.json'),{fixture:true});
 const stage=path.join(base,'staging-1'),ready=await prepareReviewRelease(source,stage,{reviewRound:'fixture-round-one',expectedPosts:2});assert.equal(ready.posts,2);assert.equal(ready.pages,2);
 const freshWorkflow=JSON.parse(await fs.readFile(path.join(stage,feedback,'검토 진행.json'),'utf8'));assert.deepEqual(freshWorkflow,{schemaVersion:1,recordType:'user_review_workflow',reviewRound:'fixture-round-one',entries:[]});
 const applied=await activateReviewRelease(root,stage,{expectedStatusSha256:oldStatusSha,expectedFeedbackSha256:hash(oldRating),expectedPointerSha256:null});assert(applied.oldBytesPreserved);
 assert.equal(JSON.parse(await fs.readFile(path.join(applied.archive,'archive-before.json'))).oldPointerSha256,null);await assert.rejects(fs.readFile(path.join(applied.archive,'review-current.json')),{code:'ENOENT'});
 assert.equal(await digest(path.join(applied.archive,feedback,'평가 기록.json')),hash(oldRating));assert.equal(await digest(path.join(applied.archive,out,'status.json')),oldStatusSha);
 assert.deepEqual(await fs.readFile(path.join(applied.archive,feedback,'검토 진행.json')),oldWorkflow);assert.deepEqual(await fs.readFile(path.join(applied.archive,feedback,'attachments','preserved.json')),ancillary);
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(root,feedback,'검토 진행.json'),'utf8')).entries,[]);
 assert.equal(await digest(path.join(root,out,rows[0].outputFolder,rows[0].images[0].name)),hash(png));
 assert.equal((await fs.readdir(root)).includes('09_개별 보완_20261007'),false);
 const store=createPostReviewStore(root,{legacyFeedbackFile:path.join(applied.archive,feedback,'평가 기록.json')});let list=await store.list();assert.equal(list.reviewRound,'fixture-round-one');assert(list.entries.every(e=>e.current===null&&e.previous===null));assert.equal(JSON.parse(await fs.readFile(store.file)).evaluations.length,0);assert.notEqual(list.entries[0].outputVersion,version(rows[0]));
 await assert.rejects(store.save({id:'one',outputVersion:version(rows[0]),score:10,note:'STALE'}),/바뀌/);
 const current=list.entries.find(e=>e.id==='one');await store.save({id:current.id,outputVersion:current.outputVersion,score:4,note:'NEW FIXTURE ONLY'});assert.equal((await store.list()).entries.find(e=>e.id==='one').current.score,4);
 const stage2=path.join(base,'staging-2');await prepareReviewRelease(source,stage2,{reviewRound:'fixture-round-two',expectedPosts:2});const prior=await fs.readFile(store.file),priorStatus=await digest(path.join(root,out,'status.json'));
 const workflowBefore=await fs.readFile(store.workflowFile),workflowSha=hash(workflowBefore);
 await json(store.workflowFile,{schemaVersion:1,recordType:'user_review_workflow',reviewRound:'fixture-round-one',entries:[{id:'one',outputVersion:current.outputVersion,seenAt:'2026-10-08T00:00:00Z',pagesSeen:[1],disposition:'held',reasonCode:'production_error',note:'CONCURRENT WORKFLOW ONLY'}]});
 const changedWorkflow=await fs.readFile(store.workflowFile),pointerBefore=await fs.readFile(path.join(root,'review-current.json')),journalBefore=await fs.readFile(path.join(root,'review-delivery-in-progress.json'));
 for(const expectedWorkflowSha256 of [workflowSha,null]){
  await assert.rejects(activateReviewRelease(root,stage2,{expectedStatusSha256:priorStatus,expectedFeedbackSha256:hash(prior),expectedWorkflowSha256}),/변경/);
  assert.deepEqual(await fs.readFile(store.workflowFile),changedWorkflow);assert.deepEqual(await fs.readFile(store.file),prior);assert.equal(await digest(path.join(root,out,'status.json')),priorStatus);
  assert.deepEqual(await fs.readFile(path.join(root,'review-current.json')),pointerBefore);assert.deepEqual(await fs.readFile(path.join(root,'review-delivery-in-progress.json')),journalBefore);
  await assert.rejects(fs.stat(path.join(root,'05_이전 작업','리뷰 과거','before-fixture-round-two')), {code:'ENOENT'});assert.equal(JSON.parse(await fs.readFile(path.join(stage2,'release-ready.json'))).reviewRound,'fixture-round-two');
 }
 const changedPointer=Buffer.from(' \n'+pointerBefore.toString('utf8')+'\n');await fs.writeFile(path.join(root,'review-current.json'),changedPointer);
 for(const expectedPointerSha256 of [hash(pointerBefore),null]){
  await assert.rejects(activateReviewRelease(root,stage2,{expectedStatusSha256:priorStatus,expectedFeedbackSha256:hash(prior),expectedWorkflowSha256:hash(changedWorkflow),expectedPointerSha256}),/변경/);
  assert.deepEqual(await fs.readFile(path.join(root,'review-current.json')),changedPointer);assert.deepEqual(await fs.readFile(path.join(root,'review-delivery-in-progress.json')),journalBefore);assert.deepEqual(await fs.readFile(store.workflowFile),changedWorkflow);
  assert.equal(await digest(path.join(root,out,'status.json')),priorStatus);assert.deepEqual(await fs.readFile(store.file),prior);await assert.rejects(fs.stat(path.join(root,'05_이전 작업','리뷰 과거','before-fixture-round-two')),{code:'ENOENT'});
 }
 await assert.rejects(activateReviewRelease(root,stage2,{expectedStatusSha256:priorStatus,expectedFeedbackSha256:hash(oldRating)}),/변경/);assert.equal((await store.list()).reviewRound,'fixture-round-one');
 const applied2=await activateReviewRelease(root,stage2,{expectedStatusSha256:priorStatus,expectedFeedbackSha256:hash(prior),expectedWorkflowSha256:hash(changedWorkflow),expectedPointerSha256:hash(changedPointer)});assert.deepEqual(await fs.readFile(path.join(applied2.archive,'review-current.json')),changedPointer);assert.equal(JSON.parse(await fs.readFile(path.join(applied2.archive,'archive-before.json'))).oldPointerSha256,hash(changedPointer));assert.deepEqual(await fs.readFile(path.join(applied2.archive,feedback,'검토 진행.json')),changedWorkflow);assert.equal(JSON.parse(await fs.readFile(path.join(applied2.archive,'archive-before.json'))).oldWorkflowSha256,hash(changedWorkflow));assert.deepEqual(JSON.parse(await fs.readFile(store.workflowFile)).entries,[]);assert.equal(await digest(path.join(applied2.archive,feedback,'평가 기록.json')),hash(prior));list=await store.list();assert(list.entries.every(e=>e.current===null&&e.previous===null));assert.notEqual(list.entries[0].outputVersion,current.outputVersion);
 assert((await activateReviewRelease(root,stage2,{expectedStatusSha256:'ignored',expectedFeedbackSha256:'ignored'})).alreadyActive);
 await assert.rejects(store.save({id:'one',outputVersion:current.outputVersion,score:7,note:'STALE SECOND ROUND'}),/바뀌/);
 const thirdPointer=await fs.readFile(path.join(root,'review-current.json'));
 const stage3=path.join(base,'staging-3');await prepareReviewRelease(source,stage3,{reviewRound:'fixture-round-three',expectedPosts:2});const thirdStatus=await digest(path.join(root,out,'status.json')),thirdFeedback=await digest(store.file);
 await fs.rm(store.workflowFile);
 await assert.rejects(activateReviewRelease(root,stage3,{expectedStatusSha256:thirdStatus,expectedFeedbackSha256:thirdFeedback,expectedWorkflowSha256:hash(changedWorkflow)}),/변경/);
 await assert.rejects(fs.stat(path.join(root,'05_이전 작업','리뷰 과거','before-fixture-round-three')),{code:'ENOENT'});
 const applied3=await activateReviewRelease(root,stage3,{expectedStatusSha256:thirdStatus,expectedFeedbackSha256:thirdFeedback,expectedWorkflowSha256:null});
 assert.deepEqual(await fs.readFile(path.join(applied3.archive,'review-current.json')),thirdPointer);
 await assert.rejects(fs.readFile(path.join(applied3.archive,feedback,'검토 진행.json')),{code:'ENOENT'});assert.equal(JSON.parse(await fs.readFile(path.join(applied3.archive,'archive-before.json'))).oldWorkflowSha256,null);assert.deepEqual(JSON.parse(await fs.readFile(store.workflowFile)).entries,[]);
 const rollbackStage=path.join(base,'staging-rollback');await prepareReviewRelease(source,rollbackStage,{reviewRound:'fixture-rollback',expectedPosts:2});
 const rollbackPointer=await fs.readFile(path.join(root,'review-current.json')),rollbackStatus=await digest(path.join(root,out,'status.json')),rollbackFeedback=await fs.readFile(store.file),rollbackWorkflow=await fs.readFile(store.workflowFile),originalRename=fs.rename;
 const archivedPointer=path.join(root,'05_이전 작업','리뷰 과거','before-fixture-rollback','review-current.json');
 // Inject real archive-file corruption after its atomic rename to test rollback after pointer overwrite.
 fs.rename=async(from,to)=>{await originalRename(from,to);if(to===archivedPointer)await fs.writeFile(to,'CORRUPTED ARCHIVE POINTER');};
 try{await assert.rejects(activateReviewRelease(root,rollbackStage,{expectedStatusSha256:rollbackStatus,expectedFeedbackSha256:hash(rollbackFeedback),expectedWorkflowSha256:hash(rollbackWorkflow),expectedPointerSha256:hash(rollbackPointer)}),/변경/);}finally{fs.rename=originalRename;}
 assert.deepEqual(await fs.readFile(path.join(root,'review-current.json')),rollbackPointer);assert.equal(await digest(path.join(root,out,'status.json')),rollbackStatus);assert.deepEqual(await fs.readFile(store.file),rollbackFeedback);assert.deepEqual(await fs.readFile(store.workflowFile),rollbackWorkflow);assert.equal(JSON.parse(await fs.readFile(path.join(root,'review-delivery-in-progress.json'))).rolledBack,true);assert.equal(JSON.parse(await fs.readFile(path.join(rollbackStage,out,'status.json'))).reviewRound,'fixture-rollback');
 const originalSourceStatus=await fs.readFile(path.join(source,out,'status.json'));
 const proofReport={reviewRound:'fixture-proof',reproductionContract:'universal-reproduction-v1',deliveryStatus:'complete',wholeCollectionRegenerated:true,processed:3,entries:[...rows,{id:'held-source',status:'held',reason:'source insufficient'}]};
 const proof={reviewRound:'fixture-proof',generated:2,held:1,planned:3,sourceBytesUnchanged:true};
 await json(path.join(source,out,'status.json'),proofReport);
 await assert.rejects(prepareReviewRelease(source,path.join(base,'proof-missing'),{reviewRound:'fixture-proof',expectedPosts:2}),/완료/);await assert.rejects(fs.stat(path.join(base,'proof-missing')),{code:'ENOENT'});
 await json(path.join(source,'reproduction-complete.json'),proof);await json(path.join(source,'reproduction-fatal.json'),{error:'FIXTURE FATAL'});
 await assert.rejects(prepareReviewRelease(source,path.join(base,'proof-fatal'),{reviewRound:'fixture-proof',expectedPosts:2}),/완료/);await assert.rejects(fs.stat(path.join(base,'proof-fatal')),{code:'ENOENT'});await fs.rm(path.join(source,'reproduction-fatal.json'));
 const proofCases=[{name:'wrong-round',proof:{reviewRound:'other'}},{name:'wrong-generated',proof:{generated:1}},{name:'wrong-planned',proof:{planned:4}},{name:'changed-source',proof:{sourceBytesUnchanged:false}},{name:'bad-held',proof:{held:-1,planned:1}},{name:'incomplete-report',report:{deliveryStatus:'reproducing'}},{name:'partial-report',report:{wholeCollectionRegenerated:false}},{name:'wrong-report-round',report:{reviewRound:'other'}}];
 for(const fixture of proofCases){await json(path.join(source,out,'status.json'),{...proofReport,...fixture.report});await json(path.join(source,'reproduction-complete.json'),{...proof,...fixture.proof});const destination=path.join(base,'proof-'+fixture.name);await assert.rejects(prepareReviewRelease(source,destination,{reviewRound:'fixture-proof',expectedPosts:2}),/완료/,fixture.name);await assert.rejects(fs.stat(destination),{code:'ENOENT'});}
 await json(path.join(source,out,'status.json'),proofReport);await json(path.join(source,'reproduction-complete.json'),proof);const proved=await prepareReviewRelease(source,path.join(base,'proof-valid'),{reviewRound:'fixture-proof',expectedPosts:2});assert.equal(proved.posts,2);assert.equal(proved.wholeCollectionRegenerated,true);
 await fs.writeFile(path.join(source,out,'status.json'),originalSourceStatus);
 const sourceStatus=JSON.parse(await fs.readFile(path.join(source,out,'status.json')));sourceStatus.entries[0].status='already_done';await json(path.join(source,out,'status.json'),sourceStatus);await assert.rejects(prepareReviewRelease(source,path.join(base,'staging-cached'),{reviewRound:'fixture-cached',expectedPosts:2}),/새 제작/);
 sourceStatus.entries[0].status='generated';await json(path.join(source,out,'status.json'),sourceStatus);await fs.writeFile(path.join(source,out,rows[0].outputFolder,rows[0].images[0].name),Buffer.from('corrupt'));await assert.rejects(prepareReviewRelease(source,path.join(base,'staging-corrupt'),{reviewRound:'fixture-corrupt',expectedPosts:2}),/무결성/);assert.equal((await store.list()).reviewRound,'fixture-round-three');
 console.log('Full review release: entire collection, archived original bytes/ratings, blank fresh rounds, legacy import suppression, stale-save protection, CAS rejection, idempotence, cache/corruption rejection PASS');
}finally{assert(path.resolve(base).startsWith(path.resolve(os.tmpdir())+path.sep));assert(path.basename(base).startsWith('threads-review-release-'));await fs.rm(base,{recursive:true,force:true});}
