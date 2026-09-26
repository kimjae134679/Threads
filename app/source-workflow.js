(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  if (location.protocol === 'cut-editor:') {
    $('autoTitle').closest('section').hidden = true;
    document.querySelector('main > p').textContent = '원본 폴더를 열고 제목·본문·이미지·댓글을 고른 뒤 원문 ZIP으로 묶어 제작하세요.';
    return;
  }
  const API = '/api/source-workflow/';
  const rows = new Map();
  let snapshot = null;
  const relative = file => String(file).replaceAll('\\','/').split('/').pop();
  const acquisitionLabel = {queued:'수집 대기',saved_html:'원문 저장됨',needs_exact_url:'원문 링크 없음',blocked:'접속 실패'};
  const conversionLabel = {converted:'제작 완료',needs_selection:'사용할 부분 선택 필요',needs_verbatim_check:'원문 확인 필요',
    needs_media:'본문 이미지 누락',needs_comment_check:'댓글 확인 필요',
    needs_comment_ranking:'인기 댓글 확인 필요',needs_source:'원문 부족',
    ready_to_render:'이미지 제작 대기',excluded_severe:'심한 소재 제외',failed:'처리 오류',
    not_converted:'제작 전',processing:'제작 중'};
  function label(item) {
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
        try {
          if(item.acquisition==='saved_html') {
            const names=['source.html',...item.mediaFiles];
            const files=await Promise.all(names.map(name=>sourceFile(item,name)));
            const draft=await window.ThreadsSourceBatch.prepare(files[0],files);
            draft.plan.candidate=item.candidate;
            draft.plan.sourceUrl=draft.plan.sourceUrl||item.sourceUrl||null;
            window.ThreadsSourceBatch.review(draft);
            $('jobStatus').textContent='원본을 열었습니다. 글·이미지·댓글을 고르고 원문 ZIP을 저장하세요.';
          } else await post('open-item',{candidate:item.candidate});
        } catch(e) { $('jobStatus').textContent='원본 열기 실패: '+e.message; }
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
    tr.children[5].firstChild.textContent=item.acquisition==='saved_html'?'원문 선별':'후보 열기';
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
    $('queueSummary').textContent=`전체 ${c.total}건 · 원문 저장 ${c.savedHtml} · 제작 완료 ${c.converted} · 확인 필요 ${c.needsReview} · 심한 소재 제외 ${c.excluded} · 원문/주소 문제 ${c.blocked} · 수집 대기 ${c.queued}`;
    $('jobStatus').textContent=j.running?`수집 진행 ${j.processed}/${j.total} · ${j.current||'시작 중'}`:
      j.error?`수집 중단: ${j.error}`:`수집 대기 · 결과 폴더: ${data.resultsFolder}`;
    $('queueProgress').max=Math.max(1,j.total || c.total);
    $('queueProgress').value=j.processed;
    $('autoStart').disabled=j.running;
    $('autoStop').disabled=!j.running;
  }
  async function reload() {
    try {
      const data=await api('status');
      paint(data);
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
  $('autoStart').addEventListener('click',async()=>{
    try {await post('start');await reload(); }
    catch(e) { $('jobStatus').textContent='전체 처리 시작 실패: '+e.message; }
  });
  $('autoStop').addEventListener('click',async()=>{
    try { await post('stop');await reload(); } catch(e) { $('jobStatus').textContent=e.message; }
  });
  $('reloadQueue').addEventListener('click',reload);
  $('openResults').addEventListener('click',async()=>{
    try { const result=await post('open-results');$('jobStatus').textContent='결과 폴더 열기: '+result.folder; }
    catch(e) { $('jobStatus').textContent='폴더 열기 실패: '+e.message; }
  });
  $('queueFilter').addEventListener('input',()=>{if(snapshot) for(const item of snapshot.entries) paintEntry(item);});
  reload();
  setInterval(reload,2500);
})();
