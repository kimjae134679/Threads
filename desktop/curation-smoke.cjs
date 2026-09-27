'use strict';
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
require('node:fs').mkdirSync(path.join(__dirname, 'dist', 'curation-profile'), { recursive: true });
app.setPath('userData', path.join(__dirname, 'dist', 'curation-profile'));
app.whenReady().then(async () => {
  try {
    const bundle=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
    await bundle.loadFile(path.join(__dirname,'..','app','source-batch.html'));
    for(let i=0;i<100;i++) {
      if(await bundle.webContents.executeJavaScript('!!window.ThreadsSourceBatch').catch(()=>false))break;
      await wait(100);
    }
    assert(await bundle.webContents.executeJavaScript('!!window.ThreadsSourceBatch'),'Curation scripts did not load');
    const sourceImage=await fs.readFile(path.join(__dirname,'..','docs','examples','source-cover-image.png'));
    const encoded=sourceImage.toString('base64');
    const result=await bundle.webContents.executeJavaScript(`(async()=>{
      const html='<html><head><meta property="og:title" content="원문에 있는 제목"></head><body><nav>메뉴 광고</nav><article class="article-content"><p>첫 문단의 실제 내용입니다.</p><p>두 번째 문단의 실제 내용입니다.</p><img src="photo.png"><p>마지막 문단의 실제 내용입니다.</p></article><ul class="comment-list"><li class="comment-item" data-likes="12"><span class="nickname">작성자</span><p class="comment-text">재미있는 실제 댓글</p></li></ul></body></html>';
      const source=new File([html],'source.html',{type:'text/html'});
      const data=Uint8Array.from(atob(${JSON.stringify(encoded)}),char=>char.charCodeAt(0));
      const picture=new File([data],'photo.png',{type:'image/png'});
      const item=await window.ThreadsSourceBatch.prepare(source,[source,picture]);
      window.ThreadsSourceBatch.review(item);
      const plan=item.plan;
      const before={segments:plan.segments.map(s=>[s.kind,s.text||s.mediaName,s.selected]),
        comments:plan.comments.map(c=>[c.text,c.selected]),review:plan.review,cover:plan.cover};
      const {bundle}=await window.ThreadsSourceBatch.sourceZip(item);
      const preview=await window.ThreadsSourceBatch.renderBundle(new File([bundle],'curated.zip'),{preview:true});
      let blocked=false;
      try {await window.ThreadsSourceBatch.renderBundle(new File([bundle],'curated.zip'));} catch(e) {blocked=/확인 표시/.test(e.message);}
      return {before,previewPages:preview.pages,blocked};
    })()`);
    assert.deepEqual(result.before.segments.map(s=>s[0]),['text','text','image','text']);
    assert(!result.before.segments.some(s=>s[1]==='메뉴 광고'));
    assert(result.before.segments.every(s=>s[2]));
    assert.equal(result.before.comments[0][0],'재미있는 실제 댓글');
    assert.equal(result.before.comments[0][1],true);
    assert.equal(result.before.review.bodyVerified,false);
    assert.equal(result.before.cover.kind,'image');
    assert(result.previewPages>=2,'Preview must include cover and source');
    assert(result.blocked,'Unreviewed curation must not render final output');
    const sourceFolder=path.join(__dirname,'..','data','source-packages','theqoo-3826792703','original');
    const originals=await Promise.all(Array.from({length:8},(_,i)=>fs.readFile(path.join(sourceFolder,String(i+1).padStart(2,'0')+'.jpg'))));
    const actual=await bundle.webContents.executeJavaScript(`(async()=>{
      const title='결혼 승낙 받자마자 탈모인거 밝힌 남편..';
      const media=${JSON.stringify(Array.from({length:8},(_,i)=>({name:String(i+1).padStart(2,'0')+'.jpg',base64:originals[i].toString('base64')})))};
      const text='[TITLE]\\n'+title+'\\n[BODY]\\n'+media.map(item=>'[IMAGE:'+item.name+']').join('\\n')+'\\n[COMMENTS]\\nNONE';
      const source=new File([text],'source.txt',{type:'text/plain'});
      const files=[source,...media.map(item=>new File([Uint8Array.from(atob(item.base64),c=>c.charCodeAt(0))],item.name,{type:'image/jpeg'}))];
      const item=await window.ThreadsSourceBatch.prepare(source,files);
      window.ThreadsSourceBatch.review(item);
      const {bundle:input}=await window.ThreadsSourceBatch.sourceZip(item);
      const preview=await window.ThreadsSourceBatch.renderBundle(new File([input],'original.zip'),{preview:true});
      const bytes=new Uint8Array(await preview.zip.arrayBuffer());
      let raw='';for(let i=0;i<bytes.length;i+=16384)raw+=String.fromCharCode(...bytes.subarray(i,i+16384));
      return {pages:preview.pages,selected:item.plan.segments.length,zipBase64:btoa(raw)};
    })()`);
    assert.equal(actual.pages,9);
    const samplePath=path.join(__dirname,'dist','real-source-review-preview.zip');
    await fs.mkdir(path.dirname(samplePath),{recursive:true});
    await fs.writeFile(samplePath,Buffer.from(actual.zipBase64,'base64'));
    console.log('Curated source browser smoke PASS',JSON.stringify({fixture:result,actual:{pages:actual.pages,selected:actual.selected,samplePath}}));
    app.exit(0);
  } catch(error) { console.error(error.stack);app.exit(1); }
});
