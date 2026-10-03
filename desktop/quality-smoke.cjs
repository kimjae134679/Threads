'use strict';
const fs=require('node:fs'),path=require('node:path');
const {app,BrowserWindow}=require('electron');
const original=path.join(app.getPath('desktop'),'Threads Cut Editor 자료','01_후보 기록');
const sandbox=path.join(__dirname,'dist','quality-check');
const input=path.join(sandbox,'Threads Cut Editor 자료','01_후보 기록');
fs.mkdirSync(input,{recursive:true});app.setPath('desktop',sandbox);
const profile=path.join(__dirname,'dist','quality-profile');fs.mkdirSync(profile,{recursive:true});app.setPath('userData',profile);
const records=JSON.parse(fs.readFileSync(path.join(original,'index.json'),'utf8')).records;
for(const id of ['source-50c07eb05a3ab0','source-b3c0ae54265490']){
 const record=records.find(r=>r.id===id);fs.cpSync(path.join(original,record.folder),path.join(input,id),{recursive:true});
 for(const name of ['automation-status.json','workflow-state.json'])fs.rmSync(path.join(input,id,name),{force:true});
}
require('./main.cjs');
app.whenReady().then(async()=>{try{
 let win;for(let i=0;i<100;i++){win=BrowserWindow.getAllWindows().find(w=>w.isVisible());if(win&&!win.webContents.isLoading())break;await new Promise(r=>setTimeout(r,100));}
 const result=await win.webContents.executeJavaScript('window.ThreadsCutDesktop.runFolderBatch({fillSources:false})');
 console.log('QUALITY RESULT',JSON.stringify(result));app.exit(result.counts.generated===2?0:1);
}catch(e){console.error(e);app.exit(1);}});
