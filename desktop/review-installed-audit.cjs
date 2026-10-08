'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function audit({app,window,store,directory}){
 if(!path.isAbsolute(directory))throw Error('Absolute audit directory required');
 if(process.argv.includes('--review-ui-stress')){window.restore();window.show();window.focus();}
 for(let i=0;i<150;i++){if(await window.webContents.executeJavaScript("document.getElementById('pageImage').naturalWidth>0"))break;if(i===149)throw Error('Installed image load timed out: '+JSON.stringify(await window.webContents.executeJavaScript("({error:document.getElementById('error')?.textContent,title:document.getElementById('title')?.textContent,image:document.getElementById('pageImage')?.getAttribute('src')?.slice(0,30),api:!!window.ThreadsPostReview,posts:document.querySelectorAll('.post-card').length})")));await new Promise(r=>setTimeout(r,100));}
 const before=await fs.readFile(store.file,'utf8');
 const workflowBefore=await fs.readFile(store.workflowFile,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 const data=await store.list();const controls=await window.webContents.executeJavaScript("Object.fromEntries(['randomPost','topic','excludeSeen','holdPost','rejectPost','restorePost','fromCover','vertical','note','scores'].map(id=>[id,!!document.getElementById(id)]))");
 assert(Object.values(controls).every(Boolean));assert(data.entries.some(e=>e.hasOutput));
 let stress=null,focusedImages=[];
 if(process.argv.includes('--review-ui-stress')){
  const run=s=>window.webContents.executeJavaScript(s),pause=ms=>new Promise(r=>setTimeout(r,ms));
  let active=0,maxActive=0,reads=0;const failures=[],original=store.image;
  store.image=async(...args)=>{active++;reads++;maxActive=Math.max(maxActive,active);try{return await original(...args);}catch(e){failures.push({id:args[0],page:args[1],message:e.message});throw e;}finally{active--;}};
  const focusId=process.argv.find(a=>a.startsWith('--review-focus-id='))?.slice('--review-focus-id='.length),focus=focusId&&data.entries.find(r=>r.id===focusId);
  if(focusId){assert(focus&&focus.hasOutput);assert(focus.pages<=3,'Focused audit is limited to three reported images');for(let p=1;p<=focus.pages;p++){await run(`window.ThreadsPostReviewUI.select(${JSON.stringify(focus.id)},{page:${p}})`);for(let i=0;i<300;i++){if(await run(`document.getElementById('pageImage').dataset.postId===${JSON.stringify(focus.id)}&&document.getElementById('pageImage').naturalWidth===1080&&!document.getElementById('pageImage').hidden`))break;if(i===299)throw Error('Reported image failed to decode at page '+p);await pause(30);}focusedImages.push({id:focus.id,page:p,width:1080});}}
  const ids=data.entries.filter(r=>r.hasOutput&&r.disposition==='eligible').slice(0,80).map(r=>r.id),longest=data.entries.reduce((a,b)=>a.pages>b.pages?a:b);
  for(const id of ids){await run(`void window.ThreadsPostReviewUI.select(${JSON.stringify(id)},{page:1})`);await pause(20);}
  await run(`(async()=>{await window.ThreadsPostReviewUI.select(${JSON.stringify(longest.id)},{page:1});document.getElementById('vertical').click();})()`);
  for(let p=1;p<=longest.pages;p+=3){await run(`document.querySelector('#verticalPages img[data-page="${p}"]').scrollIntoView({block:'center'});void 0`);await pause(20);}
  for(const id of ids.slice(0,20)){await run(`void window.ThreadsPostReviewUI.select(${JSON.stringify(id)},{page:1})`);await pause(20);}
  await run(`(async()=>{document.getElementById('single').click();await window.ThreadsPostReviewUI.select(${JSON.stringify(ids.at(-1))},{page:1});})()`);
  for(let i=0;i<300;i++){if(await run(`document.getElementById('pageImage').dataset.postId===${JSON.stringify(ids.at(-1))}&&document.getElementById('pageImage').naturalWidth===1080`)&&!active)break;if(i===299)throw Error('Installed rapid selection did not settle');await pause(30);}
  stress={reads,maxActive,remaining:active,failures,state:await run(`(()=>{const v=document.getElementById('imageViewport').getBoundingClientRect(),f=document.querySelector('.feedback').getBoundingClientRect();return {id:document.getElementById('pageImage').dataset.postId,naturalWidth:document.getElementById('pageImage').naturalWidth,postCards:document.querySelectorAll('.post-card').length,imageSources:[...document.images].filter(i=>i.getAttribute('src')).length,thumbnails:[...document.querySelectorAll('.post-card img')].filter(i=>i.naturalWidth).map(i=>i.naturalWidth),excludeSeen:document.getElementById('excludeSeen').checked,bodyNotCovered:v.bottom<=f.top+1,error:document.getElementById('error').hidden?null:document.getElementById('error').textContent,visible:!document.hidden};})()`)};
  assert(maxActive<=3);assert.equal(failures.length,0);assert.equal(active,0);assert(stress.state.postCards<20);assert(stress.state.thumbnails.every(w=>w<=120));assert(stress.state.bodyNotCovered);assert.equal(stress.state.error,null);
  store.image=original;
 }
 await window.webContents.executeJavaScript("document.getElementById('fromCover').click();window.ThreadsPostReviewUI.flush()");
 assert.equal(before,await fs.readFile(store.file,'utf8'),'Audit must not alter actual ratings');
 assert.equal(workflowBefore,await fs.readFile(store.workflowFile,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;}),'Audit must not alter workflow');
 await fs.mkdir(directory,{recursive:true});
 const result={pass:true,checkedAt:new Date().toISOString(),version:app.getVersion(),packaged:app.isPackaged,executable:process.execPath,nativeWindow:{visible:window.isVisible(),minimized:window.isMinimized(),focused:window.isFocused(),bounds:window.getBounds()},readOnlyActualData:true,entries:data.entries.length,outputs:data.entries.filter(e=>e.hasOutput).length,ratings:data.entries.filter(e=>e.current?.score!=null).length,memos:data.entries.filter(e=>e.current?.note?.trim()).length,reviewRound:data.reviewRound,controls,focusedImages,stress,feedbackUnchanged:true,workflowUnchanged:true};
 await fs.writeFile(path.join(directory,'installed-review.json'),JSON.stringify({...result,screenshot:'pending'},null,2));
 await fs.writeFile(path.join(directory,'installed-review.png'),(await window.webContents.capturePage()).toPNG());
 await fs.writeFile(path.join(directory,'installed-review.json'),JSON.stringify({...result,screenshot:'captured'},null,2));console.log(JSON.stringify(result));app.exit(0);
};
