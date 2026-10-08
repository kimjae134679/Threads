import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {prepareReviewRelease}=require('../desktop/review-release.cjs');
const {createPostReviewStore}=require('../desktop/post-review-store.cjs');
const {withCanonicalWriter}=require('../desktop/review-canonical-writer.cjs');
let activateReviewRoundFresh;
try{({activateReviewRoundFresh}=require('../desktop/activate-review-round-fresh.cjs'));}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
assert.equal(typeof activateReviewRoundFresh,'function','Fresh checkpoint activation helper must implement the approved API');

const base=await fs.mkdtemp(path.join(os.tmpdir(),'threads-fresh-activation-'));
const output='06_자동 제작 결과',feedback='07_사용자 평가';
const names={status:path.join(output,'status.json'),feedback:path.join(feedback,'평가 기록.json'),workflow:path.join(feedback,'검토 진행.json'),pointer:'review-current.json'};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const json=async(file,value)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2)+'\n');};
const options={reviewRound:'fresh-round',expectedCurrentRound:'old-round',expectedPosts:2,expectedPages:2};
const read=async(root)=>Object.fromEntries(await Promise.all(Object.entries(names).map(async([key,relative])=>[key,await fs.readFile(path.join(root,relative))])));
let sequence=0;
async function fixture(){
 const dir=path.join(base,String(++sequence)),source=path.join(dir,'source'),root=path.join(dir,'live'),stage=path.join(dir,'stage'),old=path.join(dir,'old-prepared'),rows=[];
 const png=Buffer.alloc(32);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1080,16);png.writeUInt32BE(1080,20);
 for(const id of ['one','two']){
  const folder='current/'+id,entry={id,title:id,status:'generated',templateId:'universal_paper',ruleVersion:'fixture-v1',sourceFingerprint:'source-'+id,outputSha256:'preview-'+id,outputFolder:folder,images:[{name:'rendered/slide-001.png',sha256:hash(png),width:1080,height:1080}]};rows.push(entry);
  await json(path.join(source,output,folder,'production-plan.json'),{ruleVersion:entry.ruleVersion,coverTitle:id,pages:[{role:'cover',width:1080,height:1080}]});
  await fs.mkdir(path.join(source,output,folder,'rendered'),{recursive:true});await fs.writeFile(path.join(source,output,folder,entry.images[0].name),png);
  await fs.writeFile(path.join(source,output,folder,'source-bundle.zip'),'IMMUTABLE SOURCE '+id);
 }
 await json(path.join(source,names.status),{processed:2,entries:rows});
 await prepareReviewRelease(source,old,{reviewRound:'old-round',expectedPosts:2});
 await fs.mkdir(root,{recursive:true});for(const folder of [output,feedback])await fs.cp(path.join(old,folder),path.join(root,folder),{recursive:true});
 await json(path.join(root,names.pointer),{schemaVersion:1,reviewRound:'old-round',posts:2,pages:2,active:true});
 await prepareReviewRelease(source,stage,{reviewRound:'fresh-round',expectedPosts:2});
 const store=createPostReviewStore(root),list=await store.list();
 await store.save({id:'one',outputVersion:list.entries[0].outputVersion,score:3,note:'Original human evaluation'});
 await store.visit({id:'one',outputVersion:list.entries[0].outputVersion,page:1});
 return {root,stage,store,list,dir};
}
async function noActivation(f,before){
 const after=await read(f.root);for(const key of Object.keys(names))assert.deepEqual(after[key],before[key],'No mutation before failed validation: '+key);
 await assert.rejects(fs.stat(path.join(f.root,'05_이전 작업','리뷰 과거','before-fresh-round')),{code:'ENOENT'});
 await assert.rejects(fs.stat(path.join(f.root,'review-delivery-in-progress.json')),{code:'ENOENT'});
}
try{
 // Omitting fresh reads would archive the pre-render score and lose these latest user edits.
 const latest=await fixture();await latest.store.save({id:'one',outputVersion:latest.list.entries[0].outputVersion,score:9,note:'Latest human memo · 직전 수정'});
 await latest.store.save({id:'two',outputVersion:latest.list.entries[1].outputVersion,score:5,note:'Added during rendering'});
 await latest.store.decide({id:'two',outputVersion:latest.list.entries[1].outputVersion,disposition:'held',reasonCode:'production_error',note:'Latest human workflow'});
 const before=await read(latest.root),applied=await withCanonicalWriter(latest.root,()=>activateReviewRoundFresh(latest.root,latest.stage,options));
 for(const [key,relative]of Object.entries(names)){assert.deepEqual(await fs.readFile(path.join(applied.archive,relative)),before[key]);assert.equal(applied.freshCheckpoint[key+'Sha256'],hash(before[key]));}
 assert.equal(applied.freshCheckpoint.feedbackCount,2);assert.equal(applied.freshCheckpoint.workflowCount,2);assert.equal(applied.freshCheckpoint.reviewRound,'old-round');
 assert.deepEqual(JSON.parse(await fs.readFile(latest.store.file)).evaluations,[]);assert.deepEqual(JSON.parse(await fs.readFile(latest.store.workflowFile)).entries,[]);
 const fresh=await latest.store.list();assert.equal(fresh.reviewRound,'fresh-round');assert(fresh.entries.every(row=>row.current===null&&row.previous===null));
 await assert.rejects(latest.store.save({id:'one',outputVersion:latest.list.entries[0].outputVersion,score:7,note:'Old window draft'}),/바뀌|전환/);
 assert.equal(await hash(await fs.readFile(path.join(latest.root,output,'current/one/source-bundle.zip'))),hash(Buffer.from('IMMUTABLE SOURCE one')));

 // An independent process can finish a user save first; the helper must wait, then snapshot it.
 const concurrent=await fixture(),writerFile=path.resolve('desktop/review-canonical-writer.cjs'),storeFile=path.resolve('desktop/post-review-store.cjs');
 const script="const {withCanonicalWriter}=require(process.argv[2]),{createPostReviewStore}=require(process.argv[3]);const root=process.argv[1];withCanonicalWriter(root,async()=>{process.stdout.write('LOCKED\\n');await new Promise(r=>process.stdin.once('data',r));const store=createPostReviewStore(root),rows=(await store.list()).entries;await store.save({id:'one',outputVersion:rows[0].outputVersion,score:10,note:'External process latest memo'});}).then(()=>process.exit(0),e=>{console.error(e);process.exit(1)});";
 const child=spawn(process.execPath,['-e',script,concurrent.root,writerFile,storeFile],{windowsHide:true,stdio:['pipe','pipe','pipe']});let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
 const exit=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Fixture writer failed: '+stderr)));});
 await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{if(chunk.toString().includes('LOCKED'))resolve();});child.once('error',reject);child.once('exit',code=>{if(code!==0)reject(Error(stderr));});});
 let settled=false;const waiting=activateReviewRoundFresh(concurrent.root,concurrent.stage,options).then(result=>{settled=true;return result;});
 await new Promise(resolve=>setTimeout(resolve,40));assert.equal(settled,false);await assert.rejects(fs.stat(path.join(concurrent.root,'05_이전 작업','리뷰 과거','before-fresh-round')),{code:'ENOENT'});
 child.stdin.write('finish');await exit;const concurrentApplied=await waiting;
 assert.equal(JSON.parse(await fs.readFile(path.join(concurrentApplied.archive,names.feedback))).evaluations[0].note,'External process latest memo');

 // A non-cooperating writer after snapshot must hit the existing activator's CAS before any move.
 const cas=await fixture(),casBefore=await read(cas.root),readFile=fs.readFile;let interfered=false;
 const external=JSON.parse(casBefore.feedback);external.evaluations[0].note='Unmanaged external write';const externalBytes=Buffer.from(JSON.stringify(external));
 fs.readFile=async(file,...args)=>{if(path.resolve(file)===path.join(cas.stage,'release-ready.json')&&!interfered){interfered=true;await fs.writeFile(path.join(cas.root,names.feedback),externalBytes);}return readFile(file,...args);};
 try{await assert.rejects(activateReviewRoundFresh(cas.root,cas.stage,options),/변경|바뀌|changed/);}finally{fs.readFile=readFile;}
 assert.equal(interfered,true);await noActivation(cas,{...casBefore,feedback:externalBytes});

 const boundaries=await fixture(),boundaryBefore=await read(boundaries.root);
 for(const stage of [boundaries.root,path.join(boundaries.root,'nested-stage'),path.dirname(boundaries.root)])await assert.rejects(activateReviewRoundFresh(boundaries.root,stage,options),/overlap/);
 if(process.platform==='win32'){
  const otherDrive=path.parse(boundaries.root).root[0].toUpperCase()==='D'?'E:':'D:';
  await assert.rejects(activateReviewRoundFresh(boundaries.root,otherDrive+'\\fixture-stage-do-not-create',options),/same volume/);
 }
 await noActivation(boundaries,boundaryBefore);

 // A legacy client without the writer lock can finish an old save after the
 // release's own archive checks. Report the actual applied state, never success.
 const late=await fixture(),lateBefore=await read(late.root),rename=fs.rename;let lateWritten=false;
 const lateData=JSON.parse(lateBefore.feedback);lateData.evaluations[0].note='Legacy in-flight memo completed after activation';const lateBytes=Buffer.from(JSON.stringify(lateData));
 fs.rename=async(from,to)=>{await rename(from,to);if(path.resolve(to)===path.join(late.root,'review-delivery-in-progress.json')&&!lateWritten&&JSON.parse(await fs.readFile(to)).complete===true){lateWritten=true;await fs.writeFile(path.join(late.root,names.feedback),lateBytes);}};
 try{await assert.rejects(activateReviewRoundFresh(late.root,late.stage,options),error=>error.code==='REVIEW_ACTIVATION_POSTVERIFY_FAILED'&&error.activation.reviewRound==='fresh-round');}finally{fs.rename=rename;}
 assert.equal(lateWritten,true);assert.deepEqual(await fs.readFile(path.join(late.root,names.feedback)),lateBytes,'Do not overwrite the legacy client memo on verification failure');
 assert.equal(JSON.parse(await fs.readFile(path.join(late.root,names.pointer))).reviewRound,'fresh-round');
 assert.deepEqual(await fs.readFile(path.join(late.root,'05_이전 작업','리뷰 과거','before-fresh-round',names.feedback)),lateBefore.feedback);

 // Invalid or absent live records and inconsistent rounds must fail before archive/journal creation.
 for(const change of ['corrupt-feedback','deleted-feedback','deleted-workflow','feedback-round','workflow-round','status-round','pointer-round','bad-score','bad-note','staged-score','staged-workflow','staged-round','ready-count','requested-count']){
  const f=await fixture();let args=options;
  if(change==='corrupt-feedback')await fs.writeFile(path.join(f.root,names.feedback),'{');
  else if(change==='deleted-feedback'||change==='deleted-workflow')await fs.rm(path.join(f.root,names[change==='deleted-feedback'?'feedback':'workflow']));
  else if(change==='requested-count')args={...options,expectedPages:3};
  else{
   const staged=change.startsWith('staged'),key=change==='ready-count'?'ready':change==='staged-round'?'status':change==='staged-score'?'feedback':change==='staged-workflow'?'workflow':change.split('-')[0]==='bad'?'feedback':change.split('-')[0];
   const file=path.join(staged||change==='ready-count'?f.stage:f.root,key==='ready'?'release-ready.json':names[key]),data=JSON.parse(await fs.readFile(file));
   if(change==='bad-score')data.evaluations[0].score=99;
   else if(change==='bad-note')data.evaluations[0].note={invalid:true};
   else if(change==='staged-score')data.evaluations.push({id:'one',score:10,note:'Do not migrate'});
   else if(change==='staged-workflow')data.entries.push({id:'one',disposition:'held'});
   else if(change==='ready-count')data.pages=99;
   else data.reviewRound='mismatched-round';
   await json(file,data);
  }
  const existing=Object.fromEntries(await Promise.all(Object.entries(names).map(async([key,relative])=>[key,await fs.readFile(path.join(f.root,relative)).catch(error=>{if(error.code==='ENOENT')return null;throw error;})])));
  await assert.rejects(activateReviewRoundFresh(f.root,f.stage,args),undefined,change);
  for(const [key,relative]of Object.entries(names)){const after=await fs.readFile(path.join(f.root,relative)).catch(error=>{if(error.code==='ENOENT')return null;throw error;});assert.deepEqual(after,existing[key],change+' must preserve '+key);}
  await assert.rejects(fs.stat(path.join(f.root,'05_이전 작업','리뷰 과거','before-fresh-round')),{code:'ENOENT'},change);
  await assert.rejects(fs.stat(path.join(f.root,'review-delivery-in-progress.json')),{code:'ENOENT'},change);
 }
 console.log('Fresh activation: latest human bytes archived, external writer serialized, CAS race rejected, corrupt/missing/round-mismatched inputs rejected before mutation, blank new records and stale-save rejection PASS');
}finally{
 const resolved=path.resolve(base);assert(resolved.startsWith(path.resolve(os.tmpdir())+path.sep));assert(path.basename(resolved).startsWith('threads-fresh-activation-'));await fs.rm(resolved,{recursive:true,force:true});
}
