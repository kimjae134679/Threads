import vm from 'node:vm';
import test from 'node:test';import assert from 'node:assert/strict';import{createRequire}from'node:module';import{EventEmitter}from'node:events';
const require=createRequire(import.meta.url);
function fixture(){
 const shell=new EventEmitter();shell.mainFrame={url:'http://127.0.0.1:4387/materials/'};shell.getURL=()=>shell.mainFrame.url;shell.executeJavaScript=async()=>true;
 const window=new EventEmitter();window.webContents=shell;window.contentView={children:new Set(),addChildView(v){this.children.add(v);},removeChildView(v){this.children.delete(v);}};window.getContentBounds=()=>({width:1400,height:1000});window.isDestroyed=()=>false;
 const handles=new Map(),ipcMain={handle:(n,fn)=>handles.set(n,fn),removeHandler:n=>handles.delete(n)};const sessions=[];
 const session={fromPartition(){const ses={protocol:{handle:async()=>{}},setPermissionRequestHandler(fn){this.permission=fn;},setPermissionCheckHandler(){},webRequest:{onBeforeRequest(fn){ses.request=fn;}}};sessions.push(ses);return ses;}};
 class View {constructor(options){this.options=options;const wc=new EventEmitter();wc.mainFrame={url:''};wc.getURL=()=>wc.mainFrame.url;wc.setWindowOpenHandler=fn=>wc.popup=fn;wc.executeJavaScript=async expression=>{wc.scripts.push(expression);if(expression.includes('canLeave'))return vm.runInNewContext(expression,{window:{ThreadsStudioToolView:{canLeave:async()=>wc.canLeave}},Promise});return true;};wc.scripts=[];wc.canLeave=true;wc.loadURL=async url=>{wc.mainFrame.url=url;};wc.close=()=>{wc.closed=true;};wc.isDestroyed=()=>wc.closed===true;wc.focus=()=>{};this.webContents=wc;}setBounds(b){this.bounds=b;}setVisible(v){this.visible=v;}}
 const context={key:'a'.repeat(64),postId:'source-fixture',outputVersion:'version-1',fingerprint:'b'.repeat(64),title:'모의 선택 원문',bodyKind:'verbatim',summaryOnly:false,sourceGate:{publicationAllowed:false}};
 const calls=[];let current={...context};const studio={url:'http://127.0.0.1:4387',resolveToolSource:async input=>{calls.push(input);if(input.key!==current.key||input.postId!==current.postId||input.outputVersion!==current.outputVersion||input.fingerprint!==current.fingerprint)throw Error('studio_source_changed');return{...current};}};
 return{window,shell,handles,ipcMain,session,sessions,View,studio,context,calls,setCurrent:value=>current=value,event:()=>({sender:shell,senderFrame:shell.mainFrame})};
}
test('a selected verified source opens a same-window isolated view, and hidden views preserve their own state',async()=>{
 const f=fixture(),{createStudioTools}=require('../desktop/studio-tools.cjs'),host=await createStudioTools({...f,WebContentsView:f.View,app:{isPackaged:false},editorRoot:'synthetic-app',readAsset:async()=>Buffer.from('')});
 await host.open(f.event(),{tool:'production',key:f.context.key,postId:f.context.postId,outputVersion:f.context.outputVersion,fingerprint:f.context.fingerprint});assert.equal(f.window.contentView.children.size,1);const production=host.views.get('production');assert.equal(production.webContents.getURL(),'cut-editor://app/source-batch.html');assert.equal(production.options.webPreferences.nodeIntegration,false);assert.equal(production.options.webPreferences.sandbox,true);assert.equal(production.bounds.y,68);
 await host.back(f.event());assert.equal(production.visible,false);await host.open(f.event(),{tool:'production',key:f.context.key,postId:f.context.postId,outputVersion:f.context.outputVersion,fingerprint:f.context.fingerprint});assert.equal(host.views.get('production'),production);
 await host.close();assert.equal(production.webContents.closed,true);
});
test('HTTP subframes, foreign views, arbitrary files and stale source identities cannot invoke native tools',async()=>{
 const f=fixture(),{createStudioTools}=require('../desktop/studio-tools.cjs'),host=await createStudioTools({...f,WebContentsView:f.View,app:{isPackaged:false},editorRoot:'synthetic-app',readAsset:async()=>Buffer.from('')});
 for(const event of [{sender:{},senderFrame:f.shell.mainFrame},{sender:f.shell,senderFrame:{url:f.shell.mainFrame.url}}])await assert.rejects(host.open(event,{tool:'production',key:f.context.key,postId:f.context.postId,outputVersion:f.context.outputVersion,fingerprint:f.context.fingerprint}),/studio_tool_sender_invalid/);
 for(const payload of [{tool:'production',...f.context,path:'C:/private'},{tool:'other',...f.context},{tool:'production',...f.context,outputVersion:'version-other'}])await assert.rejects(host.open(f.event(),payload),/studio_(?:tool_request_invalid|source_changed)/);
 assert.equal(host.views.size,0);await host.close();
});
test('dirty editor or a failed shell save refuses replacement, return and close without destroying the draft',async()=>{
 const f=fixture(),{createStudioTools}=require('../desktop/studio-tools.cjs'),host=await createStudioTools({...f,WebContentsView:f.View,app:{isPackaged:false},editorRoot:'synthetic-app',readAsset:async()=>Buffer.from('')});
 await host.open(f.event(),{tool:'editor',key:f.context.key,postId:f.context.postId,outputVersion:f.context.outputVersion,fingerprint:f.context.fingerprint});const view=host.views.get('editor');view.webContents.canLeave=false;
 await assert.rejects(host.back(f.event()),/studio_tool_dirty/);await assert.rejects(host.close(),/studio_tool_dirty/);assert.equal(view.visible,true);assert.notEqual(view.webContents.closed,true);
 view.webContents.canLeave=true;await host.close();
});
