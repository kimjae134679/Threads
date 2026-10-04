'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {app,BrowserWindow}=require('electron');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'threads-auto-smoke-'));
const material=path.join(scratch,'Threads Cut Editor 자료');
const input=path.join(material,'01_후보 기록');
fs.mkdirSync(input,{recursive:true});app.setPath('desktop',scratch);
fs.mkdirSync(path.join(__dirname,'dist','auto-batch-profile'),{recursive:true});
app.setPath('userData',path.join(__dirname,'dist','auto-batch-profile'));
function source(folder,name,data){fs.mkdirSync(path.join(input,folder),{recursive:true});fs.writeFileSync(path.join(input,folder,name),data);}
source('exact','source.json',JSON.stringify({schema:'threads-verbatim-source-v1',verbatim:true,title:'검증용 원문 글 제목',
  body:'첫 문단을 원문 그대로 저장합니다.\n\n다음 문단도 빠짐없이 읽습니다.',comments:[{text:'검증용 실제 반응입니다.',likes:12}],sourceUrl:'https://example.com/test'}));
source('html','source.html','<html><head><meta property="og:title" content="저장 HTML 원문 제목"></head><body><nav>광고 메뉴</nav><div class="contentBody"><p>저장된 본문 첫 문단입니다.</p><p>그 다음 원문 문단입니다.</p></div></body></html>');
source('restricted','manifest.json',JSON.stringify({schema:'threads-program-input-v1',id:'restricted',title:'제한 소스 후보',sourceUrl:'https://www.teamblind.com/kr/post/test',media:[]}));
fs.cpSync(path.join(__dirname,'..','data','source-packages','theqoo-3826792703'),path.join(input,'saved'),{recursive:true});
require('./main.cjs');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
  try {
    let win;
    for(let i=0;i<100;i++){win=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()==='cut-editor://app/source-cut-editor.html');if(win&&!win.webContents.isLoading())break;await wait(100);}
    assert(win&&!win.webContents.isLoading());
    const initial=await win.webContents.executeJavaScript('window.ThreadsCutDesktop.batchReport()');
    assert.equal(initial.total,4);assert.equal(initial.entries.length,4);
    assert(initial.entries.every(row=>row.status==='waiting'));
    const first=await win.webContents.executeJavaScript('window.ThreadsCutDesktop.runFolderBatch({fillSources:false})');
    assert.equal(first.total,4);assert.equal(first.counts.generated,3);assert.equal(first.counts.needs_access,1);assert.equal(first.counts.failed,0);
    const second=await win.webContents.executeJavaScript('window.ThreadsCutDesktop.runFolderBatch({fillSources:false})');
    assert.equal(second.counts.already_done,3);assert.equal(second.counts.generated,0);
    for(let i=0;i<100;i++){if(await win.webContents.executeJavaScript('!document.getElementById("runFolderBatch").disabled'))break;await wait(100);}
    assert(await win.webContents.executeJavaScript('!document.getElementById("runFolderBatch").disabled'));
    await win.webContents.executeJavaScript('document.getElementById("fillBatchSources").checked=false;document.getElementById("runFolderBatch").click()');
    for(let i=0;i<150;i++){const state=await win.webContents.executeJavaScript('({busy:document.getElementById("runFolderBatch").disabled,rows:document.getElementById("batchRows").children.length})');if(!state.busy&&state.rows)break;await wait(100);}
    const ui=await win.webContents.executeJavaScript('({rows:document.getElementById("batchRows").children.length,ready:document.getElementById("batchReady").textContent,status:document.getElementById("folderBatchStatus").textContent})');
    const buttons=await win.webContents.executeJavaScript('Array.from(document.getElementById("batchRows").children[0].querySelectorAll("button"),b=>b.textContent)');
    assert(buttons.includes('원본 자료 열기')&&buttons.includes('이미지 전체 보기')&&buttons.includes('결과 폴더 열기'));
    assert.equal(ui.rows,3);assert.equal(ui.ready,'3');assert.match(ui.status,/処理|처리 종료/);
    const ready=second.entries.find(e=>e.outputFolder);
    const preview=await win.webContents.executeJavaScript('window.ThreadsCutDesktop.batchPreview('+JSON.stringify(ready.id)+')');
    assert(preview.startsWith('data:image/png;base64,'));
    let rejected=false;
    try{await win.webContents.executeJavaScript('window.ThreadsCutDesktop.batchPreview("../outside")');}catch{rejected=true;}
    assert(rejected);
    const ledger=JSON.parse(await fsp.readFile(path.join(material,'06_자동 제작 결과','status.json'),'utf8'));
    for(const row of ledger.entries.filter(e=>e.outputFolder)){
      assert((await fsp.stat(path.join(material,'06_자동 제작 결과',row.outputFolder,'source-bundle.zip'))).size>100);
      const gallery=await fsp.readFile(path.join(material,'06_자동 제작 결과',row.outputFolder,'이미지 전체 보기.html'),'utf8');
      assert.equal((gallery.match(/<figure>/g)||[]).length,row.renderedPages);
    }
    const missing=ledger.entries.find(row=>row.outputFolder);
    await fsp.rm(path.join(material,'06_자동 제작 결과',missing.outputFolder,'rendered','slide-001.png'));
    const refreshed=await win.webContents.executeJavaScript('window.ThreadsCutDesktop.batchReport()');
    assert.equal(refreshed.entries.find(row=>row.id===missing.id).outputFolder,null);
    assert.equal(refreshed.entries.find(row=>row.id===missing.id).status,'waiting');
    console.log('AUTO BATCH PASS',JSON.stringify({generated:first.counts.generated,skipped:second.counts.already_done,access:first.counts.needs_access,ui}));
    fs.rmSync(scratch,{recursive:true,force:true});app.exit(0);
  }catch(error){console.error(error.stack);fs.rmSync(scratch,{recursive:true,force:true});app.exit(1);}
});
