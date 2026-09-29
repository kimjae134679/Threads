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
    const saved=await bundle.webContents.executeJavaScript(`(async()=>{
      const title='결혼 승낙 받자마자 탈모인거 밝힌 남편..';
      const raw=${JSON.stringify(Array.from({length:8},(_,i)=>originals[i].toString('base64')))};
      const files=raw.map((data,i)=>{const name=String(i+1).padStart(2,'0')+'.jpg';
        const file=new File([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],name,{type:'image/jpeg'});
        Object.defineProperty(file,'webkitRelativePath',{value:'candidate/media/'+name});return file;});
      const media=await Promise.all(files.map(async(file,i)=>{const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
        return {file:'media/'+file.name,sequence:i+1,sha256:[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')};}));
      const manifest=new File([JSON.stringify({schema:'threads-program-input-v1',title,sourceUrl:'https://theqoo.net/square/3826792703',media})],
        'manifest.json',{type:'application/json'});
      Object.defineProperty(manifest,'webkitRelativePath',{value:'candidate/manifest.json'});
      const item=await window.ThreadsSourceBatch.loadSavedFolder([manifest,...files]);
      document.getElementById('coverTitle').value='결혼 승낙 후 탈모 고백';
      document.getElementById('coverSize').value='64';
      document.getElementById('coverTop').value='24';
      document.getElementById('coverLeft').value='300';
      const damaged=new File([new Uint8Array([1,2,3])],files[0].name,{type:'image/jpeg'});
      Object.defineProperty(damaged,'webkitRelativePath',{value:files[0].webkitRelativePath});
      let rejected=false;
      try {await window.ThreadsSourceBatch.loadSavedFolder([manifest,damaged,...files.slice(1)]);}
      catch(error) {rejected=/원문 이미지 누락 또는 변경/.test(error.message);}
      const {bundle:zip}=await window.ThreadsSourceBatch.sourceZip(item);
      const preview=await window.ThreadsSourceBatch.renderBundle(new File([zip],'saved.zip'),{preview:true});
      const entries=await window.ThreadsSourceBundleZip.read(new File([preview.zip],'preview.zip'));
      const output=JSON.parse(new TextDecoder().decode(entries.get('manifest.json')));
      const bytes=new Uint8Array(await preview.zip.arrayBuffer());
      let packed='';for(let i=0;i<bytes.length;i+=16384)packed+=String.fromCharCode(...bytes.subarray(i,i+16384));
      const originals=files.map((file,i)=>{const name=String(i+1).padStart(2,'0')+'.jpg';
        const copy=new File([file],name,{type:'image/jpeg'});
        Object.defineProperty(copy,'webkitRelativePath',{value:'package/original/'+name});return copy;});
      const note=new File(['- exact observed title: '+String.fromCharCode(96)+title+String.fromCharCode(96)+'\\n- source URL: https://theqoo.net/square/3826792703\\n'],
        'SOURCE.md',{type:'text/plain'});
      Object.defineProperty(note,'webkitRelativePath',{value:'package/SOURCE.md'});
      const intake=new File([JSON.stringify({type:'SCREENSHOT_INTAKE_MANIFEST',assets:media.map((entry,i)=>({
        name:originals[i].name,sha256:entry.sha256}))})],'intake-manifest.json',{type:'application/json'});
      Object.defineProperty(intake,'webkitRelativePath',{value:'package/intake-manifest.json'});
      const packageItem=await window.ThreadsSourceBatch.loadSavedFolder([note,intake,...originals]);
      return {count:item.plan.segments.length,kind:item.plan.sourceType,body:item.plan.segments.filter(x=>x.kind==='text').length,
        title:item.plan.originalTitle,review:item.plan.review,previewPages:preview.pages,
        previewOnly:output.previewOnly,publicationAllowed:output.publicationAllowed,rejected,
        sourcePackageCount:packageItem.plan.segments.length,zipBase64:btoa(packed)};
    })()`);
    assert.equal(saved.count,8);assert.equal(saved.kind,'saved-media');assert.equal(saved.body,0);
    assert.equal(saved.review.bodyVerified,false);assert.equal(saved.previewPages,9);
    assert.equal(saved.previewOnly,true);assert.equal(saved.publicationAllowed,false);assert.equal(saved.rejected,true);
    assert.equal(saved.sourcePackageCount,8);
    const samplePath=path.join(__dirname,'dist','real-source-review-preview.zip');
    await fs.mkdir(path.dirname(samplePath),{recursive:true});
    await fs.writeFile(samplePath,Buffer.from(saved.zipBase64,'base64'));
    console.log('Curated source browser smoke PASS',JSON.stringify({fixture:result,
      actual:{pages:actual.pages,selected:actual.selected},saved:{count:saved.count,previewPages:saved.previewPages,
        rejected:saved.rejected,previewOnly:saved.previewOnly,publicationAllowed:saved.publicationAllowed,samplePath}}));
    app.exit(0);
  } catch(error) { console.error(error.stack);app.exit(1); }
});
