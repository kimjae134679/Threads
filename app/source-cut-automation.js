(function(){
  'use strict';
  const $=id=>document.getElementById(id),api=window.ThreadsCutDesktop;
  const labels={waiting:'이미지 제작 대기',published:'게시 완료 기록 있음',generated:'이번에 제작',already_done:'이미 제작됨',needs_source:'원문 부족',needs_access:'접근·제공 권한 필요',
    needs_exact_url:'정확한 주소 필요',needs_media:'본문 이미지 누락',needs_selection:'원문 선별 필요',
    unavailable:'삭제·없는 글',excluded_severe:'소재 제외',failed:'처리 오류'};
  let snapshot={entries:[]},limit=20,running=false,previewed='',refreshTimer=0,requested=false;
  function setRunning(value) {
    running=value;$('runFolderBatch').disabled=value||!api?.runFolderBatch;
    $('chooseFolderBatch').disabled=value||!api?.runFolderBatch;
    $('fillBatchSources').disabled=value;
    $('stopFolderBatch').hidden=!value;
  }
  function paint() {
    const all=snapshot.entries||[],ready=all.filter(row=>row.outputFolder);
    $('batchTotal').textContent=String(snapshot.total||all.length);
    $('batchReady').textContent=String(ready.length);
    $('batchBlocked').textContent=String(all.length-ready.length);
    $('batchFolderName').textContent=snapshot.inputFolder||'바탕화면의 전체 후보 자료를 사용합니다.';
    $('batchFolderName').title=snapshot.inputFolder||'';
    const term=$('batchSearch').value.trim().toLocaleLowerCase(),filter=$('batchFilter').value;
    const rows=all.filter(row=>(filter==='all'||filter==='ready'&&row.outputFolder||filter==='blocked'&&!row.outputFolder)&&
      (!term||[row.title,row.site,row.reason,labels[row.status]].some(value=>String(value||'').toLocaleLowerCase().includes(term))));
    rows.sort((a,b)=>Number(Boolean(b.outputFolder))-Number(Boolean(a.outputFolder)));
    const body=$('batchRows');body.replaceChildren();
    for(const row of rows.slice(0,limit)) {
      const tr=document.createElement('tr'),title=document.createElement('td'),state=document.createElement('td'),action=document.createElement('td');
      const strong=document.createElement('strong');strong.textContent=row.title||'제목 미확인';
      const site=document.createElement('small');site.textContent=row.site||'저장 자료';title.append(strong,site);
      state.textContent=(labels[row.status]||row.status)+(row.renderedPages?' · '+row.renderedPages+'장':'');
      const reason=document.createElement('small');reason.textContent=row.outputFolder?(row.renderedPages+'장의 이미지가 준비됐어요.'):(row.reason||'');state.append(reason);
      const lifecycle=document.createElement('small');lifecycle.textContent=row.outputFolder?'이미지를 만들었어요. 내용 확인이 필요해요.':row.nextAction||'';state.append(lifecycle);
      const button=(text,kind)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',()=>api.openBatchEntry(row.id,kind).catch(error=>{$('folderBatchStatus').textContent=error.message;}));action.append(b);};
      button('원본 자료 열기','source');
      if(row.outputFolder){button('이미지 전체 보기','images');button('결과 폴더 열기','result');}
      if(row.outputFolder) {
        const view=document.createElement('button');view.type='button';view.textContent='표지 보기';
        view.addEventListener('click',()=>preview(row));action.append(view);
      }
      tr.append(title,state,action);body.append(tr);
    }
    $('batchEmpty').hidden=rows.length>0;
    $('batchEmpty').textContent=all.length?'해당 조건의 후보가 없습니다.':'자동 제작을 실행하면 결과와 보류 사유가 여기에 표시됩니다.';
    $('batchMore').hidden=rows.length<=limit;
    $('batchListCount').textContent=rows.length+'건 중 '+Math.min(limit,rows.length)+'건 표시';
  }
  async function preview(row) {
    try {
      const url=await api.batchPreview(row.id);
      if(!url)return;
      previewed=row.id;$('batchPreviewTitle').textContent=row.title||'검수 전 표지';
      $('batchPreviewImage').src=url;$('batchPreviewPanel').hidden=false;
    } catch(error) {$('folderBatchStatus').textContent='표지 열기 실패: '+error.message;}
  }
  async function refresh() {
    if(!api?.batchReport)return;
    try {
      snapshot=await api.batchReport();paint();
      if(!requested)setRunning(Boolean(snapshot.active));
      if(!previewed) {const row=snapshot.entries.find(item=>item.outputFolder);if(row)await preview(row);}
    } catch(error) {$('folderBatchStatus').textContent='결과 기록 열기 실패: '+error.message;}
  }
  async function run(chooseFolder) {
    if(running||!api?.runFolderBatch)return;
    requested=true;setRunning(true);limit=20;
    $('folderBatchProgress').hidden=false;$('folderBatchProgress').removeAttribute('value');
    $('folderBatchStatus').textContent=chooseFolder?'자료 폴더를 선택하세요.':'저장 자료를 검사하고 필요한 후보만 처리합니다.';
    try {
      const result=await api.runFolderBatch({chooseFolder,fillSources:$('fillBatchSources').checked});
      if(result.canceled){$('folderBatchStatus').textContent='폴더 선택을 취소했습니다.';return;}
      snapshot=result;paint();
      const c=result.counts,ready=(c.generated||0)+(c.already_done||0);
      const pending=Object.values(c).reduce((n,value)=>n+value,0)-ready;
      $('folderBatchStatus').textContent=(result.cancelled?'중지됨':'처리 종료')+' · '+(result.processed||0)+'/'+result.total+
        '건 확인 · 결과 '+ready+'건 · 자료·확인 필요 '+pending+'건. 아래에서 후보별 이유와 결과를 확인하세요.';
      $('batchFilter').value=ready?'ready':'blocked';paint();
      previewed='';await refresh();
    } catch(error) {$('folderBatchStatus').textContent='자동 제작 오류: '+error.message;await refresh();}
    finally {requested=false;setRunning(false);}
  }
  $('runFolderBatch').addEventListener('click',()=>run(false));
  $('chooseFolderBatch').addEventListener('click',()=>run(true));
  $('stopFolderBatch').addEventListener('click',()=>{api.cancelFolderBatch();$('folderBatchStatus').textContent='진행 중인 요청을 취소하고 완료 기록을 저장합니다.';});
  $('openBatchResults').disabled=!api?.openBatchResults;
  $('openBatchResults').addEventListener('click',()=>api.openBatchResults().catch(error=>{$('folderBatchStatus').textContent=error.message;}));
  $('batchFilter').addEventListener('change',()=>{limit=20;paint();});
  $('batchSearch').addEventListener('input',()=>{limit=20;paint();});
  $('batchMore').addEventListener('click',()=>{limit+=20;paint();});
  $('closeBatchPreview').addEventListener('click',()=>{$('batchPreviewPanel').hidden=true;});
  api?.onBatchProgress?.(value=>{
    if(value.phase==='finished'){clearTimeout(refreshTimer);refresh();return;}
    if(!running)return;
    const progress=$('folderBatchProgress');progress.hidden=false;progress.max=Math.max(value.total||1,1);progress.value=value.done||0;
    $('folderBatchStatus').textContent=(value.phase==='acquiring'?'공개 원문 보완 중':value.phase==='scan'?'저장 자료 검사 중':labels[value.status]||'처리 중')+
      ' · '+(value.done||0)+'/'+(value.total||0)+' · '+(value.title||'');
    if(!refreshTimer)refreshTimer=setTimeout(()=>{refreshTimer=0;refresh();},1500);
  });
  setRunning(false);refresh();
})();
