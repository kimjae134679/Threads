'use strict';
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {squareCoverHtml}=require('../desktop/square-cover.cjs');
app.disableHardwareAcceleration();app.setPath('userData',path.join(os.tmpdir(),'square-cover-test-'+process.pid));
app.whenReady().then(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'square-cover-'));
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>cb({cancel:true}));
 const win=new BrowserWindow({show:false,width:1080,height:1080,useContentSize:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 const fontUrl=pathToFileURL(path.join(__dirname,'../app/fonts/CutGothic-ExtraBold.woff')).href;
 const long='예전 남자친구가 "한 번쯤 요리해줘!"하고 화를 낸 적 있었는데, 막상 요리를 내놓았더니 "다시는 요리할 생각 하지마... 외식하는 비용으로 목숨이 보장된다면 그걸로 됐어..."라는 말을 들은적 있어요.';
 const photo='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="1080" height="1080" fill="#677773"/></svg>').toString('base64');
 let cases=0;
 for(const title of [long,'메가커피 알바 중기','키즈카페 알바 그만둔 후기(키즈카페 알바의 모든 것)','숫자 없는 제목','7000원 3번','<> & "그대로"','앞줄\n뒷줄'])for(const imageUrl of [null,photo]){
  const file=path.join(dir,'cover.html');await fs.writeFile(file,squareCoverHtml({id:'fixture',title,fontUrl,imageUrl}));await win.loadFile(file);
  const r=await win.webContents.executeJavaScript('window.coverPNG()').catch(e=>{throw Error(JSON.stringify({title,image:Boolean(imageUrl)})+': '+e.message);}),g=r.geometry,b=Buffer.from(r.data.split(',')[1],'base64');
  assert.equal(b.readUInt32BE(20),1080,'Short and long covers must both default to square');
  assert.equal(g.title,title);assert.equal(g.lines.join('').replace(/\s/gu,''),title.replace(/\s/gu,''));
  assert(g.size>=80&&g.size<=128);assert.equal(/\d/.test(g.lines.join('')),/\d/.test(title));
  assert(g.glyphBoxes.every(b=>b.x>=64&&b.y>=64&&b.x+b.width<=1016&&b.y+b.height<=1016));
  if(title===long){assert(g.size>=86,'Long title improves on the previous 82px square');assert.equal(g.imageBox,null,'Dense title automatically uses typography');}
  if(title.startsWith('키즈카페')){assert(g.lines.some(line=>line.includes('그만둔')));assert.equal(g.lines.filter(line=>line.includes('키즈카페')).length,2,'Short Korean nouns must not split across lines');}
  if(g.imageBox){assert.equal(g.imageBox.fit,'contain');assert.equal(g.imageBox.width,1080);assert(g.box.y>=480);assert.equal(g.aiLabel,'AI 연출 이미지');}
  cases++;
 }
 const file=path.join(dir,'cover.html');await fs.writeFile(file,squareCoverHtml({title:'가'.repeat(300),fontUrl}));await win.loadFile(file);await assert.rejects(win.webContents.executeJavaScript('window.coverPNG()'),/보류/);
 assert.throws(()=>squareCoverHtml({title:'제목',emphasis:'없는 99'}));
 win.destroy();console.log(JSON.stringify({pass:true,squareCases:cases}));app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
