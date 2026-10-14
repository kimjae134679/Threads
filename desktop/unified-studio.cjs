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
 if(!['/','/materials/','/viewer/','/?review=all','/?review=hold','/?review=discard'].includes(route))throw Error('native_route_invalid');return route;
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
async function openUnifiedStudio({app,BrowserWindow,session,args=process.argv,loadRuntime,claimOwner=claimStudioOwner}={}){
 const projectRoot=projectArgument(args);if(!projectRoot)throw Error('native_project_root_required');
 process.env.THREADS_PROJECT_ROOT=projectRoot;
 const load=loadRuntime||(()=>import(pathToFileURL(path.join(app.isPackaged?path.join(process.resourcesPath,'unified-runtime'):path.join(__dirname,'..'),'upload-studio/server.mjs')).href));
 const {createStudioServer,studioLaunchConfig}=await load(),normalized=args.filter(a=>!a.startsWith('--project-root='));
 if(!normalized.includes('--project-root'))normalized.push('--project-root',projectRoot);
 const config=studioLaunchConfig(normalized);if(config.projectRoot!==projectRoot||config.preserveStartupState!==true||config.seedTags!==false)throw Error('native_unified_mode_required');
 const route=nativeRoute(args),owned=await createStudioServer({...config,nativeHosted:true});let window=null,closed=null,claim=null;
 const close=()=>closed||(closed=Promise.resolve().then(async()=>{owned.setNativeReady?.(false);try{await owned.close();}finally{await claim?.release();}}));
 try{
  if(!allowedStudioUrl(owned.url,owned.url)||new URL(owned.url).pathname!=='/')throw Error('native_server_origin_invalid');
  claim=await claimOwner({projectRoot});
  const ses=session.fromPartition('persist:threads-unified-offline-'+createHash('sha256').update(projectRoot).digest('hex').slice(0,16),{cache:false});
  ses.setPermissionRequestHandler((wc,permission,callback,details)=>callback(clipboardWriteAllowed(window,wc,permission,owned.url,details)));
  ses.setPermissionCheckHandler((wc,permission,requestingOrigin,details)=>clipboardWriteAllowed(window,wc,permission,owned.url,details,requestingOrigin));
  ses.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!allowedStudioUrl(details.url,owned.url,{resource:true})}));
  ses.on('will-download',(_event,item)=>item.setSaveDialogOptions({title:'통합 자료 저장',defaultPath:path.join(projectRoot,'local-private',path.basename(item.getFilename()))}));
  window=new BrowserWindow({width:1450,height:1000,minWidth:780,minHeight:650,title:'Threads · 평가와 게시 준비',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,session:ses}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(!allowedStudioUrl(url,owned.url))event.preventDefault();});
  window.webContents.on('will-redirect',(event,url)=>{if(!allowedStudioUrl(url,owned.url))event.preventDefault();});
  window.once('closed',()=>close().catch(()=>{}));
  const quitting=event=>{if(!closed||closed instanceof Promise&&!quitting.complete){event.preventDefault();close().then(()=>{quitting.complete=true;app.quit();}).catch(()=>{quitting.complete=true;app.quit();});}};
  app.on('will-quit',quitting);
  await window.loadURL(new URL(route,owned.url).href);
  const ready=await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let attempts=0;const check=()=>{if(location.pathname!=='/'||window.ThreadsStudioNavigation?.ready===true)return resolve(true);if(++attempts>=100)return reject(Error('native_ui_not_ready'));setTimeout(check,50);};check();})`);
  if(ready!==true)throw Error('native_ui_not_ready');owned.setNativeReady?.(true);
  return{window,url:owned.url,close,navigate:route=>navigateStudio(window,owned.url,route),focus:()=>{if(!window.isDestroyed()){if(window.isMinimized?.())window.restore();window.show();window.focus();}}};
 }catch(error){await close();if(window&&!window.isDestroyed())window.destroy();throw error;}
}
module.exports={projectArgument,allowedStudioUrl,openUnifiedStudio,claimStudioOwner,nativeRoute,navigateStudio,studioInstanceData,dispatchStudioInstance};
