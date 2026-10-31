'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {app,BrowserWindow,dialog}=require('electron');
const scratch=path.join(__dirname,'dist','import-smoke'),saved=path.join(scratch,'provided');fs.mkdirSync(saved,{recursive:true});
fs.writeFileSync(path.join(saved,'post.json'),JSON.stringify({schema:'threads-verbatim-source-v1',verbatim:true,title:'가져오기 검증 원문',body:'원문 띄어  쓰기\n\n마지막 문장',sourceUrl:'https://example.com/post/123'}));
dialog.showOpenDialog=async()=>({canceled:false,filePaths:[path.join(saved,'post.json')]});
app.setPath('desktop',scratch);app.setPath('userData',path.join(scratch,'profile'));require('./main.cjs');
app.whenReady().then(async()=>{try{
const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
const result=await win.webContents.executeJavaScript('window.ThreadsCutDesktop.importSavedSource()');
assert(result.results.length===1&&!result.results[0].error);
const report=await win.webContents.executeJavaScript('window.ThreadsCutDesktop.batchReport()');assert(report.entries.some(r=>r.title==='가져오기 검증 원문'));
const row=await win.webContents.executeJavaScript('({visible:!document.getElementById("importWebFiles").hidden,label:document.getElementById("importWebFiles").textContent})');assert(row.visible);assert.equal(row.label,'저장한 웹 글 가져오기');
const again=await win.webContents.executeJavaScript('window.ThreadsCutDesktop.importSavedSource()');assert.equal(again.results[0].alreadyPresent,true);
const batch=await win.webContents.executeJavaScript('window.ThreadsCutDesktop.runFolderBatch({fillSources:false})');assert.equal(batch.counts.failed,0);assert.equal(batch.counts.generated+batch.counts.already_done,1);
console.log('SAVED IMPORT UI PASS',JSON.stringify({source:result.results[0].title,listed:true,duplicatePreserved:true,pages:batch.entries[0].renderedPages}));
app.exit(0);
}catch(e){console.error(e.stack);app.exit(1)}});