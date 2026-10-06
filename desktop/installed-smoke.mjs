import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const [executable,destination]=process.argv.slice(2);
if(!executable||!destination)throw new Error('Specify the installed executable and verification output directory.');
await fs.mkdir(destination,{recursive:true});
const child=spawn(executable,['--disable-gpu','--inspect=127.0.0.1:9338','--user-data-dir='+path.join(destination,'profile')],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let socket,id=0;const pending=new Map();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 let endpoint;
 for(let n=0;n<60;n++){try{endpoint=(await(await fetch('http://127.0.0.1:9338/json')).json())[0]?.webSocketDebuggerUrl;if(endpoint)break;}catch{}await pause(100);}
 assert(endpoint,'Installed app inspector started');
 socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id&&pending.has(data.id)){pending.get(data.id)(data);pending.delete(data.id);}});
 const evaluate=expression=>new Promise((resolve,reject)=>{
  const request=++id;pending.set(request,data=>data.error||data.result?.exceptionDetails?reject(new Error(JSON.stringify(data))):resolve(data.result.result.value));
  socket.send(JSON.stringify({id:request,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
 });
 await evaluate(`globalThis.require=process.getBuiltinModule('module').createRequire(process.resourcesPath+'/app.asar/package.json');true`);
 let ready=false;
 for(let n=0;n<100;n++){
  ready=await evaluate(`(async()=>{const w=require('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()==='cut-editor://app/source-cut-editor.html');return !!w&&!w.webContents.isLoading()&&await w.webContents.executeJavaScript('Boolean(window.ThreadsCutDesktop&&window.ThreadsSourceCutEditor)');})()`);
  if(ready)break;await pause(100);
 }
 assert(ready,'Installed editor and bridge loaded');
 const check=await evaluate(`(async()=>{const e=require('electron'),w=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()==='cut-editor://app/source-cut-editor.html');await w.webContents.executeJavaScript('document.getElementById("openBundleTool").click()');await new Promise(r=>setTimeout(r,800));const b=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()==='cut-editor://app/source-batch.html');return {version:e.app.getVersion(),packaged:e.app.isPackaged,layout:await b.webContents.executeJavaScript('({version:window.ThreadsPagePlan.VERSION,analysis:!!window.ThreadsImageAnalysis,templates:document.getElementById("batchTemplate").options.length,manual:!!document.getElementById("manualTitleLayout")})')};})()`);
 assert.equal(check.version,'0.3.9');assert.equal(check.packaged,true);assert.equal(check.layout.version,'2026-10-06.3');assert.equal(check.layout.analysis,true);assert.equal(check.layout.templates,6);assert.equal(check.layout.manual,true);

 const review=await evaluate("(async()=>{const e=require('electron'),w=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()==='cut-editor://app/source-cut-editor.html');await w.webContents.executeJavaScript('window.ThreadsCutDesktop.openPostReview()');let r;for(let n=0;n<100;n++){r=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()==='cut-editor://app/source-cut-post-review.html');if(r&&await r.webContents.executeJavaScript(\"Boolean(document.getElementById('pageImage').naturalWidth)\").catch(()=>false))break;await new Promise(resolve=>setTimeout(resolve,100));}return await r.webContents.executeJavaScript(\"({count:document.querySelectorAll('.post-card').length,ratings:document.querySelectorAll('#scores button').length,loaded:document.getElementById('pageImage').naturalWidth>0,error:document.getElementById('error').hidden})\");})()");
 assert.equal(review.count,399);assert.equal(review.ratings,10);assert.equal(review.loaded,true);assert.equal(review.error,true);check.review=review;
 const reviewShot=await evaluate("(async()=>{const w=require('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()==='cut-editor://app/source-cut-post-review.html');await w.webContents.executeJavaScript(\"document.querySelector('.feedback').scrollIntoView({block:'end'})\");w.show();w.focus();await new Promise(r=>setTimeout(r,1000));return (await w.webContents.capturePage()).toPNG().toString('base64');})()");
 await fs.writeFile(path.join(destination,'installed-review-viewer.png'),Buffer.from(reviewShot,'base64'));
 const shot=await evaluate(`(async()=>{const w=require('electron').BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()==='cut-editor://app/source-cut-editor.html');w.show();await new Promise(r=>setTimeout(r,1000));return (await w.webContents.capturePage()).toPNG().toString('base64');})()`);
 await fs.writeFile(path.join(destination,'installed-app.png'),Buffer.from(shot,'base64'));
 await fs.writeFile(path.join(destination,'installed-check.json'),JSON.stringify(check,null,2));
 console.log('INSTALLED APP PASS',JSON.stringify(check));
 await evaluate(`setTimeout(()=>require('electron').app.exit(0),100);true`);
}finally{socket?.close();if(child.exitCode===null)await new Promise(resolve=>{child.once('exit',resolve);setTimeout(()=>{child.kill();resolve();},2000);});}
