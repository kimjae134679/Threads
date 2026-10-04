'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {app,BrowserWindow}=require('electron');
const args=process.argv.slice(2),option=name=>args[args.indexOf(name)+1];
const input=option('--input'),destination=option('--output');
if(!args.includes('--input')||!args.includes('--output')||!path.isAbsolute(input)||!path.isAbsolute(destination))throw new Error('Use --input and --output with absolute paths.');
if(destination===input||destination.startsWith(input+path.sep))throw new Error('Output must be outside the original input.');
const scratch=path.join(destination,'verification-desktop'),material=path.join(scratch,'Threads Cut Editor 자료');
const copied=path.join(material,'01_후보 기록');
fs.mkdirSync(copied,{recursive:true});
const index=JSON.parse(fs.readFileSync(path.join(input,'index.json'),'utf8'));
const ids=(option('--ids')||'').split(',').filter(Boolean);
if(!ids.length)throw new Error('Select actual source IDs with --ids.');
const rows=index.records.filter(row=>ids.includes(row.id));assert.equal(rows.length,ids.length);
for(const row of rows){
 const folder=path.resolve(input,row.folder);assert(folder.startsWith(path.resolve(input)+path.sep));
 fs.cpSync(folder,path.join(copied,row.folder),{recursive:true});
}
fs.writeFileSync(path.join(copied,'index.json'),JSON.stringify({...index,records:rows},null,2));
app.setPath('desktop',scratch);app.setPath('userData',path.join(destination,'electron-profile'));
require('./main.cjs');
app.whenReady().then(async()=>{
 try {
  const editor=BrowserWindow.getAllWindows()[0];
  if(editor.webContents.isLoading())await new Promise(resolve=>editor.webContents.once('did-finish-load',resolve));
  const first=await editor.webContents.executeJavaScript('window.ThreadsCutDesktop.runFolderBatch({fillSources:false})');
  console.log('REVIEW FIRST',JSON.stringify(first.counts));
  for(const row of first.entries){
   if(!row.outputFolder){console.log('REVIEW BLOCKED',row.id,row.reason);continue;}
   const from=path.join(material,'06_자동 제작 결과',row.outputFolder),to=path.join(destination,'examples',path.basename(row.outputFolder));
   fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true});
   const plan=JSON.parse(fs.readFileSync(path.join(to,'production-plan.json'),'utf8'));
   console.log('REVIEW EXAMPLE',JSON.stringify({id:row.id,title:row.title,pages:plan.pages.length,template:plan.templateId,warnings:plan.warnings,output:to,
    images:Object.entries(plan.imageAnalysis).map(([name,d])=>({name,width:d.width,height:d.height,kind:d.analysis.kind,textBands:d.analysis.textBands,photoScore:d.analysis.photoScore}))}));
  }
  assert.equal(first.counts.failed,0);
  const second=await editor.webContents.executeJavaScript('window.ThreadsCutDesktop.runFolderBatch({fillSources:false})');
  assert.equal(second.counts.generated,0);assert.equal(second.counts.already_done,first.counts.generated+first.counts.already_done);
  fs.writeFileSync(path.join(destination,'review-report.json'),JSON.stringify({first,second},null,2));
  console.log('REVIEW RESTART PASS',second.counts.already_done);app.exit(0);
 }catch(error){console.error(error.stack);app.exit(1);}
});
