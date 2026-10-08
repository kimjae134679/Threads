'use strict';
// Offline, opt-in renderer. Reads frozen original ZIPs; writes a fresh reproduction tree only.
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const {sha256,pngSize,assertCoverGeometry,isInfrastructureFailure}=require('./universal-reproduction.cjs'),{coverHtml}=require('./universal-cover.cjs'),{writeResultGallery,writeCatalog}=require('./batch-catalog.cjs');
const repo=path.resolve(__dirname,'..'),input=path.resolve(process.argv[2]||'');
let state;
const json=p=>fs.readFile(p,'utf8').then(JSON.parse);
const write=(p,data)=>fs.writeFile(p,JSON.stringify(data,null,2)+'\n');
const encode=b=>Buffer.from(b).toString('base64');
const zipContext=vm.createContext({window:{},Blob,File,TextEncoder,TextDecoder,Uint8Array,DataView});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=(root,relative)=>{const p=path.resolve(root,relative),r=path.relative(root,p);if(!r||r.startsWith('..')||path.isAbsolute(r))throw Error('작업 경로 범위 오류');return p;};
app.commandLine.appendSwitch('force-device-scale-factor','1');app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
(async()=>{
 state=await json(input);
 if(!state.sourceOutput||!state.reproductionRoot||!Array.isArray(state.jobs)||!state.reviewRound)throw Error('고정된 재제작 목록 필요');
 if(path.resolve(state.sourceOutput)===path.resolve(state.reproductionRoot)||path.resolve(state.materialRoot)===path.resolve(state.reproductionRoot))throw Error('원본 경로에 재제작 금지');
 await fs.mkdir(state.reproductionRoot,{recursive:true});
 const lock=path.join(state.reproductionRoot,'reproduction-start.json');
 await fs.writeFile(lock,JSON.stringify({input,startedAt:new Date().toISOString(),pid:process.pid})+'\n',{flag:'wx'});
 app.setPath('userData',path.join(state.reproductionRoot,'renderer-profile'));
 await app.whenReady();
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_details,cb)=>cb({cancel:true}));
 const bodyWin=new BrowserWindow({show:false,width:1200,height:900,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
 const coverWin=new BrowserWindow({show:false,width:1080,height:1920,useContentSize:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
 let rendererGone=false;
 for(const win of [bodyWin,coverWin]){win.webContents.on('render-process-gone',()=>{rendererGone=true;});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('file:'))event.preventDefault();});}
 await bodyWin.loadFile(path.join(repo,'app/source-batch.html'));
 if(!await bodyWin.webContents.executeJavaScript('!!window.ThreadsUniversalProductionModel&&!!window.ThreadsSourceBatch'))throw Error('제작 모듈 로드 실패');
 vm.runInContext(await fs.readFile(path.join(repo,'app/source-cut-zip.js'),'utf8'),zipContext);zipContext.ThreadsSourceCutZip=zipContext.window.ThreadsSourceCutZip;
 vm.runInContext(await fs.readFile(path.join(repo,'app/source-bundle-zip.js'),'utf8'),zipContext);
 const originalReport=await json(path.join(state.sourceOutput,'status.json')),selections=state.photoSelection?await json(state.photoSelection):{rows:[]},selectionMap=new Map(selections.rows.map(x=>[x.id,x]));
 const output=path.join(state.reproductionRoot,'06_자동 제작 결과');await fs.mkdir(output,{recursive:true});
 const report={...structuredClone(originalReport),reviewRound:state.reviewRound,entries:[],outputs:[],counts:{},processed:0,deliveryStatus:'reproducing',lastRunAt:new Date().toISOString(),wholeCollectionRegenerated:false,reproductionContract:'universal-reproduction-v1'};
 const results=[],blocked=[],decisionMap=new Map(state.decisions.map(x=>[x.id,x])),jobIds=new Set(state.jobs.map(x=>x.id));
 for(const old of originalReport.entries)if(!jobIds.has(old.id)){
  const d=decisionMap.get(old.id),row=structuredClone(old);
  if(row.outputFolder){row.previousOutputFolder=row.outputFolder;row.previousReviewRound=originalReport.reviewRound;row.outputFolder=null;row.images=[];row.renderedPages=0;row.previewZip=null;row.status=d?.disposition==='rejected'?'excluded_press':'needs_source';row.reason=d?.reason||'이전 회차 보류';row.reasonCode=d?.reasonCode||'source_insufficient';row.triageEvidence=d?.evidence||[];row.disposition=d?.disposition||'held';}
  row.reviewRound=state.reviewRound;row.publicationAllowed=false;report.entries.push(row);
 }
 async function saveReport(){report.processed=report.entries.length;report.outputs=report.entries.filter(x=>x.outputFolder);report.counts=report.entries.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});report.lastRunAt=new Date().toISOString();await write(path.join(output,'status.json'),report);await write(path.join(state.reproductionRoot,'reproduction-audit.json'),{reviewRound:state.reviewRound,planned:state.jobs.length,completed:results.length,blocked,results,publicationAllowed:false});}
 await saveReport();
 for(const job of state.jobs){
  const oldFolder=safe(state.sourceOutput,job.outputFolder),sourceBytes=await fs.readFile(path.join(oldFolder,'source-bundle.zip'));
  if(sha256(sourceBytes)!==job.sourceZipSha256)throw Error('원문 ZIP 변경: '+job.id);
  const folder=safe(output,job.outputFolder);await fs.mkdir(folder,{recursive:true});
  let phase='body_plan';
  try{
   const planned=await bodyWin.webContents.executeJavaScript('(async()=>{const b=Uint8Array.from(atob('+JSON.stringify(encode(sourceBytes))+'),c=>c.charCodeAt(0));window.__universalFile=new File([b],"source-bundle.zip");window.__universalPlan=await window.ThreadsSourceBatch.planBundle(window.__universalFile,{preview:true,universalCover:true});return {plan:window.__universalPlan,audit:window.ThreadsUniversalProductionModel.auditLayout(window.__universalPlan)};})()');
   if(!planned.audit.ok){const e=Error('본문 무결성 검증 실패');e.audit=planned.audit;throw e;}
   const layout=planned.plan,sourceFiles=await zipContext.ThreadsSourceBundleZip.read(new File([sourceBytes],'source-bundle.zip')),rawPlan=JSON.parse(Buffer.from(sourceFiles.get('bundle.json')).toString('utf8'));
   phase='body_render';
   const rendered=await bodyWin.webContents.executeJavaScript('(async()=>{const r=await window.ThreadsSourceBatch.renderBundle(window.__universalFile,{preview:true,watermark:false,productionPlan:window.__universalPlan});const enc=b=>{let raw="";for(let i=0;i<b.length;i+=16384)raw+=String.fromCharCode(...b.subarray(i,i+16384));return btoa(raw);};return {images:r.images.map(x=>({name:x.name,data:enc(x.data)}))};})()');
   let asset=selectionMap.get(job.id)||null,imageBytes=null;
   if(asset){
    const media=rawPlan.media.find(x=>x.name.toLowerCase()===asset.name.toLowerCase());
    if(!media)throw Error('표지 원본 매핑 누락');
    imageBytes=Buffer.from(sourceFiles.get(media.file));if(sha256(imageBytes)!==asset.sha256)throw Error('표지 원본 해시 불일치');
    if(asset.kind==='ai_generated')throw Error('부모 생성 자산은 별도 명시적 provenance import로 적용');
   }
   const title=layout.coverTitle,emphasis=(title.match(/[0-9][0-9,.]*\s*(?:만원|원|년|살|개)/)||[])[0]||'',variant=asset?'photo':'paper';
   const context='';
   await fs.mkdir(path.join(folder,'fonts'),{recursive:true});await fs.copyFile(path.join(repo,'app/fonts/CarouselSansKR-Black.woff'),path.join(folder,'fonts/CarouselSansKR-Black.woff'));
   await fs.copyFile(path.join(repo,'app/fonts/OFL.txt'),path.join(folder,'fonts/OFL.txt'));
   const html=coverHtml({id:job.id,title,context,variant,imageUrl:imageBytes?'data:image/'+(/png$/i.test(asset.name)?'png':/webp$/i.test(asset.name)?'webp':'jpeg')+';base64,'+encode(imageBytes):null,credit:asset?asset.attribution||'원문 첨부 이미지 · 실제 사건 확인 별도':'',fontUrl:'fonts/CarouselSansKR-Black.woff',emphasis});
   phase='universal_cover';await fs.writeFile(path.join(folder,'cover.html'),html);await coverWin.loadFile(path.join(folder,'cover.html'));
   const cover=await coverWin.webContents.executeJavaScript('window.coverPNG()');assertCoverGeometry(cover.geometry);
   const images=rendered.images.map(x=>({name:x.name,data:Buffer.from(x.data,'base64')}));images[0].data=Buffer.from(cover.data.split(',')[1],'base64');
   for(const item of images){pngSize(item.data);await fs.mkdir(path.dirname(path.join(folder,item.name)),{recursive:true});await fs.writeFile(path.join(folder,item.name),item.data);}
   layout.pages[0]={number:1,role:'cover',width:1080,height:1920,background:variant==='paper'?'#f6f0e7':'#08090a',contentBottom:cover.geometry.box.y+cover.geometry.box.height,operations:[],sourceIds:['title'],elements:[{kind:'text',sourceId:'title'}],purpose:'원문 제목 보존 · 범용 임시 표지',renderMethod:'universal-cover-canvas-v1',geometry:cover.geometry};
   layout.templateId='universal_'+variant;layout.coverAsset=asset;layout.universalCover={schemaVersion:1,variant,temporary:true,title,emphasis,context,geometry:cover.geometry,asset,html:'cover.html',publicationAllowed:false};
   layout.priorTemplateId=job.templateId;layout.reproduction={reviewRound:state.reviewRound,originalSourceZipSha256:sha256(sourceBytes),freshBodyRender:true,noCachedPng:true,audit:planned.audit};
   const finalAudit=await bodyWin.webContents.executeJavaScript('window.ThreadsUniversalProductionModel.auditLayout('+JSON.stringify(layout)+')');if(!finalAudit.ok){const e=Error('최종 본문 검증 실패');e.audit=finalAudit;throw e;}
   await fs.writeFile(path.join(folder,'source-bundle.zip'),sourceBytes);await write(path.join(folder,'production-plan.json'),layout);await write(path.join(folder,'integrity-audit.json'),finalAudit);
   if(asset){await fs.mkdir(path.join(folder,'cover-assets'),{recursive:true});await fs.writeFile(path.join(folder,'cover-assets',asset.name),imageBytes);await write(path.join(folder,'cover-assets/provenance.json'),{...asset,id:job.id,importedAt:new Date().toISOString()});}
   const manifest={schema:'threads-curated-preview-v1',sourceSha256:sha256(sourceBytes),originalTitle:rawPlan.originalTitle,coverTitle:title,coverTitleEvidence:rawPlan.coverTitleEvidence,productionPlan:layout,renderedPages:images.length,previewOnly:true,publicationAllowed:false};
   const files=[...images,{name:'manifest.json',data:Buffer.from(JSON.stringify(manifest,null,2)+'\n')},{name:'source-bundle.zip',data:sourceBytes},{name:'cover.html',data:Buffer.from(html)},{name:'fonts/CarouselSansKR-Black.woff',data:await fs.readFile(path.join(folder,'fonts/CarouselSansKR-Black.woff'))},{name:'fonts/OFL.txt',data:await fs.readFile(path.join(folder,'fonts/OFL.txt'))}];
   if(asset)files.push({name:'cover-assets/'+asset.name,data:imageBytes},{name:'cover-assets/provenance.json',data:Buffer.from(JSON.stringify({...asset,id:job.id},null,2))});
   const zipBytes=Buffer.from(await zipContext.window.ThreadsSourceCutZip.zip(files).arrayBuffer());await fs.writeFile(path.join(folder,'review-preview.zip'),zipBytes);
   const row={...structuredClone(job),title,status:'generated',reason:'전체 본문 재제작·범용 임시 표지 적용, 새 회차 검토 대기',reviewRound:state.reviewRound,reviewStatus:'needs_review',publicationAllowed:false,publicationStatus:'unknown',ruleVersion:layout.ruleVersion,templateId:layout.templateId,coverAsset:asset,generatedAt:new Date().toISOString(),plannedAt:layout.preparedAt,sourceZipSha256:sha256(sourceBytes),outputSha256:sha256(zipBytes),sourceFingerprint:sha256(Buffer.from([sha256(sourceBytes),layout.ruleVersion,sha256(images[0].data)].join(':'))),images:images.map(x=>({name:x.name,sha256:sha256(x.data),...pngSize(x.data)})),renderedPages:images.length};
   await writeResultGallery(folder,row);report.entries.push(row);results.push({id:job.id,pages:images.length,variant,sourceZipSha256:row.sourceZipSha256,outputSha256:row.outputSha256,bodyCharacters:finalAudit.bodyCharacters,commentCharacters:finalAudit.commentCharacters,auditPassed:true,geometry:cover.geometry});
  }catch(error){
   if(isInfrastructureFailure(error,{rendererGone,rendererDestroyed:bodyWin.isDestroyed()||coverWin.isDestroyed()}))throw error;
   const audit=error.audit||null;
   await write(path.join(folder,'reproduction-failure.json'),{id:job.id,phase,error:error.message,audit});
   blocked.push({id:job.id,title:job.title,phase,error:error.message,issues:audit?.issues||[],reasonCode:'production_error'});
   report.entries.push({...structuredClone(job),previousOutputFolder:job.outputFolder,previousReviewRound:originalReport.reviewRound,outputFolder:null,images:[],renderedPages:0,previewZip:null,status:'needs_selection',disposition:'held',reasonCode:'production_error',reason:error.message,reviewRound:state.reviewRound,publicationAllowed:false});
  }
  await saveReport();console.log(JSON.stringify({processed:results.length+blocked.length,total:state.jobs.length,generated:results.length,held:blocked.length,last:job.id}));
 }
 for(const frozen of state.sourceFiles){const folder=safe(state.sourceOutput,originalReport.entries.find(x=>x.id===frozen.id).outputFolder);if(sha256(await fs.readFile(path.join(folder,'source-bundle.zip')))!==frozen.sourceZipSha256||sha256(await fs.readFile(path.join(folder,'production-plan.json')))!==frozen.planSha256)throw Error('이전 제작 원본 변경됨: '+frozen.id);}
 report.wholeCollectionRegenerated=true;report.deliveryStatus='complete';report.processed=report.entries.length;await saveReport();await writeCatalog(output,report);
 await write(path.join(state.reproductionRoot,'reproduction-complete.json'),{reviewRound:state.reviewRound,planned:state.jobs.length,generated:results.length,held:blocked.length,pages:results.reduce((n,r)=>n+r.pages,0),sourcePosts:state.sourceFiles.length,sourceBytesUnchanged:true,publicationAllowed:false});
 console.log(JSON.stringify({complete:true,generated:results.length,held:blocked.length,pages:results.reduce((n,r)=>n+r.pages,0),reproductionRoot:state.reproductionRoot}));app.exit(0);
})().catch(async error=>{console.error(error.stack);if(state?.reproductionRoot){const statusPath=path.join(state.reproductionRoot,'06_자동 제작 결과/status.json');try{const failed=await json(statusPath);failed.deliveryStatus='fatal';failed.wholeCollectionRegenerated=false;await write(statusPath,failed);}catch{}}
 if(state?.reproductionRoot)await write(path.join(state.reproductionRoot,'reproduction-fatal.json'),{error:error.message}).catch(()=>{});app.exit(1);});
