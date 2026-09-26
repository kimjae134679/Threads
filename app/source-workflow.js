(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const API = '/api/source-workflow/';
  const rows = new Map();
  let snapshot = null, processing = false, autoEnabled = false, stopped = false, currentCandidate = null;
  const attempted = new Set();
  const relative = file => String(file).replaceAll('\\','/').split('/').pop();
  const acquisitionLabel = {queued:'수집 대기',saved_html:'원문 저장됨',needs_exact_url:'원문 링크 없음',blocked:'접속 실패'};
  const conversionLabel = {converted:'제작 완료',needs_verbatim_check:'원문 확인 필요',
    needs_media:'본문 이미지 누락',needs_comment_check:'댓글 확인 필요',
    needs_comment_ranking:'인기 댓글 확인 필요',needs_source:'원문 부족',
    ready_to_render:'이미지 제작 대기',excluded_severe:'심한 소재 제외',failed:'처리 오류',
    not_converted:'제작 전',processing:'제작 중'};
  function label(item) {
    if (item.candidate===currentCandidate) return conversionLabel.processing;
    if (item.conversion==='not_converted' && item.acquisition==='needs_exact_url') return '원문 링크 필요';
    if (item.conversion==='not_converted' && item.acquisition==='blocked') return '원문 접속 실패';
    if (item.conversion==='not_converted' && item.acquisition==='queued') return '수집 대기';
    if (item.conversion==='needs_verbatim_check' && !item.pages && item.note?.includes('원본 이미지 없음'))
      return '본문 이미지 누락';
    return conversionLabel[item.conversion] || item.conversion;
  }
  function note(item) {
    if (item.conversion==='needs_verbatim_check' && item.pages) return '원문과 이미지의 글자·줄바꿈을 대조해 주세요.';
    if (item.note?.includes('원본 이미지 없음')) {
      const count=item.note.split(',').length;
      return `본문 이미지 ${count}개를 확보해야 합니다.`;
    }
    if (/^HTTP \d+$/.test(item.note||'')) return '원문 사이트 응답 '+item.note;
    if (item.acquisition==='needs_exact_url') return '후보에 정확한 게시글 주소가 없습니다.';
    return item.note || '';
  }
  async function api(name, options) {
    const response = await fetch(API+name, options);
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || data.error || '서버 요청 실패');
    return data;
  }
  const post = (name, body={}) => api(name,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  function cell(tr,index,value) { const s=String(value ?? '');if(tr.children[index].textContent!==s) tr.children[index].textContent=s; }
  function paintEntry(item) {
    let tr=rows.get(item.candidate);
    if (!tr) {
      tr=document.createElement('tr');
      for (let i=0;i<6;i++) tr.append(document.createElement('td'));
      const button=document.createElement('button');button.type='button';button.className='open-item';
      button.addEventListener('click',async()=>{
        try { await post('open-item',{candidate:item.candidate}); }
        catch(e) { $('jobStatus').textContent='파일 열기 실패: '+e.message; }
      });
      tr.children[5].append(button);
      rows.set(item.candidate,tr);$('queueRows').append(tr);
    }
    const title=item.title||relative(item.candidate);
    if (tr.children[0].firstChild?.nodeType!==3) tr.children[0].prepend(document.createTextNode(''));
    if (tr.children[0].firstChild.nodeValue!==title) tr.children[0].firstChild.nodeValue=title;
    let pathNode=tr.children[0].querySelector('.file-path');
    if (!pathNode) {pathNode=document.createElement('small');pathNode.className='file-path';tr.children[0].append(pathNode);}
    const filename=relative(item.candidate);
    if (pathNode.textContent!==filename) pathNode.textContent=filename;
    cell(tr,1,acquisitionLabel[item.acquisition]||item.acquisition);
    cell(tr,2,label(item));
    cell(tr,3,item.pages ? item.pages+'장' : '—');
    cell(tr,4,note(item));
    tr.children[4].title=item.note||'';
    tr.children[5].firstChild.textContent=item.resultFile?'결과 열기':'원본 열기';
    tr.children[2].className=item.conversion==='converted'?'converted':
      item.conversion==='not_converted'?'muted':'blocked';
    const search=$('queueFilter').value.trim().toLowerCase();
    tr.hidden=!!search && ![title,item.candidate,item.acquisition,item.conversion,label(item),item.resultFile,item.note]
      .some(value=>String(value||'').toLowerCase().includes(search));
  }
  function paint(data) {
    snapshot=data;
    for (const entry of data.entries) paintEntry(entry);
    const c=data.counts, j=data.job;
    $('queueSummary').textContent=`전체 ${c.total}건 · 원문 저장 ${c.savedHtml} · 제작 완료 ${c.converted} · 확인 필요 ${c.needsReview} · 심한 소재 제외 ${c.excluded} · 원문/주소 문제 ${c.blocked} · 수집 대기 ${c.queued}`+
      (currentCandidate?`\n변환 중: ${currentCandidate}`:'');
    $('jobStatus').textContent=j.running?`수집 진행 ${j.processed}/${j.total} · ${j.current||'시작 중'}`:
      j.error?`수집 중단: ${j.error}`:`수집 대기 · 결과 폴더: ${data.resultsFolder}`;
    $('queueProgress').max=Math.max(1,j.total || c.total);
    $('queueProgress').value=j.processed;
    $('autoStart').disabled=j.running;
    $('autoStop').disabled=!j.running && !processing;
  }
  async function reload() {
    try {
      const data=await api('status');
      paint(data);
      if (data.job.running) autoEnabled=true;
      if (autoEnabled) processPending();
    } catch (e) { $('jobStatus').textContent='목록 오류: '+e.message; }
  }
  async function sourceFile(item,name) {
    const query=new URLSearchParams({candidate:item.candidate,file:name});
    const response=await fetch(API+'source?'+query);
    if (!response.ok) throw new Error(`${name} 가져오기 실패 (${response.status})`);
    const file=new File([await response.arrayBuffer()],relative(name),{type:response.headers.get('content-type')||''});
    Object.defineProperty(file,'webkitRelativePath',{value:item.id+'/'+name});
    return file;
  }
  async function convert(item) {
    try {
      const names=['source.html',...item.mediaFiles];
      const files=await Promise.all(names.map(name=>sourceFile(item,name)));
      const output=await window.ThreadsSourceBatch.handle(files[0],files);
      if (output.excluded) {
        const note=output.reasons.join(', ');
        await post('record',{candidate:item.candidate,state:'excluded_severe',note});
        item.conversion='excluded_severe';item.note=note;
      } else {
        const m=output.manifest;
        const params=new URLSearchParams({candidate:item.candidate,state:m.conversionStatus,
          pages:String(m.renderedPages),note:m.missingMedia.length?'원본 이미지 없음: '+m.missingMedia.join(', '):m.extraction});
        const response=await fetch(API+'result?'+params,{method:'POST',
          headers:{'content-type':'application/zip'},body:output.zip});
        const saved=await response.json();
        if (!response.ok || !saved.ok) throw new Error(saved.message||saved.error||'결과 저장 실패');
        item.conversion=m.conversionStatus;item.pages=m.renderedPages;
        item.resultFile=saved.result.file;item.note=saved.result.note;
      }
    } catch (e) {
      item.conversion='failed';item.note=String(e.message||e);
      try { await post('record',{candidate:item.candidate,state:'failed',note:item.note}); }
      catch (saveError) { item.note+=' · 상태 저장 실패: '+saveError.message; }
    }
    currentCandidate=null;paintEntry(item);
    if (snapshot) paint(snapshot);
  }
  async function processPending() {
    if (processing || !snapshot || !autoEnabled) return;
    processing=true;
    try {
      while (autoEnabled && !stopped) {
        const item=snapshot.entries.find(x=>x.acquisition==='saved_html' &&
          x.conversion==='not_converted' && !attempted.has(x.candidate));
        if (!item) break;
        attempted.add(item.candidate);
        currentCandidate=item.candidate;paint(snapshot);
        await convert(item);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    } finally { processing=false; if (snapshot) $('autoStop').disabled=!snapshot.job.running; }
  }
  $('autoStart').addEventListener('click',async()=>{
    try { stopped=false;autoEnabled=true;attempted.clear();await post('start');await reload(); }
    catch(e) { $('jobStatus').textContent='전체 처리 시작 실패: '+e.message; }
  });
  $('autoStop').addEventListener('click',async()=>{
    stopped=true;autoEnabled=false;
    try { await post('stop');await reload(); } catch(e) { $('jobStatus').textContent=e.message; }
  });
  $('reloadQueue').addEventListener('click',reload);
  $('openResults').addEventListener('click',async()=>{
    try { const result=await post('open-results');$('jobStatus').textContent='결과 폴더 열기: '+result.folder; }
    catch(e) { $('jobStatus').textContent='폴더 열기 실패: '+e.message; }
  });
  $('queueFilter').addEventListener('input',()=>{if(snapshot) for(const item of snapshot.entries) paintEntry(item);});
  reload().then(()=>{
    if (snapshot?.entries.some(x=>x.acquisition==='saved_html' && x.conversion==='not_converted')) {
      autoEnabled=true;processPending();
    }
  });
  setInterval(reload,2500);
})();
