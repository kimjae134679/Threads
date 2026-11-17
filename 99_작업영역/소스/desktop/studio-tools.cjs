'use strict';
// The HTTP workspace gets a selection-only bridge. File and render capabilities
// stay on separately owned cut-editor main frames in this BrowserWindow.
const path=require('node:path'),fs=require('node:fs/promises');
const URLS={production:'cut-editor://app/source-batch.html',editor:'cut-editor://app/source-cut-editor.html'};
const ASSETS=new Set(['source-cut-post-review.html','source-cut-post-review.css','source-cut-post-review.js','source-cut-editor.html','source-cut-editor.css','source-cut-editor.js','source-cut-automation.js','source-cut-automation.css','source-community-template.js','source-cut-model.js','source-cut-composition.js','source-cut-history.js','source-cut-zip.js','source-batch.html','source-batch.css','source-batch.js','source-batch-core.js','source-batch-image-analysis.js','source-page-plan.js','universal-production-model.js','source-curation.js','source-bundle-zip.js','source-workflow.js','viral-model.js','source-cut-review-loader.js','source-review-batches.js','source-review-gallery.js','source-batch-image-composition.js','source-cover-typography.js','unified-material-txt.js','source-workspace.js','source-workspace.css','fonts/CarouselSansKR-Regular.woff','fonts/CarouselSansKR-Black.woff','fonts/CutGothic-ExtraBold.woff']);
const fail=code=>{throw Error(code);};
function selector(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['tool','key','postId','outputVersion','fingerprint'].includes(k))||!Object.hasOwn(URLS,value.tool)||typeof value.key!=='string'||!value.key||typeof value.postId!=='string'||!value.postId||value.outputVersion!==null&&typeof value.outputVersion!=='string'||typeof value.fingerprint!=='string'||!value.fingerprint)fail('studio_tool_request_invalid');
 return{key:value.key,postId:value.postId,outputVersion:value.outputVersion,fingerprint:value.fingerprint};
}
function publicContext(c){return{key:c.key,postId:c.postId,outputVersion:c.outputVersion,fingerprint:c.fingerprint,title:c.title,bodyKind:c.bodyKind,sourceUrl:c.sourceUrl||null,summary:c.summary||null,source:c.source||null,savedSelection:c.savedSelection||null,editorFiles:c.editorFiles||[],readOnly:c.readOnly===true,publicationAllowed:false};}
async function createStudioTools({window,studio,app,WebContentsView,session,ipcMain,editorRoot,readAsset=name=>fs.readFile(path.join(editorRoot,name))}={}){
 const views=new Map(),channels=[],origin=new URL(studio.url).origin;let active=null,bound=null,tail=Promise.resolve(),closed=false;
 const trustedShell=e=>{if(e?.sender!==window.webContents||e?.senderFrame!==window.webContents.mainFrame||e.senderFrame.url!==window.webContents.getURL())fail('studio_tool_sender_invalid');try{const u=new URL(e.senderFrame.url);if(u.origin!==origin||u.username||u.password)fail('studio_tool_sender_invalid');}catch{fail('studio_tool_sender_invalid');}};
 const trustedTool=e=>{for(const [kind,view]of views)if(e?.sender===view.webContents&&e?.senderFrame===view.webContents.mainFrame&&e.senderFrame.url===URLS[kind])return kind;fail('studio_tool_sender_invalid');};
 const serial=fn=>{const p=tail.catch(()=>{}).then(fn);tail=p;return p;};
 const canLeave=async()=>{if(!active)return;const wc=views.get(active).webContents;if(await wc.executeJavaScript('Promise.resolve(window.ThreadsStudioToolView?.canLeave?.()).then(value=>value===true)')!==true)fail('studio_tool_dirty');};
 const shellBarrier=async()=>{if(new URL(window.webContents.getURL()).pathname==='/'){const ok=await window.webContents.executeJavaScript("window.ThreadsStudioNavigation?.settle?.()");if(ok!==true)fail('studio_shell_save_incomplete');}};
 const bounds=()=>{const b=window.getContentBounds();for(const view of views.values())view.setBounds({x:0,y:68,width:Math.max(1,b.width),height:Math.max(1,b.height-68)});};
 const hide=()=>{for(const view of views.values())view.setVisible(false);active=null;};
 async function viewFor(kind){
  if(views.has(kind))return views.get(kind);
  const ses=session.fromPartition('threads-tool-'+kind+'-'+process.pid,{cache:false});
  ses.setPermissionRequestHandler((_wc,_permission,done)=>done(false));ses.setPermissionCheckHandler(()=>false);
  ses.webRequest.onBeforeRequest((d,done)=>{let allowed=false;try{const u=new URL(d.url);allowed=u.protocol==='cut-editor:'&&u.host==='app'&&!u.search&&ASSETS.has(u.pathname.slice(1))||d.resourceType!=='mainFrame'&&/^(?:data:image\/|blob:cut-editor:\/\/app\/)/.test(d.url);}catch{}done({cancel:!allowed});});
  await ses.protocol.handle('cut-editor',async request=>{const u=new URL(request.url),name=u.pathname.slice(1);if(request.method!=='GET'||u.host!=='app'||u.search||!ASSETS.has(name))return new Response('Not found',{status:404});const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff':'font/woff'};return new Response(await readAsset(name),{headers:{'content-type':mime[path.extname(name)]||'application/octet-stream','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src data: blob:; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"}});});
  const view=new WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,session:ses,preload:path.join(__dirname,'studio-tool-preload.cjs')}});
  view.webContents.setWindowOpenHandler(()=>({action:'deny'}));for(const event of ['will-navigate','will-redirect'])view.webContents.on(event,e=>e.preventDefault());
  window.contentView.addChildView(view);views.set(kind,view);view.setVisible(false);bounds();await view.webContents.loadURL(URLS[kind]);return view;
 }
 const show=async payload=>{const selection=selector(payload),context=await studio.resolveToolSource(selection);if(closed)fail('studio_tool_closed');await canLeave();await shellBarrier();
  const same=bound&&['key','postId','outputVersion','fingerprint'].every(k=>bound[k]===context[k]),view=await viewFor(payload.tool);
  if(!same||!view.loadedSelection){await view.webContents.executeJavaScript('(async()=>{for(let i=0;i<100;i++){if(window.ThreadsStudioToolView)return window.ThreadsStudioToolView.open('+JSON.stringify(publicContext(context))+');await new Promise(r=>setTimeout(r,50));}throw Error("studio_tool_not_ready");})()');view.loadedSelection=true;if(!same)for(const [name,other]of views)if(name!==payload.tool)other.loadedSelection=false;}
  bound=context;hide();view.setVisible(true);active=payload.tool;view.webContents.focus();return{tool:active,postId:context.postId,outputVersion:context.outputVersion};
 };
 const open=(event,payload)=>serial(async()=>{trustedShell(event);return show(payload);});
 const back=event=>serial(async()=>{try{trustedShell(event);}catch{trustedTool(event);}await canLeave();hide();window.webContents.focus?.();return true;});
 const contextFor=async event=>{trustedTool(event);if(!bound)fail('studio_tool_selection_missing');const current=await studio.resolveToolSource({key:bound.key,postId:bound.postId,outputVersion:bound.outputVersion,fingerprint:bound.fingerprint});return current;};
 const handle=(name,fn)=>{ipcMain.handle(name,fn);channels.push(name);};
 handle('studio:tool:open',open);handle('studio:tool:back',back);
 handle('studio:tool:switch',(event,tool)=>serial(async()=>{trustedTool(event);if(!bound||!Object.hasOwn(URLS,tool))fail('studio_tool_request_invalid');return show({tool,key:bound.key,postId:bound.postId,outputVersion:bound.outputVersion,fingerprint:bound.fingerprint});}));
 handle('studio:tool:context',async event=>publicContext(await contextFor(event)));
 handle('studio:tool:generate',async event=>{if(studio.readOnlyInspection)fail('read_only_inspection');if(trustedTool(event)!=='production')fail('studio_tool_sender_invalid');const c=await contextFor(event);return studio.generateToolSource(c,views.get('production').webContents);});
 handle('studio:tool:handoff',async(event,version)=>{if(studio.readOnlyInspection)fail('read_only_inspection');if(trustedTool(event)!=='production'||typeof version!=='string')fail('studio_tool_request_invalid');await canLeave();const c=await contextFor(event);const result=await studio.handoffToolSource(c,version);await canLeave();hide();if(result.reviewUrl!=='/?post='+encodeURIComponent(c.postId)+'&version='+encodeURIComponent(result.outputVersion))fail('studio_tool_review_route_invalid');await window.loadURL(new URL(result.reviewUrl,studio.url).href);return result;});
 handle('studio:tool:save-selection',async(event,plan)=>{if(studio.readOnlyInspection)fail('read_only_inspection');if(trustedTool(event)!=='production')fail('studio_tool_sender_invalid');return studio.saveToolSelection(await contextFor(event),plan);});
 handle('studio:tool:save-project',async(event,payload)=>{if(studio.readOnlyInspection)fail('read_only_inspection');if(trustedTool(event)!=='editor')fail('studio_tool_sender_invalid');return studio.saveToolProject(await contextFor(event),payload);});
 handle('studio:tool:save-reference',async(event,payload)=>{if(studio.readOnlyInspection)fail('read_only_inspection');if(trustedTool(event)!=='editor')fail('studio_tool_sender_invalid');return studio.saveToolReference(await contextFor(event),payload);});
 window.on('resize',bounds);
 return{views,open,back,leave:()=>serial(async()=>{await canLeave();hide();return true;}),settle:()=>serial(canLeave),close:()=>serial(async()=>{if(closed)return;await canLeave();for(const view of views.values())view.webContents.close({waitForBeforeUnload:true});for(const channel of channels)ipcMain.removeHandler(channel);window.removeListener('resize',bounds);closed=true;}),get active(){return active;}};
}
module.exports={createStudioTools,selector,URLS};
