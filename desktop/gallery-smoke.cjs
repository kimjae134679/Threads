'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path');
const [material]=process.argv.slice(2);if(!material)throw Error('Specify actual materials');
const inspect=()=>{const b=document.getElementById('view'),main=document.querySelector('main');b.click();const overview=main.classList.contains('overview')&&b.getAttribute('aria-pressed')==='true';b.click();const reading=!main.classList.contains('overview'),figures=document.querySelectorAll('figure').length,links=[...document.querySelectorAll('nav a')];return {figures,overview,reading,bodyLink:links.some(a=>a.hash==='#page-2'),lastLink:links.some(a=>a.hash==='#page-'+figures)};};
app.whenReady().then(async()=>{let win;try{
 const qa=path.join(material,'04_검수','2026-10-06_표지 이미지 보완'),out=path.join(material,'06_자동 제작 결과'),report=JSON.parse(await fs.readFile(path.join(out,'status.json'),'utf8'));
 const selected=JSON.parse(await fs.readFile(path.join(qa,'대표 20건 편집 계획.json'),'utf8')).records;
 win=new BrowserWindow({show:false,width:1000,height:1120,webPreferences:{nodeIntegration:false,contextIsolation:true}});
 win.webContents.on('console-message',e=>{if(e.level>=2)console.error(e.message);});
 const checks=[];
 for(const s of selected){
  const row=report.entries.find(r=>r.id===s.id);if(!row?.outputFolder)throw Error('Selected output missing '+s.id);
  await win.loadFile(path.join(out,row.outputFolder,'이미지 전체 보기.html'));
  const result=await win.webContents.executeJavaScript('('+inspect.toString()+')()');
  if(!result.overview||!result.reading||result.figures!==row.renderedPages||!result.lastLink)throw Error('Gallery UI failed '+s.id);
  checks.push({id:s.id,...result});
 }
 const row=report.entries.find(r=>r.id==='source-208fc2ac2bf245');await win.loadFile(path.join(out,row.outputFolder,'이미지 전체 보기.html'));
 await win.webContents.executeJavaScript('Promise.all([...document.images].slice(0,2).map(i=>{i.loading="eager";return i.decode().catch(()=>{});}))');
 await fs.writeFile(path.join(qa,'글 전체 보기 화면.png'),(await win.webContents.capturePage()).toPNG());
 await win.webContents.executeJavaScript('[...document.querySelectorAll("nav a")].find(a=>a.hash==="#page-2").click()');await new Promise(r=>setTimeout(r,150));
 await fs.writeFile(path.join(qa,'본문 읽기 화면.png'),(await win.webContents.capturePage()).toPNG());
 await fs.writeFile(path.join(qa,'갤러리 실행 검사.json'),JSON.stringify({checkedAt:new Date().toISOString(),actualFileChecks:checks,status:'pass',selectedSourceComments:0,commentsVerification:'67-suite regression only; no actual selected comments in current saved inputs',publicationAllowed:false},null,2)+'\n');
 console.log('ACTUAL GALLERY UI PASS '+checks.length);app.exit(0);
 }catch(e){console.error(e.stack);app.exit(1);}finally{win?.destroy();}
});
