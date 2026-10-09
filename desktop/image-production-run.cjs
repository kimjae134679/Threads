'use strict';
// Single article, offline rendering. Never registers or activates a review release.
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
const {loadBatchInput}=require('./batch-input.cjs'),{renderBatchInput,mergeReflowedBody,loadEndingCard,appendEndingCard}=require('./batch-render.cjs'),{fingerprintFor}=require('./folder-batch.cjs');
const {pngSize}=require('./universal-reproduction.cjs'),{writeAtomic}=require('./atomic-file.cjs');
const {createZipTools}=require('./reflow-review-covers-run.cjs');
const {readReviewProgress}=require('./image-work-state.cjs');
const {editorRoot}=require('./editor-assets.cjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),inside=(a,b)=>b===a||b.startsWith(a+path.sep);
async function assertUnread(request){
 if(request.representativeOnly===true)return;
 if(!path.isAbsolute(request.reviewProgress||''))throw Error('최신 검토 진행 파일 절대 경로 필요');
 const progress=await readReviewProgress(request.reviewProgress);
 const entries=progress.entries.filter(e=>e.id===request.postId);
 if(entries.some(e=>e.seenAt))throw Error('already_seen: 최신 열람 기록에서 제외');
 if(entries.some(e=>e.disposition&&!['eligible','restored'].includes(e.disposition)))throw Error('user_hold: 최신 보류 기록에서 제외');
}
app.disableHardwareAcceleration();app.commandLine.appendSwitch('force-device-scale-factor','1');app.on('window-all-closed',()=>{});
(async()=>{
 const requestFile=process.argv.find(a=>a.startsWith('--image-production-request='))?.slice('--image-production-request='.length)||process.argv[2];
 if(!path.isAbsolute(requestFile||''))throw Error('단건 요청 JSON 절대 경로 필요');
 const request=JSON.parse(await fs.readFile(requestFile,'utf8'));
 if(request.schema!=='threads-image-production-request-v1'||!['input','output','work'].every(k=>path.isAbsolute(request[k]||''))||!/^[\w-]+$/.test(request.postId||''))throw Error('단건 요청 형식·절대 경로·글 ID 확인 필요');
 const input=path.resolve(request.input),output=path.resolve(request.output),work=path.resolve(request.work);
 if(inside(input,output)||inside(output,input)||inside(input,work))throw Error('원본과 별도 결과·작업 폴더 필요');
 await fs.mkdir(path.join(work,'locks'),{recursive:true});await fs.mkdir(path.join(work,'checkpoints'),{recursive:true});
 const checkpoint=path.join(work,'checkpoints',request.postId+'.json'),lockFile=path.join(work,'locks','image-production.lock');let lock,win;
 try{lock=await fs.open(lockFile,'wx');}catch(e){if(e.code==='EEXIST'){console.log(JSON.stringify({state:'skipped_running',postId:request.postId,lockFile}));return;}throw e;}
 await lock.writeFile(JSON.stringify({postId:request.postId,pid:process.pid,startedAt:new Date().toISOString()}));
 try{
  await assertUnread(request);
  const job=await loadBatchInput(input,{id:request.postId,sourceUrl:request.sourceUrl,title:request.title,representativeOnly:request.representativeOnly===true,coverOnly:true});if(!job)throw Error('원본 입력 없음');
  if(job.coverAsset&&!job.imageComposition)throw Error('표지 보완 자산을 selectedCoverAsset 계약으로 확인한 후 재시도하세요.');
  if(!request.representativeOnly&&(!job.imageHandoff||job.imageHandoff.held?.length))throw Error('검토 완료된 표지 선택 계약 필요');
  if(job.imageHandoff?.excludeFromRediscovery&&!request.representativeOnly)throw Error('already_seen: 새 공급 제외');
  if(!path.isAbsolute(request.existingOutput||''))throw Error('기존 본문 보존용 existingOutput 절대 경로 필요');
  const existing=path.resolve(request.existingOutput);if(inside(output,existing)||inside(existing,output))throw Error('기존 결과와 별도 표지 결과 폴더 필요');
  const priorPlan=JSON.parse(await fs.readFile(path.join(existing,'production-plan.json'),'utf8')),priorSource=await fs.readFile(path.join(existing,'source-bundle.zip'));
  const zipTools=await createZipTools(),sourceArchive=await zipTools.read(priorSource),sourcePlan=JSON.parse(Buffer.from(sourceArchive.get('bundle.json')).toString('utf8'));
  const bodyImages=[];for(const name of (await fs.readdir(path.join(existing,'rendered'))).filter(n=>/^slide-\d{3}\.png$/.test(n)).sort().slice(1)){const data=await fs.readFile(path.join(existing,'rendered',name));bodyImages.push({name:'rendered/'+name,data,sha256:sha(data)});}
  if(bodyImages.length!==priorPlan.pages.length-1)throw Error('기존 본문 장수와 제작 계획 불일치');
  const portrait=request.layoutMode!=='cover_only_legacy';
  if(request.layoutMode&&!['portrait','cover_only_legacy'].includes(request.layoutMode))throw Error('지원하지 않는 제작 레이아웃');
  const endingAsset=await loadEndingCard(request.endingCard);
  const fingerprint=sha(fingerprintFor(job)+(portrait?'|portrait-reflow-v1|':'|preserve-body-v1|')+sha(priorSource)+'|'+JSON.stringify(bodyImages.map(i=>({name:i.name,sha256:i.sha256})))+'|'+JSON.stringify(priorPlan.pages.slice(1))+(endingAsset?'|ending-card-v1|'+endingAsset.sha256:'')),target=path.join(output,request.postId,fingerprint);let old=null;
  try{old=JSON.parse(await fs.readFile(checkpoint,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(old?.state==='complete'&&old.fingerprint===fingerprint){
   const all=[{file:'review-preview.zip',sha256:old.outputSha256},{file:'source-bundle.zip',sha256:old.sourceZipSha256},{file:'production-plan.json',sha256:old.planSha256},...old.images];
   let intact=true;for(const row of all)if(await fs.readFile(path.join(target,row.file)).then(b=>sha(b)===row.sha256).catch(()=>false)===false)intact=false;
   if(intact){console.log(JSON.stringify({state:'already_done',postId:request.postId,fingerprint,target}));return;}
  }
  await writeAtomic(checkpoint,JSON.stringify({state:'running',postId:request.postId,fingerprint,startedAt:new Date().toISOString(),representativeOnly:!!request.representativeOnly}));
  app.setPath('userData',path.join(work,'renderer-profile'));await app.whenReady();session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>cb({cancel:true}));
  win=new BrowserWindow({show:false,width:1200,height:900,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
  await win.loadFile(path.join(editorRoot(),'source-batch.html'));
  await assertUnread(request);
  let result=await renderBatchInput(job,{getWindow:async()=>win,universalCover:true,preserveBodyPlan:priorPlan});
  if(result.sourcePlan.input.sha256!==sourcePlan.input.sha256)throw Error('기존 본문과 새 입력 원본 hash 불일치; 표지 교체 보류');
  if(JSON.stringify(result.productionPlan.pages.slice(1))!==JSON.stringify(priorPlan.pages.slice(1)))throw Error('기존 본문 제작 계획 변경; 표지 교체 보류');
  if(portrait){
   const reflow=await require('./cover-reproduction-run.cjs').reflowSourceBundle(win,priorSource,priorPlan);
   result=mergeReflowedBody(result,reflow);
   result.productionPlan.layoutReviewContinuity={scope:'layout_only',sourceBundleSha256:sha(priorSource),oldPlanSha256:sha(Buffer.from(JSON.stringify(priorPlan))),oldOutputSha256:sha(await fs.readFile(path.join(existing,'review-preview.zip'))),contentOrderVerified:true,evaluationCarryForwardAllowed:true,approvalEvidence:'Sentinel_482ab1ebb4ac8191ba15812debde8188',reviewOwnerMustLinkVersions:true};
  }else result.images=[result.images[0],...bodyImages];
  for(const image of result.images){const size=pngSize(image.data);if(size.width!==1080||size.height!==1440)throw Error('혼합 비율 출력 보류: layoutMode portrait로 전체 장을 재배치하세요.');}
  result.productionPlan.bodyPreservation={mode:portrait?'layout_only_reflow':'copy_existing_png',sourceOutput:existing,sourceBundleSha256:sha(priorSource),originalImages:bodyImages.map(i=>({name:i.name,sha256:i.sha256}))};
  result=await appendEndingCard(result,request.endingCard);
  const manifest={schema:'threads-curated-preview-v1',sourceSha256:sha(result.sourceZip),originalTitle:result.productionPlan.originalTitle,productionPlan:result.productionPlan,renderedPages:result.images.length,previewOnly:true,publicationAllowed:false,representativeOnly:!!request.representativeOnly};
  result.zip=await zipTools.zip([...result.images,{name:'manifest.json',data:Buffer.from(JSON.stringify(manifest,null,2)+'\n')},{name:'source-bundle.zip',data:result.sourceZip}]);
  await fs.mkdir(path.join(target,'rendered'),{recursive:true});const images=[];
  for(const image of result.images){const size=pngSize(image.data);if(size.width!==1080)throw Error('1080px 출력 검증 실패');await fs.writeFile(path.join(target,image.name),image.data);images.push({file:image.name,sha256:sha(image.data),...size});}
  const coverSize=pngSize(result.images[0].data);if(coverSize.height!==1440)throw Error('세로 표지 검증 실패');
  const planData=Buffer.from(JSON.stringify(result.productionPlan,null,2)+'\n');await fs.writeFile(path.join(target,'production-plan.json'),planData);
  await fs.writeFile(path.join(target,'source-bundle.zip'),result.sourceZip);await fs.writeFile(path.join(target,'review-preview.zip'),result.zip);
  const done={state:'complete',postId:request.postId,input,existingOutput:existing,consumedInputFingerprint:fingerprintFor(job),fingerprint,target,completedAt:new Date().toISOString(),representativeOnly:!!request.representativeOnly,
   reviewRegistered:false,publicationAllowed:false,bodyPngPreserved:!portrait,bodyImages:result.images.length-1-(endingAsset?1:0),endingCard:result.productionPlan.endingCard||null,layoutMode:portrait?'portrait':'cover_only_legacy',layoutReviewContinuity:result.productionPlan.layoutReviewContinuity||null,outputSha256:sha(result.zip),sourceZipSha256:sha(result.sourceZip),planSha256:sha(planData),images,
   runtime:{packaged:app.isPackaged,version:app.getVersion(),executable:process.execPath,editorAssets:editorRoot()}};
  await writeAtomic(checkpoint,JSON.stringify(done,null,2)+'\n');console.log(JSON.stringify(done));
 }catch(error){await writeAtomic(checkpoint,JSON.stringify({state:'held',postId:request.postId,reason:error.message,failedAt:new Date().toISOString(),retry:'자료·권리·생성 준비를 수정한 뒤 같은 명령 실행',publicationAllowed:false},null,2)+'\n');throw error;}
 finally{win?.destroy();await lock.close();await fs.rm(lockFile,{force:true});}
})().then(()=>app.exit(0)).catch(e=>{console.error(e.stack);app.exit(1);});
