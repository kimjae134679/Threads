'use strict';
const {BrowserWindow,ipcMain,shell,dialog}=require('electron'),path=require('node:path'),fs=require('node:fs/promises');
const {getMaterialRoot}=require('./material-paths.cjs');
const {createPostReviewStore}=require('./post-review-store.cjs');
const url='cut-editor://app/source-cut-post-review.html';
function registerPostReview({app,trusted,preferences,materialRoot=getMaterialRoot(app)}){
 const legacyFeedbackFile=!app.isPackaged&&process.env.THREADS_TEST_MATERIAL_ROOT?null:path.join(app.getPath('desktop'),'Threads Cut Editor 자료','07_사용자 평가','평가 기록.json');
 const store=createPostReviewStore(materialRoot,{legacyFeedbackFile});let window=null,closing=false;
 const guard=e=>{if(!window||e.sender!==window.webContents||e.senderFrame!==window.webContents.mainFrame||e.senderFrame.url!==url)throw Error('허용되지 않은 평가 요청입니다.');};
 async function open(id){
  const background=process.argv.includes('--background-worker');
  if(window&&!window.isDestroyed()){if(!background){window.show();window.focus();}if(id)window.webContents.send('post-review:select',id);return;}
  window=new BrowserWindow({show:!background,width:1250,height:1000,minWidth:760,minHeight:650,title:'Threads 게시글 평가',autoHideMenuBar:true,webPreferences:{...preferences,preload:path.join(__dirname,'post-review-preload.cjs')}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',e=>e.preventDefault());
  window.on('close',e=>{
   if(closing)return;e.preventDefault();const current=window;
   current.webContents.executeJavaScript('window.ThreadsPostReviewUI?.flush()').then(()=>{
    if(!current.isDestroyed()){closing=true;current.close();}
   }).catch(error=>{dialog.showErrorBox('평가 저장 실패 — 창을 유지합니다',error.message);});
  });
  window.on('closed',()=>{window=null;closing=false;});await window.loadURL(url);if(id)window.webContents.send('post-review:select',id);
 }
 ipcMain.handle('source-cut:open-post-review',(e,id)=>{trusted(e);if(id!==undefined&&(typeof id!=='string'||id.length>200))throw Error('글 ID를 확인하세요.');return open(id);});
 ipcMain.handle('post-review:list',e=>{guard(e);return store.list();});
 ipcMain.handle('post-review:image',(e,id,page,version)=>{guard(e);return store.image(id,page,version);});
 ipcMain.handle('post-review:save',(e,payload)=>{guard(e);return store.save(payload);});
 ipcMain.handle('post-review:open-folder',async e=>{guard(e);await fs.mkdir(store.folder,{recursive:true});const error=await shell.openPath(store.folder);if(error)throw Error(error);});
 return {open};
}
module.exports={registerPostReview};
