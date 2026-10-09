'use strict';
const {titleInfo}=require('./production-title.cjs');
const {getMaterialRoot}=require('./material-paths.cjs');
const {BrowserWindow,dialog,ipcMain,shell}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {runFolderBatch,readReport,discoverCandidates,inside}=require('./folder-batch.cjs');
const {importSavedSource}=require('./source-import.cjs');
const {fetchPublic,decodeHtml,hash}=require('./public-source.cjs');
function registerFolderBatch({app,getEditor,trusted,preferences,bundleUrl}) {
  const materialRoot=getMaterialRoot(app);
  const output=path.join(materialRoot,'06_자동 제작 결과');
  let active=null;
  const progress=value=>{const editor=getEditor();if(editor&&!editor.isDestroyed())editor.webContents.send('source-cut:batch-progress',value);};
  const publicReport=report=>report?{inputFolder:report.inputFolder,lastRunAt:report.lastRunAt,total:report.total,
    processed:report.processed??report.entries.length,cancelled:report.cancelled,counts:report.counts,active:!!active,
    entries:report.entries.map(({id,title,status,reason,nextAction,site,sourceUrl,renderedPages,outputFolder,inputKind,ruleVersion,plannedAt,generatedAt,sourceCheckedAt,sourcePublishedAt,collectedAt,templateId,reviewStatus,publicationStatus})=>
      ({id,title:titleInfo(title).displayTitle,originalTitle:title,displayTitle:titleInfo(title).displayTitle,captionInputTitle:titleInfo(title).displayTitle,status,reason,nextAction,site,sourceUrl,renderedPages,outputFolder,inputKind,ruleVersion,plannedAt,generatedAt,sourceCheckedAt,sourcePublishedAt,collectedAt,templateId,reviewStatus,publicationStatus}))}:{entries:[],active:!!active};
  async function currentReport(){
    const saved=await readReport(output),inputFolder=saved?.inputFolder||path.join(materialRoot,'01_후보 기록');
    let candidates;
    try{candidates=await discoverCandidates(inputFolder);}catch(error){if(error.code==='ENOENT')return saved;throw error;}
    const prior=new Map((saved?.entries||[]).map(row=>[row.id,row]));
    const entries=[];
    for(const candidate of candidates){
      const id=String(candidate.id||hash(candidate.folder).slice(0,16)).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80);
      let row=prior.get(id)||{id,title:candidate.title||'제목 미확인',relativePath:candidate.relativePath,sourceUrl:candidate.sourceUrl,
        status:'waiting',reason:'저장 자료를 확인하고 이미지를 만들 준비가 됐어요.',nextAction:'전체 이미지 만들기를 누르세요.'};
      if(row.outputFolder){
        const folder=path.resolve(output,row.outputFolder);
        const present=inside(output,folder)&&await fs.stat(path.join(folder,'rendered','slide-001.png')).then(s=>s.isFile()).catch(()=>false);
        if(!present)row={...row,outputFolder:null,renderedPages:0,status:'waiting',reason:'기록된 결과 파일이 없어요. 다시 만들기를 누르세요.'};
      }
      entries.push(row);
    }
    return {...saved,inputFolder,total:candidates.length,processed:saved?.processed||0,entries};
  }
  async function renderWindow(state) {
    if(!state.window||state.window.isDestroyed()) {
      state.window=new BrowserWindow({show:false,webPreferences:{...preferences,backgroundThrottling:false}});
      state.window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
      state.window.webContents.on('will-navigate',event=>event.preventDefault());
      await state.window.loadURL(bundleUrl);
    }
    return state.window;
  }
  ipcMain.handle('source-cut:import-saved-source',async(event)=>{
    trusted(event);if(active)throw new Error('이미지 제작이 끝난 뒤 가져오세요.');
    const selected=await dialog.showOpenDialog(getEditor(),{title:'저장한 웹 글 가져오기',properties:['openFile','multiSelections'],filters:[{name:'웹 글 · 원문 파일',extensions:['html','htm','json','txt']}]});
    if(selected.canceled)return {canceled:true};
    if(selected.filePaths.length>50)throw new Error('한 번에 50개까지 가져올 수 있습니다.');
    const report=await currentReport(),root=report?.inputFolder||path.join(materialRoot,'01_후보 기록'),state={},results=[];
    try{const win=await renderWindow(state);
      for(const file of selected.filePaths){try{results.push(await importSavedSource({file,root,parseHtml:html=>win.webContents.executeJavaScript('window.ThreadsSourceCuration.htmlDraft('+JSON.stringify(html)+',[])')}));}catch(error){results.push({file:path.basename(file),error:error.message});}}
      return {results};
    }finally{state.window?.destroy();}
  });
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
      record={...record,state:'saved_html',url:page.url,title:extracted.title,...titleInfo(extracted.title),captionInputTitle:titleInfo(extracted.title).displayTitle,titleInputVersion:'2026-10-09-title-input-1',htmlSha256:hash(page.bytes),
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
  const render=(job,state,context={})=>require('./batch-render.cjs').renderBatchInput(job,{getWindow:()=>renderWindow(state),context});
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
  ipcMain.handle('source-cut:batch-report',async event=>{trusted(event);return publicReport(await currentReport());});
  ipcMain.handle('source-cut:open-batch-results',async event=>{trusted(event);await fs.mkdir(output,{recursive:true});const error=await shell.openPath(output);if(error)throw new Error(error);});
  async function findEntry(id) {
    if(typeof id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(id))throw new Error('후보 ID를 확인하세요.');
    const report=await currentReport(),entry=report?.entries.find(item=>item.id===id);
    if(!entry)throw new Error('기록에서 후보를 찾지 못했습니다.');
    return {entry,report};
  }
  ipcMain.handle('source-cut:open-batch-entry',async(event,id,kind)=>{
    trusted(event);if(!['source','result','images'].includes(kind))throw new Error('열기 종류를 확인하세요.');const {entry,report}=await findEntry(id);
    const root=kind==='source'?(entry.originalInputFolder||report.inputFolder):output;
    const folder=path.resolve(root,kind==='source'?entry.relativePath:entry.outputFolder||'');
    if(folder===root||!inside(root,folder))throw new Error('해당 후보 폴더가 없습니다.');
    const target=kind==='images'?path.join(folder,'이미지 전체 보기.html'):folder;
    const error=await shell.openPath(target);if(error)throw new Error(error);
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
