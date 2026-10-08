'use strict';
// Targeted offline QA. Never activates a review round or writes source material.
const {app,BrowserWindow,session,nativeImage}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {squareCoverHtml}=require('../desktop/square-cover.cjs'),{coverHtml}=require('../desktop/universal-cover.cjs');
require('../app/source-page-plan.js');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),repo=path.resolve(__dirname,'..');
const source=path.resolve(process.argv[2]||''),destination=path.resolve(process.argv[3]||'');
if(!process.argv[2]||!process.argv[3]||destination.startsWith(source+path.sep)||source.startsWith(destination+path.sep)||source===destination)throw Error('Separate source and QA output required');
const json=p=>fs.readFile(p,'utf8').then(JSON.parse),write=(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function wordSplits(title,lines){const compact=title.replace(/\s/gu,''),legal=new Set();let offset=0;for(const token of title.match(/\S+\s*/gu)||[]){offset+=Array.from(token.trim()).length;legal.add(offset);}let cursor=0;const issues=[];for(const line of lines.slice(0,-1)){cursor+=Array.from(line.replace(/\s/gu,'')).length;if(!legal.has(cursor))issues.push({offset:cursor,before:Array.from(compact)[cursor-1],after:Array.from(compact)[cursor]});}return issues;}
app.disableHardwareAcceleration();app.commandLine.appendSwitch('force-device-scale-factor','1');app.setPath('userData',path.join(destination,'profile'));app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{
 await fs.mkdir(destination,{recursive:true});
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>cb({cancel:true}));
 const output=path.join(source,'06_자동 제작 결과'),statusFile=path.join(output,'status.json'),report=await json(statusFile),rows=report.entries.filter(r=>r.outputFolder&&r.images?.length);
 const feedbackFile=path.join(source,'07_사용자 평가/평가 기록.json'),feedback=await json(feedbackFile),protectedFiles=[statusFile,feedbackFile,path.join(source,'07_사용자 평가/검토 진행.json'),path.join(source,'review-current.json')],frozen=[];
 async function freeze(file){try{frozen.push({file,sha256:hash(await fs.readFile(file))});}catch(e){if(e.code!=='ENOENT')throw e;}}
 for(const file of protectedFiles)await freeze(file);
 const ids=[...new Set(['source-ac6fc8b1f1829c','source-842a63b3d248fb','source-ea281a867a852a','source-b0ada7acfec56a','source-80ff8e745aa9c8',rows.toSorted((a,b)=>a.title.length-b.title.length)[0].id,rows.toSorted((a,b)=>b.title.length-a.title.length)[0].id])];
 const bodyWin=new BrowserWindow({show:false,width:1200,height:900,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}}),coverWin=new BrowserWindow({show:false,width:1080,height:1080,useContentSize:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
 await bodyWin.loadFile(path.join(repo,'app/source-batch.html'));
 const results=[];
 for(const id of ids){
  const row=rows.find(r=>r.id===id),folder=path.join(output,row.outputFolder),target=path.join(destination,id);await fs.mkdir(target,{recursive:true});
  const oldPlan=await json(path.join(folder,'production-plan.json')),bytes=await fs.readFile(path.join(folder,'source-bundle.zip'));
  for(const name of ['production-plan.json','source-bundle.zip','review-preview.zip','cover.html',...row.images.map(r=>r.name)])await freeze(path.join(folder,name));
  const originalHtml=await fs.readFile(path.join(folder,'cover.html'),'utf8');
  const coverInput=JSON.parse(originalHtml.match(/window\.coverInput=(.*?);window\.(?:coverResourcesReady|coverReady)/s)[1]);
  const title=oldPlan.originalTitle||oldPlan.coverTitle,info=globalThis.ThreadsPagePlan.titleInfo(title);
  const planned=await bodyWin.webContents.executeJavaScript('(async()=>{window.__file=new File([Uint8Array.from(atob('+JSON.stringify(bytes.toString('base64'))+'),c=>c.charCodeAt(0))],"source-bundle.zip");window.__plan=await ThreadsSourceBatch.planBundle(window.__file,{preview:true,universalCover:true});return {plan:window.__plan,audit:ThreadsUniversalProductionModel.auditLayout(window.__plan)};})()');
  assert(planned.audit.ok,JSON.stringify(planned.audit.issues));
  const rendered=await bodyWin.webContents.executeJavaScript('(async()=>{const r=await ThreadsSourceBatch.renderBundle(window.__file,{preview:true,watermark:false,productionPlan:window.__plan});return r.images.map(i=>({name:i.name,data:btoa(Array.from(i.data,c=>String.fromCharCode(c)).join(""))}));})()');
  const usesUniversal=oldPlan.universalCover?.renderer!=='square-complete';
  const options={...coverInput,id,title,fontUrl:pathToFileURL(path.join(repo,'app/fonts',usesUniversal?'CarouselSansKR-Black.woff':'CutGothic-ExtraBold.woff')).href};
  const html=usesUniversal?coverHtml(options):squareCoverHtml(options);
  await fs.writeFile(path.join(target,'cover.html'),html);await coverWin.loadFile(path.join(target,'cover.html'));
  const cover=await coverWin.webContents.executeJavaScript('window.coverPNG()'),g=cover.geometry;
  assert.equal(g.title,info.displayTitle);assert.equal(g.lines.join('').replace(/\s/gu,''),info.displayTitle.replace(/\s/gu,''));assert.deepEqual(wordSplits(info.displayTitle,g.lines),[]);
  assert(g.glyphBoxes.every(b=>b.x>=64&&b.y>=64&&b.x+b.width<=1016&&b.y+b.height<=g.height-64),'Glyph crop');
  const plan=planned.plan;plan.coverTitle=info.displayTitle;plan.titleSourceLabels=info.sourceLabels;plan.pages[0]={...oldPlan.pages[0],geometry:g,width:g.width,height:g.height,contentBottom:g.box.y+g.box.height};
  const files=rendered.map(i=>({...i,data:Buffer.from(i.data,'base64')}));files[0].data=Buffer.from(cover.data.split(',')[1],'base64');
  for(let i=0;i<files.length;i++){const item=files[i];await fs.mkdir(path.dirname(path.join(target,item.name)),{recursive:true});await fs.writeFile(path.join(target,item.name),item.data);const small=nativeImage.createFromBuffer(item.data).resize({width:320});await fs.writeFile(path.join(target,'small-'+(i+1)+'.png'),small.toPNG());}
  for(let i=0;i<row.images.length;i++){const bytes=await fs.readFile(path.join(folder,row.images[i].name));await fs.writeFile(path.join(target,'before-small-'+(i+1)+'.png'),nativeImage.createFromBuffer(bytes).resize({width:320}).toPNG());}
  const audit=await bodyWin.webContents.executeJavaScript('ThreadsUniversalProductionModel.auditLayout(window.__plan)');assert(audit.ok);
  for(const page of plan.pages)for(const op of page.operations||[]){if(op.kind==='text')assert(op.y+(op.lineHeight||op.size)<=page.height-plan.safeMargin+2);}
  const oldEnding=oldPlan.pages.at(-1),ending=plan.pages.at(-1);
  if(id==='source-ac6fc8b1f1829c'){assert(oldEnding.operations.length===1);assert(ending.operations.some(o=>o.sourceId==='s15')&&ending.operations.some(o=>o.sourceId==='s16'));}
  const evaluation=feedback.evaluations.find(e=>e.id===id)||null;
  const item={id,title:row.title,originalTitle:plan.originalTitle,displayTitle:info.displayTitle,hiddenSiteLabels:info.sourceLabels,sourceReviewRound:report.reviewRound,evaluation:evaluation&&{id:evaluation.id,outputVersion:evaluation.outputVersion,score:evaluation.score,note:evaluation.note,updatedAt:evaluation.updatedAt},oldPages:row.images.length,newPages:files.length,oldLines:oldPlan.pages[0].geometry.lines,newLines:g.lines,oldWordSplits:wordSplits(title,oldPlan.pages[0].geometry.lines),glyphCrop:false,geometry:g,oldEnding:oldEnding.operations.filter(o=>o.kind==='text').map(o=>o.text),newEnding:ending.operations.filter(o=>o.kind==='text').map(o=>o.text),sourceZipSha256:hash(bytes),audit,images:files.map(f=>({name:f.name,sha256:hash(f.data)})),representativeOnly:true,publicationAllowed:false};
  await write(path.join(target,'production-plan.json'),plan);await write(path.join(target,'comparison.json'),item);results.push(item);console.log(JSON.stringify({id,oldPages:item.oldPages,newPages:item.newPages,oldWordSplits:item.oldWordSplits.length,newLines:g.lines,size:g.size}));
 }
 // Existing no-space tests previously split Korean tokens to stay in a fixed box.
 const impossible=path.join(destination,'unbreakable-title.html');await fs.writeFile(impossible,squareCoverHtml({title:'가'.repeat(300),fontUrl:pathToFileURL(path.join(repo,'app/fonts/CutGothic-ExtraBold.woff')).href}));await coverWin.loadFile(impossible);await assert.rejects(coverWin.webContents.executeJavaScript('window.coverPNG()'),/보류/);
 for(const record of frozen)assert.equal(hash(await fs.readFile(record.file)),record.sha256,'Source changed '+record.file);
 const gallery='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>제목·고아줄 대표 수정 검수</title><style>*{box-sizing:border-box}body{margin:0;padding:12px;font:14px "Malgun Gothic",sans-serif;background:#ece9e4;color:#242a30}h1{font-size:20px}h2{font-size:17px;overflow-wrap:anywhere}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}figure{margin:0}img{width:100%;display:block}p{overflow-wrap:anywhere}a{color:inherit}@media(max-width:660px){.pair{grid-template-columns:1fr}}</style><h1>대표 7글 제목·고아줄 수정</h1><p>실제 현재 제작물과 수정안 비교. 기존 회차·평가 보존, 전체 적용 전.</p>'+results.map(r=>'<section><h2>'+escape(r.displayTitle)+'</h2><p>'+r.id+' · '+r.oldPages+' → '+r.newPages+'장 · 점수 '+(r.evaluation?.score??'없음')+'</p><div class="pair"><figure><figcaption>현재 표지</figcaption><img src="'+r.id+'/before-small-1.png"></figure><figure><figcaption>수정 표지</figcaption><img src="'+r.id+'/small-1.png"></figure></div>'+(r.id==='source-ac6fc8b1f1829c'?'<div class="pair"><figure><figcaption>현재 마지막 장</figcaption><img src="'+r.id+'/before-small-'+r.oldPages+'.png"></figure><figure><figcaption>수정 마지막 장</figcaption><img src="'+r.id+'/small-'+r.newPages+'.png"></figure></div>':'')+'</section>').join('');
 await fs.writeFile(path.join(destination,'index.html'),gallery);coverWin.setContentSize(320,900);await coverWin.loadFile(path.join(destination,'index.html'));await coverWin.webContents.executeJavaScript('Promise.all([...document.images].map(i=>i.decode()))');
 const viewport=await coverWin.webContents.executeJavaScript('({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,loaded:[...document.images].every(i=>i.naturalWidth>0)})');assert.equal(viewport.width,320);assert(!viewport.overflow&&viewport.loaded);await fs.writeFile(path.join(destination,'gallery-320.png'),(await coverWin.webContents.capturePage()).toPNG());
 await write(path.join(destination,'manifest.json'),{generatedAt:new Date().toISOString(),source,sourceRound:report.reviewRound,feedbackUpdatedAt:feedback.updatedAt,feedbackCount:feedback.evaluations.length,representativePosts:results.length,representativeOnly:true,wholeCollectionRegenerated:false,newScoreCreated:false,sourceFilesUnchanged:true,frozen,viewport,unbreakableTitleHeld:true,results});
 console.log(JSON.stringify({complete:true,representatives:results.length,viewport,destination}));bodyWin.destroy();coverWin.destroy();app.exit(0);
}).catch(e=>{console.error(e.stack);app.exit(1);});
