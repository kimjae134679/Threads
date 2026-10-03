'use strict';
const {BrowserWindow,dialog,ipcMain,shell}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {runFolderBatch,readReport,inside}=require('./folder-batch.cjs');
const {fetchPublic,decodeHtml,hash}=require('./public-source.cjs');
function registerFolderBatch({app,getEditor,trusted,preferences,bundleUrl}) {
  const materialRoot=path.join(app.getPath('desktop'),'Threads Cut Editor 자료');
  const output=path.join(materialRoot,'06_자동 제작 결과');
  let active=null;
  const progress=value=>{const editor=getEditor();if(editor&&!editor.isDestroyed())editor.webContents.send('source-cut:batch-progress',value);};
  const publicReport=report=>report?{inputFolder:report.inputFolder,lastRunAt:report.lastRunAt,total:report.total,
    processed:report.processed??report.entries.length,cancelled:report.cancelled,counts:report.counts,active:!!active,
    entries:report.entries.map(({id,title,status,reason,nextAction,site,sourceUrl,renderedPages,outputFolder,inputKind,ruleVersion,plannedAt,generatedAt,reviewStatus,publicationStatus})=>
      ({id,title,status,reason,nextAction,site,sourceUrl,renderedPages,outputFolder,inputKind,ruleVersion,plannedAt,generatedAt,reviewStatus,publicationStatus}))}:{entries:[],active:!!active};
  async function renderWindow(state) {
    if(!state.window||state.window.isDestroyed()) {
      state.window=new BrowserWindow({show:false,webPreferences:{...preferences,backgroundThrottling:false}});
      state.window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
      state.window.webContents.on('will-navigate',event=>event.preventDefault());
      await state.window.loadURL(bundleUrl);
    }
    return state.window;
  }
  async function acquire(job,state) {
    const target=path.join(job.folder,'source'),recordPath=path.join(target,'acquisition.json');
    try {
      const prior=JSON.parse(await fs.readFile(recordPath,'utf8'));
      if(prior.url===job.sourceUrl&&prior.state!=='saved_html'&&!/Script failed to execute/.test(prior.reason||'')&&Date.now()-Date.parse(prior.checkedAt)<86400000)
        return {status:prior.state,reason:prior.reason};
    } catch(error) {if(error.code!=='ENOENT')throw error;}
    await fs.mkdir(target,{recursive:true});
    let record={url:job.sourceUrl,checkedAt:new Date().toISOString(),publicationAllowed:false};
    try {
      const page=await fetchPublic(job.sourceUrl,{maxBytes:5*1024*1024,mime:'html',signal:state.abort.signal});
      const raw=decodeHtml(page.bytes,page.contentType),win=await renderWindow(state);
      const extracted=await win.webContents.executeJavaScript(`(()=>{try{
        const plan=window.ThreadsSourceCuration.htmlDraft(${JSON.stringify(raw)},[]);
        return {title:plan.originalTitle,images:plan.segments.filter(s=>s.kind==='image').map(s=>({name:s.mediaName,url:s.mediaUrl}))};
      }catch(error){return {error:error.message};}})()`);
      if(extracted.error)throw new Error(extracted.error);
      if(!extracted.title?.trim())throw new Error('본문 제목을 특정하지 못했습니다.');
      await fs.writeFile(path.join(target,'source.html'),page.bytes);
      const media=[];await fs.mkdir(path.join(target,'media'),{recursive:true});
      const seen=new Map();
      for(const item of extracted.images) {
        if(state.cancelled)throw new Error('중지됨');
        const resolved=new URL(item.url,page.url);if(resolved.protocol==='http:')resolved.protocol='https:';
        const url=resolved.href;
        if(seen.has(item.name)) {
          if(seen.get(item.name)!==url)media.push({url,error:'같은 이름의 서로 다른 원본 이미지'});
          continue;
        }
        seen.set(item.name,url);
        if(seen.size>30){media.push({url,error:'본문 이미지 30장 제한'});continue;}
        const filename=path.basename(item.name.replaceAll('\\','/'));
        if(!filename||filename!==item.name||/[<>:"/\\|?*\x00-\x1f]/.test(filename)){media.push({url,error:'지원하지 않는 원본 파일명'});continue;}
        try {
          const embedded=/^data:(image\/(?:png|jpeg|webp|gif));base64,([a-z0-9+/=\s]+)$/i.exec(url);
          const image=embedded?{bytes:Buffer.from(embedded[2],'base64'),contentType:embedded[1]}:
            await fetchPublic(url,{maxBytes:8*1024*1024,mime:'image',signal:state.abort.signal});
          if(!image.bytes.length||image.bytes.length>8*1024*1024)throw new Error('본문 이미지 용량을 확인하세요.');
          await fs.writeFile(path.join(target,'media',filename),image.bytes);
          media.push({url,file:'media/'+filename,sha256:hash(image.bytes),contentType:image.contentType,bytes:image.bytes.length});
        } catch(error) {if(state.cancelled)throw error;media.push({url,error:String(error.message)});}
      }
      record={...record,state:'saved_html',url:page.url,title:extracted.title,htmlSha256:hash(page.bytes),
        contentType:page.contentType,media,textStatus:'needs_verbatim_check',commentsStatus:'visible_only_not_complete'};
      await fs.writeFile(recordPath,JSON.stringify(record,null,2)+'\n','utf8');
      return {status:'saved_html'};
    } catch(error) {
      if(state.cancelled)throw error;
      record={...record,state:/HTTP (404|410)/.test(error.message)?'unavailable':
        /HTTP (401|403)|로그인|권한/.test(error.message)?'needs_access':
        /본문|제목/.test(error.message)?'needs_selection':'failed',reason:String(error.message).slice(0,300)};
      await fs.writeFile(recordPath,JSON.stringify(record,null,2)+'\n','utf8');
      return {status:record.state,reason:record.reason};
    } finally {if(!state.cancelled)await new Promise(resolve=>setTimeout(resolve,1000));}
  }
  async function render(job,state,context={}) {
    const win=await renderWindow(state);
    const result=await win.webContents.executeJavaScript(`(async()=>{try{
      const input=${JSON.stringify(job)},prefix='candidate/';
      const source=new File([input.sourceText],input.sourceName,{type:'text/plain'});
      Object.defineProperty(source,'webkitRelativePath',{value:prefix+input.sourceName});
      const all=[source];
      if(input.intakeText) {
        const intake=new File([input.intakeText],'intake-manifest.json',{type:'application/json'});
        Object.defineProperty(intake,'webkitRelativePath',{value:prefix+'intake-manifest.json'});all.push(intake);
      }
      for(const file of input.files) {
        const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));
        const image=new File([bytes],file.name,{type:file.type});
        Object.defineProperty(image,'webkitRelativePath',{value:prefix+input.imageDirectory+'/'+file.name});all.push(image);
      }
      if(input.inputKind==='html') {
        const draft=window.ThreadsSourceCuration.htmlDraft(input.sourceText,all.map(file=>file.name));
        for(const part of draft.segments) {
          const embedded=/^data:(image\\/(?:png|jpeg|webp|gif));base64,([a-z0-9+/=\\s]+)$/i.exec(part.mediaUrl||'');
          if(!embedded||all.some(file=>file.name===part.mediaName))continue;
          const image=new File([Uint8Array.from(atob(embedded[2].replace(/\\s/g,'')),c=>c.charCodeAt(0))],part.mediaName,{type:embedded[1]});
          Object.defineProperty(image,'webkitRelativePath',{value:prefix+input.imageDirectory+'/'+part.mediaName});all.push(image);
        }
      }
      const item=input.inputKind==='saved-media'?await window.ThreadsSourceBatch.loadSavedFolder(all):
        await window.ThreadsSourceBatch.prepare(source,all);
      if(input.inputKind!=='saved-media')window.ThreadsSourceBatch.review(item);
      item.plan.sourceUrl=item.plan.sourceUrl||input.sourceUrl||null;
      item.plan.style={...item.plan.style,allowSystemFallback:true};
      const title=item.plan.originalTitle||input.title;
      const coverTitle=window.ThreadsPagePlan.headline(title);
      document.getElementById('coverTitle').value=coverTitle;
      document.getElementById('coverSize').value='64';
      document.getElementById('coverTop').value='48';
      document.getElementById('coverLeft').value='70';
      const {bundle}=await window.ThreadsSourceBatch.sourceZip(item);
      window.__batchFile=new File([bundle],'source-bundle.zip');
      window.__batchPlan=await window.ThreadsSourceBatch.planBundle(window.__batchFile,{preview:true});
      return {productionPlan:window.__batchPlan,title};
    }catch(error){return {error:error.message};}})()`);
    if(result.error)throw new Error(result.error);
    if(context.folder) {
      await fs.mkdir(path.join(context.folder,'작업 정보'),{recursive:true});
      await fs.writeFile(path.join(context.folder,'작업 정보','production-plan.json'),JSON.stringify(result.productionPlan,null,2)+'\n','utf8');
      const p=result.productionPlan;
      const note=['# 제작 계획',p.originalTitle,'','기준: '+p.ruleVersion,'계획 갱신: '+p.preparedAt,
        '표지 제목: '+p.coverTitle,'원문 제목: '+p.originalTitle,'검수: 미확인','게시: 확인 기록 없음',
        '','장별 구성',...p.pages.map(page=>page.number+'장 / '+page.role+' / '+page.width+'×'+page.height+' / '+page.elements.map(e=>e.sourceId+':'+e.kind).join(', ')),
        '','제외 기록',...p.omitted.map(o=>o.sourceId+' / '+o.reason),'','주의',...p.warnings];
      await fs.writeFile(path.join(context.folder,'제작 계획.md'),note.join('\n')+'\n','utf8');
    }
    const rendered=await win.webContents.executeJavaScript(`(async()=>{try{
      const preview=await window.ThreadsSourceBatch.renderBundle(window.__batchFile,{preview:true,productionPlan:window.__batchPlan});
      const bundle=window.__batchFile,title=${JSON.stringify(result.title)};
      const encode=bytes=>{let raw='';for(let i=0;i<bytes.length;i+=16384)raw+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(raw);};
      return {pages:preview.pages,title,zip:encode(new Uint8Array(await preview.zip.arrayBuffer())),
        sourceZip:encode(new Uint8Array(await bundle.arrayBuffer())),
        images:preview.images.map(image=>({name:image.name,data:encode(image.data)}))};
    }catch(error){return {error:error.message};}})()`);
    if(rendered.error)throw new Error(rendered.error);
    if(!rendered.pages||rendered.images?.length!==rendered.pages)throw new Error('결과 이미지 수를 확인할 수 없습니다.');
    return {title:rendered.title,productionPlan:result.productionPlan,zip:Buffer.from(rendered.zip,'base64'),sourceZip:Buffer.from(rendered.sourceZip,'base64'),
      images:rendered.images.map(image=>({name:image.name,data:Buffer.from(image.data,'base64')}))};
  }
  ipcMain.handle('source-cut:run-folder-batch',async(event,options={})=>{
    trusted(event);if(active)throw new Error('이미 자동 제작 중입니다.');
    const prior=await readReport(output);
    let folder=prior?.inputFolder||path.join(materialRoot,'01_후보 기록');
    if(options.chooseFolder===true || !await fs.stat(folder).then(s=>s.isDirectory()).catch(()=>false)) {
      const picked=await dialog.showOpenDialog(getEditor(),{title:'전체 자동 처리할 자료 폴더',defaultPath:folder,properties:['openDirectory']});
      if(picked.canceled||!picked.filePaths[0])return {canceled:true};folder=picked.filePaths[0];
    }
    const state={cancelled:false,window:null,abort:new AbortController()};active=state;
    try {
      const result=await runFolderBatch({folder,output,render:(job,context)=>render(job,state,context),
        acquire:options.fillSources===false?undefined:job=>acquire(job,state),
        cancelled:()=>state.cancelled,onProgress:progress});
      return publicReport(result);
    } finally {if(state.window&&!state.window.isDestroyed())state.window.destroy();active=null;progress({phase:'finished'});}
  });
  ipcMain.handle('source-cut:cancel-folder-batch',event=>{trusted(event);if(active){active.cancelled=true;active.abort.abort();}});
  ipcMain.handle('source-cut:batch-report',async event=>{trusted(event);return publicReport(await readReport(output));});
  ipcMain.handle('source-cut:open-batch-results',async event=>{trusted(event);await fs.mkdir(output,{recursive:true});const error=await shell.openPath(output);if(error)throw new Error(error);});
  async function findEntry(id) {
    if(typeof id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(id))throw new Error('후보 ID를 확인하세요.');
    const report=await readReport(output),entry=report?.entries.find(item=>item.id===id);
    if(!entry)throw new Error('기록에서 후보를 찾지 못했습니다.');
    return {entry,report};
  }
  ipcMain.handle('source-cut:open-batch-entry',async(event,id,kind)=>{
    trusted(event);const {entry,report}=await findEntry(id);
    const root=kind==='source'?report.inputFolder:output;
    const folder=path.resolve(root,kind==='source'?entry.relativePath:entry.outputFolder||'');
    if(folder===root||!inside(root,folder))throw new Error('해당 후보 폴더가 없습니다.');
    const error=await shell.openPath(folder);if(error)throw new Error(error);
  });
  ipcMain.handle('source-cut:batch-preview',async(event,id)=>{
    trusted(event);const {entry}=await findEntry(id);
    if(!entry.outputFolder)return null;
    const folder=path.resolve(output,entry.outputFolder);
    if(!inside(output,folder)||folder===output)throw new Error('결과 경로를 확인하세요.');
    const file=path.join(folder,'rendered','slide-001.png'),stat=await fs.stat(file);
    if(stat.size>25*1024*1024)throw new Error('미리보기 이미지가 너무 큽니다.');
    return 'data:image/png;base64,'+(await fs.readFile(file)).toString('base64');
  });
  getEditor().on('closed',()=>{if(active){active.cancelled=true;active.abort.abort();}});
}
module.exports={registerFolderBatch};
