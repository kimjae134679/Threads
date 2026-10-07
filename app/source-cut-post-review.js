(function(){
 'use strict';
 const $=id=>document.getElementById(id),api=window.ThreadsPostReview;
 let entries=[],current=null,page=1,mode='single',dirty=false,timer=0,saveQueue=Promise.resolve(),selection=0,requestedId=null,editRevision=0,reviewRound=null;
 const cache=new Map(),positions=new Map();
 let navigation=0;
 function visibleEntries(){const q=$('search').value.toLocaleLowerCase(),f=$('filter').value;return entries.filter(r=>(r.title+' '+r.coverTitle).toLocaleLowerCase().includes(q)&&(f==='all'||r.category===f||f==='unrated'&&r.current?.score==null||f==='rated'&&r.current?.score!=null||f==='low'&&r.current?.score!=null&&r.current.score<=5)).sort((a,b)=>a.rank-b.rank);}
 function paintNavigation(){const rows=visibleEntries(),i=rows.findIndex(r=>r.id===current?.id);$('prevPost').disabled=i<=0;$('nextPost').disabled=i<0||i===rows.length-1;$('postPosition').textContent=i>=0?'글 '+(i+1)+' / '+rows.length:'선택한 글';$('dockPrev').disabled=!current||page===1;$('dockNext').disabled=!current||page===current.pages;$('dockPage').textContent=current?page+' / '+current.pages:'—';$('dockPages').hidden=mode!=='single';}
 async function movePost(delta){const rows=visibleEntries(),i=rows.findIndex(r=>r.id===current?.id),next=rows[i+delta];if(i>=0&&next)await select(next.id);}
 function rememberPosition(){if(current)positions.set(current.id+':'+current.outputVersion,page);}
 function prefetch(row,p){for(const n of [p-1,p+1])if(n>0&&n<=row.pages)getImage(row,n).catch(()=>{});}
 function showError(error){$('error').hidden=false;$('error').textContent=error.message||String(error);}
 function status(text,failed=false){$('saveStatus').textContent=text;$('saveStatus').classList.toggle('failed',failed);}
 async function getImage(row,p){const key=row.id+row.outputVersion+p;if(cache.has(key))return cache.get(key);const value=await api.image(row.id,p,row.outputVersion);cache.set(key,value);if(cache.size>60)cache.delete(cache.keys().next().value);return value;}
 const thumbs=new IntersectionObserver(records=>{for(const r of records)if(r.isIntersecting){thumbs.unobserve(r.target);const row=entries.find(e=>e.id===r.target.dataset.id);getImage(row,1).then(src=>{r.target.src=src;}).catch(showError);}}, {root:$('posts'),rootMargin:'150px'});
 let verticalObserver=null;
 function paintList(){
  const scrollTop=$('posts').scrollTop;thumbs.disconnect();$('posts').replaceChildren();const q=$('search').value.toLocaleLowerCase(),f=$('filter').value;
  const rows=entries.filter(r=>(r.title+' '+r.coverTitle).toLocaleLowerCase().includes(q)&&(f==='all'||r.category===f||f==='unrated'&&r.current?.score==null||f==='rated'&&r.current?.score!=null||f==='low'&&r.current?.score!=null&&r.current.score<=5));
  rows.sort((a,b)=>a.rank-b.rank);
  $('count').textContent=entries.length+'개 글 · '+entries.filter(r=>r.current?.score!=null).length+'개 평가 · 표시 '+rows.length+'개';
  for(const row of rows){
   const b=document.createElement('button');b.type='button';b.className='post-card'+(current?.id===row.id?' active':'');b.dataset.id=row.id;b.setAttribute('aria-pressed',String(current?.id===row.id));
   const img=document.createElement('img');img.alt='';img.dataset.id=row.id;thumbs.observe(img);
   const text=document.createElement('div'),title=document.createElement('b'),meta=document.createElement('small');title.textContent=row.coverTitle;meta.textContent=row.pages+'장 · '+(row.current?.score!=null?'★ '+row.current.score+'/10':'미평가');if(row.categoryLabel){const category=document.createElement('small');category.textContent=row.categoryLabel;text.append(category);}text.append(title,meta);b.append(img,text);b.onclick=()=>select(row.id).catch(showError);$('posts').append(b);
  }
  $('posts').scrollTop=scrollTop;paintNavigation();
 }
 function paintScore(){for(const b of $('scores').children)b.setAttribute('aria-pressed',String(Number(b.dataset.score)===current?.current?.score));$('scoreText').textContent=current?.current?.score!=null?'★ '+current.current.score+' / 10':'아직 점수 없는 글';}
 function schedule(){editRevision++;dirty=true;status('저장 대기');clearTimeout(timer);timer=setTimeout(()=>flush().catch(showError),400);}
 async function flush(){
  clearTimeout(timer);
  if(dirty&&current){
   const row=current,revision=editRevision,payload={id:row.id,outputVersion:row.outputVersion,score:row.current?.score??null,note:$('note').value};
   dirty=false;status('저장 중…');
   const op=saveQueue.catch(()=>{}).then(()=>api.save(payload));
   saveQueue=op;
   try{const saved=await op;if(current!==row||revision===editRevision)row.current=saved;if(current===row&&!dirty&&op===saveQueue){paintScore();status('저장됨 · '+new Date(saved.updatedAt).toLocaleTimeString());}paintList();}
   catch(e){if(current===row)dirty=true;status('저장 실패 · 평가 저장을 눌러 다시 시도하세요',true);throw e;}
  }else await saveQueue;
 }
 async function renderPage(){
  const row=current,token=selection,p=page;if(!row)return;paintNavigation();rememberPosition();
  $('prev').disabled=p===1;$('next').disabled=p===row.pages;$('pageSelect').value=String(p);$('pageLabel').textContent=row.pageLabels[p-1]+' · '+p+' / '+row.pages;
  $('pageImage').removeAttribute('src');$('pageImage').alt='불러오는 중 · '+p+'장';
  try{const src=await getImage(row,p);if(token!==selection||row!==current||page!==p)return;$('pageImage').src=src;$('pageImage').alt=row.pageLabels[p-1]+' '+p+'장';prefetch(row,p);}catch(e){showError(e);}
 }
 function renderVertical(){
  verticalObserver?.disconnect();$('verticalPages').replaceChildren();if(mode!=='vertical'||!current)return;
  const row=current,token=selection;
  verticalObserver=new IntersectionObserver(records=>{for(const r of records)if(r.isIntersecting){verticalObserver.unobserve(r.target);getImage(row,Number(r.target.dataset.page)).then(src=>{if(token===selection)r.target.src=src;}).catch(showError);}}, {rootMargin:'350px'});
  for(let p=1;p<=row.pages;p++){const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.alt=row.pageLabels[p-1]+' '+p+'장';img.dataset.page=p;caption.textContent=row.pageLabels[p-1]+' · '+p+' / '+row.pages;figure.append(img,caption);$('verticalPages').append(figure);verticalObserver.observe(img);}
 }
 async function select(id){
  const request=++navigation;rememberPosition();do{await flush();if(request!==navigation)return;}while(dirty);const row=entries.find(r=>r.id===id);if(!row)return;current=row;page=Math.max(1,Math.min(row.pages,positions.get(row.id+':'+row.outputVersion)||1));selection++;$('reader').hidden=false;$('error').hidden=true;
  $('title').textContent=row.coverTitle;$('original').textContent=row.title===row.coverTitle?'':'원제 · '+row.title;$('postMeta').textContent=row.pages+'장 · '+(row.categoryLabel||'현재 제작 결과');
  $('note').value=row.current?.note||'';paintScore();status(row.current?'저장된 평가를 불러왔어요':'점수나 메모를 남겨주세요');
  $('previous').hidden=!row.previous;$('previous').textContent=row.previous?'이전 제작 버전 평가 · '+(row.previous.score??'점수 없음')+' / 10\n'+row.previous.note:'';
  $('pageSelect').replaceChildren();for(let n=1;n<=row.pages;n++){const option=document.createElement('option');option.value=n;option.textContent=n+' / '+row.pages;$('pageSelect').append(option);}
  paintList();renderVertical();await renderPage();window.scrollTo(0,0);
 }
 function turn(delta){if(!current||mode!=='single')return;const next=Math.max(1,Math.min(current.pages,page+delta));if(next===page)return;page=next;renderPage();$('stage').scrollIntoView({block:'start',behavior:'instant'});}
 for(let n=1;n<=10;n++){const b=document.createElement('button');b.type='button';b.dataset.score=n;b.setAttribute('aria-label',n+'점');b.setAttribute('aria-pressed','false');const star=document.createElement('span');star.textContent='★';star.setAttribute('aria-hidden','true');b.append(star,document.createTextNode(n));b.onclick=()=>{if(!current)return;current.current={...current.current,score:n,note:$('note').value};paintScore();schedule();flush().catch(showError);};$('scores').append(b);}
 $('note').oninput=schedule;$('save').onclick=()=>flush().catch(showError);$('prev').onclick=()=>turn(-1);$('next').onclick=()=>turn(1);$('pageSelect').onchange=()=>{page=Number($('pageSelect').value);renderPage();};
 $('search').oninput=paintList;$('filter').onchange=paintList;$('zoom').onchange=()=>{$('reader').classList.toggle('zoom',$('zoom').checked);};
 function setMode(value){mode=value;$('stage').hidden=value!=='single';$('pages').hidden=value!=='single';$('verticalPages').hidden=value!=='vertical';$('single').setAttribute('aria-pressed',String(value==='single'));$('vertical').setAttribute('aria-pressed',String(value==='vertical'));renderVertical();paintNavigation();}
 $('single').onclick=()=>setMode('single');$('vertical').onclick=()=>setMode('vertical');
 document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable)return;if(mode==='single'&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();turn(e.key==='ArrowRight'?1:-1);}else if((e.key==='ArrowDown'||e.key==='ArrowUp')&&!e.repeat){e.preventDefault();movePost(e.key==='ArrowDown'?1:-1).catch(showError);}});
 let gesture=null;$('stage').addEventListener('pointerdown',e=>{if(e.target.tagName!=='IMG'||e.button!==0)return;gesture={x:e.clientX,y:e.clientY,id:e.pointerId,time:performance.now()};if(e.isTrusted)$('stage').setPointerCapture(e.pointerId);});$('stage').addEventListener('pointerup',e=>{const g=gesture;gesture=null;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4&&performance.now()-g.time<1500)turn(dx<0?1:-1);});for(const event of ['pointercancel','lostpointercapture'])$('stage').addEventListener(event,()=>{gesture=null;});$('pageImage').ondragstart=e=>e.preventDefault();
 $('openFolder').onclick=()=>api.openFolder().catch(showError);
 $('prevPost').onclick=()=>movePost(-1).catch(showError);$('nextPost').onclick=()=>movePost(1).catch(showError);$('dockPrev').onclick=()=>turn(-1);$('dockNext').onclick=()=>turn(1);$('jumpFeedback').onclick=()=>{document.querySelector('.feedback').scrollIntoView({block:'start',behavior:'smooth'});$('note').focus({preventScroll:true});};
 async function reload(){await flush();const result=await api.list();entries=result.entries;reviewRound=result.reviewRound;cache.clear();positions.clear();current=null;page=1;selection++;$('roundLabel').textContent=reviewRound?'최신 전체 수정본 · '+reviewRound:'현재 제작본';paintList();if(entries.length)await select(entries[0].id);else $('reader').hidden=true;}
 $('reload').onclick=()=>reload().catch(showError);$('openHistory').onclick=()=>api.openHistory().catch(showError);
 window.ThreadsPostReviewUI=Object.freeze({flush,select,reload});
 if(!api){showError(Error('설치된 Threads 게시글 평가 프로그램에서 여세요.'));return;}
 api.onSelect(id=>{requestedId=id;if(entries.length)select(id).catch(showError);});
 api.list().then(result=>{entries=result.entries;reviewRound=result.reviewRound;$('roundLabel').textContent=reviewRound?'최신 전체 수정본 · '+reviewRound:'현재 제작본';paintList();if(entries.length)return select(requestedId||[...entries].sort((a,b)=>a.rank-b.rank)[0].id);$('title').textContent='아직 제작된 글이 없습니다.';}).catch(showError);
})();
