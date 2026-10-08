'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const {inspectRecord,canonicalUrl,sha256}=require('./intake-policy.cjs');
const {discoverCandidates,runFolderBatch,inside}=require('./folder-batch.cjs');
const {writeAtomic}=require('./atomic-file.cjs');
const {prepareReviewRelease,activateReviewRelease}=require('./review-release.cjs');
const {writeCatalog}=require('./batch-catalog.cjs');
const {pngSize,isInfrastructureFailure}=require('./universal-reproduction.cjs');
async function json(p){return JSON.parse(await fs.readFile(p,'utf8'));}
async function bytes(p){try{return await fs.readFile(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function write(p,v){await fs.mkdir(path.dirname(p),{recursive:true});await writeAtomic(p,JSON.stringify(v,null,2)+'\n');}
async function noLinks(p){for(let q=path.resolve(p);path.dirname(q)!==q;q=path.dirname(q)){try{if((await fs.lstat(q)).isSymbolicLink())throw Error('연결 경로는 입력·작업에 사용하지 않습니다.');}catch(e){if(e.code!=='ENOENT')throw e;}}}
async function bounded(p,max){await noLinks(p);const s=await fs.lstat(p);if(!s.isFile()||s.size>max)throw Error('원문 파일 형식 또는 용량 오류');return fs.readFile(p);}
async function assertUnlocked(p){const raw=await bytes(p);if(!raw)return;const v=JSON.parse(raw);try{process.kill(v.pid,0);throw Error('같은 경로에서 자동 작업이 실행 중입니다.');}catch(e){if(e.code!=='ESRCH')throw e;}await fs.rm(p);}
async function validateOutput(out,row,originalRecord){
 const folder=path.resolve(out,row.outputFolder);if(!inside(out,folder)||folder===out)throw Error('결과 경로 오류');await noLinks(folder);
 for(const [name,hash] of [['source-bundle.zip',row.sourceZipSha256],['review-preview.zip',row.outputSha256],...row.images.map(i=>[i.name,i.sha256])]){const p=path.resolve(folder,name);if(!inside(folder,p)||p===folder||sha256(await bounded(p,150*1024*1024))!==hash)throw Error('완료 결과 해시 오류: '+row.id);}
 const plan=await json(path.join(folder,'production-plan.json'));if(plan.pages.length!==row.images.length||plan.ruleVersion!==row.ruleVersion)throw Error('완료 결과 장수·규칙 오류');
 if(originalRecord){const sourceModule={exports:{}};require('node:vm').runInNewContext(require('node:fs').readFileSync(path.join(__dirname,'../app/source-curation.js'),'utf8'),{module:sourceModule});require('./batch-render.cjs').assertExactIntake(sourceModule.exports.exactDraft(originalRecord),plan);}
 for(const image of row.images)pngSize(await fs.readFile(path.join(folder,image.name)));
 return folder;
}
async function recipeHash(){const r=path.resolve(__dirname,'..'),html=await fs.readFile(path.join(r,'app/source-batch.html'),'utf8'),files=['app/source-batch.html',...[...html.matchAll(/<script[^>]*src="([^"]+.js)"/g)].map(m=>'app/'+m[1]),...['intake-pipeline-run.cjs','batch-render.cjs','batch-input.cjs','folder-batch.cjs','universal-cover.cjs','universal-cover-canvas.cjs','intake-policy.cjs','intake-pipeline.cjs'].map(f=>'desktop/'+f),...(await fs.readdir(path.join(r,'app/fonts'))).filter(f=>/\.(woff2?|ttf|otf|txt)$/i.test(f)).map(f=>'app/fonts/'+f)];return sha256(Buffer.concat(await Promise.all(files.sort().map(f=>fs.readFile(path.join(r,f))))));}
async function runIntakePipeline({input,work,materialRoot,render,activate=false,allowTestFixtures=false,retryHeld=false,stopAfter=0,onProgress=()=>{}}){
 if(![input,work,materialRoot].every(p=>p&&path.isAbsolute(p)))throw Error('입력·작업·리뷰 자료의 절대 경로를 지정하세요.');
 input=path.resolve(input);work=path.resolve(work);materialRoot=path.resolve(materialRoot);
 if(inside(input,work)||inside(input,materialRoot)||inside(work,input)||input===materialRoot||work===materialRoot)throw Error('입력 원본과 작업/리뷰 폴더를 분리하세요.');
 if(allowTestFixtures&&(!inside(work,materialRoot)||materialRoot===work))throw Error('TEST_ONLY 회차는 작업 폴더 안의 격리 리뷰 자료만 허용합니다.');
 for(const p of [input,work,materialRoot])await noLinks(p);await fs.mkdir(work,{recursive:true});
 const lock=path.join(work,'intake.lock');await assertUnlocked(lock);const handle=await fs.open(lock,'wx');await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
 let materialHandle;const materialLock=path.join(materialRoot,'intake.lock');
 const checkpoint=path.join(work,'checkpoint.json'),fatal=path.join(work,'intake-fatal.json');
 try{
  await fs.mkdir(materialRoot,{recursive:true});await assertUnlocked(materialLock);materialHandle=await fs.open(materialLock,'wx');await materialHandle.writeFile(JSON.stringify({pid:process.pid,work,startedAt:new Date().toISOString()}));
  await assertUnlocked(path.join(materialRoot,'06_자동 제작 결과/batch.lock'));
  const pending=await bytes(path.join(materialRoot,'review-delivery-in-progress.json'));if(pending&&JSON.parse(pending).complete!==true)throw Error('기존 리뷰 전환 복구가 먼저 필요합니다.');
  const oldStatus=await bytes(path.join(materialRoot,'06_자동 제작 결과/status.json')),old=oldStatus?JSON.parse(oldStatus):{entries:[]};
  const oldFlowBytes=await bytes(path.join(materialRoot,'07_사용자 평가/검토 진행.json')),oldFlow=oldFlowBytes?JSON.parse(oldFlowBytes):{entries:[]};
  const snapshot={expectedStatusSha256:oldStatus?sha256(oldStatus):null};
  for(const [field,name] of [['expectedFeedbackSha256','07_사용자 평가/평가 기록.json'],['expectedWorkflowSha256','07_사용자 평가/검토 진행.json'],['expectedPointerSha256','review-current.json']]){const b=await bytes(path.join(materialRoot,name));snapshot[field]=b?sha256(b):null;}
  const priorCheckpointBytes=await bytes(checkpoint),priorCheckpoint=priorCheckpointBytes?JSON.parse(priorCheckpointBytes):{entries:[]};
  const recipe=await recipeHash(),records=[],sourceFiles=[],ids=new Map(),urls=new Map(),contents=new Map();
  const currentOutputs=old.entries.filter(e=>e.outputFolder&&e.images?.length&&!e.duplicateOf&&!['duplicate','research'].includes(e.disposition)),activeByUrl=new Map();
  for(const entry of currentOutputs)if(entry.sourceUrl){try{const url=canonicalUrl(entry.sourceUrl);if(url&&!activeByUrl.has(url))activeByUrl.set(url,entry);}catch{}}
  for(const candidate of await discoverCandidates(input)){
   const sourceFile=path.join(candidate.folder,'source.json');let raw,record,policy,media=[];
   try{raw=await bounded(sourceFile,5*1024*1024);record=JSON.parse(raw.toString('utf8').replace(/^\ufeff/,''));policy=inspectRecord(record,{allowTestFixtures});}
   catch(e){if(e.code!=='ENOENT'&&isInfrastructureFailure(e))throw e;policy={disposition:'held',reasonCode:'source_insufficient',reason:e.code==='ENOENT'?'정확한 source.json과 intake 정보가 필요합니다.':e.message};}
   const legacyId=candidate.id||'',legacy=old.entries.find(r=>r.id===legacyId);
   if(record&&!record.intake&&legacy){continue;}
   let id=policy.id||'input-'+sha256(candidate.relativePath).slice(0,16),active=policy.canonicalUrl?activeByUrl.get(policy.canonicalUrl):null;
   if(active&&policy.disposition==='ready')id=active.id;
   const row={id,providedId:policy.id||null,title:record?.title||candidate.title||path.basename(candidate.folder),sourceUrl:record?.sourceUrl||candidate.sourceUrl||'',relativePath:candidate.relativePath,originalInputFolder:input,sourceReferenceFile:'source.json',disposition:policy.disposition,reasonCode:policy.reasonCode,reason:policy.reason,publicationAllowed:false};
   if(raw)sourceFiles.push({file:sourceFile,sha256:sha256(raw)});
   if(policy.disposition==='ready')try{
    let total=0;for(const m of record.intake.media){const file=path.join(candidate.folder,'media',m.name),data=await bounded(file,25*1024*1024);total+=data.length;if(total>60*1024*1024||media.length>=30||sha256(data)!==m.sha256)throw Error('원문 이미지 용량 또는 SHA256 오류');media.push({...m,data});sourceFiles.push({file,sha256:sha256(data)});}
    row.sourceContentHash=sha256(JSON.stringify({title:record.title,body:record.body,comments:record.comments,media:media.map(m=>({name:m.name,sha256:m.sha256}))}));row.canonicalSourceUrl=policy.canonicalUrl;
    const sameUrl=policy.canonicalUrl&&urls.get(policy.canonicalUrl),sameContent=contents.get(row.sourceContentHash);
    if(sameUrl&&sameUrl.sourceContentHash!==row.sourceContentHash){sameUrl.disposition='held';sameUrl.reasonCode='source_conflict';sameUrl.reason='같은 URL의 서로 다른 원문 버전이 한 입력에 있습니다.';row.disposition='held';row.reasonCode='source_conflict';row.reason=sameUrl.reason;}
    else if(sameUrl||sameContent){row.disposition='duplicate';row.id=policy.id&&policy.id!==id?policy.id:'duplicate-'+sha256(candidate.relativePath).slice(0,16);row.reasonCode='duplicate_source';row.duplicateOf=(sameUrl||sameContent).id;row.reason='URL 또는 원문·댓글·이미지 내용 해시가 같은 입력';}
    else {const duplicateCurrent=currentOutputs.find(e=>e.sourceContentHash===row.sourceContentHash&&e.id!==id);if(duplicateCurrent){row.disposition='duplicate';row.reasonCode='duplicate_source';row.duplicateOf=duplicateCurrent.id;row.reason='이미 등록된 원문 내용과 같음';}}
    if(row.disposition==='ready'){if(policy.canonicalUrl&&!urls.has(policy.canonicalUrl))urls.set(policy.canonicalUrl,row);if(!contents.has(row.sourceContentHash))contents.set(row.sourceContentHash,row);}
    row.fingerprint=sha256(Buffer.concat([raw,Buffer.from(recipe),...media.map(m=>m.data)]));row.versionId=id+'-'+row.fingerprint.slice(0,16);row.record=record;row.raw=raw;row.media=media;
   }catch(e){if(e.code!=='ENOENT'&&isInfrastructureFailure(e))throw e;row.disposition='held';row.reasonCode='source_insufficient';row.reason=e.message;}
   if(row.disposition==='research')await write(path.join(work,'research',row.id+'.json'),{id:row.id,title:row.title,sourceUrl:row.sourceUrl,summary:record?.intake?.referenceSummary||null,summaryOrigin:record?.intake?.referenceSummary?'provided_input':'none',reason:row.reason,publicationAllowed:false});
   if(ids.has(row.id)){const previous=ids.get(row.id);if(previous.sourceContentHash&&previous.sourceContentHash===row.sourceContentHash){row.id='duplicate-'+sha256(candidate.relativePath).slice(0,16);row.disposition='duplicate';row.duplicateOf=previous.id;row.reasonCode='duplicate_source';}else{previous.disposition='held';previous.reasonCode='source_conflict';previous.reason='같은 글ID의 서로 다른 입력 버전';row.id='conflict-'+sha256(candidate.relativePath).slice(0,16);row.disposition='held';row.reasonCode='source_conflict';row.reason=previous.reason;}}ids.set(row.id,row);
   records.push(row);
  }
  if(!retryHeld)for(const row of records){const previous=priorCheckpoint.entries.find(p=>(p.originalPostId||p.id)===row.id&&p.fingerprint===row.fingerprint&&p.fingerprint&&p.reasonCode==='production_error'&&p.disposition==='held');if(previous&&row.disposition==='ready'){row.disposition='held';row.reasonCode='production_error';row.reason=previous.reason;row.cachedFailure=true;}}
  const prepared=path.join(work,'prepared-input'),index={schema:'threads-program-input-index-v1',records:[]};await fs.mkdir(prepared,{recursive:true});
  for(const row of records.filter(r=>r.disposition==='ready')){
   const folder=path.join(prepared,row.versionId);await fs.mkdir(path.join(folder,'media'),{recursive:true});
   const p=path.join(folder,'source.json'),prior=await bytes(p);if(prior&&sha256(prior)!==sha256(row.raw))throw Error('불변 입력 체크포인트 변경');if(!prior)await fs.writeFile(p,row.raw);
   for(const m of row.media){const p=path.join(folder,'media',m.name),prior=await bytes(p);if(prior&&sha256(prior)!==m.sha256)throw Error('불변 이미지 체크포인트 변경');if(!prior)await fs.writeFile(p,m.data);}
   index.records.push({id:row.versionId,folder:row.versionId,title:row.title,sourceUrl:row.sourceUrl});
  }
  await write(path.join(prepared,'index.json'),index);
  const cache=path.join(work,'cache/06_자동 제작 결과');let done=0,fatalRender=null,batch={entries:[],cancelled:false};
  if(index.records.length)batch=await runFolderBatch({folder:prepared,output:cache,preserveReplacedOutputs:true,render:async(job,context)=>{let result;try{result=await render(job,context);}catch(e){if(e.infrastructureFatal||isInfrastructureFailure(e)){fatalRender=e;e.infrastructureFatal=true;}throw e;}if(result.intakeAudit?.rawBodyAndCommentsExact!==true)throw Error('원문 전체 무결성 증명이 없습니다.');return result;},cancelled:()=>stopAfter>0&&done>=stopAfter,onProgress:p=>{if(p.phase==='processing')done=p.done;onProgress(p);}});
  if(fatalRender)throw fatalRender;
  const rows=records.map(r=>{
   const {record,raw,media,...entry}=r,b=batch.entries.find(b=>b.id===r.versionId);
   if(r.disposition==='ready'&&b){if(b.outputFolder&&['generated','already_done'].includes(b.status)){Object.assign(entry,b,{id:r.id,relativePath:r.relativePath,originalInputFolder:input,sourceReferenceFile:'source.json',sourceContentHash:r.sourceContentHash,canonicalSourceUrl:r.canonicalSourceUrl,intakeAuditPassed:true,disposition:'review',publicationAllowed:false});}else{entry.disposition='held';entry.reasonCode='production_error';entry.reason=b.reason;entry.status='needs_selection';}}
   else entry.status=r.disposition==='research'?'needs_rights':r.disposition==='duplicate'?'duplicate':'needs_source';
   return entry;
  });
  for(const r of rows)if(r.outputFolder){const original=old.entries.find(e=>e.id===r.id&&(e.outputSha256===r.outputSha256||e.sourceContentHash&&e.sourceContentHash===r.sourceContentHash));const decision=original&&(oldFlow.entries||[]).find(d=>d.id===original.id&&d.outputVersion===require('./post-review-store.cjs').version(original)&&['held','rejected'].includes(d.disposition));if(decision)Object.assign(r,{disposition:decision.disposition,reasonCode:decision.reasonCode,reason:decision.note||r.reason,priorTriage:{reviewRound:old.reviewRound,outputVersion:decision.outputVersion,updatedAt:decision.updatedAt}});}
  for(const r of rows)if(!r.outputFolder&&old.entries.some(e=>e.id===r.id&&e.outputFolder)){r.originalPostId=r.id;r.intakeAttempt=true;r.id='attempt-'+sha256(r.id+'|'+(r.fingerprint||r.reasonCode)+'|'+r.relativePath).slice(0,24);}
  const cleanRows=old.entries.filter(e=>!rows.some(r=>r.id===e.id&&(r.outputFolder||!e.outputFolder))&&!(e.intakeAttempt&&records.some(r=>r.id===e.originalPostId))).map(e=>{const row={...e,preservedCurrent:!!e.outputFolder,originalInputFolder:e.originalInputFolder||old.inputFolder},decision=(oldFlow.entries||[]).find(d=>d.id===e.id&&d.outputVersion===require('./post-review-store.cjs').version(e)&&['held','rejected'].includes(d.disposition));if(decision)Object.assign(row,{disposition:decision.disposition,reasonCode:decision.reasonCode,reason:decision.note||e.reason,priorTriage:{reviewRound:old.reviewRound,outputVersion:decision.outputVersion,updatedAt:decision.updatedAt}});return row;});
  const combined=[...cleanRows,...rows],complete=!batch.cancelled;
  await write(checkpoint,{complete,entries:rows,counts:rows.reduce((a,r)=>(a[r.disposition]=(a[r.disposition]||0)+1,a),{}),processed:batch.processed||0,total:index.records.length,recipe,sourceFiles,publicationAllowed:false});
  const success=combined.filter(r=>r.outputFolder&&r.images?.length);
  const summary={complete,registered:false,posts:success.length,newOrChanged:rows.filter(r=>r.status==='generated').length,cached:rows.filter(r=>r.status==='already_done').length,counts:rows.reduce((a,r)=>(a[r.disposition]=(a[r.disposition]||0)+1,a),{}),materialRoot,checkpoint};
  const completedChanges=rows.filter(r=>r.outputFolder&&!old.entries.some(o=>o.id===r.id&&o.sourceFingerprint===r.sourceFingerprint&&o.outputSha256===r.outputSha256)).length;summary.completedChanges=completedChanges;summary.unchangedCurrent=completedChanges===0;summary.cachedHeld=rows.filter(r=>r.cachedFailure).length;
  if(!complete||!success.length||!completedChanges){await write(path.join(work,'last-result.json'),summary);return summary;}
  const round='intake-'+sha256(JSON.stringify(combined.map(r=>[r.id,r.sourceFingerprint||null,r.outputSha256||null,r.disposition||null,r.reasonCode||null]).sort())).slice(0,20),pointer=await bytes(path.join(materialRoot,'review-current.json'));
  if(pointer&&JSON.parse(pointer).reviewRound===round){await write(path.join(work,'last-result.json'),{...summary,registered:true,alreadyActive:true,reviewRound:round});return {...summary,registered:true,alreadyActive:true,reviewRound:round};}
  const roundRoot=path.join(work,'rounds',round),sourceRoot=path.join(roundRoot,'source'),out=path.join(sourceRoot,'06_자동 제작 결과');await fs.mkdir(out,{recursive:true});
  let pages=0;for(const row of success){const origin=row.preservedCurrent?path.join(materialRoot,'06_자동 제작 결과'):cache,folder=await validateOutput(origin,row,row.preservedCurrent?null:records.find(r=>r.id===row.id)?.record),target=path.join(out,row.outputFolder);await noLinks(target);if(!await bytes(path.join(target,'review-preview.zip')))await fs.cp(folder,target,{recursive:true,errorOnExist:true,force:false});await validateOutput(out,row,row.preservedCurrent?null:records.find(r=>r.id===row.id)?.record);pages+=row.images.length;}
  if(await recipeHash()!==recipe)throw Error('작업 중 제작 규칙이 변경되었습니다.');
  for(const f of sourceFiles)if(sha256(await bounded(f.file,60*1024*1024))!==f.sha256)throw Error('작업 중 원문이 변경되었습니다.');
  const report={schema:'threads-auto-batch-v1',intakeContract:'verified-intake-v1',reviewRound:round,inputFolder:old.inputFolder||input,entries:combined.map(r=>({...r,reviewRound:round,publicationAllowed:false})),processed:combined.length,total:combined.length,deliveryStatus:'complete',wholeCollectionRegenerated:false,lastRunAt:new Date().toISOString()};
  await write(path.join(out,'status.json'),report);await writeCatalog(out,report);await write(path.join(sourceRoot,'intake-complete.json'),{reviewRound:round,completed:true,registeredIds:success.map(r=>r.id),sourceBytesUnchanged:true,posts:success.length,pages});
  const stage=path.join(roundRoot,'ready'),ready=await bytes(path.join(stage,'release-ready.json'));
  if(!ready){try{await fs.access(stage);await fs.rename(stage,stage+'-incomplete-'+Date.now());}catch(e){if(e.code!=='ENOENT')throw e;}await prepareReviewRelease(sourceRoot,stage,{reviewRound:round,expectedPosts:success.length});}
  if(activate){const applied=await activateReviewRelease(materialRoot,stage,snapshot);await writeCatalog(path.join(materialRoot,'06_자동 제작 결과'),await json(path.join(materialRoot,'06_자동 제작 결과/status.json')));Object.assign(summary,{registered:true,applied});}
  Object.assign(summary,{reviewRound:round,pages,reviewSource:sourceRoot,readyRoot:stage});await write(path.join(work,'last-result.json'),summary);return summary;
 }catch(error){await write(fatal,{at:new Date().toISOString(),message:error.message,complete:false,publicationAllowed:false});throw error;}
 finally{if(materialHandle){await materialHandle.close();await fs.rm(materialLock,{force:true});}await handle.close();await fs.rm(lock,{force:true});}
}
module.exports={runIntakePipeline,validateOutput};
