'use strict';
const {app,BrowserWindow}=require('electron');
require('./main.cjs');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
  try{
    let win;for(let i=0;i<100;i++){win=BrowserWindow.getAllWindows().find(w=>w.isVisible());if(win&&!win.webContents.isLoading())break;await wait(100);}
    await win.webContents.executeJavaScript('window.ThreadsCutDesktop.onBatchProgress(value=>{if(value.phase==="acquiring"||value.done%25===0)console.log("BATCH "+JSON.stringify(value));});true');
    win.webContents.on('console-message',event=>{if(event.message?.startsWith('BATCH '))console.log(event.message);});
    const report=await win.webContents.executeJavaScript('window.ThreadsCutDesktop.runFolderBatch({fillSources:true})');
    console.log('REAL BATCH RESULT',JSON.stringify({total:report.total,processed:report.processed,counts:report.counts}));
    app.exit(0);
  }catch(error){console.error(error.stack);app.exit(1);}
});
