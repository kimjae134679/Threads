'use strict';
const path=require('node:path'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
const fs=require('node:fs/promises'),{createPathResolver}=require('./project-paths.cjs'),{writeAtomic}=require('./atomic-file.cjs');
const identity=root=>createHash('sha256').update(process.platform==='win32'?path.resolve(root).toLowerCase():path.resolve(root)).digest('hex');
async function claimStudioOwner({projectRoot,pid=process.pid,executable=process.execPath,alive=id=>{try{process.kill(id,0);return true;}catch(e){return e.code!=='ESRCH';}}}={}){
 const root=path.resolve(projectRoot),resolve=createPathResolver({projectRoot:root,pathMappings:[]}),file=resolve(path.join(root,'local-private/operating-studio/server.pid'));
 await fs.mkdir(path.dirname(file),{recursive:true});const read=async()=>{resolve(file);try{const stat=await fs.lstat(file);if(!stat.isFile()||stat.size>4096)throw Error('native_owner_conflict');return await fs.readFile(file,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}};
 const before=await read();if(before!==null){let previous;try{previous=JSON.parse(before);}catch{throw Error('native_owner_conflict');}
  const priorPid=typeof previous==='number'?previous:previous?.pid;if(!Number.isInteger(priorPid)||priorPid<=0)throw Error('native_owner_conflict');
  if(priorPid!==pid&&alive(priorPid)||typeof previous==='object'&&(previous.mode!=='native-unified'||previous.projectRoot!==root||previous.executable!==executable))throw Error('native_owner_conflict');
 }
 const bytes=JSON.stringify({schema:1,pid,projectRoot:root,projectIdentity:identity(root),executable,mode:'native-unified'});
 if(await read()!==before)throw Error('native_owner_changed');await writeAtomic(file,bytes);
 return{file,release:async()=>{if(await read()===bytes)await fs.unlink(file);}};
}
function nativeRoute(args=process.argv){const at=args.indexOf('--native-route'),inline=args.find(a=>a.startsWith('--native-route=')),route=at>=0?args[at+1]:inline?.slice('--native-route='.length)||'/';
 if(!['/','/materials/','/viewer/','/?review=all','/?review=hold','/?review=discard','/?stage=production','/?stage=review','/?stage=prepare'].includes(route))throw Error('native_route_invalid');return route;
}
async function navigateStudio(window,origin,route){nativeRoute(['--native-route',route]);if(window.isDestroyed()||!allowedStudioUrl(window.webContents.getURL(),origin))throw Error('native_navigation_origin_invalid');
 return window.webContents.executeJavaScript(`(async()=>{const route=${JSON.stringify(route)};if(location.pathname==='/'){if(!window.ThreadsStudioNavigation)throw Error('native_navigation_not_ready');return window.ThreadsStudioNavigation.open(route);}if(!['/materials/','/viewer/'].includes(location.pathname)&&!location.pathname.startsWith('/viewer/'))throw Error('native_navigation_origin_invalid');location.assign(route);return true;})()`);
}
function projectArgument(args=process.argv,env=process.env){
 const at=args.indexOf('--project-root'),inline=args.find(a=>a.startsWith('--project-root='));
 const value=at>=0?args[at+1]:inline?.slice('--project-root='.length)||env.THREADS_PROJECT_ROOT;
 if(at>=0&&(!value||value.startsWith('--'))||inline&&!value||value&&!path.isAbsolute(value))throw Error('native_project_root_invalid');
 return value?path.resolve(value):null;
}
function studioInstanceData(args=process.argv,env=process.env){
 const projectRoot=projectArgument(args,env);if(!projectRoot)throw Error('native_project_root_required');
 return{schema:1,mode:'native-unified',projectRoot,route:nativeRoute(args)};
}
async function dispatchStudioInstance(studio,projectRoot,data,dialog){
 try{
  if(!data||data.schema!==1||data.mode!=='native-unified'||typeof data.projectRoot!=='string'||!path.isAbsolute(data.projectRoot)||path.resolve(data.projectRoot)!==path.resolve(projectRoot))throw Error('native_instance_project_conflict');
  const route=nativeRoute(['--native-route',data.route]);if(typeof data.route!=='string'||route!==data.route)throw Error('native_instance_route_invalid');
  await studio.navigate(route);studio.focus();return true;
 }catch(error){
  // Async reporting keeps the owned server responsive and the current draft intact.
  await dialog.showMessageBox(studio.window,{type:'error',title:'화면 이동 보류',message:'화면 이동 보류',detail:error.message,buttons:['확인']});return false;
 }
}
function allowedStudioUrl(value,origin,{resource=false}={}){
 try{const u=new URL(value),own=new URL(origin);if(u.username||u.password)return false;
  return u.origin===own.origin&&(u.protocol==='http:'&&u.hostname==='127.0.0.1'||resource&&u.protocol==='blob:')||resource&&/^data:(?:image|video)\//i.test(value);
 }catch{return false;}
}
function clipboardWriteAllowed(window,wc,permission,origin,details,requestingOrigin){
 if(permission!=='clipboard-sanitized-write'||!window||window.isDestroyed()||wc!==window.webContents||details?.isMainFrame!==true)return false;
 try{const url=wc.getURL();return details.requestingUrl===url&&wc.mainFrame?.url===url&&allowedStudioUrl(url,origin)&&(!requestingOrigin||allowedStudioUrl(requestingOrigin,origin));}catch{return false;}
}
const {isIP,BlockList}=require('node:net'),{Resolver}=require('node:dns/promises');
const EXTERNAL_CHANNEL='studio:external:open',externalBlocked=new BlockList();
for(const [ip,prefix]of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])externalBlocked.addSubnet(ip,prefix,'ipv4');
for(const [ip,prefix]of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]])externalBlocked.addSubnet(ip,prefix,'ipv6');
const externalFail=code=>{throw Error(code);};
function externalHttpsUrl(value){
 if(typeof value!=='string'||value.length>2048||/[\u0000-\u0020\u007f\\]|%(?:0[0-9a-f]|1[0-9a-f]|20|7f)/i.test(value))externalFail('external_url_invalid');
 let u;try{u=new URL(value);}catch{externalFail('external_url_invalid');}
 const host=u.hostname.toLowerCase();
 if(u.href.length>2048||u.protocol!=='https:'||u.username||u.password||host.endsWith('.')||isIP(host)||host.includes(':')||!host.includes('.')||host.length>253||!host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))||/(?:^|\.)(?:localhost|local|internal|intranet|home|lan|corp|test|invalid|example|onion|arpa)$/.test(host))externalFail('external_url_invalid');
 return u.href;
}
function publicExternalAddress(address){
 const family=isIP(address);
 if(family===4)return !externalBlocked.check(address,'ipv4');
 return family===6&&/^[23][0-9a-f]{3}:/i.test(address)&&!externalBlocked.check(address,'ipv6');
}
async function resolveExternalHost(host,{signal}={}){
 const resolver=new Resolver(),cancel=()=>resolver.cancel();signal?.addEventListener('abort',cancel,{once:true});
 try{
  if(signal?.aborted)externalFail('external_dns_cancelled');
  const results=await Promise.allSettled([resolver.resolve4(host),resolver.resolve6(host)]);
  if(signal?.aborted)externalFail('external_dns_cancelled');
  if(results.some(r=>r.status==='rejected'&&!['ENODATA','ENOTFOUND'].includes(r.reason?.code)))externalFail('external_dns_failed');
  return results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
 }finally{signal?.removeEventListener('abort',cancel);resolver.cancel();}
}
function createStudioExternalLinks({window,origin,ipcMain,resolveHost=resolveExternalHost,openExternal=url=>require('electron').shell.openExternal(url),timeoutMs=2000}={}){
 let closed=false,pending=null;
 const trusted=(event,snapshot)=>{
  if(closed||window.isDestroyed()||window.webContents.isDestroyed?.()||event?.sender!==window.webContents||event?.senderFrame!==window.webContents.mainFrame)externalFail('external_sender_invalid');
  const frame=event.senderFrame,current=window.webContents.getURL();
  let u;try{u=new URL(current);}catch{externalFail('external_sender_invalid');}
  if(frame.url!==current||!allowedStudioUrl(current,origin)||u.pathname!=='/materials/'||snapshot&&(snapshot.frame!==frame||snapshot.url!==current))externalFail('external_sender_invalid');
  return{frame,url:current};
 };
 const handler=async(event,value)=>{
  const snapshot=trusted(event),url=externalHttpsUrl(value);
  if(pending)externalFail('external_request_pending');
  const controller=new AbortController();pending=controller;let timer;
  try{
   if(await snapshot.frame.executeJavaScript('navigator.userActivation?.isActive === true')!==true)externalFail('external_activation_required');
   trusted(event,snapshot);
   if(controller.signal.aborted)externalFail('external_sender_invalid');
   const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('external_dns_timeout'));controller.abort();},timeoutMs);controller.signal.addEventListener('abort',()=>reject(Error('external_request_cancelled')),{once:true});});
   const addresses=await Promise.race([Promise.resolve().then(()=>resolveHost(new URL(url).hostname,{signal:controller.signal})),deadline]);
   if(!Array.isArray(addresses)||!addresses.length||!addresses.every(publicExternalAddress))externalFail('external_dns_not_public');
   trusted(event,snapshot);
   if(controller.signal.aborted)externalFail('external_sender_invalid');
   await openExternal(url);return true;
  }finally{clearTimeout(timer);controller.abort();if(pending===controller)pending=null;}
 };
 ipcMain.handle(EXTERNAL_CHANNEL,handler);
 return{close(){if(closed)return;closed=true;pending?.abort();ipcMain.removeHandler(EXTERNAL_CHANNEL);}};
}
async function openUnifiedStudio({app,BrowserWindow,WebContentsView,ipcMain,session,dialog,args=process.argv,loadRuntime,claimOwner=claimStudioOwner,externalLinkOptions}={}){
 const projectRoot=projectArgument(args);if(!projectRoot)throw Error('native_project_root_required');
 process.env.THREADS_PROJECT_ROOT=projectRoot;
 const load=loadRuntime||(()=>import(pathToFileURL(path.join(app.isPackaged?path.join(process.resourcesPath,'unified-runtime'):path.join(__dirname,'..'),'upload-studio/server.mjs')).href));
 const {createStudioServer,studioLaunchConfig}=await load(),normalized=args.filter(a=>!a.startsWith('--project-root='));
 if(!normalized.includes('--project-root'))normalized.push('--project-root',projectRoot);
 const config=studioLaunchConfig(normalized);if(config.projectRoot!==projectRoot||config.preserveStartupState!==true||config.seedTags!==false)throw Error('native_unified_mode_required');
 const route=nativeRoute(args),owned=await createStudioServer({...config,nativeHosted:true});let window=null,closed=null,claim=null,tools=null,externalLinks=null;
 const close=()=>closed||Promise.resolve().then(async()=>{await tools?.close();externalLinks?.close();return closed||(closed=Promise.resolve().then(async()=>{owned.setNativeReady?.(false);try{await owned.close();}finally{await claim?.release();}}));});
 try{
  if(!allowedStudioUrl(owned.url,owned.url)||new URL(owned.url).pathname!=='/')throw Error('native_server_origin_invalid');
  if(!config.readOnlyInspection)claim=await claimOwner({projectRoot});
  const ses=session.fromPartition('persist:threads-unified-offline-'+createHash('sha256').update(projectRoot).digest('hex').slice(0,16),{cache:false});
  ses.setPermissionRequestHandler((wc,permission,callback,details)=>callback(clipboardWriteAllowed(window,wc,permission,owned.url,details)));
  ses.setPermissionCheckHandler((wc,permission,requestingOrigin,details)=>clipboardWriteAllowed(window,wc,permission,owned.url,details,requestingOrigin));
  ses.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!allowedStudioUrl(details.url,owned.url,{resource:true})}));
  ses.on('will-download',(_event,item)=>item.setSaveDialogOptions({title:'통합 자료 저장',defaultPath:path.join(projectRoot,'local-private',path.basename(item.getFilename()))}));
  window=new BrowserWindow({width:1450,height:1000,minWidth:780,minHeight:650,title:'Threads · 평가와 게시 준비',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,session:ses,preload:path.join(__dirname,'studio-preload.cjs')}});
  if(ipcMain)externalLinks=createStudioExternalLinks({window,origin:owned.url,ipcMain,...externalLinkOptions});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(!allowedStudioUrl(url,owned.url))event.preventDefault();});
  window.webContents.on('will-redirect',(event,url)=>{if(!allowedStudioUrl(url,owned.url))event.preventDefault();});
  if(WebContentsView&&ipcMain){const {createStudioTools}=require('./studio-tools.cjs'),{createNativeToolAdapter}=require('./studio-native.cjs');tools=await createStudioTools({window,studio:createNativeToolAdapter({owned,projectRoot,readOnly:config.readOnlyInspection===true}),app,WebContentsView,session,ipcMain,editorRoot:require('./editor-assets.cjs').editorRoot()});}
  let closeReady=false,closeChecking=false;window.on('close',event=>{if(closeReady||!tools)return;event.preventDefault();if(closeChecking)return;closeChecking=true;Promise.resolve().then(async()=>{await tools.settle();if(new URL(window.webContents.getURL()).pathname==='/'&&await window.webContents.executeJavaScript('window.ThreadsStudioNavigation?.settle?.()')!==true)throw Error('studio_shell_save_incomplete');closeReady=true;window.close();}).catch(error=>dialog?.showMessageBox(window,{type:'error',message:'저장 후 닫아 주세요.',detail:error.message,buttons:['확인']})).finally(()=>{closeChecking=false;});});
  window.once('closed',()=>close().catch(()=>{}));
  const quitting=event=>{if(!closed||closed instanceof Promise&&!quitting.complete){event.preventDefault();close().then(()=>{quitting.complete=true;app.quit();}).catch(error=>dialog?.showMessageBox(window,{type:'error',message:'저장 후 종료해 주세요.',detail:error.message,buttons:['확인']}));}};
  app.on('will-quit',quitting);
  await window.loadURL(new URL(route,owned.url).href);
  const ready=await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let attempts=0;const check=()=>{if(location.pathname!=='/'||window.ThreadsStudioNavigation?.ready===true)return resolve(true);if(++attempts>=100)return reject(Error('native_ui_not_ready'));setTimeout(check,50);};check();})`);
  if(ready!==true)throw Error('native_ui_not_ready');owned.setNativeReady?.(true);
  return{window,url:owned.url,close,navigate:async route=>{await tools?.leave();return navigateStudio(window,owned.url,route);},focus:()=>{if(!window.isDestroyed()){if(window.isMinimized?.())window.restore();window.show();window.focus();}}};
 }catch(error){await close();if(window&&!window.isDestroyed())window.destroy();throw error;}
}
module.exports={externalHttpsUrl,publicExternalAddress,resolveExternalHost,createStudioExternalLinks,projectArgument,allowedStudioUrl,openUnifiedStudio,claimStudioOwner,nativeRoute,navigateStudio,studioInstanceData,dispatchStudioInstance};
