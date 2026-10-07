'use strict';
const {app,BrowserWindow,protocol,nativeImage}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
app.disableHardwareAcceleration();app.setPath('userData',path.join(os.tmpdir(),'threads-cover-fit-'+process.pid));
protocol.registerSchemesAsPrivileged([{scheme:'cut-editor',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(fn){for(let n=0;n<100;n++){if(await fn())return;await pause(30);}throw Error('Cover fixture wait timed out');}
app.whenReady().then(async()=>{
 const image=nativeImage.createFromBitmap(Buffer.alloc(1080*1920*4,255),{width:1080,height:1920}).toDataURL();
 const row={id:'cover-fixture',title:'A full source title for the viewport fixture',coverTitle:'A full source title for the viewport fixture',hasOutput:true,outputVersion:'fixture-v1',pages:2,pageLabels:['\uD45C\uC9C0','\uBCF8\uBB38'],rank:1,topic:'life',topicLabel:'Life',disposition:'eligible',current:null,progress:null};
 const bootstrap='window.ThreadsPostReview={list:async()=>({entries:['+JSON.stringify(row)+']}),image:async()=>'+JSON.stringify(image)+',visit:async p=>({lastPage:p.page,pagesSeen:[p.page]}),onSelect:()=>{},onFilter:()=>{}};';
 const appRoot=path.join(__dirname,'..','app'),mime={'.html':'text/html','.css':'text/css','.js':'text/javascript'};
 protocol.handle('cut-editor',async req=>{const name=new URL(req.url).pathname.slice(1);if(!['source-cut-post-review.html','source-cut-post-review.js','source-cut-post-review.css'].includes(name))return new Response('',{status:404});let content=await fs.readFile(path.join(appRoot,name),'utf8');if(name.endsWith('.html'))content=content.replace('<script src="./source-cut-post-review.js">','<script>'+bootstrap+'</script><script src="./source-cut-post-review.js">');return new Response(content,{headers:{'Content-Type':mime[path.extname(name)]}});});
 const win=new BrowserWindow({show:false,width:1250,height:1000,useContentSize:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}}),run=s=>win.webContents.executeJavaScript(s);
 await win.loadURL('cut-editor://app/source-cut-post-review.html');await wait(()=>run("document.getElementById('pageImage').naturalHeight===1920"));await pause(100);
 const geometry=()=>run("(()=>{const i=document.getElementById('pageImage'),b=i.getBoundingClientRect(),d=document.querySelector('.review-dock').getBoundingClientRect();return {top:b.top,bottom:b.bottom,width:b.width,height:b.height,viewport:innerHeight,dockHeight:d.height,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight};})()");
 function fits(g){assert(g.top>=0&&g.bottom<=g.viewport-g.dockHeight-12,'Complete cover must fit above dock: '+JSON.stringify(g));assert.equal(g.naturalWidth,1080);assert.equal(g.naturalHeight,1920);assert(Math.abs(g.width/g.height-1080/1920)<.01,'Cover keeps original aspect ratio');}
 fits(await geometry());
 win.setContentSize(1250,760);await pause(150);fits(await geometry());
 win.setContentSize(760,650);await pause(150);fits(await geometry());
 win.setContentSize(1250,760);await pause(150);
 await run("document.getElementById('next').click()");await wait(()=>run("document.getElementById('pageSelect').value==='2'&&document.getElementById('pageImage').naturalHeight===1920"));await pause(100);const body=await geometry();assert(body.width>=400,'Body pages retain readable width');assert(body.height>body.viewport/2,'Body can scroll at full readable size');
 await run("document.getElementById('fromCover').click()");await pause(150);fits(await geometry());
 const cover=await geometry();await run("const z=document.getElementById('zoom');z.checked=true;z.dispatchEvent(new Event('change'))");await pause(100);assert((await geometry()).width>cover.width,'Zoom expands cover for closer reading');
 await run("document.getElementById('vertical').click()");await wait(()=>run("document.querySelector('#verticalPages img')?.naturalHeight===1920"));assert.equal(await run("document.querySelectorAll('#verticalPages figure').length"),2);assert.equal(await run("document.getElementById('stage').hidden"),true);
 console.log('Cover viewport fit: full default cover, resize, readable body, cover reset, zoom and vertical DOM PASS');win.destroy();app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});