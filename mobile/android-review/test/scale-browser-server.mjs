// Owned loopback-only fixture server. Serves source modules with a synthetic
// transport; no real repository, user materials, credentials or Internet calls.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';import {createScaleFixture} from './scale-fixture.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function startScaleBrowserServer(){
 const fixture=createScaleFixture(),stats={assets:0,active:0,maxActive:0},blobShas=new Set(Object.values(fixture.state.assets).map(a=>a.blobSha));
 const seed=`import {initial,applyManifest} from '/core.js';import {openStore,writeStore} from '/storage.js';const db=await openStore();await writeStore(db,'state','current',applyManifest(initial(),${JSON.stringify(fixture.manifest)}));db.close();location.replace('/');`;
 const native=`import {createGithubAdapter} from '/github-adapter.js';globalThis.fixtureEnabled=!location.search.includes('offline');globalThis.fixtureCalls=[];globalThis.fixtureApiStatus=0;globalThis.fixtureConnectionOpens=0;globalThis.ReviewNative={config:()=>JSON.stringify({...${JSON.stringify(fixture.repository)},approved:globalThis.fixtureEnabled,connectionAvailable:location.search.includes('login-ready')}),openConnection:()=>{globalThis.fixtureConnectionOpens++;}};const provider=createGithubAdapter({...${JSON.stringify(fixture.repository)},approved:true,api:async(path,init={})=>{globalThis.fixtureCalls.push(path);if(globalThis.fixtureApiStatus)throw Object.assign(Error('Synthetic revoked session'),{status:globalThis.fixtureApiStatus});const r=await fetch('/fixture-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,init})});if(!r.ok)throw Error('Synthetic API unavailable '+r.status);return r.json();}});export const nativeGithub=()=>globalThis.fixtureEnabled?provider:null;export const openNativeConnection=()=>{globalThis.ReviewNative.openConnection();return true;};`;
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');const name=url.pathname.slice(1)||'index.html';
  try{
   if(name==='fixture-api'){
    let raw='';for await(const chunk of req)raw+=chunk;if(raw.length>65536)throw Error('Oversized synthetic request');const {path:route,init}=JSON.parse(raw);const asset=blobShas.has(route.split('/').at(-1));
    if(asset){stats.assets++;stats.active++;stats.maxActive=Math.max(stats.maxActive,stats.active);await new Promise(r=>setTimeout(r,150));}
    try{const data=await fixture.api(route,init);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));}finally{if(asset)stats.active--;}
    return;
   }
   if(name==='seed'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<meta charset="utf-8"><script type="module" src="/seed.js"></script>');return;}
   if(name==='seed.js'){res.setHeader('Content-Type','text/javascript');res.end(seed);return;}
   if(name==='native-api.js'){res.setHeader('Content-Type','text/javascript');res.end(native);return;}
   if(name==='classifier.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'../../desktop/review-workflow-model.cjs'),'utf8').replace(/module\.exports=\{[^}]+\};/,'export {classifyTopic};'));return;}
   if(!['index.html','style.css','ui.js','core.js','storage.js','transport.js','sync-engine.js','github-adapter.js','review-limits.js','asset-loader.js'].includes(name)){res.writeHead(404);res.end();return;}
   let content=fs.readFileSync(path.join(root,'app',name),'utf8');if(name==='index.html')content=content.replace('<script src="bundle.js" defer></script>','<script type="module" src="/ui.js"></script>');if(name==='ui.js')content="import {classifyTopic} from '/classifier.js';\n"+content;
   res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':'text/css');res.end(content);
  }catch(error){res.writeHead(503,{'Content-Type':'text/plain'});res.end(error.message);}
 });
 return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve({url:'http://127.0.0.1:'+server.address().port,fixture,stats,close:()=>new Promise(done=>server.close(done))})));
}
