'use strict';
// Electron QA only. All writes, including scores and round changes, stay in a fresh fixture.
// electron compact-review-round-smoke.cjs <QA directory> <new material source> [body baseline]
//   [--expected-square=365] [--expected-portrait=0] [--expected-photos=11]
//   [--allow-existing-feedback] [--legacy-ui] (legacy mode never claims compact-cover PASS)
//   [--installed-modules=<absolute resources/app.asar>] [--assets=<absolute resources/editor>]
// Rerun exactly the same arguments plus --verify-process-restore for independent-process persistence QA.
const {app,protocol,session,BrowserWindow,nativeTheme}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const args=process.argv.slice(2),qa=args[0],source=args[1],baseline=args[2]?.startsWith('--')?source:(args[2]||source);
const option=key=>args.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3);
const moduleRoot=option('installed-modules')||__dirname,assetRoot=option('assets')||path.join(__dirname,'..','app');
const {registerPostReview}=require(path.join(moduleRoot,'post-review-service.cjs')),{version}=require(path.join(moduleRoot,'post-review-store.cjs'));
const restoreOnly=args.includes('--verify-process-restore');
const allowExisting=args.includes('--allow-existing-feedback');
const legacy=args.includes('--legacy-ui');
const numberOption=(key,fallback)=>{const value=args.find(a=>a.startsWith('--'+key+'='));if(!value)return fallback;const n=Number(value.split('=')[1]);if(!Number.isInteger(n)||n<0)throw Error('Invalid '+key);return n;};
const expected={square:numberOption('expected-square',365),portrait:numberOption('expected-portrait',0),photos:numberOption('expected-photos',11),aiAssets:numberOption('expected-ai-assets',2)};
const OUTPUT='06_자동 제작 결과',FEEDBACK='07_사용자 평가',SCORE='평가 기록.json',WORKFLOW='검토 진행.json';
for(const [name,value]of Object.entries({qa,source,baseline,moduleRoot,assetRoot}))if(!path.isAbsolute(value||''))throw Error(name+' must be an absolute path');
const inside=(a,b)=>{const r=path.relative(path.resolve(a),path.resolve(b));return !r||r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
if(inside(source,qa)||inside(qa,source)||inside(baseline,qa)||inside(qa,baseline))throw Error('QA and read-only material roots must not overlap');
app.disableHardwareAcceleration();app.commandLine.appendSwitch('force-device-scale-factor','1');
app.setPath('userData',path.join(qa,'profile'));process.argv.push('--background-worker');app.on('window-all-closed',()=>{});
protocol.registerSchemesAsPrivileged([{scheme:'cut-editor',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),checks=[],geometry=[],copied={files:0,bytes:0,skippedLinks:[]};
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
let fixture,win,store,originalImage,run,report,rows,sourceHead,baselineHead,lastJavaScript='';const rendererMessages=[];
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
async function until(fn,label){for(let n=0;n<1000;n++){if(await fn())return;await pause(40);}throw Error('Timed out: '+label);}
function safe(root,name){const target=path.resolve(root,name);if(!inside(root,target)||target===path.resolve(root))throw Error('Unsafe fixture-relative path: '+name);return target;}
async function head(root){const result={};for(const name of [path.join(OUTPUT,'status.json'),'review-current.json','review-delivery-in-progress.json',path.join(FEEDBACK,SCORE),path.join(FEEDBACK,WORKFLOW)]){
 try{result[name]=digest(await fs.readFile(path.join(root,name)));}catch(e){if(e.code!=='ENOENT')throw e;result[name]=null;}
 }return result;}
async function copyReviewInputs(){
 report=await json(path.join(source,OUTPUT,'status.json'));rows=report.entries.filter(r=>r.outputFolder&&r.images?.length);
 const files=[path.join(OUTPUT,'status.json'),'review-current.json','review-delivery-in-progress.json',path.join(FEEDBACK,SCORE),path.join(FEEDBACK,WORKFLOW)];
 for(const row of rows)for(const name of ['production-plan.json',...row.images.map(i=>i.name)])files.push(path.join(OUTPUT,row.outputFolder,name));
 for(const relative of files){
  const src=safe(source,relative),dst=safe(fixture,relative);
  try{const real=await fs.realpath(src);assert(inside(source,real),'Review fixture must not follow a link outside its source');const stat=await fs.lstat(src);assert(stat.isFile()&&!stat.isSymbolicLink(),'Only regular review files are copied');
   await fs.mkdir(path.dirname(dst),{recursive:true});await fs.copyFile(src,dst);copied.files++;copied.bytes+=stat.size;
  }catch(e){if(e.code!=='ENOENT'||![path.join(FEEDBACK,SCORE),path.join(FEEDBACK,WORKFLOW),'review-delivery-in-progress.json'].includes(relative))throw e;}
 }
}
async function requestedImage(){
 const request=await run("({id:document.getElementById('pageImage').dataset.postId,page:Number(document.getElementById('pageSelect').value)})");
 const row=rows.find(r=>r.id===request.id);assert(row,'The active post must be a complete source row');
 const expected=await originalImage(row.id,request.page,version(row));
 await until(()=>run("(()=>{const i=document.getElementById('pageImage');return i.src==="+JSON.stringify(expected)+"&&i.complete&&i.naturalWidth>0&&i.dataset.postId==="+JSON.stringify(row.id)+"&&i.dataset.page==="+JSON.stringify(String(request.page))+";})()"),'requested post/page image decoded');
}
const select=async(id,page=1)=>{await run('window.ThreadsPostReviewUI.select('+JSON.stringify(id)+',{page:'+page+'})');await requestedImage();};
const go=page=>run("document.getElementById('pageSelect').value="+JSON.stringify(String(page))+";document.getElementById('pageSelect').dispatchEvent(new Event('change'))");
async function snapshot(name){await fs.writeFile(path.join(qa,name+'.png'),(await win.webContents.capturePage()).toPNG());}
async function assertRatio(selector,label,{fit=false}={}){
 const g=await run("(()=>{const i=document.querySelector("+JSON.stringify(selector)+"),b=i.getBoundingClientRect(),d=document.querySelector('.review-dock').getBoundingClientRect();return {width:b.width,height:b.height,left:b.left,right:b.right,top:b.top,bottom:b.bottom,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,viewportWidth:innerWidth,viewportHeight:innerHeight,dockHeight:d.height,objectFit:getComputedStyle(i).objectFit};})()");
 assert(g.width>0&&g.height>0&&g.naturalWidth>0&&g.naturalHeight>0,label+' image must be decoded and displayed');
 assert(Math.abs(g.width/g.height-g.naturalWidth/g.naturalHeight)<.004,label+' must retain the actual PNG ratio: '+JSON.stringify(g));
 assert(g.left>=-.5&&g.right<=g.viewportWidth+.5,label+' must fit horizontally');
 if(fit)assert(g.top>=-.5&&g.bottom<=g.viewportHeight-g.dockHeight-12+.5,label+' full cover must fit above the dock: '+JSON.stringify(g));
 geometry.push({label,...g});return g;
}
async function validateCollection(){
 const prior=await json(path.join(baseline,OUTPUT,'status.json')),byId=new Map(prior.entries.map(r=>[r.id,r]));
 assert.equal(rows.length,365,'Actual complete collection must contain 365 posts');
 assert.equal(rows.reduce((n,r)=>n+r.images.length,0),3073,'Actual complete collection must contain 3073 pages');
 assert.equal(new Set(rows.map(r=>r.id)).size,365,'Complete IDs must be unique');
 let square=0,portrait=0,photos=0,body=0,sourcePhotos=0,aiAssets=0;const plans=new Map();
 for(const row of rows){
  const root=safe(path.join(fixture,OUTPUT),row.outputFolder),old=byId.get(row.id);assert(old,'Baseline must include '+row.id);
  const plan=await json(path.join(root,'production-plan.json'));plans.set(row.id,plan);
  const oldPlan=await json(path.join(safe(path.join(baseline,OUTPUT),old.outputFolder),'production-plan.json'));
  assert.deepEqual(plan.pages.slice(1),oldPlan.pages.slice(1),'All body/comment plans must stay unchanged');
  assert.equal(row.images.length,old.images.length);assert.equal(plan.pages.length,row.images.length);
  assert.equal(row.reviewRound,report.reviewRound);assert.equal(plan.coverTitle,oldPlan.coverTitle,'Exact cover title must be preserved');
  assert.deepEqual(plan.coverAsset,oldPlan.coverAsset,'Existing source photograph metadata must stay unchanged');if(oldPlan.coverAsset)sourcePhotos++;
  const ai=plan.universalCover?.aiAsset;if(ai&&!legacy){aiAssets++;assert.equal(ai.sourceId,row.id);assert.equal(ai.actualScene,false);assert.equal(plan.universalCover.aiAssetUsed,true);assert.equal(plan.pages[0].geometry.aiLabel,'AI 연출 이미지');
   assert.equal(digest(await fs.readFile(safe(safe(path.join(source,OUTPUT),row.outputFolder),ai.file))),ai.sha256,'Retained AI asset bytes match provenance');}
  for(const [i,image]of row.images.entries()){
   const bytes=await fs.readFile(safe(root,image.name));assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Valid PNG signature');
   const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);assert.equal(width,1080);assert.equal(width,image.width);assert.equal(height,image.height);
   assert.equal(digest(bytes),image.sha256,'Actual PNG hash matches status: '+row.id+'/'+image.name);
   if(i===0){if(height===1080)square++;else if(height===1350)portrait++;else if(!legacy)assert.fail('Compact cover must be square or 4:5: '+row.id);
    const g=plan.pages[0].geometry;assert.equal(g.title,plan.coverTitle);assert.equal(g.width,width);assert.equal(g.height,height);
    assert.equal(plan.pages[0].width,width,'Cover plan width matches actual PNG');assert.equal(plan.pages[0].height,height,'Cover plan height matches actual PNG');
    assert.equal(g.lines.join('').replace(/\s/gu,''),plan.coverTitle.replace(/\s/gu,''));
    if(!legacy)assert(g.glyphBoxes?.length&&g.glyphBoxes.every(b=>b.x>=72&&b.y>=72&&b.x+b.width<=1008&&b.y+b.height<=height-72),'Title glyphs must stay within safe margins');
    if(plan.universalCover?.variant==='photo'){photos++;if(!legacy){assert.equal(g.imageBox?.fit,'contain');assert(g.imageBox.x>=0&&g.imageBox.y>=0&&g.imageBox.x+g.imageBox.width<=1080+.01&&g.imageBox.y+g.imageBox.height<=height+.01,'Photo image box stays inside cover');}}
   }else{body++;assert.deepEqual(image,old.images[i],'Body PNG status contract stays unchanged');assert.equal(digest(await fs.readFile(safe(safe(path.join(baseline,OUTPUT),old.outputFolder),old.images[i].name))),image.sha256,'Actual baseline body PNG matches unchanged output');}
  }
 }
 if(!legacy){assert.equal(square,expected.square);assert.equal(portrait,expected.portrait);assert.equal(photos,expected.photos);assert.equal(sourcePhotos,9);assert.equal(aiAssets,expected.aiAssets);}assert.equal(body,2708);
 checks.push('365 complete posts / 3073 real PNG hashes and dimensions / '+(legacy?'legacy UI baseline':square+' square + '+portrait+' portrait cover / '+photos+' contained photos')+' / 2708 unchanged body pages');
 return {square,portrait,photos,body,plans,sourcePhotos,aiAssets};
}
app.whenReady().then(async()=>{
 await fs.mkdir(qa,{recursive:true});sourceHead=await head(source);baselineHead=await head(baseline);
 if(restoreOnly){const request=await json(path.join(qa,'process-restore-request.json'));fixture=request.fixture;assert(inside(qa,fixture)&&fixture!==path.resolve(qa),'Restore fixture must belong to the QA directory');}
 else{fixture=await fs.mkdtemp(path.join(qa,'fixture-'));await copyReviewInputs();}
 process.env.THREADS_TEST_MATERIAL_ROOT=fixture;
 report=await json(path.join(fixture,OUTPUT,'status.json'));rows=report.entries.filter(r=>r.outputFolder&&r.images?.length);assert(report.reviewRound,'Active round must be supplied');
 const pointer=await json(path.join(fixture,'review-current.json'));assert.equal(pointer.reviewRound,report.reviewRound);
 const contract=await validateCollection();
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_details,callback)=>callback({cancel:true}));
 const allowed=new Set(['source-cut-post-review.html','source-cut-post-review.js','source-cut-post-review.css']),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
 protocol.handle('cut-editor',async request=>{const u=new URL(request.url),name=u.pathname.slice(1);if(u.host!=='app'||!allowed.has(name))return new Response('',{status:404});return new Response(await fs.readFile(path.join(assetRoot,name)),{headers:{'Content-Type':mime[path.extname(name)],'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src data:; connect-src 'none'"}});});
 const service=registerPostReview({app,trusted:()=>{throw Error('No editor in isolated QA');},materialRoot:fixture,preferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:false,offscreen:true}});
 store=service.store;originalImage=store.image;const initial=await store.list();
 assert.equal(initial.entries.length,report.entries.length);assert.equal(initial.entries.filter(r=>r.hasOutput&&r.disposition==='eligible').length,365);
 const initialEvaluations=initial.entries.filter(r=>r.current).length;
 if(!allowExisting&&!restoreOnly){assert.equal(initialEvaluations,0,'New source round starts with no user evaluations');assert(initial.entries.every(r=>!r.previous),'Old evaluations must not migrate into new round');}
 await service.open();win=service.getWindow();
 win.webContents.on('console-message',(_event,details,_level,message)=>{const value=typeof details==='object'?details.message:(typeof _level==='string'?_level:message);rendererMessages.push(String(value).slice(0,1000));if(rendererMessages.length>50)rendererMessages.shift();});
 run=async s=>{lastJavaScript=s.slice(0,500);try{return await win.webContents.executeJavaScript(s);}catch(e){e.message+='\nQA JavaScript: '+lastJavaScript;throw e;}};
 // Electron 44 intentionally omits preload paths from normalized web preferences.
 // This real service resolves its preload next to the loaded service module; successful
 // isolated UI bridge calls below prove that the configured preload actually executed.
 const preloadPath=path.join(moduleRoot,'post-review-preload.cjs'),preferences=win.webContents.getLastWebPreferences();assert.equal(preferences.contextIsolation,true);assert.equal(preferences.sandbox,true);assert.equal(preferences.nodeIntegration,false);
 await until(()=>run("document.querySelectorAll('.post-card').length===365&&document.getElementById('pageImage').naturalWidth>0"),'actual full default list');
 assert.equal(await run("!!window.ThreadsPostReview&&typeof window.ThreadsPostReview.list==='function'&&typeof window.ThreadsPostReview.save==='function'"),true,'Real isolated preload bridge must be available');
 assert.equal(await run("document.getElementById('workflow').value"),'eligible');
 assert.deepEqual((await run("[...document.querySelectorAll('.post-card')].map(e=>e.dataset.id)")).sort(),rows.map(r=>r.id).sort());
 assert.equal(win.isVisible(),false);
 if(restoreOnly){
  const request=await json(path.join(qa,'process-restore-request.json'));assert(Number.isInteger(request.createdPid));assert.notEqual(process.pid,request.createdPid,'Restore must run in a separate Electron process');assert.equal(moduleRoot,request.moduleRoot);assert.equal(assetRoot,request.assetRoot);assert.equal(initial.reviewRound,request.reviewRound);assert.equal(initial.entries.find(r=>r.id===request.id).current.score,request.score);
  await select(request.id,request.page);assert.equal(await run("document.getElementById('note').value"),request.note);assert.equal(await run("document.querySelector('[data-score=\""+request.score+"\"]').getAttribute('aria-pressed')"),'true');
  assert.deepEqual(await head(source),sourceHead);assert.deepEqual(await head(baseline),baselineHead);
  await fs.writeFile(path.join(qa,'process-restore-check.json'),JSON.stringify({pass:true,fixtureOnly:true,independentProcess:true,pid:process.pid,seedPid:request.createdPid,moduleRoot,assetRoot,servicePreloadPath:preloadPath,realPreloadBridge:true,fixture,id:request.id,reviewRound:request.reviewRound,score:request.score,note:request.note,allWindowsHidden:true,sourceStateUnchanged:true},null,2));
  console.log('INDEPENDENT PROCESS RESTORE PASS');for(const w of BrowserWindow.getAllWindows())w.destroy();app.exit(0);return;
 }
 if(!allowExisting){assert.equal(await run("document.querySelectorAll('#scores [aria-pressed=true]').length"),0);assert.equal(await run("document.getElementById('note').value"),'');assert.equal(await run("document.getElementById('previous').hidden"),true);}
 checks.push('default UI shows exactly 365 current complete posts; new-round scores/memos/history are blank when required');
 const first=rows.find(r=>r.images.length>=19)||rows.find(r=>r.images.length>=4),other=rows.find(r=>r.id!==first.id&&r.images.length>=3);
 const square=rows.find(r=>r.images[0].height===1080&&contract.plans.get(r.id).universalCover.variant!=='photo')||rows.find(r=>contract.plans.get(r.id).universalCover.variant!=='photo'),portrait=rows.find(r=>r.images[0].height===1350),photo=rows.find(r=>contract.plans.get(r.id).universalCover.variant==='photo');
 for(const [width,height]of [[760,650],[1250,1000]]){
  win.setSize(width,height);await pause(150);
  for(const [kind,row]of [['square',square],['portrait',portrait],['photo',photo]].filter(([,r])=>r)){
   await select(row.id);await run("window.scrollTo(0,0);document.getElementById('zoom').checked=false;document.getElementById('zoom').dispatchEvent(new Event('change'))");await pause(120);
   await assertRatio('#pageImage',kind+'-'+width+'x'+height,{fit:true});await snapshot('cover-'+kind+'-'+width+'x'+height);
   await run("document.getElementById('vertical').click();document.querySelector('#verticalPages img').scrollIntoView({block:'start'})");
   await until(()=>run("document.querySelector('#verticalPages img')?.naturalWidth>0"),'vertical cover decoded');await assertRatio('#verticalPages img',kind+'-vertical-'+width+'x'+height);
   await run("document.getElementById('single').click()");await requestedImage();
  }
 }
 checks.push('actual cover PNG display ratio preserved, complete default cover visible at 760x650 and 1250x1000, vertical covers retain ratio');
 for(const theme of ['light','dark']){nativeTheme.themeSource=theme;win.setSize(760,650);await pause(120);await select(square.id);await pause(100);await assertRatio('#pageImage','square-small-'+theme,{fit:true});await snapshot('cover-small-'+theme);}
 nativeTheme.themeSource='system';win.setSize(1250,1000);await pause(120);checks.push('small-window complete cover and controls remain reachable in light/dark system themes');
 await select(first.id,2);const bodyGeometry=await assertRatio('#pageImage','body-readable');assert(bodyGeometry.width>=400,'Body retains readable desktop width');
 await run("document.getElementById('fromCover').click()");await requestedImage();const unzoomed=await assertRatio('#pageImage','cover-reset',{fit:true});
 await run("document.getElementById('zoom').checked=true;document.getElementById('zoom').dispatchEvent(new Event('change'))");await pause(80);
 const zoomed=await assertRatio('#pageImage','cover-zoom');assert(zoomed.width>unzoomed.width,'Cover zoom expands image');await run("document.getElementById('zoom').checked=false;document.getElementById('zoom').dispatchEvent(new Event('change'))");
 checks.push('body remains readable; from-cover restores complete cover; cover zoom expands without stretching');
 // Visibility reporting varies with offscreen rendering; explicitly persist the fixture visit
 // and derive list counts from the actual store rather than assuming document.hidden.
 const ratedForRandom=initial.entries.find(r=>r.hasOutput&&r.disposition==='eligible'&&!r.progress?.seenAt&&!r.current&&r.id!==first.id&&initial.entries.filter(s=>s.hasOutput&&s.disposition==='eligible'&&(s.title+' '+s.coverTitle).toLocaleLowerCase().includes(r.title.toLocaleLowerCase())).length===1);assert(ratedForRandom,'Fixture needs a uniquely searchable unseen post to prove evaluated-post exclusion');
 await store.save({id:ratedForRandom.id,outputVersion:ratedForRandom.outputVersion,score:6,note:'RANDOM EXCLUSION FIXTURE ONLY'});
 assert.equal(await store.random({search:ratedForRandom.title}),null,'An exclusively searched evaluated post must never be a random candidate');
 await store.visit({id:first.id,outputVersion:version(first),page:2});await run('window.ThreadsPostReviewUI.reload()');
 await run("document.getElementById('excludeSeen').checked=true;document.getElementById('excludeSeen').dispatchEvent(new Event('change'))");
 assert.equal(await run("!!document.querySelector('.post-card[data-id='+"+JSON.stringify(JSON.stringify(first.id))+"+']')"),false);
 const unseen=(await store.list()).entries.filter(r=>r.hasOutput&&r.disposition==='eligible'&&!r.progress?.seenAt).length;
 assert.equal(await run("document.querySelectorAll('.post-card').length"),unseen);
 for(let n=0;n<12;n++){const random=await store.random({});assert(random?.hasOutput&&random.disposition==='eligible');assert.notEqual(random.id,first.id,'Random must exclude seen posts');assert.notEqual(random.id,ratedForRandom.id,'Random must exclude an unseen evaluated post');assert(!random.current?.score&&!random.current?.note?.trim(),'Random must exclude evaluated posts');}
 await run("document.getElementById('randomPost').onclick()");await requestedImage();assert.notEqual(await run("document.getElementById('pageImage').dataset.postId"),first.id);assert.notEqual(await run("document.getElementById('pageImage').dataset.postId"),ratedForRandom.id);
 await run("document.getElementById('excludeSeen').checked=false;document.getElementById('excludeSeen').dispatchEvent(new Event('change'))");
 checks.push('real workflow visit excludes viewed post from list; store random and UI random only choose unseen eligible unevaluated output');
 await select(other.id);await run("document.getElementById('note').value='COMPACT ROUND FIXTURE ONLY <script> memo';document.getElementById('note').dispatchEvent(new Event('input'));document.querySelector('[data-score=\"7\"]').click();window.ThreadsPostReviewUI.flush()");
 assert.equal((await store.list()).entries.find(r=>r.id===other.id).current.score,7);
 await run('window.ThreadsPostReviewUI.reload()');await select(other.id);assert.equal(await run("document.getElementById('note').value"),'COMPACT ROUND FIXTURE ONLY <script> memo');
 win.close();await until(()=>win.isDestroyed(),'flush and close');await service.open();win=service.getWindow();await until(()=>run("document.querySelectorAll('.post-card').length===365"),'reopened full list');await select(other.id);
 assert.equal(await run("document.getElementById('note').value"),'COMPACT ROUND FIXTURE ONLY <script> memo');assert.equal(await run("document.querySelector('[data-score=\"7\"]').getAttribute('aria-pressed')"),'true');
 checks.push('fixture-only score/memo save survives latest-list reload and close/reopen');
 // Exercise real service IPC races with delayed real store reads, not synthetic UI data.
 await select(first.id);await run('window.ThreadsPostReviewUI.reload()');await requestedImage();let release;
 const pending=new Promise(resolve=>{release=resolve;});store.image=(id,p,v)=>id===first.id&&p===8?pending:originalImage(id,p,v);
 await go(8);await go(9);await requestedImage();const currentImage=digest(await run("document.getElementById('pageImage').src"));release(await originalImage(first.id,8,version(first)));await pause(80);
 assert.equal(digest(await run("document.getElementById('pageImage').src")),currentImage,'Late old page must not overwrite current page');store.image=originalImage;
 let reject;const abandoned=new Promise((_resolve,r)=>{reject=r;});store.image=(id,p,v)=>id===first.id&&p===12?abandoned:originalImage(id,p,v);
 await go(12);await run("document.getElementById('vertical').click();document.getElementById('single').click();window.ThreadsPostReviewUI.select("+JSON.stringify(other.id)+",{page:2})");await requestedImage();const otherImage=digest(await run("document.getElementById('pageImage').src"));reject(Error('Abandoned fixture read'));await pause(100);
 assert.equal(digest(await run("document.getElementById('pageImage').src")),otherImage);assert.equal(await run("document.getElementById('error').hidden"),true);store.image=originalImage;
 checks.push('rapid page/post/mode changes ignore abandoned delayed success and error');
 await select(first.id,2);await run('window.ThreadsPostReviewUI.reload()');await requestedImage();const priorImage=digest(await run("document.getElementById('pageImage').src"));let fail=true;
 store.image=(id,p,v)=>{if(id===first.id&&p===16&&fail){fail=false;return Promise.reject(Error('Fixture temporary read failure'));}return originalImage(id,p,v);};
 await go(16);await until(()=>run("!document.getElementById('error').hidden"),'transient body failure');assert.equal(digest(await run("document.getElementById('pageImage').src")),priorImage);
 await run("document.getElementById('retryPage').click()");await requestedImage();assert.equal(await run("document.getElementById('error').hidden"),true);store.image=originalImage;
 checks.push('body read failure preserves decoded preview and same-page retry recovers');
 // New-round stale guard and draft recovery use a real canonical fixture transaction.
 const savedRound=report.reviewRound,nextRound='compact-smoke-next-'+Date.now();await run('window.ThreadsPostReviewUI.flush()');
 await store.withCanonicalWriter(async()=>{await fs.copyFile(store.file,path.join(fixture,'qa-old-feedback.json'));report.reviewRound=nextRound;for(const row of report.entries)row.reviewRound=nextRound;
  await fs.writeFile(path.join(fixture,OUTPUT,'status.json'),JSON.stringify(report));await fs.writeFile(path.join(fixture,'review-current.json'),JSON.stringify({reviewRound:nextRound}));await fs.writeFile(store.file,JSON.stringify({schemaVersion:1,recordType:'user_post_quality_feedback',reviewRound:nextRound,evaluations:[]}));});
 await run("document.getElementById('note').value='OLD ROUND UNSAVED FIXTURE DRAFT';document.getElementById('note').dispatchEvent(new Event('input'))");const beforeStale=digest(await run("document.getElementById('pageImage').src"));
 await go(18);await until(()=>run("!document.getElementById('loadRecovery').hidden"),'real changed-round rejection');assert.equal(digest(await run("document.getElementById('pageImage').src")),beforeStale);assert.equal(await run("document.getElementById('note').disabled"),true);
 await run("document.getElementById('reloadLatest').click()");await until(()=>run("document.getElementById('roundLabel').textContent.includes("+JSON.stringify(nextRound)+")&&!document.getElementById('note').disabled"),'latest-round recovery');await requestedImage();
 assert.equal(await run("document.getElementById('pageSelect').value"),'18');assert.equal(await run("document.getElementById('note').value"),'');assert.equal((await store.list()).entries.find(r=>r.id===first.id).current,null);
 assert((await run("document.getElementById('previousDraft').textContent")).includes('OLD ROUND UNSAVED FIXTURE DRAFT'));assert.equal((await json(path.join(fixture,'qa-old-feedback.json'))).evaluations.find(r=>r.id===other.id).score,7);
 const list=store.list,preview=digest(await run("document.getElementById('pageImage').src"));store.list=()=>Promise.reject(Error('Fixture latest-list failure'));
 await run('window.ThreadsPostReviewUI.reload()');assert.equal(digest(await run("document.getElementById('pageImage').src")),preview);assert.equal(await run("document.getElementById('note').disabled"),true);
 store.list=list;await run('window.ThreadsPostReviewUI.reload()');await requestedImage();assert.equal(await run("document.getElementById('error').hidden"),true);
 checks.push('real stale round keeps body preview and unsaved draft; latest recovery preserves post/page; old saved evaluation stays archived; failed latest list retains preview and recovers');
 await snapshot('body-latest-round-recovered');await run("document.getElementById('note').value='INDEPENDENT PROCESS RESTORE FIXTURE ONLY';document.getElementById('note').dispatchEvent(new Event('input'));document.querySelector('[data-score=\"8\"]').click();window.ThreadsPostReviewUI.flush()");
 await fs.writeFile(path.join(qa,'process-restore-request.json'),JSON.stringify({fixture,createdPid:process.pid,id:first.id,reviewRound:nextRound,score:8,note:'INDEPENDENT PROCESS RESTORE FIXTURE ONLY',page:18,moduleRoot,assetRoot},null,2));
 assert.deepEqual(await head(source),sourceHead,'Read-only source state must remain byte-identical');assert.deepEqual(await head(baseline),baselineHead,'Read-only baseline state must remain byte-identical');
 assert(BrowserWindow.getAllWindows().every(w=>!w.isVisible()));
 const provenance={moduleRoot,assetRoot,servicePreloadPath:preloadPath,realPreloadBridge:true,installedModules:!!option('installed-modules'),version:(await json(path.join(moduleRoot,'package.json'))).version,modules:{},assets:{}};
 for(const name of ['post-review-service.cjs','post-review-store.cjs','post-review-preload.cjs','package.json'])provenance.modules[name]=digest(await fs.readFile(path.join(moduleRoot,name)));
 for(const name of allowed)provenance.assets[name]=digest(await fs.readFile(path.join(assetRoot,name)));
 const result={pass:true,compactCoverPass:!legacy,legacyUiOnly:legacy,checkedAt:new Date().toISOString(),fixtureOnly:true,copiedOnlyReviewFiles:true,sourceReadOnly:source,baselineReadOnly:baseline,fixture,reviewRound:savedRound,posts:365,pages:3073,covers:{square:contract.square,portrait:contract.portrait,photosContained:legacy?null:contract.photos,originalSourcePhotos:contract.sourcePhotos,aiAssetsUsed:contract.aiAssets},bodyUnchanged:2708,initialEvaluations,requireBlank:!allowExisting,provenance,copied,checks,geometry,allWindowsHidden:true,sourceStateUnchanged:true};
 await fs.writeFile(path.join(qa,'compact-round-check.json'),JSON.stringify(result,null,2));console.log('COMPACT REVIEW ROUND PASS '+JSON.stringify({...result,geometry:undefined,checks:checks.length,copied:{files:copied.files,bytes:copied.bytes,skippedLinks:copied.skippedLinks.length}}));
 for(const w of BrowserWindow.getAllWindows())w.destroy();app.exit(0);
}).catch(async error=>{console.error(error.stack);await fs.mkdir(qa,{recursive:true});if(win&&!win.isDestroyed())await snapshot('failure').catch(()=>{});await fs.writeFile(path.join(qa,'compact-round-error.json'),JSON.stringify({pass:false,fixture,checks,geometry,copied,lastJavaScript,rendererMessages,error:error.stack},null,2));app.exit(1);});
