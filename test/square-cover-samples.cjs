'use strict';
// Read-only QA: outputs are isolated, no body, status, score or release writes.
const {app,BrowserWindow,session,nativeImage}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {squareCoverHtml}=require('../desktop/square-cover.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceRoot=path.resolve(process.argv[2]||''),directory=path.resolve(process.argv[3]||'qa-local/square-ai-covers');
if(!process.argv[2]||directory===sourceRoot||directory.startsWith(sourceRoot+path.sep)||sourceRoot.startsWith(directory+path.sep))throw Error('Read-only source and separate output directories required');
app.disableHardwareAcceleration();app.commandLine.appendSwitch('force-device-scale-factor','1');app.setPath('userData',path.join(os.tmpdir(),'square-cover-samples-'+process.pid));
app.whenReady().then(async()=>{
 await fs.mkdir(directory,{recursive:true});session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>cb({cancel:true}));
 const output=path.join(sourceRoot,'06_자동 제작 결과'),statusFile=path.join(output,'status.json'),report=JSON.parse(await fs.readFile(statusFile,'utf8'));
 const selected=[{label:'kids',id:'source-64603b7a036c51',evidence:'s17 장난감 정리, s18 마감 청소'},{label:'cafe',id:'source-36bac6407575c8',evidence:'s13 컵홀더·컵 등 소모품 보충, 장비 정리'},{label:'long',id:'source-7b6661b6a2156b',evidence:'원문 제목 전체, 사진 없이 구성'}];
 const frozen=[];
 for(const file of [statusFile,path.join(sourceRoot,'review-current.json'),path.join(sourceRoot,'07_사용자 평가','평가 기록.json'),path.join(sourceRoot,'07_사용자 평가','검토 진행.json')])frozen.push({file,sha256:hash(await fs.readFile(file))});
 for(const row of report.entries.filter(r=>r.outputFolder))for(const image of row.images){const file=path.join(output,row.outputFolder,image.name);frozen.push({file,sha256:hash(await fs.readFile(file)),kind:row.images[0].name===image.name?'cover':'body'});}
 const win=new BrowserWindow({show:false,width:1080,height:1080,useContentSize:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
 const fontUrl=pathToFileURL(path.join(__dirname,'../app/fonts/CutGothic-ExtraBold.woff')).href,prompts=JSON.parse(await fs.readFile(path.join(directory,'assets/prompts.json'),'utf8')),results=[];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 for(const item of selected){
  const row=report.entries.find(r=>r.id===item.id);assert(row);const folder=path.join(output,row.outputFolder),planFile=path.join(folder,'production-plan.json'),planBytes=await fs.readFile(planFile),plan=JSON.parse(planBytes);frozen.push({file:planFile,sha256:hash(planBytes)});
  const bundleFile=path.join(folder,'source-bundle.zip');frozen.push({file:bundleFile,sha256:hash(await fs.readFile(bundleFile))});
  assert.equal(plan.coverTitle,plan.originalTitle,'Selected title is the full original');
  let imageUrl=null,asset=null;
  if(item.label!=='long'){
   const relative='assets/'+item.label+'-closing-ai-v1.png',bytes=await fs.readFile(path.join(directory,relative));imageUrl='data:image/png;base64,'+bytes.toString('base64');
   asset={file:relative,sha256:hash(bytes),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),generator:'Built-in GPT image tool',prompt:prompts[item.label],sourceId:item.id,sourceUrl:plan.sourceUrl,evidence:item.evidence,textFree:true,actualScene:false,usage:'AI 연출 이미지 / 해당 글의 표지 배경, 실제 당사자·매장·증거 아님',rightsStatus:'기본 제공 GPT 이미지 도구 생성 자산; 원문 첨부 사진 복제 아님. 별도 권리 보증·실제 매장 동일성 주장 없음.',generatedForThisTask:true,publicationAllowed:false};
  }
  const htmlFile=item.label+'-square.html';await fs.writeFile(path.join(directory,htmlFile),squareCoverHtml({id:row.id,title:plan.coverTitle,imageUrl,fontUrl}));await win.loadFile(path.join(directory,htmlFile));
  const rendered=await win.webContents.executeJavaScript('window.coverPNG()'),g=rendered.geometry,bytes=Buffer.from(rendered.data.split(',')[1],'base64');
  assert.equal(g.title,plan.originalTitle);assert.equal(g.lines.join('').replace(/\s/gu,''),plan.originalTitle.replace(/\s/gu,''));assert.equal(bytes.readUInt32BE(20),1080);assert.equal(/\d/.test(g.lines.join('')),/\d/.test(plan.originalTitle));
  if(asset){assert(g.imageBox&&!g.photoFallback);assert.equal(g.aiLabel,'AI 연출 이미지');}
  const file=item.label+'-square.png';await fs.writeFile(path.join(directory,file),bytes);
  const bitmap=nativeImage.createFromBuffer(bytes).toBitmap();assert.equal(bitmap.length,1080*1080*4);
  // Scan exported pixels in the measured title region (BGRA); verify actual ink exists.
  let count=0,left=1080,right=0,top=1080,bottom=0;
  for(const box of g.glyphBoxes)for(let y=Math.max(0,Math.floor(box.y));y<Math.min(1080,Math.ceil(box.y+box.height));y++)for(let x=Math.max(0,Math.floor(box.x));x<Math.min(1080,Math.ceil(box.x+box.width));x++){
   const p=(y*1080+x)*4,b=bitmap[p],green=bitmap[p+1],r=bitmap[p+2],ink=asset?r>205&&green>190&&b>145:r<180&&green<180&&b<180;
   if(ink){count++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  }
  assert(count>2000);assert(left>=64&&right<=1016&&top>=64&&bottom<=1016);
  results.push({...item,title:plan.coverTitle,sourceUrl:plan.sourceUrl,file,html:htmlFile,sha256:hash(bytes),geometry:g,actualTitlePixels:{left,right,top,bottom,count,bottomGap:1079-bottom},asset,mobile320FontPx:g.size*320/1080,mobile390FontPx:g.size*390/1080});
 }
 const small=[];
 for(const width of [320,390])for(const result of results){
  win.setContentSize(width,width);const file=path.join(directory,'mobile.html');await fs.writeFile(file,'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>html,body{margin:0}img{width:100%;height:auto;display:block}</style><img alt="'+esc(result.title)+'" src="'+result.file+'">');await win.loadFile(file);await win.webContents.executeJavaScript('Promise.all([...document.images].map(i=>i.decode()))');
  const state=await win.webContents.executeJavaScript('({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,height:document.querySelector("img").getBoundingClientRect().height})');assert.equal(state.overflow,false);assert.equal(state.height,width);
  const name=result.label+'-mobile-'+width+'.png';await fs.writeFile(path.join(directory,name),(await win.webContents.capturePage()).toPNG());small.push({label:result.label,file:name,...state});
 }
 const gallery='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>정사각 표지 실출력 3개</title><style>body{margin:0;padding:20px;background:#e8e4dc;font:16px "Malgun Gothic",sans-serif;color:#243036}h1{font-size:24px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}figure{margin:0}img{width:100%;display:block}figcaption{margin-top:12px;line-height:1.6}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style><h1>정사각 표지 3개 — 본문 변경 없음</h1><p>사진형 2개는 AI 연출 이미지. 긴 제목은 사진 없이 전체 보존.</p><div class="grid">'+results.map(r=>'<figure><a href="'+r.html+'"><img src="'+r.file+'" alt="'+esc(r.title)+'"></a><figcaption>'+esc(r.label)+' · 1080×1080 · '+r.geometry.size+'px<br>320px 화면 '+r.mobile320FontPx.toFixed(1)+'px / 390px 화면 '+r.mobile390FontPx.toFixed(1)+'px</figcaption></figure>').join('')+'</div></html>';
 await fs.writeFile(path.join(directory,'index.html'),gallery);
 for(const f of frozen)assert.equal(hash(await fs.readFile(f.file)),f.sha256,'Source stays unchanged: '+f.file);
 const manifest={createdAt:new Date().toISOString(),sourceReviewRound:report.reviewRound,sourcePosts:report.entries.filter(r=>r.outputFolder).length,sourcePNGs:frozen.filter(f=>f.kind).length,bodyPNGs:frozen.filter(f=>f.kind==='body').length,sourceFilesUnchanged:true,AIAssetsSaved:2,parentConsultationIncluded:false,results,small,frozenSourceFiles:frozen,remainingScope:'365개 활성 표지 반영·UI 연결·설치본 교체는 최종 통합 담당 범위. 본문 재제작 없음. 부모 상담 시안 및 청첩장 이미지 포함 안 됨.'};
 await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');win.destroy();console.log(JSON.stringify({pass:true,directory,results:results.map(r=>({label:r.label,size:r.geometry.size,lines:r.geometry.lines.length,mobile320:r.mobile320FontPx})),smallScreens:small.length,sourcePNGs:manifest.sourcePNGs,bodyPNGs:manifest.bodyPNGs,sourceUnchanged:true}));app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
