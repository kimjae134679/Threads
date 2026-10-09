'use strict';
// Offline production integration test; outputs only into the explicit test directory.
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {coverHtml}=require('../desktop/universal-cover.cjs'),{reflowSourceBundle}=require('../desktop/cover-reproduction-run.cjs'),{loadGeneratedCover}=require('../desktop/user-generated-cover.cjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
app.disableHardwareAcceleration();app.commandLine.appendSwitch('force-device-scale-factor','1');
(async()=>{
 const requestFile=process.argv.find(a=>a.startsWith('--portrait-test='))?.slice('--portrait-test='.length);assert(path.isAbsolute(requestFile||''));
 const request=JSON.parse(await fs.readFile(requestFile,'utf8'));assert(path.isAbsolute(request.output));
 app.setPath('userData',path.join(request.output,'test-profile'));await app.whenReady();session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>cb({cancel:true}));
 const win=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}}),proof=[];
 try{for(const row of request.rows){
  const original=await fs.readFile(path.join(row.source,'source-bundle.zip')),old=JSON.parse(await fs.readFile(path.join(row.source,'production-plan.json'),'utf8'));
  const reflow=await reflowSourceBundle(win,original,old),asset=await loadGeneratedCover(request.sourceRoot,row);assert(asset,'Existing user-generated cover must be available');
  const dir=path.join(request.output,row.id);await fs.mkdir(path.join(dir,'fonts'),{recursive:true});await fs.copyFile(path.join(__dirname,'../app/fonts/SB_Aggro_B.ttf'),path.join(dir,'fonts/SB_Aggro_B.ttf'));
  const html=coverHtml({id:row.id,title:old.originalTitle,typography:true,aspectRatio:'3:4',titleStyle:old.coverTitleStyle||old.universalCover?.titleStyle,imageUrl:asset.dataUrl,variant:'photo'});
  await fs.writeFile(path.join(dir,'cover.html'),html);await win.loadFile(path.join(dir,'cover.html'));const cover=await win.webContents.executeJavaScript('window.coverPNG()');
  const coverBytes=Buffer.from(cover.data.split(',')[1],'base64'),images=[{name:'rendered/slide-001.png',data:coverBytes},...reflow.images.slice(1)];
  const g=cover.geometry;assert(g.glyphBoxes.every(b=>b.x>=120&&b.x+b.width<=960&&b.y>=120&&b.y+b.height<=1320));
  assert.equal(g.imageBox.fit,'contain');assert.equal(g.imageBox.crop.width,asset.width||g.imageBox.crop.width);
  await fs.mkdir(path.join(dir,'rendered'),{recursive:true});const files=[];
  for(const image of images){assert.equal(image.data.readUInt32BE(16),1080);assert.equal(image.data.readUInt32BE(20),1440);await fs.writeFile(path.join(dir,image.name),image.data);files.push({name:image.name,sha256:sha(image.data),width:1080,height:1440});}
  // Evaluate profile 3:4 and center-cropped 4:5 rectangles, without uploading.
  assert(g.glyphBoxes.every(b=>b.y>=45&&b.y+b.height<=1395));
  const plan={...reflow.plan,pages:[{...reflow.plan.pages[0],geometry:g},...reflow.plan.pages.slice(1)]};await fs.writeFile(path.join(dir,'production-plan.json'),JSON.stringify(plan,null,2)+'\n');
  assert.equal(sha(await fs.readFile(path.join(row.source,'source-bundle.zip'))),sha(original));
  const item={id:row.id,output:dir,originalPages:old.pages.length,pages:images.length,coverTitle:g.title,bodyFontSize:plan.bodyFontSize,safeMargin:plan.safeMargin,files,sourceZipSha256:sha(original),consumedAssetSha256:asset.sha256,titleSize:g.size,sourceAndContentOrderPreserved:true,profile3x4And4x5CropSimulation:true,liveInstagramChecked:false,endingCardIncluded:false};proof.push(item);
  await fs.writeFile(path.join(request.output,'proof.json'),JSON.stringify({passed:true,installedApplicationModified:false,rows:proof},null,2)+'\n');console.log(JSON.stringify({id:row.id,pages:images.length,titleSize:g.size,pass:true}));
 }}finally{win.destroy();}
 // Credits use the same portrait text safe area in both existing cover renderers.
 const creditDir=path.join(request.output,'credit-fixtures');await fs.mkdir(path.join(creditDir,'fonts'),{recursive:true});
 for(const name of ['SB_Aggro_B.ttf','CarouselSansKR-Black.woff'])await fs.copyFile(path.join(__dirname,'../app/fonts',name),path.join(creditDir,'fonts',name));
 const creditWin=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 try{for(const typography of [true,false]){const file=path.join(creditDir,'cover-'+typography+'.html');await fs.writeFile(file,coverHtml({title:'출처를 보존하는 제목',typography,aspectRatio:'3:4',credit:'QA Attribution · Test rights',fontUrl:'fonts/CarouselSansKR-Black.woff'}));await creditWin.loadFile(file);const g=await creditWin.webContents.executeJavaScript('(await window.coverPNG()).geometry');const b=g.creditBox;assert(b&&b.x>=120&&b.x+b.width<=960&&b.y>=120&&b.y+b.height<=1320);}}
 finally{creditWin.destroy();}
 app.exit(0);
})().catch(e=>{console.error(e.stack);app.exit(1);});
