import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createStudioServer} from '../server.mjs';
import assert from 'node:assert/strict';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'upload-studio-browser-'));
const studioRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(studioRoot,'evidence');await fs.mkdir(out,{recursive:true});
let chrome,app,socket;const calls=new Map(),events=new Map();let serial=0,external=0,holdSync=false,heldSync=null,finalReviewRequests=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<300;i++){const x=await fn();if(x)return x;await wait(100);}throw Error('browser_condition_timeout');}
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{calls.delete(id);reject(Error('CDP timeout: '+method));},10000);calls.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});socket.send(JSON.stringify({id,method,params}));});}
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
async function click(selector){const rect=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e)throw Error("missing element");e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...rect});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...rect});}
async function fill(selector,text){await click(selector);await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});await send('Input.insertText',{text});}
async function shot(name){await evaluate('window.scrollTo(0,0)');const {data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(out,name),Buffer.from(data,'base64'));console.log('SCREENSHOT '+path.join(out,name));}
async function api(route,body){const r=await fetch(app.url+route,{method:body?'POST':'GET',headers:body?{'content-type':'application/json','x-studio-local':'1'}:{},body:body?JSON.stringify(body):undefined});const v=await r.json();assert.equal(r.status,200,JSON.stringify(v));return v;}
try {
  for(const file of ['domain.mjs','store.mjs','server.mjs','adapter.mjs','planner-worker.mjs','local-assets.mjs','public/studio.js','public/icons.mjs','public/draft-backups.mjs','production-input.mjs','production-sync.mjs','title-normalization.mjs']){const r=spawnSync(process.execPath,['--check',path.join(studioRoot,file)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
  let executable;for(const p of [process.env.STUDIO_CHROMIUM_EXECUTABLE||'/missing-explicit-browser',path.join(process.env.PROGRAMFILES||'C:\\Program Files','Google','Chrome','Application','chrome.exe'),path.join(process.env['PROGRAMFILES(X86)']||'C:\\Program Files (x86)','Google','Chrome','Application','chrome.exe'),'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser']){try{await fs.access(p);executable=p;break;}catch{}}
  if(!executable)throw Error('actual_browser_unavailable');
  app=await createStudioServer({root:path.join(root,'data'),port:0,materialRoot:path.join(root,'production-materials')});
  chrome=spawn(executable,['--headless=new','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--disable-default-apps','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+path.join(root,'chrome'),'about:blank'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
  let errors='';chrome.stderr.on('data',c=>errors+=String(c));chrome.on('error',e=>errors+=e.message);
  const port=await until(async()=>{try{return (await fs.readFile(path.join(root,'chrome','DevToolsActivePort'),'utf8')).split('\n')[0];}catch{if(chrome.exitCode!==null)throw Error('Chrome exited: '+errors.slice(-1200));return null;}});
  const pages=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());socket=new WebSocket(pages.find(x=>x.type==='page').webSocketDebuggerUrl);
  socket.addEventListener('message',event=>{const msg=JSON.parse(String(event.data));if(msg.id){const c=calls.get(msg.id);if(c){calls.delete(msg.id);msg.error?c.reject(Error(msg.error.message)):c.resolve(msg.result);}}else events.get(msg.method)?.(msg.params);});
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  events.set('Fetch.requestPaused',p=>{if(p.request.url===app.url+'/api/final-review')finalReviewRequests++;if(holdSync&&p.request.url===app.url+'/api/production/sync'){heldSync=p.requestId;return;}if(p.request.url.startsWith(app.url+'/')||p.request.url.startsWith('data:')||p.request.url.startsWith('blob:'))send('Fetch.continueRequest',{requestId:p.requestId}).catch(()=>{});else {external++;send('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'}).catch(()=>{});}});
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1400,deviceScaleFactor:1,mobile:false});await send('Emulation.setTimezoneOverride',{timezoneId:'Asia/Seoul'});
  await send('Page.navigate',{url:app.url});await until(()=>evaluate('document.querySelector("#status")?.textContent.startsWith("로컬 저장을 불러왔습니다.")'));

  await click('#empty-new');await until(()=>evaluate('!document.querySelector("#composer").hidden'));
  const first=(await api('/api/state')).state.posts[0].post_id;
  assert.equal(await evaluate('document.querySelector("#add-queue").disabled'),true);
  const rejected=await fetch(app.url+'/api/queue',{method:'POST',headers:{'content-type':'application/json','x-studio-local':'1'},body:JSON.stringify({post_id:first,expected_revision:(await api('/api/state')).state.posts[0].revision})});
  assert.equal(rejected.ok,false);assert.equal((await api('/api/state')).state.jobs.length,0);
  const assets=[];
  for(let i=0;i<3;i++){
    const data=await evaluate('(()=>{const c=document.createElement("canvas");c.width=120;c.height=120;const x=c.getContext("2d");x.fillStyle='+JSON.stringify(['#185c3a','#c1aa7c','#517ba0'][i])+';x.fillRect(0,0,120,120);return c.toDataURL("image/jpeg").split(",")[1];})()');
    assets.push({...((await api('/api/assets',{name:'review-'+i+'.jpg',mime:'image/jpeg',base64:data})).asset),order:i+1});
  }
  let post=(await api('/api/state')).state.posts[0];
  await api('/api/posts/'+encodeURIComponent(first),{expected_revision:post.revision,patch:{images:assets}});
  await send('Page.reload');await until(()=>evaluate('document.querySelector("#selected-image-position")?.textContent==="1 / 3"'));
  const geometry=await evaluate('(()=>{const r=x=>document.querySelector(x).getBoundingClientRect();return {list:r(".library").x,preview:r("#preview-column").x,writing:r(".writing").x};})()');
  assert.ok(geometry.list<geometry.preview&&geometry.preview<geometry.writing,JSON.stringify(geometry));
  assert.equal(await evaluate('document.querySelector("#readiness")'),null);
  assert.equal(await evaluate('document.querySelector("#image-list")'),null);
  assert.equal(await evaluate('document.querySelector("#identity").textContent.includes("draft-")'),false);
  await click('[data-slide="1"]');await until(()=>evaluate('document.querySelector("#selected-image-position").textContent==="2 / 3"'));
  await click('#image-earlier');await until(async()=>(await api('/api/state')).state.posts[0].images[0].asset_id===assets[1].asset_id);
  assert.equal(await evaluate('document.querySelector("#selected-image-position").textContent'),'1 / 3');
  await click('#image-later');await until(async()=>(await api('/api/state')).state.posts[0].images[1].asset_id===assets[1].asset_id);
  await click('#exclude-image');await until(async()=>(await api('/api/state')).state.posts[0].images.length===2);
  assert.deepEqual((await api('/api/state')).state.posts[0].images.map(x=>x.asset_id),[assets[0].asset_id,assets[2].asset_id]);
  assert.equal((await fetch(app.url+'/assets/'+assets[1].asset_id)).status,200,'excluded image remains in local vault');
  await until(()=>evaluate('!document.querySelector("#restore-image").disabled'));await click('#restore-image');
  await until(async()=>(await api('/api/state')).state.posts[0].images.length===3);
  assert.deepEqual((await api('/api/state')).state.posts[0].images.map(x=>x.asset_id),assets.map(x=>x.asset_id));
  await fill('#caption','[ 최종 검토 문안 ]\n\n누르기 직전 편집도 저장한다.');
  await fill('#tags','#최종검토');
  await click('[data-final-review="passed"]');
  await until(async()=>{const p=(await api('/api/state')).state.posts[0];return p.final_review_status==='passed'&&p.caption.includes('누르기 직전')&&p.tags==='#최종검토';});
  assert.ok(await evaluate('document.querySelector("#final-review-status").textContent.includes("통과")'));
  await click('#review-handoff');await until(()=>evaluate('document.querySelector("#handoff-result").textContent.startsWith("1개 현재 통과본")'));
  assert.equal((await api('/api/state')).state.jobs.length,0);
  await click('#new-post');await until(async()=>(await api('/api/state')).state.posts.length===2);
  const second=(await api('/api/state')).state.posts[1].post_id;
  await fill('#caption','[ 두 번째 검토 ]\n\n수정 필요.');
  await click('[data-final-review="revise"]');await until(async()=>(await api('/api/state')).state.posts[1].final_review_status==='revise');
  assert.equal(await evaluate('document.querySelector("#add-queue").disabled'),true);
  // Native select keyboard navigation chooses the current-pass filter.
  await click('#post-status-filter');await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'End',code:'End',windowsVirtualKeyCode:35});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'End',code:'End',windowsVirtualKeyCode:35});await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await until(()=>evaluate('document.querySelectorAll("#post-list [data-post]").length===1'));
  await click('[data-post="'+first+'"]');await until(()=>evaluate('document.querySelector("#caption").value.includes("누르기 직전")'));
  await fill('#caption','[ 통과 후 수정 ]\n\n새 내용은 재검토한다.');
  assert.equal(await evaluate('document.querySelector("#add-queue").disabled'),true);
  await until(async()=>(await api('/api/state')).state.posts[0].final_review_status==='unreviewed');
  await click('[data-final-review="discard"]');await until(async()=>(await api('/api/state')).state.posts[0].final_review_status==='discard');
  await evaluate('window.__beforeReviewReload=true');await send('Page.reload');await until(()=>evaluate('window.__beforeReviewReload!==true && document.querySelector("#caption")?.value.includes("새 내용은 재검토")'));
  assert.ok(await evaluate('document.querySelector("#final-review-status").textContent.includes("폐기")'));
  assert.equal(await evaluate('document.querySelector("#add-queue").disabled'),true);
  await click('[data-post="'+second+'"]');await until(()=>evaluate('document.querySelector("#caption").value.includes("수정 필요")'));
  await click('[data-final-review="passed"]');await until(async()=>(await api('/api/state')).state.posts[1].final_review_status==='passed');
  await click('#add-queue');await until(async()=>(await api('/api/state')).state.jobs.length===1);
  // Hold a real browser sync before it reaches the server, then update the
  // production row while the final-pass click waits behind that sync.
  const material=path.join(root,'production-materials'),raceFolder=path.join(material,'06_자동 제작 결과','race','rendered');
  await fs.mkdir(raceFolder,{recursive:true});
  const raceBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ol8AAAAASUVORK5CYII=','base64'),{createHash}=await import('node:crypto');
  await fs.writeFile(path.join(raceFolder,'slide-001.png'),raceBytes);
  await fs.writeFile(path.join(raceFolder,'..','production-plan.json'),JSON.stringify({publishCaption:'[ 동기화 검토 v1 ]\n\n표시된 제작 버전만 검토한다.'}));
  const raceRow={id:'race-review',title:'동기화 중 최종 검토',sourceUrl:'https://example.invalid/race-review',sourceFingerprint:'race-source',outputSha256:'race-output',ruleVersion:'race-rule',reviewRound:'race-v1',outputFolder:'race',images:[{name:'rendered/slide-001.png',sha256:createHash('sha256').update(raceBytes).digest('hex')}]};
  const raceStatus=path.join(material,'06_자동 제작 결과','status.json');
  await fs.writeFile(raceStatus,JSON.stringify({entries:[raceRow]}));await api('/api/production/sync',{});
  await evaluate('window.__beforeRaceReload=true');await send('Page.reload');await until(()=>evaluate('window.__beforeRaceReload!==true && !!document.querySelector(\'[data-post="race-review"]\') && document.querySelector("#production-sync-state").textContent.includes("활성")'));
  await click('[data-post="race-review"]');await until(()=>evaluate('document.querySelector("#identity").textContent.includes("동기화 중 최종 검토")'));
  const raceBefore=(await api('/api/state')).state.posts.find(p=>p.post_id==='race-review');
  holdSync=true;raceRow.reviewRound='race-v2';await fs.writeFile(raceStatus,JSON.stringify({entries:[raceRow]}));
  await until(()=>heldSync);
  const requestsBefore=finalReviewRequests;
  await click('[data-final-review="passed"]');
  await until(()=>evaluate('document.querySelector(\'[data-final-review="passed"]\').disabled'));
  holdSync=false;await send('Fetch.continueRequest',{requestId:heldSync});heldSync=null;
  await until(()=>evaluate('document.querySelector("#status").classList.contains("error") && document.querySelector("#status").textContent.includes("현재 버전 검수를 다시 불러온")'));
  const raceAfter=(await api('/api/state')).state.posts.find(p=>p.post_id==='race-review');
  assert.notEqual(raceAfter.output_version,raceBefore.output_version);
  assert.equal(raceAfter.final_review_status,'unreviewed');assert.equal(raceAfter.final_review,null);
  assert.equal(finalReviewRequests,requestsBefore,'unseen synced version must never reach verdict POST');
  assert.equal(await evaluate('document.querySelector("#add-queue").disabled'),true);
  // A new explicit click after seeing the refreshed version may pass it.
  await click('[data-final-review="passed"]');await until(async()=>(await api('/api/state')).state.posts.find(p=>p.post_id==='race-review').final_review_status==='passed');
  assert.equal(finalReviewRequests,requestsBefore+1);
  await click('[data-post="'+second+'"]');await until(()=>evaluate('document.querySelector("#caption").value.includes("수정 필요")'));
  // A competing edit changes the review intent while this click settles.
  // The client guard must reject it without passing any unseen content.
  post=(await api('/api/state')).state.posts[1];
  await api('/api/posts/'+encodeURIComponent(second),{expected_revision:post.revision,patch:{tags:'#다른창'}});
  const competingRequestsBefore=finalReviewRequests;
  await click('[data-final-review="passed"]');await until(()=>evaluate('document.querySelector("#status").classList.contains("error") && document.querySelector("#status").textContent.includes("현재 버전 검수를 다시 불러온")'));
  const competingAfter=(await api('/api/state')).state.posts.find(p=>p.post_id===second);
  assert.equal(competingAfter.tags,'#다른창');assert.equal(competingAfter.final_review_status,'unreviewed');assert.equal(competingAfter.final_review,null);
  assert.equal(finalReviewRequests,competingRequestsBefore,'changed unseen content must never reach verdict POST');
  assert.equal((await api('/api/state')).state.publications.length,0);assert.equal(external,0);
  await shot('final-review-layout.png');
  console.log('FINAL_REVIEW_BROWSER_PASS native image move/exclude/undo, no vault deletion, ordered layout, filters, flushed verdicts, navigation/reload, pass invalidation and competing edit intent rejection. External requests: 0.');
}catch(error){if(socket?.readyState===1){console.log("FAILURE_DOM",JSON.stringify(await evaluate('({save:document.querySelector("#save-state")?.textContent,status:document.querySelector("#status")?.textContent})')));await shot("final-review-failure.png");}throw error;}finally {socket?.close();chrome?.kill('SIGTERM');if(app)await app.close();await fs.rm(root,{recursive:true,force:true,maxRetries:20,retryDelay:100});}
