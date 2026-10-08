'use strict';
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {coverHtml}=require('../desktop/universal-cover.cjs');
app.disableHardwareAcceleration();app.commandLine.appendSwitch('force-device-scale-factor','1');
app.setPath('userData',path.join(os.tmpdir(),'threads-compact-cover-'+process.pid));
app.whenReady().then(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'compact-cover-test-'));
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>cb({cancel:true}));
 const win=new BrowserWindow({show:false,width:1080,height:1350,useContentSize:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 const fontUrl=pathToFileURL(path.join(__dirname,'../app/fonts/CarouselSansKR-Black.woff')).href;
 const photo='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#526b70"/></svg>').toString('base64');
 let count=0;
 for(const aspectRatio of ['square','4:5'])for(const variant of ['paper','ink','photo'])for(const title of ['결혼 정보회사에\n다녀온 썰','숫자가 없는 제목도 글자 전체를 그대로 보존합니다. '.repeat(4),'원문에 있는 7000원과 3년을 그대로 표시','<> & "문자 그대로"','아주긴공백없는제목'.repeat(11)]){
  const file=path.join(dir,'cover.html');await fs.writeFile(file,coverHtml({id:'fixture',title,aspectRatio,variant,imageUrl:variant==='photo'?photo:null,fontUrl}));
  await win.loadFile(file);const result=await win.webContents.executeJavaScript('window.coverPNG()').catch(e=>{throw Error(JSON.stringify({aspectRatio,variant,characters:title.length})+': '+e.message);}),g=result.geometry,b=Buffer.from(result.data.split(',')[1],'base64');
  assert.equal(b.readUInt32BE(16),1080);assert.equal(b.readUInt32BE(20),aspectRatio==='square'?1080:1350,'Compact cover must render requested PNG height');
  assert.equal(g.title,title);assert.equal(g.lines.join('').replace(/\s/g,''),title.replace(/\s/g,''),'Wrapping may not remove characters');
  assert(g.box.x>=72&&g.box.y>=72&&g.box.x+g.box.width<=1008&&g.box.y+g.box.height<=g.height-72,'All title pixels stay within safe margins');
  assert(g.size>=64&&g.size<=132,'Title remains readable without oversized short headings');
  assert.equal(/\d/.test(g.lines.join('')),/\d/.test(title),'No invented numbers');
  if(g.emphasis)assert(title.includes(g.emphasis)&&g.emphasis.length<=24,'Automatic emphasis only uses a short source phrase');
  if(variant!=='photo')assert(Math.abs(g.box.y+g.box.height/2-g.height/2)<55,'Title-only composition uses the centre instead of leaving an empty photo slot');
  if(variant==='photo')assert(g.box.y>=g.height*.32,'Photo keeps a visible upper scene');
  count++;
 }
 assert.throws(()=>coverHtml({id:'x',title:'제목',aspectRatio:'9:16'}),/비율/);
 assert.throws(()=>coverHtml({id:'x',title:'원제목',aspectRatio:'square',variant:'photo'}));
 assert.throws(()=>coverHtml({id:'x',title:'원제목',aspectRatio:'square',emphasis:'없는 숫자 99'}));
 for(const {title,height}of [{title:'짧은 제목',height:1080},{title:'긴 원문 제목을 생략 없이 읽을 수 있게 자동으로 더 넓은 세로 공간을 선택합니다. '.repeat(3),height:1350}]){
  const autoFile=path.join(dir,'auto.html');await fs.writeFile(autoFile,coverHtml({id:'auto',title,aspectRatio:'auto',fontUrl}));await win.loadFile(autoFile);const result=await win.webContents.executeJavaScript('window.coverPNG()');assert.equal(result.geometry.height,height);assert.equal(result.geometry.title,title);
 }
 const heldFile=path.join(dir,'held.html');await fs.writeFile(heldFile,coverHtml({id:'long-photo',title:'긴제목'.repeat(90),aspectRatio:'square',variant:'photo',imageUrl:photo,fontUrl}));await win.loadFile(heldFile);
 await assert.rejects(win.webContents.executeJavaScript('window.coverPNG()'),/안전한 범위/,'An unfit title is held instead of silently truncating or shrinking below the readable minimum');
 await win.loadFile(path.join(dir,'cover.html'));await win.webContents.executeJavaScript('window.coverReady');
 const preview=await win.webContents.executeJavaScript('({width:document.querySelector(".rendered").naturalWidth,height:document.querySelector(".rendered").naturalHeight})');assert.equal(preview.height,1350,'HTML preview displays the same rendered PNG');
 win.destroy();console.log(JSON.stringify({compactCoverCases:count,pass:true}));app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
