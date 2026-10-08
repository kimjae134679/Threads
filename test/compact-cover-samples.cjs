'use strict';
// Read-only representative cover QA. Never activates a release or rewrites a body.
const {app,BrowserWindow,session,nativeImage}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {coverHtml}=require('../desktop/universal-cover.cjs'),{createZipTools}=require('../desktop/reflow-review-covers-run.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceRoot=path.resolve(process.argv[2]||''),directory=path.resolve(process.argv[3]||'qa-local/compact-covers');
if(!process.argv[2]||directory===sourceRoot||directory.startsWith(sourceRoot+path.sep)||sourceRoot.startsWith(directory+path.sep))throw Error('Read-only source and separate output directories required');
app.disableHardwareAcceleration();app.commandLine.appendSwitch('force-device-scale-factor','1');app.setPath('userData',path.join(os.tmpdir(),'threads-cover-samples-'+process.pid));
app.whenReady().then(async()=>{
 await fs.mkdir(directory,{recursive:true});
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>cb({cancel:true}));
 const output=path.join(sourceRoot,'06_자동 제작 결과'),statusFile=path.join(output,'status.json'),report=JSON.parse(await fs.readFile(statusFile,'utf8'));
 const rows=report.entries.filter(e=>e.outputFolder),longest=[...rows].sort((a,b)=>b.title.length-a.title.length)[0];
 const selected=[{label:'short',row:rows.find(e=>e.id==='source-47ec687ab31ecb')},{label:'long',row:longest},{label:'photo',row:rows.find(e=>e.id==='source-1b38d44a793e89')}];
 assert(selected.every(s=>s.row),'Representative current posts exist');
 const frozen=[];
 for(const file of [statusFile,path.join(sourceRoot,'review-current.json'),path.join(sourceRoot,'07_사용자 평가','평가 기록.json'),path.join(sourceRoot,'07_사용자 평가','검토 진행.json')])frozen.push({file,sha256:hash(await fs.readFile(file))});
 for(const {row}of selected)for(const name of ['production-plan.json','source-bundle.zip',...row.images.map(i=>i.name)]){const file=path.join(output,row.outputFolder,name);frozen.push({file,sha256:hash(await fs.readFile(file))});}
 const win=new BrowserWindow({show:false,width:1080,height:1350,useContentSize:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
 const fontUrl=pathToFileURL(path.join(__dirname,'../app/fonts/CarouselSansKR-Black.woff')).href,zip=await createZipTools(),results=[];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 for(const {label,row}of selected){
  const folder=path.join(output,row.outputFolder),plan=JSON.parse(await fs.readFile(path.join(folder,'production-plan.json'),'utf8'));
  const old=await fs.readFile(path.join(folder,row.images[0].name));await fs.writeFile(path.join(directory,label+'-before.png'),old);
  let imageUrl=null,asset=null;
  if(label==='photo'){
   const entries=await zip.read(await fs.readFile(path.join(folder,'source-bundle.zip'))),matches=[...entries].filter(([name])=>{const base=path.posix.basename(name.replaceAll('\\','/')).toLowerCase(),wanted=plan.coverAsset.name.toLowerCase();return base===wanted||base.endsWith('-'+wanted);});assert.equal(matches.length,1,'Selected original source photograph resolves unambiguously in the ZIP');const found=matches[0];
   const bytes=Buffer.from(found[1]);assert.equal(hash(bytes),plan.coverAsset.sha256);
   await fs.writeFile(path.join(directory,'photo-source.webp'),bytes);imageUrl='data:image/webp;base64,'+bytes.toString('base64');
   asset={...plan.coverAsset,sourceUrl:plan.sourceUrl,zipEntry:found[0],rightsStatus:'원문 첨부 사진 / 상업 재사용 권리 미확인 / 비공개 표지 배치 검수 전용',usage:'역 표지판의 전체 사진을 보존하여 해당 원문 위치 설명에만 사용',actualScene:false,publicationAllowed:false};
  }
  for(const aspectRatio of ['square','4:5']){
   const name=label+'-'+(aspectRatio==='square'?'square':'4x5'),html=coverHtml({id:row.id,title:plan.coverTitle,variant:label==='photo'?'photo':'paper',imageUrl,fontUrl,aspectRatio,credit:label==='photo'?'원문 첨부 사진 · 권리 확인 전 검수용':''});
   await fs.writeFile(path.join(directory,name+'.html'),html);await win.loadFile(path.join(directory,name+'.html'));await win.webContents.executeJavaScript('window.coverReady');
   const rendered=await win.webContents.executeJavaScript('window.coverPNG()'),bytes=Buffer.from(rendered.data.split(',')[1],'base64'),g=rendered.geometry;
   assert.equal(g.title,plan.coverTitle);assert.equal(g.lines.join('').replace(/\s/g,''),plan.coverTitle.replace(/\s/g,''));assert.equal(bytes.readUInt32BE(20),aspectRatio==='square'?1080:1350);
   await fs.writeFile(path.join(directory,name+'.png'),bytes);
   let titlePixelBounds=null;
   if(label!=='photo'){
    const bitmap=nativeImage.createFromBuffer(bytes).toBitmap();let first=g.height,last=0,left=1080,right=0,count=0;
    for(let y=72;y<g.height-72;y++)for(let x=72;x<1008;x++){const p=(y*1080+x)*4;if(bitmap[p]<170&&bitmap[p+1]<170&&bitmap[p+2]<190){first=Math.min(first,y);last=Math.max(last,y);left=Math.min(left,x);right=Math.max(right,x);count++;}}
    assert(count>3000,'Actual title pixels exist');titlePixelBounds={x:left,y:first,right,bottom:last,count,bottomGap:g.height-last-1};
   }
   results.push({label,id:row.id,title:plan.coverTitle,originalTitle:plan.originalTitle,sourceUrl:plan.sourceUrl,aspectRatio,file:name+'.png',html:name+'.html',sha256:hash(bytes),geometry:g,titlePixelBounds,mobile390FontPx:g.size*390/1080,mobile320FontPx:g.size*320/1080,asset,publicationAllowed:false});
  }
 }
 const gallery='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>표지 3글 실출력 비교</title><style>body{margin:0;padding:18px;background:#e6e2db;color:#242323;font:16px "Malgun Gothic",sans-serif}h1{font-size:24px}section{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:30px 0}figure{margin:0}img{display:block;width:100%;height:auto}figcaption{font-size:14px;margin:10px 0}a{color:inherit}@media(max-width:600px){section{grid-template-columns:1fr}h1{font-size:20px}}</style><h1>표지 3글 · 기존 / 정사각형 / 4:5</h1><p>원문 제목 전체 보존. 표지 검수 후보이며 기존 본문·평가·설치본은 유지합니다.</p>'+selected.map(({label,row})=>'<section><figure><img src="'+label+'-before.png" alt="기존 표지"><figcaption>기존 1080×1920</figcaption></figure>'+results.filter(r=>r.label===label).map(r=>'<figure><a href="'+r.html+'"><img src="'+r.file+'" alt="'+esc(r.title)+'"></a><figcaption>'+esc(r.aspectRatio)+' · '+r.geometry.size+'px / 모바일 390폭 '+r.mobile390FontPx.toFixed(1)+'px</figcaption></figure>').join('')+'</section>').join('')+'</html>';
 await fs.writeFile(path.join(directory,'index.html'),gallery);
 const small=[];
 for(const width of [390,320])for(const label of ['short','long','photo']){
  const preferred=results.find(r=>r.label===label&&r.aspectRatio===(label==='long'?'4:5':'square'));
  const file=path.join(directory,'mobile.html');await fs.writeFile(file,'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>html,body{margin:0;background:#e6e2db}img{width:100%;height:auto;display:block}</style><img alt="'+esc(preferred.title)+'" src="'+preferred.file+'">');
  win.setContentSize(width,650);await win.loadFile(file);await win.webContents.executeJavaScript('Promise.all([...document.images].map(i=>i.decode()))');
  const state=await win.webContents.executeJavaScript('(()=>{const b=document.querySelector("img").getBoundingClientRect();return {width:innerWidth,height:innerHeight,image:{x:b.x,y:b.y,width:b.width,height:b.height},overflow:document.documentElement.scrollWidth>innerWidth};})()');assert.equal(state.overflow,false);assert(state.image.height<=650);
  await fs.writeFile(path.join(directory,label+'-mobile-'+width+'.png'),(await win.webContents.capturePage()).toPNG());small.push({label,file:label+'-mobile-'+width+'.png',...state});
 }
 for(const f of frozen)assert.equal(hash(await fs.readFile(f.file)),f.sha256,'Read-only source file stays unchanged: '+f.file);
 const manifest={createdAt:new Date().toISOString(),sourceSHA:'251ae0bec27040fecef774a7438b836a8c8a7106',sourceReviewRound:report.reviewRound,sourcePosts:rows.length,sourcePNGs:rows.reduce((n,r)=>n+r.images.length,0),selectedIds:selected.map(s=>s.row.id),newGeneratedImages:false,publicationAllowed:false,frozenSourceFiles:frozen,sourceFilesUnchanged:true,results,small,selection:{short:'square',long:'4:5',photo:'square'},remainingScope:'365개 표지 전체 적용·새 회차 전환·뷰어/설치 연결은 하지 않음. 본문 유지. 원문 사진 게시 권리 확인은 별도.'};
 await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 win.destroy();console.log(JSON.stringify({directory,posts:3,candidates:6,smallScreens:small.length,sourceUnchanged:true,pass:true}));app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
