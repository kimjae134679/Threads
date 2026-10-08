'use strict';
const {app,protocol,nativeTheme,BrowserWindow}=require('electron');
const {finishQa,reportAndFinishQa}=require('./qa-electron-lifecycle.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const moduleRoot=process.argv.find(a=>a.startsWith('--installed-modules='))?.slice('--installed-modules='.length)||__dirname;
const assetRoot=process.argv.find(a=>a.startsWith('--assets='))?.slice('--assets='.length)||path.join(__dirname,'..','app');
const {registerPostReview}=require(path.join(moduleRoot,'post-review-service.cjs')),{version}=require(path.join(moduleRoot,'post-review-store.cjs'));
const qa=process.argv[2],source=process.argv[3],scenario=process.argv[4]||'all';
if(!path.isAbsolute(qa||'')||!path.isAbsolute(source||''))throw Error('Usage: electron review-recovery-smoke.cjs <absolute QA folder> <read-only material source> [scenario]');
app.disableHardwareAcceleration();app.commandLine.appendSwitch('force-device-scale-factor','1');app.setPath('userData',path.join(qa,'profile'));
protocol.registerSchemesAsPrivileged([{scheme:'cut-editor',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
const pause=ms=>new Promise(r=>setTimeout(r,ms)),checks=[];let fixture,win,store;
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
async function until(fn,label){for(let i=0;i<150;i++){if(await fn())return;await pause(40);}throw Error('Timed out: '+label);}
app.whenReady().then(async()=>{
 await fs.mkdir(qa,{recursive:true});fixture=await fs.mkdtemp(path.join(qa,'fixture-'));process.env.THREADS_TEST_MATERIAL_ROOT=fixture;
 await fs.writeFile(path.join(qa,'qa-process.json'),JSON.stringify({pid:process.pid,parentPid:process.ppid,executable:process.execPath,argv:process.argv,observedAtUtc:new Date().toISOString(),startedAtApproxUtc:new Date(Date.now()-process.uptime()*1000).toISOString(),electron:process.versions.electron,fixtureOnly:true},null,2));
 const report=JSON.parse(await fs.readFile(path.join(source,'06_자동 제작 결과','status.json'),'utf8')),generated=report.entries.filter(e=>e.outputFolder&&e.images.length>=3);
 const first={...generated.find(e=>e.images.length>=19)},other={...generated.find(e=>e.id!==first.id&&(scenario!=='layout'||e.coverAsset))},missing={...report.entries.find(e=>!e.outputFolder)};
 const longest={...generated.reduce((a,b)=>Array.from(a.coverTitle||a.title).length>=Array.from(b.coverTitle||b.title).length?a:b)};
 const rows=scenario==='layout'?[...new Map([first,other,longest,missing].map(r=>[r.id,r])).values()]:[first,other,missing],output=path.join(fixture,'06_자동 제작 결과'),round='review-recovery-fixture-1';
 for(const [i,row] of rows.entries()){
  const old=row.outputFolder;row.reviewRound=round;
  if(!old)continue;row.outputFolder='現在結果/post-'+i;const base=path.join(output,row.outputFolder);await fs.mkdir(path.join(base,'rendered'),{recursive:true});
  await fs.copyFile(path.join(source,'06_자동 제작 결과',old,'production-plan.json'),path.join(base,'production-plan.json'));
  for(const image of row.images)await fs.copyFile(path.join(source,'06_자동 제작 결과',old,image.name),path.join(base,image.name));
 }
 const statusFile=path.join(output,'status.json');await fs.writeFile(statusFile,JSON.stringify({entries:rows,reviewRound:round}));await fs.writeFile(path.join(fixture,'review-current.json'),JSON.stringify({reviewRound:round}));
 const allowed=new Set(['source-cut-post-review.html','source-cut-post-review.js','source-cut-post-review.css']),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
 protocol.handle('cut-editor',async request=>{const u=new URL(request.url),name=u.pathname.slice(1);if(u.host!=='app'||!allowed.has(name))return new Response('',{status:404});return new Response(await fs.readFile(path.join(assetRoot,name)),{headers:{'Content-Type':mime[path.extname(name)],'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src data:; connect-src 'none'"}});});
 const service=registerPostReview({app,trusted:()=>{throw Error('No editor');},materialRoot:fixture,preferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:false,offscreen:true}});store=service.store;
 await store.save({id:first.id,outputVersion:version(first),score:7,note:'이전 제작물 평가 — fixture only'});
 await service.open();win=service.getWindow();assert(!win.isVisible());const run=s=>win.webContents.executeJavaScript(s),select=id=>run('window.ThreadsPostReviewUI.select('+JSON.stringify(id)+')');
 const loaded=async()=>{const selected=await run("({id:document.querySelector('.post-card.active')?.dataset.id,page:Number(document.getElementById('pageSelect').value)})"),row=rows.find(r=>r.id===selected.id),expected=await image(row.id,selected.page,version(row));await until(async()=>await run("document.getElementById('pageImage').src")===expected&&await run("document.getElementById('pageImage').complete&&document.getElementById('pageImage').naturalWidth>0"),'decoded requested image');};
 const go=p=>run(`document.getElementById('pageSelect').value='${p}';document.getElementById('pageSelect').dispatchEvent(new Event('change'))`);
 const image=store.image;await until(()=>run("!!document.querySelector('.post-card.active')"),'initial list');await select(first.id);await loaded();await go(2);await loaded();
 async function advanceRound(nextRound='review-recovery-fixture-2',archive='old-feedback.json',flushFirst=true){if(flushFirst)await run('window.ThreadsPostReviewUI.flush()');await store.withCanonicalWriter(async()=>{
  await fs.copyFile(store.file,path.join(fixture,archive));
  for(const row of rows)row.reviewRound=nextRound;
  await fs.writeFile(statusFile,JSON.stringify({entries:rows,reviewRound:nextRound}));await fs.writeFile(path.join(fixture,'review-current.json'),JSON.stringify({reviewRound:nextRound}));
  await fs.writeFile(store.file,JSON.stringify({schemaVersion:1,recordType:'user_post_quality_feedback',reviewRound:nextRound,evaluations:[]}));
 });}
 if(scenario==='layout'){
  const geometry=[];
  for(const [width,height]of [[760,650],[1250,1000]]){
   win.setContentSize(width,height);
   for(const row of rows.filter(r=>r.outputFolder)){
    await select(row.id);await go(1);await loaded();await run('scrollTo(0,0)');await pause(150);
    const g=await run("(()=>{const img=document.getElementById('pageImage'),r=img.getBoundingClientRect(),dock=document.querySelector('.review-dock').getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight,dockTop:dock.top,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,zoom:document.getElementById('zoom').checked,triageBottom:document.getElementById('triage').getBoundingClientRect().bottom}})()");
    geometry.push({id:row.id,title:row.coverTitle||row.title,...g});
    await fs.writeFile(path.join(qa,'layout-'+width+'x'+height+'-'+row.id+'.png'),(await win.webContents.capturePage()).toPNG());
    await fs.writeFile(path.join(qa,'layout-geometry.json'),JSON.stringify(geometry,null,2));
    assert.equal(g.zoom,false);assert.equal(g.naturalWidth,1080);assert.equal(g.naturalHeight,1080);
    assert(g.width>=340,'Default cover must be at least 340px without zoom; '+JSON.stringify(g));
    assert(Math.abs(g.width-g.height)<1,'Square cover retains its ratio');assert(g.top>=0&&g.bottom<=g.dockTop,'Cover is fully visible above navigation');
   }
   await select(first.id);await go(2);await loaded();await run("document.getElementById('next').click()");await loaded();assert.equal(await run("document.getElementById('pageSelect').value"),'3');
   await run("document.getElementById('vertical').click();document.querySelector('#verticalPages img[data-page=\"4\"]').scrollIntoView({block:'start'})");
   await until(()=>run("document.querySelector('#verticalPages img[data-page=\"4\"]').naturalWidth>0"),'layout vertical body decoded');
   await fs.writeFile(path.join(qa,'layout-vertical-'+width+'x'+height+'.png'),(await win.webContents.capturePage()).toPNG());
   await run("document.getElementById('jumpFeedback').click()");await pause(300);
   assert.equal(await run("document.activeElement.id"),'note');
   await run("document.querySelector('[data-score=\"8\"]').click();document.getElementById('note').value='LAYOUT FIXTURE ONLY';document.getElementById('note').dispatchEvent(new Event('input'))");await run('window.ThreadsPostReviewUI.flush()');
   assert.equal((await store.list()).entries.find(r=>r.id===first.id).current.score,8);
   assert.equal((await store.list()).entries.find(r=>r.id===first.id).current.note,'LAYOUT FIXTURE ONLY');
   await run("document.getElementById('jumpFeedback').click()");await pause(300);
   assert.equal(await run("(()=>{const s=document.getElementById('scores').getBoundingClientRect(),n=document.getElementById('note').getBoundingClientRect();return s.top>=0&&n.bottom<=innerHeight})()"),true,'Scores and memo remain visible together after evaluation jump');
   await fs.writeFile(path.join(qa,'layout-feedback-'+width+'x'+height+'.png'),(await win.webContents.capturePage()).toPNG());
   await run("document.getElementById('triage').scrollIntoView({block:'center'})");await pause(80);
   assert.equal(await run("(()=>{const r=document.getElementById('holdPost').getBoundingClientRect();return r.width>0&&r.top>=0&&r.bottom<=innerHeight})()"),true,'Triage actions remain reachable');
   await select(missing.id);assert.equal(await run("document.getElementById('triage').hidden"),false,'Raw-only item keeps triage access');
   await run("document.getElementById('single').click()");
  }
  await fs.writeFile(path.join(qa,'layout-check.json'),JSON.stringify({pass:true,fixtureOnly:true,sourceReadOnly:source,moduleRoot,assetRoot,geometry,checks:['default unzoomed covers >=340px at both window sizes','complete title/photo/long title screenshots','body paging and vertical reading','fixture score and memo save','score memo and triage accessibility'],hidden:!win.isVisible()},null,2));
  console.log('REVIEW LAYOUT PASS');finishQa({app,BrowserWindow,exitCode:0});return;
 }
 if(['all','stale'].includes(scenario)){
  const previous=await run("document.getElementById('pageImage').src");await advanceRound();
  // An unsaved old-round draft must survive recovery without becoming a new-round evaluation.
  await run("document.getElementById('note').value='이전 회차 미저장 <script>메모';document.getElementById('note').dispatchEvent(new Event('input'))");
  await go(16);await until(()=>run("!document.getElementById('error').hidden"),'real store stale rejection');
  assert.equal(digest(await run("document.getElementById('pageImage').src")),digest(previous),'A rejected new page must keep the last decoded image');
  assert.equal(await run("document.getElementById('note').disabled"),true,'Old preview must not accept a new evaluation');
  assert.equal(await run("document.getElementById('loadRecovery').hidden"),false);
  await fs.writeFile(path.join(qa,'stale-preview.png'),(await win.webContents.capturePage()).toPNG());
  for(const theme of ['light','dark']){
   nativeTheme.themeSource=theme;win.setSize(760,650);await pause(100);
   await run("document.getElementById('loadRecovery').scrollIntoView({block:'center'})");
   assert.equal(await run("(()=>{const b=document.getElementById('reloadLatest').getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight;})()"),true,'Recovery button stays reachable in small '+theme+' window');
   await fs.writeFile(path.join(qa,'stale-small-'+theme+'.png'),(await win.webContents.capturePage()).toPNG());
  }
  nativeTheme.themeSource='system';win.setSize(1250,1000);await run('window.scrollTo(0,0)');
  checks.push('recovery action is reachable at 760×650 in light/dark system themes');
  await run("document.getElementById('reloadLatest').click()");await until(()=>run("document.getElementById('roundLabel').textContent.includes('fixture-2')&&document.getElementById('pageSelect').value==='16'&&document.getElementById('pageImage').dataset.outputVersion==="+JSON.stringify(version(first))), 'latest round and requested position');await loaded();
  assert.equal(await run("document.getElementById('note').value"),'');assert.equal((await store.list()).entries.find(e=>e.id===first.id).current,null);
  assert.equal(JSON.parse(await fs.readFile(path.join(fixture,'old-feedback.json'),'utf8')).evaluations[0].score,7);
  assert((await run("document.getElementById('previousDraft').textContent")).includes('이전 회차 미저장 <script>메모'));
  assert.equal(await run("document.getElementById('scores').querySelector('[aria-pressed=true]')===null"),true);
  checks.push('real stale-round rejection keeps preview; reload preserves post/page; old saved and unsaved evaluations never migrate');
  await fs.writeFile(path.join(qa,'recovered-round.png'),(await win.webContents.capturePage()).toPNG());
 }
 if(['all','retry'].includes(scenario)){
  await select(first.id);await go(2);await loaded();const prior=await run("document.getElementById('pageImage').src");let failed=false;
  store.image=async(id,p,v)=>{if(id===first.id&&p===18&&!failed){failed=true;throw Error('이미지 파일을 읽을 수 없습니다.');}return image(id,p,v);};
  await go(18);await until(()=>run("!document.getElementById('error').hidden"),'transient read error');
  assert.equal(digest(await run("document.getElementById('pageImage').src")),digest(prior),'Transient read error must retain a readable preview');
  assert.equal(await run("document.getElementById('retryPage').disabled"),false);await run("document.getElementById('retryPage').click()");await until(()=>run("document.getElementById('pageImage').dataset.page==='18'&&!document.getElementById('note').disabled"),'same page retry');await loaded();
  assert.equal(await run("document.getElementById('error').hidden"),true);checks.push('transient image error retries the same page without discarding preview');store.image=image;
 }
 if(['all','late-error'].includes(scenario)){
  await select(first.id);await loaded();let reject;const pending=new Promise((_resolve,r)=>{reject=r;});store.image=(id,p,v)=>id===first.id&&p===9?pending:image(id,p,v);
  await go(9);await select(other.id);await loaded();const currentImage=await run("document.getElementById('pageImage').src");reject(Error('제작 결과가 바뀌었습니다. 목록을 다시 여세요.'));await pause(100);
  assert.equal(await run("document.getElementById('error').hidden"),true,'A late rejection for another post must not taint the current post');assert.equal(digest(await run("document.getElementById('pageImage').src")),digest(currentImage));checks.push('late rejection from abandoned post is ignored');store.image=image;
 }
 if(['all','late-success'].includes(scenario)){
  await select(first.id);await loaded();let release;const pending=new Promise(r=>{release=r;});store.image=(id,p,v)=>id===first.id&&p===10?pending:image(id,p,v);
  await go(10);await go(11);await loaded();const currentImage=await run("document.getElementById('pageImage').src");release(await image(first.id,10,version(first)));await pause(100);
  assert.equal(digest(await run("document.getElementById('pageImage').src")),digest(currentImage));checks.push('late successful page cannot overwrite newer page');store.image=image;
 }
 if(['all','vertical'].includes(scenario)){
  await select(first.id);await loaded();let fail=true;store.image=async(id,p,v)=>{if(id===first.id&&p===7&&fail){fail=false;throw Error('이미지 읽기 실패 — fixture');}return image(id,p,v);};
  await run("document.getElementById('vertical').click();document.querySelector('#verticalPages img[data-page=\"7\"]').scrollIntoView({block:'center'})");await until(()=>run("!document.getElementById('error').hidden"),'vertical read failure');
  assert.equal(await run("!!document.querySelector('#verticalPages button[data-retry-page=\"7\"]')"),true,'Failed vertical page needs an explicit retry');await run("document.querySelector('#verticalPages button[data-retry-page=\"7\"]').click()");await until(()=>run("document.querySelector('#verticalPages img[data-page=\"7\"]').naturalWidth>0"),'vertical retry');
  checks.push('vertical failed image gives its reason and retry');store.image=image;await run("document.getElementById('single').click()");
 }
 if(['all','empty'].includes(scenario)){
  await select(missing.id);assert.equal(await run("document.getElementById('reader').hidden"),true);assert.equal(await run("document.getElementById('unavailable').hidden"),false);assert((await run("document.getElementById('unavailable').textContent")).includes(missing.reason));assert((await run("document.getElementById('postMeta').textContent")).includes('제작물 없음'));checks.push('no-output item explains its reason instead of an empty body');
 }
 if(['all','reload'].includes(scenario)){
  await select(first.id);await go(12);await loaded();
  await run("document.getElementById('note').value='현재 회차 평가';document.getElementById('note').dispatchEvent(new Event('input'))");
  await run('window.ThreadsPostReviewUI.reload()');await loaded();
  assert.equal(await run("document.querySelector('.post-card.active').dataset.id"),first.id);
  assert.equal(await run("document.getElementById('pageSelect').value"),'12');
  assert.equal((await store.list()).entries.find(e=>e.id===first.id).current.note,'현재 회차 평가');
  checks.push('same-round reload saves only its current draft and retains post/page');
  const list=store.list;let release,started=false;const pending=new Promise(r=>{release=r;});
  store.list=async()=>{started=true;return pending;};
  await run("window.pendingRecoveryReload=window.ThreadsPostReviewUI.reload();void 0");
  await until(()=>started,'pending latest list');
  assert.equal(await run("document.getElementById('note').disabled"),true);
  await select(other.id);await loaded();release(await list());await run('window.pendingRecoveryReload');
  assert.equal(await run("document.querySelector('.post-card.active').dataset.id"),other.id);
  assert.equal(await run("document.getElementById('note').disabled"),false);
  checks.push('late list reload cannot undo a newer post selection');store.list=list;
  const previous=await run("document.getElementById('pageImage').src");store.list=async()=>{throw Error('목록 읽기 실패 — fixture');};
  await run('window.ThreadsPostReviewUI.reload()');
  assert.equal(digest(await run("document.getElementById('pageImage').src")),digest(previous));
  assert.equal(await run("document.getElementById('loadRecovery').hidden"),false);
  assert.equal(await run("document.getElementById('note').disabled"),true);
  store.list=list;await run('window.ThreadsPostReviewUI.reload()');await loaded();
  assert.equal(await run("document.getElementById('error').hidden"),true);
  checks.push('failed list reload retains preview and recovers with another reload');
  await select(first.id);await loaded();await run("document.getElementById('vertical').click();document.querySelector('#verticalPages img[data-page=\"12\"]').scrollIntoView({block:'start'})");
  await until(()=>run("document.querySelector('#verticalPages img[data-page=\"12\"]').naturalWidth>0"),'vertical position before reload');
  // Hidden QA windows intentionally do not write seen progress; capture the actual reader position explicitly.
  await run("document.getElementById('pageSelect').value='12';document.getElementById('pageSelect').dispatchEvent(new Event('change'))");
  await run('window.ThreadsPostReviewUI.reload()');
  await until(()=>run("document.querySelector('#verticalPages img[data-page=\"12\"]').naturalWidth>0"),'vertical position after reload');
  assert.equal(await run("document.getElementById('vertical').getAttribute('aria-pressed')"),'true');
  assert.equal(await run("Math.abs(document.querySelector('#verticalPages img[data-page=\"12\"]').getBoundingClientRect().top)<5"),true);
  await until(()=>run("[...document.querySelectorAll('#verticalPages img')].filter(img=>{const b=img.getBoundingClientRect();return b.top<innerHeight+300&&b.bottom>0;}).every(img=>img.complete&&img.naturalWidth>0)"),'visible vertical images decoded for capture');
  await until(()=>run("[...document.querySelectorAll('#posts img')].every(img=>img.complete&&img.naturalWidth>0)"),'visible output thumbnails decoded for capture');
  await fs.writeFile(path.join(qa,'vertical-reloaded.png'),(await win.webContents.capturePage()).toPNG());
  checks.push('vertical mode and target reading page survive latest-list reload');
  await run("document.getElementById('single').click()");await loaded();
 }
 if(['all','vertical-race'].includes(scenario)){
  await select(first.id);await run('window.ThreadsPostReviewUI.reload()');await loaded();
  let attempts=0,reject;const delayed=new Promise((_resolve,r)=>{reject=r;});
  store.image=(id,p,v)=>{if(id!==first.id||p!==7)return image(id,p,v);attempts++;if(attempts===1)throw Error('세로 페이지 최초 실패');if(attempts===2)return delayed;return image(id,p,v);};
  await run("document.getElementById('vertical').click();document.querySelector('#verticalPages img[data-page=\"7\"]').scrollIntoView({block:'center'})");
  await until(()=>run("!document.getElementById('loadRecovery').hidden"),'vertical initial error');
  await run("const retry=document.querySelector('#verticalPages button[data-retry-page=\"7\"]');retry.click();retry.click()");
  await until(()=>run("document.querySelector('#verticalPages img[data-page=\"7\"]').naturalWidth>0"),'newer vertical retry success');
  reject(Error('이전 세로 재시도의 늦은 실패'));await pause(100);
  assert.equal(await run("document.getElementById('error').hidden"),true,'A late vertical retry failure cannot overwrite a newer success');
  assert.equal(await run("document.getElementById('note').disabled"),false);
  checks.push('late vertical retry rejection cannot replace a newer successful retry');store.image=image;
  await run("document.getElementById('single').click()");await loaded();
 }
 if(['all','pending-save'].includes(scenario)){
  await select(first.id);await run('window.ThreadsPostReviewUI.reload()');await loaded();
  const save=store.save;let release,started=false,saveCount=0;const gate=new Promise(r=>{release=r;});
  store.save=async payload=>{started=true;saveCount++;await gate;return save(payload);};
  await run("document.getElementById('note').value='회차 전환 직전 진행 중 메모';document.getElementById('note').dispatchEvent(new Event('input'));window.pendingRecoverySave=window.ThreadsPostReviewUI.flush().catch(()=>{});void 0");
  await until(()=>started,'pending old-round save');
  await advanceRound('review-recovery-fixture-3','pending-feedback.json',false);
  await go(17);await until(()=>run("!document.getElementById('loadRecovery').hidden"),'stale image while save is pending');
  await run("window.pendingRecoveryReload=window.ThreadsPostReviewUI.reload();void 0");release();
  await run('window.pendingRecoveryReload');await loaded();
  assert.equal(await run("document.getElementById('roundLabel').textContent.includes('fixture-3')"),true);
  assert.equal(await run("document.getElementById('note').value"),'');
  assert((await run("document.getElementById('previousDraft').textContent")).includes('회차 전환 직전 진행 중 메모'));
  assert.equal((await store.list()).entries.find(e=>e.id===first.id).current,null);
  assert.equal(saveCount,1,'The rejected pending old-round save must never be replayed into the new round');
  checks.push('pending rejected old-round save settles once and its draft survives without replay');store.save=save;
 }
 if(['all','thumbnail'].includes(scenario)){
  await select(first.id);await loaded();await run("document.getElementById('search').value='NO MATCH THUMBNAIL QA';document.getElementById('search').dispatchEvent(new Event('input'))");await run('window.ThreadsPostReviewUI.reload()');
  let failed=false,attempts=0,rejectOld;const delayedThumb=new Promise((_resolve,reject)=>{rejectOld=reject;});store.image=(id,p,v)=>{if(id===other.id&&p===1){attempts++;if(attempts===1){failed=true;throw Error('표지 썸네일 읽기 실패 — fixture');}if(attempts===2)return delayedThumb;}return image(id,p,v);};
  await run("document.getElementById('search').value='';document.getElementById('search').dispatchEvent(new Event('input'))");
  const cardSelector='.post-card[data-id="'+other.id+'"]';await until(()=>failed,'thumbnail failure request');
  await until(()=>run("document.querySelector("+JSON.stringify(cardSelector+' img')+").alt==='표지 오류'"),'thumbnail explains failure');
  assert((await run("document.querySelector("+JSON.stringify(cardSelector)+").title")).includes('재시도'));
  await run("document.querySelector("+JSON.stringify(cardSelector)+").click()");await until(()=>attempts>=2,'stalled thumbnail retry');await run("document.querySelector("+JSON.stringify(cardSelector)+").click()");await loaded();
  await until(()=>run("document.querySelector("+JSON.stringify(cardSelector+' img')+").naturalWidth>0&&document.querySelector("+JSON.stringify(cardSelector+' img')+").alt===''"),'thumbnail retries on post selection');
  rejectOld(Error('이전 썸네일 재시도의 늦은 실패'));await pause(100);assert.equal(await run("document.querySelector("+JSON.stringify(cardSelector+' img')+").alt"),'','Late thumbnail retry failure cannot overwrite the newer success');assert.equal(await run("document.getElementById('error').hidden"),true);
  checks.push('thumbnail failure is explicit; post selection retries reader/thumbnail and late failed retry is ignored');store.image=image;
 }
 await run('window.ThreadsPostReviewUI.flush()');await fs.writeFile(path.join(qa,'recovery-check.json'),JSON.stringify({pass:true,fixtureOnly:true,sourceReadOnly:source,fixture,scenario,checks,hidden:!win.isVisible()},null,2));console.log('REVIEW RECOVERY PASS '+JSON.stringify({scenario,checks}));finishQa({app,BrowserWindow,exitCode:0});
}).catch(async error=>{console.error(error);await reportAndFinishQa({app,BrowserWindow,exitCode:1,report:async()=>{await fs.mkdir(qa,{recursive:true});await fs.writeFile(path.join(qa,'recovery-error.json'),JSON.stringify({pass:false,pid:process.pid,parentPid:process.ppid,fixtureOnly:true,scenario,fixture,checks,error:error.stack},null,2));}});});
