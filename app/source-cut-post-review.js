(function(){
 'use strict';
 const $=id=>document.getElementById(id),api=window.ThreadsPostReview;
 let entries=[],current=null,page=1,mode='single',dirty=false,timer=0,saveQueue=Promise.resolve(),selection=0,requestedId=null,editRevision=0;
 const cache=new Map();
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
  $('posts').scrollTop=scrollTop;
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
  const row=current,token=selection,p=page;if(!row)return;
  $('prev').disabled=p===1;$('next').disabled=p===row.pages;$('pageSelect').value=String(p);$('pageLabel').textContent=row.pageLabels[p-1]+' · '+p+' / '+row.pages;
  $('pageImage').removeAttribute('src');$('pageImage').alt='불러오는 중 · '+p+'장';
  try{const src=await getImage(row,p);if(token!==selection||row!==current||page!==p)return;$('pageImage').src=src;$('pageImage').alt=row.pageLabels[p-1]+' '+p+'장';}catch(e){showError(e);}
 }
 function renderVertical(){
  verticalObserver?.disconnect();$('verticalPages').replaceChildren();if(mode!=='vertical'||!current)return;
  const row=current,token=selection;
  verticalObserver=new IntersectionObserver(records=>{for(const r of records)if(r.isIntersecting){verticalObserver.unobserve(r.target);getImage(row,Number(r.target.dataset.page)).then(src=>{if(token===selection)r.target.src=src;}).catch(showError);}}, {rootMargin:'350px'});
  for(let p=1;p<=row.pages;p++){const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.alt=row.pageLabels[p-1]+' '+p+'장';img.dataset.page=p;caption.textContent=row.pageLabels[p-1]+' · '+p+' / '+row.pages;figure.append(img,caption);$('verticalPages').append(figure);verticalObserver.observe(img);}
 }
 async function select(id){
  await flush();const row=entries.find(r=>r.id===id);if(!row)return;current=row;page=1;selection++;$('reader').hidden=false;$('error').hidden=true;
  $('title').textContent=row.coverTitle;$('original').textContent=row.title===row.coverTitle?'':'원제 · '+row.title;$('postMeta').textContent=row.pages+'장 · '+(row.categoryLabel||'현재 제작 결과');
  $('note').value=row.current?.note||'';paintScore();status(row.current?'저장된 평가를 불러왔어요':'점수나 메모를 남겨주세요');
  $('previous').hidden=!row.previous;$('previous').textContent=row.previous?'이전 제작 버전 평가 · '+(row.previous.score??'점수 없음')+' / 10\n'+row.previous.note:'';
  $('pageSelect').replaceChildren();for(let n=1;n<=row.pages;n++){const option=document.createElement('option');option.value=n;option.textContent=n+' / '+row.pages;$('pageSelect').append(option);}
  paintList();renderVertical();await renderPage();window.scrollTo(0,0);
 }
 function turn(delta){if(!current)return;page=Math.max(1,Math.min(current.pages,page+delta));renderPage();}
 for(let n=1;n<=10;n++){const b=document.createElement('button');b.type='button';b.dataset.score=n;b.setAttribute('aria-label',n+'점');b.setAttribute('aria-pressed','false');const star=document.createElement('span');star.textContent='★';star.setAttribute('aria-hidden','true');b.append(star,document.createTextNode(n));b.onclick=()=>{if(!current)return;current.current={...current.current,score:n,note:$('note').value};paintScore();schedule();flush().catch(showError);};$('scores').append(b);}
 $('note').oninput=schedule;$('save').onclick=()=>flush().catch(showError);$('prev').onclick=()=>turn(-1);$('next').onclick=()=>turn(1);$('pageSelect').onchange=()=>{page=Number($('pageSelect').value);renderPage();};
 $('search').oninput=paintList;$('filter').onchange=paintList;$('zoom').onchange=()=>{$('reader').classList.toggle('zoom',$('zoom').checked);};
 function setMode(value){mode=value;$('stage').hidden=value!=='single';$('pages').hidden=value!=='single';$('verticalPages').hidden=value!=='vertical';$('single').setAttribute('aria-pressed',String(value==='single'));$('vertical').setAttribute('aria-pressed',String(value==='vertical'));renderVertical();}
 $('single').onclick=()=>setMode('single');$('vertical').onclick=()=>setMode('vertical');
 document.addEventListener('keydown',e=>{if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||mode!=='single')return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();turn(e.key==='ArrowRight'?1:-1);}});
 let startX=null;$('stage').addEventListener('pointerdown',e=>{if(e.target.tagName==='IMG')startX=e.clientX;});$('stage').addEventListener('pointerup',e=>{if(startX!=null&&Math.abs(e.clientX-startX)>45)turn(e.clientX<startX?1:-1);startX=null;});$('stage').addEventListener('pointercancel',()=>{startX=null;});$('pageImage').ondragstart=e=>e.preventDefault();
 $('openFolder').onclick=()=>api.openFolder().catch(showError);
 window.ThreadsPostReviewUI=Object.freeze({flush,select});
 if(!api){showError(Error('설치된 Threads 게시글 평가 프로그램에서 여세요.'));return;}
 api.onSelect(id=>{requestedId=id;if(entries.length)select(id).catch(showError);});
 api.list().then(result=>{entries=result.entries;paintList();if(entries.length)return select(requestedId||[...entries].sort((a,b)=>a.rank-b.rank)[0].id);$('title').textContent='아직 제작된 글이 없습니다.';}).catch(showError);
})();
