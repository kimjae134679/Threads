'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {writeAtomic}=require('./atomic-file.cjs');
const {withCanonicalWriter}=require('./review-canonical-writer.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function inside(root,relative){if(typeof relative!=='string'||path.isAbsolute(relative))throw Error('상대 자료 경로를 확인하세요.');const p=path.resolve(root,relative),r=path.relative(root,p);if(!r||r==='..'||r.startsWith('..'+path.sep)||path.isAbsolute(r))throw Error('자료 경로가 작업 폴더 밖입니다.');return p;}
async function noLinks(p){let current=path.resolve(p);while(path.dirname(current)!==current){try{if((await fs.lstat(current)).isSymbolicLink())throw Error('연결 폴더는 이동하지 않습니다.');}catch(e){if(e.code!=='ENOENT')throw e;}current=path.dirname(current);}}
async function bytes(p){try{return await fs.readFile(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function equalCurrent(p,expected){const current=await bytes(p);if((current?hash(current):null)!==expected)throw Error('자료나 평가가 변경됐습니다. 다시 확인한 뒤 적용하세요.');}
async function treeFiles(root){const result=[];async function visit(dir,rel=''){for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.isSymbolicLink())throw Error('연결 파일은 제작 묶음에 포함하지 않습니다.');const name=path.join(rel,e.name);if(e.isDirectory())await visit(path.join(dir,e.name),name);else result.push(name);}}await visit(root);return result;}
async function prepareReviewRelease(sourceRoot,stagingRoot,{reviewRound,expectedPosts}){
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(reviewRound)||!Number.isInteger(expectedPosts)||expectedPosts<1)throw Error('검토 회차와 전체 글 수를 지정하세요.');
 sourceRoot=path.resolve(sourceRoot);stagingRoot=path.resolve(stagingRoot);await noLinks(stagingRoot);if(await bytes(path.join(stagingRoot,'release-ready.json')))throw Error('이미 준비된 회차입니다.');
 const sourceOut=path.join(sourceRoot,'06_자동 제작 결과'),statusFile=path.join(sourceOut,'status.json'),raw=await fs.readFile(statusFile),report=JSON.parse(raw);
 const rows=report.entries?.filter(e=>e.outputFolder&&e.images?.length)||[],intake=report.intakeContract==='verified-intake-v1';
 if(rows.length!==expectedPosts||new Set(rows.map(r=>r.id)).size!==expectedPosts||report.entries.some(e=>e.status==='failed')||report.processed!==report.entries.length)throw Error('전체 제작 완료와 오류를 확인하세요.');
 if(rows.some(r=>r.status!=='generated'&&!(intake&&report.reproductionContract!=='universal-reproduction-v1'&&r.status==='already_done')))throw Error('전체를 새 제작한 결과만 전달할 수 있습니다.');
 if(report.reproductionContract==='universal-reproduction-v1'){
  const proofBytes=await bytes(path.join(sourceRoot,'reproduction-complete.json')),fatal=await bytes(path.join(sourceRoot,'reproduction-fatal.json'));
  if(!proofBytes||fatal||report.reviewRound!==reviewRound||report.deliveryStatus!=='complete'||report.wholeCollectionRegenerated!==true)throw Error('전체 재제작 완료 증거를 확인하세요.');
  const proof=JSON.parse(proofBytes);
  if(proof.reviewRound!==reviewRound||proof.generated!==rows.length||!Number.isInteger(proof.held)||proof.held<0||proof.planned!==proof.generated+proof.held||proof.sourceBytesUnchanged!==true)throw Error('전체 재제작 완료 증거를 확인하세요.');
 }
 if(intake){
  const proofBytes=await bytes(path.join(sourceRoot,'intake-complete.json')),fatal=await bytes(path.join(sourceRoot,'intake-fatal.json'));
  if(!proofBytes||fatal||report.reviewRound!==reviewRound||report.deliveryStatus!=='complete'||rows.some(r=>r.intakeAuditPassed!==true&&r.preservedCurrent!==true))throw Error('신규 자료 등록 완료 증거와 제작 검증을 확인하세요.');
  const proof=JSON.parse(proofBytes),ids=proof.registeredIds,outputIds=new Set(rows.map(r=>r.id));
  const exactIds=Array.isArray(ids)&&ids.length===rows.length&&new Set(ids).size===ids.length&&ids.every(id=>typeof id==='string'&&id.length>0&&outputIds.has(id));
  if(proof.reviewRound!==reviewRound||proof.completed!==true||proof.sourceBytesUnchanged!==true||!exactIds||proof.posts!==rows.length||proof.pages!==rows.reduce((sum,row)=>sum+row.images.length,0))throw Error('신규 자료 등록 완료 증거를 확인하세요.');
 }
 const output=path.join(stagingRoot,'06_자동 제작 결과');await fs.mkdir(output,{recursive:true});const changed=structuredClone(report),audited=[];let pages=0;
 for(const row of rows){
  const source=inside(sourceOut,row.outputFolder),destination=inside(output,row.outputFolder);await noLinks(source);
  const files=await treeFiles(source);const plan=JSON.parse(await fs.readFile(path.join(source,'production-plan.json')));if(plan.pages.length!==row.images.length||plan.ruleVersion!==row.ruleVersion)throw Error('장수/제작 규칙 불일치: '+row.id);
  for(const image of row.images){const file=inside(source,image.name),b=await fs.readFile(file);if(hash(b)!==image.sha256||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||b.readUInt32BE(16)!==1080)throw Error('이미지 무결성 오류: '+row.id);pages++;}
  await fs.mkdir(path.dirname(destination),{recursive:true});await fs.cp(source,destination,{recursive:true,errorOnExist:true,force:false});
  for(const file of files){const original=await fs.readFile(inside(source,file)),copied=await fs.readFile(inside(destination,file));if(hash(original)!==hash(copied))throw Error('전체 복사 검증 실패: '+row.id);}
  const target=changed.entries.find(e=>e.id===row.id);target.reviewRound=reviewRound;target.reviewStatus='needs_review';target.publicationAllowed=false;audited.push({id:row.id,pages:row.images.length,ruleVersion:row.ruleVersion});
 }
 await equalCurrent(statusFile,hash(raw));
 changed.reviewRound=reviewRound;changed.preparedAt=new Date().toISOString();changed.deliveryStatus='complete';
 await writeAtomic(path.join(output,'status.json'),JSON.stringify(changed,null,2)+'\n');
 const ratings=path.join(stagingRoot,'07_사용자 평가');await fs.mkdir(ratings,{recursive:true});await writeAtomic(path.join(ratings,'평가 기록.json'),JSON.stringify({schemaVersion:1,recordType:'user_post_quality_feedback',reviewRound,evaluations:[]},null,2)+'\n');
 await writeAtomic(path.join(ratings,'검토 진행.json'),JSON.stringify({schemaVersion:1,recordType:'user_review_workflow',reviewRound,entries:[]},null,2)+'\n');
 const ready={schemaVersion:1,reviewRound,posts:rows.length,pages,sourceStatusSha256:hash(raw),preparedAt:changed.preparedAt,wholeCollectionRegenerated:!intake,newScores:0,newMemos:0,audited};
 await writeAtomic(path.join(stagingRoot,'release-ready.json'),JSON.stringify(ready,null,2)+'\n');return ready;
}
async function activateReviewReleaseUnlocked(materialRoot,stagingRoot,{expectedStatusSha256,expectedFeedbackSha256,expectedWorkflowSha256,expectedPointerSha256}){
 const root=path.resolve(materialRoot),stage=path.resolve(stagingRoot),ready=JSON.parse(await fs.readFile(path.join(stage,'release-ready.json'))),output=path.join(root,'06_자동 제작 결과'),feedback=path.join(root,'07_사용자 평가'),status=path.join(output,'status.json'),ratings=path.join(feedback,'평가 기록.json'),workflow=path.join(feedback,'검토 진행.json'),pointer=path.join(root,'review-current.json');
 await noLinks(root);await noLinks(stage);const marker=await bytes(pointer),oldPointerSha256=marker?hash(marker):null;if(marker&&JSON.parse(marker).reviewRound===ready.reviewRound)return {alreadyActive:true,...ready};
 if(expectedPointerSha256!==undefined&&oldPointerSha256!==expectedPointerSha256)throw Error('검토 회차가 변경됐습니다. 다시 확인한 뒤 적용하세요.');
 await equalCurrent(status,expectedStatusSha256);await equalCurrent(ratings,expectedFeedbackSha256);
 const workflowBytes=await bytes(workflow),oldWorkflowSha256=workflowBytes?hash(workflowBytes):null;
 if(expectedWorkflowSha256!==undefined&&oldWorkflowSha256!==expectedWorkflowSha256)throw Error('검토 진행이 변경됐습니다. 다시 확인한 뒤 적용하세요.');
 const archive=inside(root,'05_이전 작업/리뷰 과거/before-'+ready.reviewRound);await noLinks(archive);try{await fs.stat(archive);throw Error('과거 보관 경로가 이미 있습니다.');}catch(e){if(e.code!=='ENOENT')throw e;}
 await fs.mkdir(archive,{recursive:true});await writeAtomic(path.join(archive,'archive-before.json'),JSON.stringify({archivedAt:new Date().toISOString(),replacedBy:ready.reviewRound,oldStatusSha256:expectedStatusSha256,oldFeedbackSha256:expectedFeedbackSha256,oldWorkflowSha256,oldPointerSha256},null,2)+'\n');
 const journal=path.join(root,'review-delivery-in-progress.json');await writeAtomic(journal,JSON.stringify({reviewRound:ready.reviewRound,archive,stagingRoot:stage},null,2)+'\n');
 const moved=[];let installedOutput=false,installedFeedback=false,pointerWritten=false;
 try{
  for(const name of ['06_자동 제작 결과','07_사용자 평가','08_재검토_20261007','09_개별 보완_20261007']){
   const from=inside(root,name),to=inside(archive,name);await noLinks(from);await noLinks(to);
   try{await fs.lstat(from);}catch(e){if(e.code==='ENOENT')continue;throw e;}await fs.rename(from,to);moved.push(name);
  }
  await fs.rename(path.join(stage,'06_자동 제작 결과'),output);installedOutput=true;await fs.rename(path.join(stage,'07_사용자 평가'),feedback);installedFeedback=true;
  if(marker)await writeAtomic(path.join(archive,'review-current.json'),marker);
  await writeAtomic(pointer,JSON.stringify({...ready,archiveRelative:path.relative(root,archive),active:true},null,2)+'\n');pointerWritten=true;
  await equalCurrent(path.join(archive,'06_자동 제작 결과/status.json'),expectedStatusSha256);
  await equalCurrent(path.join(archive,'07_사용자 평가/평가 기록.json'),expectedFeedbackSha256);
  await equalCurrent(path.join(archive,'07_사용자 평가/검토 진행.json'),oldWorkflowSha256);
  await equalCurrent(path.join(archive,'review-current.json'),oldPointerSha256);
  await writeAtomic(journal,JSON.stringify({reviewRound:ready.reviewRound,complete:true,archive},null,2)+'\n');
  return {reviewRound:ready.reviewRound,posts:ready.posts,pages:ready.pages,archive,moved,activeFeedbackCount:0,oldBytesPreserved:true};
 }catch(error){
  try{if(installedFeedback)await fs.rename(feedback,path.join(stage,'07_사용자 평가'));if(installedOutput)await fs.rename(output,path.join(stage,'06_자동 제작 결과'));for(const name of [...moved].reverse())await fs.rename(inside(archive,name),inside(root,name));if(pointerWritten){if(marker)await writeAtomic(pointer,marker.toString('utf8'));else await fs.rm(pointer,{force:true});}await writeAtomic(journal,JSON.stringify({reviewRound:ready.reviewRound,complete:true,rolledBack:true,archive,error:error.message},null,2)+'\n');}catch(rollbackError){await writeAtomic(journal,JSON.stringify({reviewRound:ready.reviewRound,complete:false,archive,moved,error:error.message,rollbackError:rollbackError.message},null,2)+'\n');}throw error;}
}
async function activateReviewRelease(materialRoot,stagingRoot,options){
 return withCanonicalWriter(materialRoot,()=>activateReviewReleaseWithDeliveryLock(materialRoot,stagingRoot,options),{serializeReentry:true});
}
async function activateReviewReleaseWithDeliveryLock(materialRoot,stagingRoot,options){
 const root=path.resolve(materialRoot);await noLinks(root);await fs.mkdir(root,{recursive:true});
 const alive=pid=>{if(!Number.isInteger(pid)||pid<1)return false;try{process.kill(pid,0);return true;}catch(e){return e.code==='EPERM';}};
 for(const relative of ['06_자동 제작 결과/batch.lock','intake.lock']){const b=await bytes(path.join(root,relative));if(b){let lock;try{lock=JSON.parse(b);}catch{throw Error('실행 중 잠금 형식을 확인하세요: '+relative);}if(alive(lock.pid)&&(relative!=='intake.lock'||lock.pid!==process.pid))throw Error('제작 작업이 실행 중입니다: '+relative);}}
 const lockFile=path.join(root,'review-delivery.lock');await noLinks(lockFile);let handle;
 try{handle=await fs.open(lockFile,'wx');}catch(e){if(e.code!=='EEXIST')throw e;let lock;try{lock=JSON.parse(await fs.readFile(lockFile));}catch{throw Error('리뷰 교체가 실행 중입니다. 잠금을 확인하세요.');}if(alive(lock.pid))throw Error('리뷰 교체가 실행 중입니다.');await fs.rename(lockFile,lockFile+'.stale-'+Date.now());handle=await fs.open(lockFile,'wx');}
 try{await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));return await activateReviewReleaseUnlocked(materialRoot,stagingRoot,options);}finally{await handle.close();await fs.rm(lockFile,{force:true});}
}
module.exports={prepareReviewRelease,activateReviewRelease};
