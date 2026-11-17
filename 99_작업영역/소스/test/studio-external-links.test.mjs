import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const native=require('../desktop/unified-studio.cjs');
const channel='studio:external:open';
function fixture({resolveHost=async()=>['93.184.216.34'],timeoutMs=100}={}){
 const handlers=new Map(),opened=[],scripts=[];let current='http://127.0.0.1:43987/materials/?section=research',active=true,destroyed=false;
 const frame={get url(){return current;},executeJavaScript:async code=>{scripts.push(code);return active;}};
 const wc={mainFrame:frame,getURL:()=>current,isDestroyed:()=>destroyed};
 const window={webContents:wc,isDestroyed:()=>destroyed};
 const ipcMain={handle:(c,h)=>handlers.set(c,h),removeHandler:c=>handlers.delete(c)};
 const bridge=native.createStudioExternalLinks({window,origin:'http://127.0.0.1:43987',ipcMain,resolveHost,openExternal:async url=>opened.push(url),timeoutMs});
 return{bridge,handlers,opened,scripts,event:{sender:wc,senderFrame:frame},setURL:v=>current=v,setActive:v=>active=v,setDestroyed:v=>destroyed=v,call:(url,event)=>handlers.get(channel)(event||{sender:wc,senderFrame:frame},url)};
}
test('HTTPS public DNS policy rejects ambiguous, local, credentialed and oversized URLs',()=>{
 assert.equal(native.externalHttpsUrl('https://example.com/path?a=1#end'),'https://example.com/path?a=1#end');
 for(const u of ['http://example.com','javascript:alert(1)','file:///private','https://a:b@example.com','https://example.com/\nfoo','https://example.com/%0afoo','https://example.com\\@evil.com','https://127.0.0.1','https://2130706433','https://[::1]','https://localhost','https://a.localhost','https://intranet','https://a.local','https://a.internal','https://a.test','https://example.com/'+ 'a'.repeat(2048),'https://example.com/'+ '한'.repeat(300)]){
  assert.throws(()=>native.externalHttpsUrl(u),/external_url_invalid/,u);
 }
 for(const address of ['127.0.0.1','10.0.0.1','169.254.1.1','172.16.0.1','192.168.1.1','100.64.0.1','192.0.2.1','224.1.2.3','::1','fe80::1','fc00::1','::ffff:127.0.0.1','2001:db8::1','2002:7f00:1::'])assert.equal(native.publicExternalAddress(address),false,address);
 assert.equal(native.publicExternalAddress('93.184.216.34'),true);assert.equal(native.publicExternalAddress('2606:4700:4700::1111'),true);
});
test('owned material main frame with actual activation opens only injected HTTPS target',async()=>{
 const f=fixture();await f.call('https://example.com/docs');assert.deepEqual(f.opened,['https://example.com/docs']);assert.equal(f.scripts.length,1);assert.match(f.scripts[0],/navigator\.userActivation/);f.bridge.close();assert.equal(f.handlers.size,0);
});
test('spoofed sender/frame, changed origin/page and inactive main frame never resolve or open',async()=>{
 let lookups=0;const f=fixture({resolveHost:async()=>{lookups++;return['93.184.216.34'];}});
 for(const e of [{...f.event,sender:{}},{...f.event,senderFrame:{url:f.event.senderFrame.url}},{sender:f.event.sender}])await assert.rejects(f.call('https://example.com',e),/external_sender_invalid/);
 for(const url of ['https://example.com/materials/','http://127.0.0.1:43987/','http://localhost:43987/materials/']){f.setURL(url);await assert.rejects(f.call('https://example.com'),/external_sender_invalid/);}
 f.setURL('http://127.0.0.1:43987/materials/');f.setActive(false);await assert.rejects(f.call('https://example.com'),/external_activation_required/);assert.equal(lookups,0);assert.equal(f.opened.length,0);f.bridge.close();
});
test('DNS errors, empty/private/mixed answers refuse external open',async()=>{
 for(const resolveHost of [async()=>[],async()=>['10.0.0.2'],async()=>['93.184.216.34','::1'],async()=>{throw Error('dns failure');}]){
  const f=fixture({resolveHost});await assert.rejects(f.call('https://example.com'));assert.equal(f.opened.length,0);f.bridge.close();
 }
});
test('navigation, frame replacement and close during lookup invalidate the pending user request',async()=>{
 for(const action of ['navigate','replace','close']){
  let release;const f=fixture({resolveHost:()=>new Promise(r=>release=r)}),p=f.call('https://example.com');await new Promise(r=>setImmediate(r));
  if(action==='navigate')f.setURL('http://127.0.0.1:43987/materials/?changed=1');
  if(action==='replace')f.event.sender.mainFrame={url:f.event.senderFrame.url};
  if(action==='close')f.bridge.close();
  release(['93.184.216.34']);await assert.rejects(p);assert.equal(f.opened.length,0);f.bridge.close();assert.equal(f.handlers.size,0);
 }
});
test('bounded DNS timeout aborts work, refuses parallel requests and leaves opener untouched',async()=>{
 let aborted=false;const f=fixture({timeoutMs:15,resolveHost:(_host,{signal})=>new Promise(()=>{signal.addEventListener('abort',()=>aborted=true,{once:true});})});
 const p=f.call('https://example.com');await new Promise(r=>setImmediate(r));await assert.rejects(f.call('https://example.org'),/external_request_pending/);await assert.rejects(p,/external_dns_timeout/);assert.equal(aborted,true);assert.equal(f.opened.length,0);f.bridge.close();
});
test('preload requires a trusted matching anchor click and live user activation; consumes it once',async()=>{
 const code=fs.readFileSync(new URL('../desktop/studio-preload.cjs',import.meta.url),'utf8'),listeners={},calls=[];let exposed,active=true;
 const context={require:()=>({contextBridge:{exposeInMainWorld:(_name,value)=>exposed=value},ipcRenderer:{invoke:async(...v)=>calls.push(v)}}),navigator:{userActivation:{get isActive(){return active;}}},document:{addEventListener:(type,fn)=>listeners[type]=fn},Date,URL,Promise,Error};
 vm.runInNewContext(code,context);const click=trusted=>listeners.click({isTrusted:trusted,button:0,target:{closest:()=>({href:'https://example.com/docs'})}});
 await assert.rejects(exposed.openExternal('https://example.com/docs'));click(false);await assert.rejects(exposed.openExternal('https://example.com/docs'));click(true);active=false;await assert.rejects(exposed.openExternal('https://example.com/docs'));active=true;click(true);await assert.rejects(exposed.openExternal('https://other.example.com'));click(true);await exposed.openExternal('https://example.com/docs');await assert.rejects(exposed.openExternal('https://example.com/docs'));assert.equal(calls.length,1);assert.equal(calls[0][0],channel);
});
test('material and research HTTPS anchors work on web; native delegation rejects synthetic clicks',async()=>{
 const source=fs.readFileSync(new URL('../upload-studio/public/materials.js',import.meta.url),'utf8'),start=source.indexOf('function externalLinkHref('),end=source.indexOf('// END_EXTERNAL_LINKS',start);assert.ok(start>=0&&end>start);
 const calls=[],notices=[];const context={URL,window:{},notice:(...v)=>notices.push(v)};
 vm.runInNewContext(source.slice(start,end)+';globalThis.links={externalLinkHref,handleExternalLinkClick}',context);
 assert.equal(context.links.externalLinkHref('https://example.com/a'),'https://example.com/a');assert.equal(context.links.externalLinkHref('javascript:alert(1)'),null);
 let prevented=0;const e={isTrusted:true,button:0,preventDefault(){prevented++;},target:{closest:()=>({href:'https://example.com/a'})}};
 await context.links.handleExternalLinkClick(e);assert.equal(prevented,0);
 context.window.ThreadsStudioShell={openExternal:async u=>calls.push(u)};await context.links.handleExternalLinkClick({...e,isTrusted:false});assert.equal(calls.length,0);await context.links.handleExternalLinkClick(e);assert.deepEqual(calls,['https://example.com/a']);assert.equal(prevented,2);
 const rs=source.indexOf('function renderResearchMarkdown('),re=source.indexOf('// END_RESEARCH_RENDERER',rs),render=vm.runInNewContext(source.slice(rs,re)+';renderResearchMarkdown',{URL});
 assert.match(render('[근거](https://example.com/docs)'),/data-external-link/);assert.match(source,/원문 열기/);
});

test('source anchor comes from the actual detail renderer, including unavailable body records',async()=>{
 const source=fs.readFileSync(new URL('../upload-studio/public/materials.js',import.meta.url),'utf8'),{DOMParser}=await import('linkedom/worker');
 const start=source.indexOf('function renderDetail('),end=source.indexOf('async function select(',start),target={dataset:{},innerHTML:''},nodes={detail:target,'open-production':{}};
 for(const originalText of ['모의 요약과 끝.',null]){
  const ctx={detail:{key:'collection:fixture',scope:'collection',title:'모의 소재',texts:{},originalTextKind:originalText?'summary':'unavailable',originalText,sourceMaterial:{human:{sourceUrl:'https://example.com/story/1'}},images:[],sourceFiles:[],publicationAuthorized:false},platform:'instagram',window:{},scopeLabels:{collection:'수집 소재'},bodyLabels:{summary:'수집 요약',unavailable:'본문 미확보'},$:id=>nodes[id],esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),externalLinkHref:v=>v,remember(){},openProduction(){}};
  vm.runInNewContext(source.slice(start,end)+';renderDetail()',ctx);
  const a=new DOMParser().parseFromString(target.innerHTML,'text/html').querySelector('.source-link a');
  assert.ok(a);assert.equal(a.href,'https://example.com/story/1');assert.equal(a.target,'_blank');assert.equal(a.textContent,'원문 열기');
 }
});
test('actual native initializer unregisters only its external IPC on clean close and retains network gates',async()=>{
 const {EventEmitter}=await import('node:events');let loaded,request;const handlers=new Map(),removed=[];
 class Window extends EventEmitter{constructor(){super();this.webContents=new EventEmitter();this.webContents.executeJavaScript=async()=>true;this.webContents.getURL=()=>loaded;this.webContents.setWindowOpenHandler=cb=>this.openHandler=cb;}async loadURL(url){loaded=url;this.webContents.mainFrame={url};}isDestroyed(){return false;}destroy(){}}
 const app=new EventEmitter();app.isPackaged=false;app.quit=()=>{};const ipcMain={handle:(c,h)=>handlers.set(c,h),removeHandler:c=>{removed.push(c);handlers.delete(c);}},ses={webRequest:{onBeforeRequest:cb=>request=cb},setPermissionRequestHandler(){},setPermissionCheckHandler(){},on(){}},root=process.cwd();
 const runtime=await native.openUnifiedStudio({app,BrowserWindow:Window,ipcMain,session:{fromPartition:()=>ses},args:['--project-root',root],loadRuntime:async()=>({studioLaunchConfig:()=>({projectRoot:root,preserveStartupState:true,seedTags:false,readOnlyInspection:true}),createStudioServer:async()=>({url:'http://127.0.0.1:43987',close:async()=>{}})}),externalLinkOptions:{resolveHost:async()=>['93.184.216.34'],openExternal:async()=>{throw Error('must not open');}}});
 assert.equal(handlers.has(channel),true);assert.deepEqual(runtime.window.openHandler({url:'https://example.com'}),{action:'deny'});request({url:'https://example.com'},v=>assert.equal(v.cancel,true));
 await runtime.close();await runtime.close();assert.deepEqual(removed,[channel]);assert.equal(handlers.size,0);
});

test('refused dirty/error tool close keeps external IPC usable until a successful clean retry',async()=>{
 const {EventEmitter}=await import('node:events'),nativeRequire=createRequire(new URL('../desktop/unified-studio.cjs',import.meta.url)),source=fs.readFileSync(new URL('../desktop/unified-studio.cjs',import.meta.url),'utf8');
 for(const refusal of ['studio_tool_dirty','studio_tool_save_failed']){
  const handlers=new Map(),removed=[],opened=[],ready=[];let loaded,dirty=true,serverClosed=0,toolClosed=0;
  const owned={url:'http://127.0.0.1:43987',close:async()=>{serverClosed++;},setNativeReady:v=>ready.push(v)};
  const module={exports:{}},previousRoot=process.env.THREADS_PROJECT_ROOT;
  const requireMock=id=>id==='./studio-tools.cjs'?{createStudioTools:async()=>({close:async()=>{toolClosed++;if(dirty)throw Error(refusal);}})}:id==='./studio-native.cjs'?{createNativeToolAdapter:()=>({})}:id==='./editor-assets.cjs'?{editorRoot:()=>'/owned-fixture-only'}:nativeRequire(id);
  vm.runInNewContext(source,{require:requireMock,module,exports:module.exports,__dirname:nativeRequire('node:path').dirname(nativeRequire.resolve('./unified-studio.cjs')),process,URL,AbortController,setTimeout,clearTimeout});
  class Window extends EventEmitter{constructor(){super();this.webContents=new EventEmitter();this.webContents.executeJavaScript=async()=>true;this.webContents.getURL=()=>loaded;this.webContents.setWindowOpenHandler=()=>{};}async loadURL(url){loaded=url;this.webContents.mainFrame={url,executeJavaScript:async()=>true};}isDestroyed(){return false;}destroy(){}}
  const app=new EventEmitter();app.isPackaged=false;app.quit=()=>{};const ipcMain={handle:(c,h)=>handlers.set(c,h),removeHandler:c=>{removed.push(c);handlers.delete(c);}},ses={webRequest:{onBeforeRequest(){}},setPermissionRequestHandler(){},setPermissionCheckHandler(){},on(){}},root=process.cwd();
  let runtime;
  try{
   runtime=await module.exports.openUnifiedStudio({app,BrowserWindow:Window,WebContentsView:function OwnedView(){},ipcMain,session:{fromPartition:()=>ses},args:['--project-root',root,'--native-route','/materials/'],loadRuntime:async()=>({studioLaunchConfig:()=>({projectRoot:root,preserveStartupState:true,seedTags:false,readOnlyInspection:true}),createStudioServer:async()=>owned}),externalLinkOptions:{resolveHost:async()=>['93.184.216.34'],openExternal:async url=>opened.push(url)}});
   await assert.rejects(runtime.close(),new RegExp(refusal));
   assert.equal(handlers.has(channel),true,'a refused close must not revoke the live window bridge');
   assert.equal(serverClosed,0);assert.deepEqual(ready,[true]);assert.deepEqual(removed,[]);
   await handlers.get(channel)({sender:runtime.window.webContents,senderFrame:runtime.window.webContents.mainFrame},'https://example.com/docs');
   assert.deepEqual(opened,['https://example.com/docs']);
   dirty=false;await runtime.close();await runtime.close();assert.equal(serverClosed,1);assert.equal(toolClosed,2);assert.deepEqual(ready,[true,false]);assert.deepEqual(removed,[channel]);assert.equal(handlers.size,0);
  }finally{dirty=false;await runtime?.close();if(previousRoot===undefined)delete process.env.THREADS_PROJECT_ROOT;else process.env.THREADS_PROJECT_ROOT=previousRoot;}
 }
});
