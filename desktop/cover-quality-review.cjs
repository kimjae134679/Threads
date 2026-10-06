'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
const [material]=process.argv.slice(2);if(!material)throw Error('Specify materials directory');
app.whenReady().then(async()=>{let win;try{
 const qa=path.join(material,'04_검수','2026-10-06_표지 이미지 보완'),output=path.join(material,'06_자동 제작 결과');
 const report=JSON.parse(await fs.readFile(path.join(output,'status.json'),'utf8')),selected=JSON.parse(await fs.readFile(path.join(qa,'보완한 20건.json'),'utf8'));
 const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const refs=path.join(material,'02_레퍼런스','게시물 보기','인스타_레퍼런스_2026-10-04'),refcards=[],cards=[],bodycards=[];
 for(const account of ['humor_ssul','ddoz_ddoz','baeggopbox','ikpann.co.kr','humor_yonggari','history.me_me','choi_20223']){
  const dirs=(await fs.readdir(path.join(refs,account),{withFileTypes:true})).filter(e=>e.isDirectory());if(!dirs.length)continue;
  const dir=path.join(refs,account,dirs[0].name);for(const name of (await fs.readdir(dir)).filter(n=>/^0[12]\.(webp|jpg|png)$/.test(n)))refcards.push({title:account+' · '+name,file:path.join(dir,name)});
 }
 const bodyIds=new Set(['source-208fc2ac2bf245','source-a1ed6aef13046f','source-3600e60837dd53','source-ebb6fbcbb2efac','source-34151de230eaf0','source-284ac09a545713']);
 for(const s of selected){
  const row=report.entries.find(r=>r.id===s.id);if(!row?.outputFolder)continue;
  const folder=path.join(output,row.outputFolder),plan=JSON.parse(await fs.readFile(path.join(folder,'production-plan.json'),'utf8'));
  cards.push({title:plan.coverTitle,file:path.join(folder,'rendered','slide-001.png'),link:path.join(folder,'이미지 전체 보기.html')});
  if(bodyIds.has(row.id)){const body=plan.pages.filter(p=>p.role!=='cover'),chosen=[body[0],body[Math.floor(body.length/2)],body.at(-1)].filter(Boolean);
   for(const p of [...new Map(chosen.map(p=>[p.number,p])).values()])bodycards.push({title:plan.coverTitle+' · '+p.number+'/'+plan.pages.length+' · '+p.purpose,file:path.join(folder,'rendered','slide-'+String(p.number).padStart(3,'0')+'.png'),link:path.join(folder,'이미지 전체 보기.html')});
  }
 }
 const section=(title,items)=>'<section><h1>'+esc(title)+'</h1><div class="grid">'+items.map(c=>'<article><img src="'+pathToFileURL(c.file).href+'"><p>'+esc(c.title)+'</p>'+(c.link?'<a href="'+pathToFileURL(c.link).href+'">이 글 순서대로 읽기</a>':'')+'</article>').join('')+'</div></section>';
 const doc=(sections,compact=false)=>'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;background:#e8edea;font:15px system-ui;color:#152b24}h1{font-size:24px}.grid{display:grid;grid-template-columns:repeat('+ (compact?'5,248':'3,360')+'px);gap:16px}article{background:white;padding:10px;box-sizing:border-box}img{width:100%;height:auto;display:block}p{line-height:1.4;margin:8px 0}a{color:#176b57}section{margin-bottom:40px}</style></head><body>'+sections+'</body></html>';
 await fs.writeFile(path.join(qa,'대표 20건 보기.html'),doc(section('대표 20건 · 제목·디자인 검수 전',cards),true));
 await fs.writeFile(path.join(qa,'본문 흐름 보기.html'),doc(section('본문 첫 장·중간·마지막 장 · 6개 글',bodycards)));
 await fs.writeFile(path.join(qa,'레퍼런스와 비교.html'),doc(section('실제 수집 레퍼런스 · 첫 장과 두 번째 장',refcards)+section('현재 대표 20건 · 표지',cards)+section('현재 본문 · 첫·중간·마지막 장',bodycards)));
 win=new BrowserWindow({show:false,width:1360,height:1160,webPreferences:{contextIsolation:true,nodeIntegration:false}});
 for(const [name,items,compact]of [['covers',cards,true],['body',bodycards,false]]){
  const html=path.join(qa,name+'-contact.html');await fs.writeFile(html,doc(section(name==='covers'?'현재 표지 20건':'본문 흐름',items),compact));await win.loadFile(html);
  await win.webContents.executeJavaScript('Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))');
  const height=await win.webContents.executeJavaScript('document.documentElement.scrollHeight');
  for(let y=0,n=0;y<height;y+=1080,n++){await win.webContents.executeJavaScript('window.scrollTo(0,'+y+')');await new Promise(r=>setTimeout(r,100));await fs.writeFile(path.join(qa,name+'-'+n+'.png'),(await win.webContents.capturePage()).toPNG());}
 }
 await fs.writeFile(path.join(qa,'visual-check.json'),JSON.stringify({checkedAt:new Date().toISOString(),coverSamples:cards.length,bodySamples:bodycards.length,referenceSamples:refcards.length,status:'needs_human_review',publicationAllowed:false},null,2));
 console.log('QUALITY SHEETS '+JSON.stringify({covers:cards.length,bodies:bodycards.length,references:refcards.length,path:qa}));app.exit(0);
 }catch(e){console.error(e.stack);app.exit(1);}finally{win?.destroy();}
});
