'use strict';
// Integration fixture: copied plans/images and isolated feedback. Never writes user ratings.
const {app}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const runtime=path.resolve(__dirname,'../data/runtime/feedback-rework'),source=path.join(runtime,'materials-20261007-v2'),fixture=path.join(runtime,'ui-smoke-fixture-20261007-v2');
const out='06_자동 제작 결과',report=JSON.parse(fs.readFileSync(path.join(source,out,'status.json')));
fs.mkdirSync(path.join(fixture,out),{recursive:true});fs.mkdirSync(path.join(fixture,'07_사용자 평가'),{recursive:true});
fs.writeFileSync(path.join(fixture,out,'status.json'),JSON.stringify({...report,fixtureOnly:true}));
fs.copyFileSync(path.join(runtime,'user-feedback-original.json'),path.join(fixture,'07_사용자 평가','평가 기록.json'));
for(const row of report.entries.filter(e=>e.outputFolder)){
 const target=path.join(fixture,out,row.outputFolder);fs.mkdirSync(target,{recursive:true});
 fs.copyFileSync(path.join(source,out,row.outputFolder,'production-plan.json'),path.join(target,'production-plan.json'));
 fs.mkdirSync(path.join(target,'rendered'),{recursive:true});
 fs.copyFileSync(path.join(source,out,row.outputFolder,'rendered','slide-001.png'),path.join(target,'rendered','slide-001.png'));
 if(['source-c17d392921074a','source-2a9823cc067575'].includes(row.id))fs.cpSync(path.join(source,out,row.outputFolder,'rendered'),path.join(target,'rendered'),{recursive:true});
}
app.disableHardwareAcceleration();app.setPath('userData',path.join(fixture,'app-state'));process.env.THREADS_TEST_MATERIAL_ROOT=fixture;process.argv.push('--review','--background-worker');
let started=false;const seen=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<80;i++){if(await fn())return;await delay(100);}throw Error('UI did not become ready');}
app.on('browser-window-created',(_event,win)=>{
 seen.push(win);win.webContents.on('did-finish-load',async()=>{
  if(started||win.webContents.getURL()!=='cut-editor://app/source-cut-post-review.html')return;started=true;
  try{
   const list=await win.webContents.executeJavaScript('window.ThreadsPostReview.list()');assert.equal(list.entries.length,399);assert.equal(list.entries.filter(e=>e.previous).length,67);assert.equal(list.entries.filter(e=>e.current).length,0);
   await until(()=>win.webContents.executeJavaScript("document.querySelectorAll('#posts .post-card').length===399&&!document.getElementById('reader').hidden"));
   await win.webContents.executeJavaScript("window.ThreadsPostReviewUI.select('source-c17d392921074a')");
   await until(()=>win.webContents.executeJavaScript("document.getElementById('pageImage').complete&&document.getElementById('pageImage').naturalWidth===1080"));
   assert(seen.every(w=>!w.isVisible()),'Background smoke must not show/focus user windows');
   await win.webContents.executeJavaScript("document.getElementById('next').click()");
   await until(()=>win.webContents.executeJavaScript("document.getElementById('pageSelect').value==='2'&&document.getElementById('pageImage').naturalWidth===1080"));
   const selected=list.entries.find(e=>e.id==='source-c17d392921074a');
   await win.webContents.executeJavaScript("document.getElementById('vertical').click()");
   assert.equal(await win.webContents.executeJavaScript("document.getElementById('verticalPages').querySelectorAll('figure').length"),selected.pages);
   await win.webContents.executeJavaScript("document.getElementById('note').value='QA FIXTURE ONLY — isolated save/restore';document.getElementById('note').dispatchEvent(new Event('input'));document.querySelector('[data-score=\"6\"]').click();window.ThreadsPostReviewUI.flush()");
   const after=await win.webContents.executeJavaScript('window.ThreadsPostReview.list()');const saved=after.entries.find(e=>e.id===selected.id);assert.equal(saved.current.score,6);assert.equal(saved.current.note,'QA FIXTURE ONLY — isolated save/restore');assert.equal(saved.previous.score,selected.previous.score);
   await new Promise((resolve,reject)=>{win.webContents.once('did-finish-load',resolve);win.webContents.reload();setTimeout(()=>reject(Error('Reload timeout')),10000);});
   await until(()=>win.webContents.executeJavaScript("document.querySelectorAll('#posts .post-card').length===399&&!document.getElementById('reader').hidden"));
   await win.webContents.executeJavaScript("window.ThreadsPostReviewUI.select('source-c17d392921074a')");
   assert.equal(await win.webContents.executeJavaScript("document.getElementById('note').value"),'QA FIXTURE ONLY — isolated save/restore');
   await until(()=>win.webContents.executeJavaScript("document.getElementById('pageImage').complete&&document.getElementById('pageImage').naturalWidth===1080"));
   const screenshot=await win.webContents.capturePage();fs.writeFileSync(path.join(fixture,'review-ui.png'),screenshot.toPNG());
   await win.webContents.executeJavaScript('window.ThreadsPostReviewUI.flush()');
   assert.equal(await win.webContents.executeJavaScript("document.getElementById('error').hidden"),true,'Review must show no load errors');
   const result={checkedAt:new Date().toISOString(),fixtureOnly:true,list:399,previousRatings:67,newProductionRatingsInitially:0,nativeWidth:1080,nextPage:true,verticalPages:selected.pages,saveReload:true,noLoadErrors:true,oldVersionRatingPreserved:true,allWindowsHidden:seen.every(w=>!w.isVisible()),installed:false,userRatingFilesModified:false};
   fs.writeFileSync(path.join(fixture,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));for(const w of seen)if(!w.isDestroyed())w.destroy();app.exit(0);
  }catch(e){console.error(e.stack);fs.writeFileSync(path.join(fixture,'failure.txt'),e.stack);for(const w of seen)if(!w.isDestroyed())w.destroy();app.exit(1);}
 });
});
setTimeout(()=>{console.error('Smoke timeout');app.exit(2);},60000).unref();require('./main.cjs');
