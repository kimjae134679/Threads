'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function audit({app,window,store,directory}){
 if(!path.isAbsolute(directory))throw Error('Absolute audit directory required');
 for(let i=0;i<150;i++){if(await window.webContents.executeJavaScript("document.getElementById('pageImage').naturalWidth>0"))break;if(i===149)throw Error('Installed image load timed out: '+JSON.stringify(await window.webContents.executeJavaScript("({error:document.getElementById('error')?.textContent,title:document.getElementById('title')?.textContent,image:document.getElementById('pageImage')?.getAttribute('src')?.slice(0,30),api:!!window.ThreadsPostReview,posts:document.querySelectorAll('.post-card').length})")));await new Promise(r=>setTimeout(r,100));}
 const before=await fs.readFile(store.file,'utf8');
 const workflowBefore=await fs.readFile(store.workflowFile,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 const data=await store.list();const controls=await window.webContents.executeJavaScript("Object.fromEntries(['randomPost','topic','excludeSeen','holdPost','rejectPost','restorePost','fromCover','vertical','note','scores'].map(id=>[id,!!document.getElementById(id)]))");
 assert(Object.values(controls).every(Boolean));assert(data.entries.some(e=>e.hasOutput));
 await window.webContents.executeJavaScript("document.getElementById('fromCover').click();window.ThreadsPostReviewUI.flush()");
 assert.equal(before,await fs.readFile(store.file,'utf8'),'Audit must not alter actual ratings');
 assert.equal(workflowBefore,await fs.readFile(store.workflowFile,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;}),'Audit must not alter workflow');
 await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,'installed-review.png'),(await window.webContents.capturePage()).toPNG());
 const result={pass:true,checkedAt:new Date().toISOString(),version:app.getVersion(),packaged:app.isPackaged,executable:process.execPath,readOnlyActualData:true,entries:data.entries.length,outputs:data.entries.filter(e=>e.hasOutput).length,ratings:data.entries.filter(e=>e.current?.score!=null).length,memos:data.entries.filter(e=>e.current?.note?.trim()).length,reviewRound:data.reviewRound,controls,feedbackUnchanged:true,workflowUnchanged:true};
 await fs.writeFile(path.join(directory,'installed-review.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));app.exit(0);
};
