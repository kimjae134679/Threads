(function(){
 'use strict';
 const $=id=>document.getElementById(id),api=window.ThreadsPostReview;
 let entries=[],current=null,page=1,mode='single',dirty=false,timer=0,saveQueue=Promise.resolve(),selection=0,requestedId=null,editRevision=0,reviewRound=null;
 const cache=new Map(),positions=new Map();
 let navigation=0,pendingFilter=null,compactLayout=innerWidth<=900;
 let displayed=null,pageRequest=0,loading=false,loadFailure=null,reloading=0,cacheEpoch=0,refreshing=false,feedbackFocus=null;
 const oldDrafts=new Map(),verticalFailures=new Map(),pendingSaves=new Set();
 function isStale(error){return /제작 결과가 바뀌|새 수정본으로 전환|현재 수정본 회차|평가 기록의 검토 회차|검토 중 제작 결과/.test(error.message||String(error));}
 function reviewReady(value){
  value=value&&!refreshing;
  for(const b of $('scores').children)b.disabled=!value;
  $('note').disabled=!value;$('save').disabled=!value;
  if(value&&feedbackFocus===current){feedbackFocus=null;$('note').focus({preventScroll:true});}
  for(const id of ['holdPost','rejectPost','restorePost'])$(id).disabled=!!current?.hasOutput&&!value;
 }
 function keepDraft(force=false){
  if(!current||!dirty&&!force)return;
  oldDrafts.set(current.id+':'+current.outputVersion,{id:current.id,version:current.outputVersion,round:reviewRound,title:current.title,score:current.current?.score??null,note:$('note').value});
 }
 function paintDraft(id=current?.id,version=current?.outputVersion){
  const rows=[...oldDrafts.values()].filter(d=>d.id===id&&d.version!==version);
  $('previousDraft').hidden=!rows.length;
  $('previousDraftText').textContent=rows.map(d=>(d.round||'이전 제작물')+' · '+(d.score==null?'점수 없음':d.score+'점')+'\n'+d.title+'\n'+d.note).join('\n\n');
 }
 function clearLoadFailure(){loadFailure=null;verticalFailures.clear();$('loadRecovery').hidden=true;$('error').hidden=true;}
 function showLoadFailure(error,row,token,p){
  if(token!==selection||row!==current)return;
  loading=false;loadFailure={row,token,page:p,stale:!!loadFailure?.stale||isStale(error)};
  $('error').hidden=false;$('error').textContent=loadFailure.stale?'열려 있는 제작물과 현재 자료의 버전이 다릅니다. 최신 목록을 다시 불러오세요.':'본문 이미지를 불러오지 못했습니다. '+(error.message||String(error)).replace(/^Error invoking remote method '[^']+': Error: /,'');
  const preview=displayed?'마지막으로 불러온 '+displayed.title+' '+displayed.page+'장을 참고용으로 남겼습니다. ':'아직 불러온 이미지가 없습니다. ';
  $('recoveryMessage').textContent=loadFailure.stale?'읽던 회차: '+(reviewRound||'이전 제작물')+'. '+preview+'최신 회차를 확인하기 전에는 평가를 저장하지 않습니다.':preview+'이 장을 다시 불러오거나 최신 목록을 확인하세요.';
  $('loadRecovery').hidden=false;$('retryPage').disabled=loadFailure.stale;
  $('loadState').hidden=true;reviewReady(false);clearTimeout(timer);updateCoverFit();
 }
 function previewLoading(p){
  $('loadState').hidden=false;
  $('loadState').textContent=p+'장 불러오는 중'+(displayed?' · 이전에 읽힌 '+displayed.title+' '+displayed.page+'장을 참고용으로 표시합니다.':'. 잠시 기다려 주세요.');
  reviewReady(false);
 }
 function decodeImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve();image.onerror=()=>reject(Error('이미지를 화면에 표시할 수 없습니다.'));image.src=src;});}
 function visibleEntries(){const q=$('search').value.toLocaleLowerCase(),f=$('filter').value,t=$('topic').value,w=$('workflow').value;return entries.filter(r=>(r.title+' '+r.coverTitle).toLocaleLowerCase().includes(q)&&(!t||r.topic===t)&&(w==='all'||r.disposition===w)&&(!$('excludeSeen').checked||!r.progress?.seenAt)&&(f==='all'||r.category===f||f==='unrated'&&r.current?.score==null||f==='rated'&&r.current?.score!=null||f==='low'&&r.current?.score!=null&&r.current.score<=5)).sort((a,b)=>a.rank-b.rank);}
 function paintTopics(){const value=$('topic').value;$('topic').replaceChildren(new Option('모든 주제',''));for(const [key,label] of new Map(entries.map(r=>[r.topic,r.topicLabel])))$('topic').append(new Option(label,key));$('topic').value=value;}
 let visitQueue=Promise.resolve(),visibleObserver=null;
 let scheduledView=null,viewFrame=0,coverFitFrame=0;const pendingSeen=new Set();
 function recordVisiblePage(){
  if(document.hidden||!current?.hasOutput||loading||loadFailure||refreshing)return;
  if(mode==='single'&&($('pageImage').dataset.postId!==current.id||$('pageImage').dataset.outputVersion!==current.outputVersion||Number($('pageImage').dataset.page)!==page))return;
  const images=mode==='single'?[$('pageImage')]:[...$('verticalPages').querySelectorAll('img')];
  const visible=images.map(img=>{const b=img.getBoundingClientRect(),width=Math.max(0,Math.min(b.right,innerWidth)-Math.max(b.left,0)),height=Math.max(0,Math.min(b.bottom,innerHeight)-Math.max(b.top,0));return {img,b,ratio:b.width*b.height?width*height/(b.width*b.height):0};}).filter(v=>v.img.complete&&v.img.naturalWidth>0&&v.ratio>=.15).sort((a,b)=>Math.abs((a.b.top+a.b.bottom)/2-innerHeight/2)-Math.abs((b.b.top+b.b.bottom)/2-innerHeight/2));
  if(!visible.length)return;
  const p=mode==='single'?page:Number(visible[0].img.dataset.page),key=current.id+':'+current.outputVersion+':'+p;
  const row=current,newPages=visible.map(v=>mode==='single'?p:Number(v.img.dataset.page)).filter(n=>!row.progress?.pagesSeen?.includes(n)&&!pendingSeen.has(row.id+':'+row.outputVersion+':'+n));
  if(key===scheduledView&&!newPages.length)return;scheduledView=key;page=p;paintNavigation();
  for(const n of [...newPages.filter(n=>n!==p),p]){const seenKey=row.id+':'+row.outputVersion+':'+n;pendingSeen.add(seenKey);recordVisit(row,n).catch(()=>{scheduledView=null;}).finally(()=>pendingSeen.delete(seenKey));}
 }
 function updateCoverFit(){
  const stage=$('stage'),cover=mode==='single'&&current?.hasOutput&&(displayed&&(loading||loadFailure)?displayed.label:current.pageLabels?.[page-1])==='표지';
  stage.classList.toggle('cover-page',!!cover);
  if(cover){const top=Math.max(0,stage.getBoundingClientRect().top),dock=document.querySelector('.review-dock').getBoundingClientRect().height;stage.style.setProperty('--cover-height',Math.max(120,innerHeight-top-dock-64)+'px');}
  else stage.style.removeProperty('--cover-height');
 }
 function scheduleCoverFit(){if(!coverFitFrame)coverFitFrame=requestAnimationFrame(()=>{coverFitFrame=0;updateCoverFit();scheduleView();});}
 function setLibraryCollapsed(value){document.body.classList.toggle('library-collapsed',value);$('toggleLibrary').setAttribute('aria-expanded',String(!value));$('toggleLibrary').textContent=value?'글 목록 열기':'글 목록 접기';updateCoverFit();scheduleCoverFit();scheduleView();}
 $('toggleLibrary').onclick=()=>setLibraryCollapsed(!document.body.classList.contains('library-collapsed'));
 $('closeLibrary').onclick=()=>setLibraryCollapsed(true);
 $('showFullTitle').onclick=()=>{if(current){$('fullTitle').textContent=current.title;$('titleDialog').showModal();}};
 $('closeTitleDialog').onclick=()=>$('titleDialog').close();
 setLibraryCollapsed(compactLayout);
 function scheduleView(){if(!viewFrame)viewFrame=requestAnimationFrame(()=>{viewFrame=0;recordVisiblePage();});}
 window.addEventListener('scroll',scheduleView,{passive:true});window.addEventListener('resize',()=>{const compact=innerWidth<=900;if(compact!==compactLayout){compactLayout=compact;setLibraryCollapsed(compact);}updateCoverFit();scheduleCoverFit();scheduleView();});document.addEventListener('visibilitychange',scheduleView);

 function paintProgress(){if(!current)return;const p=current.progress;$('progressLabel').textContent=(p?.seenAt?'본 글 · '+(p.complete?'모든 장 표시':(p.pagesSeen?.length||0)+'/'+current.pages+'장 열람'):'아직 안 본 글')+' · '+(current.current?.score!=null||current.current?.note?.trim()?'평가 기록 있음':'평가 기록 없음')+' · '+({eligible:'검토 대상',held:'보류',rejected:'탈락'}[current.disposition]);}
 function recordVisit(row,p){const token=selection;const operation=visitQueue.catch(()=>{}).then(async()=>{const saved=await api.visit({id:row.id,outputVersion:row.outputVersion,page:p});row.progress=saved;if(current===row){paintProgress();rememberPosition();}if(entries.includes(row))paintList();});visitQueue=operation;operation.catch(error=>{if(current===row&&token===selection)showLoadFailure(error,row,token,p);});return operation;}
 async function decide(disposition){if(!current)return;await flush();const row=current;row.progress=await api.decide({id:row.id,outputVersion:row.outputVersion,disposition,reasonCode:disposition==='eligible'?null:$('reason').value,note:$('triageNote').value});row.disposition=disposition;paintProgress();paintList();}
 function paintNavigation(){const rows=visibleEntries(),i=rows.findIndex(r=>r.id===current?.id);$('prevPost').disabled=i<=0;$('nextPost').disabled=i<0||i===rows.length-1;$('postPosition').textContent=i>=0?'글 '+(i+1)+' / '+rows.length:'선택한 글';$('dockPrev').disabled=!current||page===1;$('dockNext').disabled=!current||page===current.pages;$('dockPage').textContent=current?page+' / '+current.pages:'—';$('dockPages').hidden=mode!=='single';}
 async function movePost(delta){const rows=visibleEntries(),i=rows.findIndex(r=>r.id===current?.id),next=rows[i+delta];if(i>=0&&next)await select(next.id);}
 function rememberPosition(){if(current)positions.set(current.id+':'+current.outputVersion,page);}
 function prefetch(row,p){for(const n of [p-1,p+1])if(n>0&&n<=row.pages)getImage(row,n).catch(()=>{});}
 function showError(error){$('error').hidden=false;$('error').textContent=error.message||String(error);}
 function status(text,failed=false){$('saveStatus').textContent=text;$('saveStatus').classList.toggle('failed',failed);}
 async function getImage(row,p){const key=row.id+':'+row.outputVersion+':'+p,epoch=cacheEpoch;if(cache.has(key))return cache.get(key);const value=await api.image(row.id,p,row.outputVersion);if(epoch===cacheEpoch){cache.set(key,value);if(cache.size>60)cache.delete(cache.keys().next().value);}return value;}
 const thumbs=new IntersectionObserver(records=>{for(const r of records)if(r.isIntersecting){thumbs.unobserve(r.target);const row=entries.find(e=>e.id===r.target.dataset.id);if(!row)continue;getImage(row,1).then(src=>{if(r.target.isConnected&&entries.includes(row))r.target.src=src;}).catch(error=>{if(r.target.isConnected&&entries.includes(row)&&isStale(error)&&current)showLoadFailure(error,current,selection,page);});}}, {root:$('posts'),rootMargin:'150px'});
 let verticalObserver=null;
 function paintList(){
  const scrollTop=$('posts').scrollTop;thumbs.disconnect();$('posts').replaceChildren();const rows=visibleEntries();
  $('count').textContent=entries.length+'개 글 · '+entries.filter(r=>r.current?.score!=null).length+'개 평가 · 표시 '+rows.length+'개';
  for(const row of rows){
   const b=document.createElement('button');b.type='button';b.className='post-card'+(current?.id===row.id?' active':'');b.dataset.id=row.id;b.setAttribute('aria-pressed',String(current?.id===row.id));
   const img=document.createElement('img');img.alt='';img.dataset.id=row.id;if(row.hasOutput)thumbs.observe(img);
   const text=document.createElement('div'),title=document.createElement('b'),meta=document.createElement('small');title.textContent=row.coverTitle;title.title=row.coverTitle;meta.textContent=(row.hasOutput?row.pages+'장':'제작물 없음')+' · '+(row.progress?.seenAt?'본 글':'안 본 글')+' · '+(row.current?.score!=null?'★ '+row.current.score+'/10':'미평가');if(row.categoryLabel){const category=document.createElement('small');category.textContent=row.categoryLabel;text.append(category);}text.append(title,meta);b.append(img,text);b.onclick=()=>select(row.id).catch(showError);$('posts').append(b);
  }
  $('posts').scrollTop=scrollTop;paintNavigation();
 }
 function paintScore(){for(const b of $('scores').children)b.setAttribute('aria-pressed',String(Number(b.dataset.score)===current?.current?.score));$('scoreText').textContent=current?.current?.score!=null?'★ '+current.current.score+' / 10':'아직 점수 없는 글';}
 function schedule(){editRevision++;dirty=true;status('저장 대기');clearTimeout(timer);timer=setTimeout(()=>flush().catch(showError),400);}
 async function flush(){
  clearTimeout(timer);
  if(dirty&&loadFailure?.stale){keepDraft();status('이전 제작물의 미저장 평가를 이 창에 보관했습니다',true);return;}
  if(dirty&&current){
   const row=current,revision=editRevision,payload={id:row.id,outputVersion:row.outputVersion,score:row.current?.score??null,note:$('note').value};
   dirty=false;status('저장 중…');
   const op=saveQueue.catch(()=>{}).then(()=>api.save(payload));
   saveQueue=op;pendingSaves.add(row);
   try{const saved=await op;if(current!==row||revision===editRevision)row.current=saved;if(current===row&&!dirty&&op===saveQueue){paintScore();status('저장됨 · '+new Date(saved.updatedAt).toLocaleTimeString());}paintList();}
   catch(e){if(current===row){dirty=true;status('저장 실패 · 평가 저장을 눌러 다시 시도하세요',true);if(isStale(e))showLoadFailure(e,row,selection,page);}throw e;}
   finally{if(op===saveQueue)pendingSaves.delete(row);}
  }else await saveQueue;
 }
 async function renderPage(){
  const row=current,token=selection,p=page,ticket=++pageRequest;if(!row||!row.hasOutput||mode!=='single')return;paintNavigation();rememberPosition();
  if(loadFailure?.stale){reviewReady(false);return;}
  loading=true;clearLoadFailure();previewLoading(p);updateCoverFit();
  $('prev').disabled=p===1;$('next').disabled=p===row.pages;$('pageSelect').value=String(p);$('pageLabel').textContent=row.pageLabels[p-1]+' · '+p+' / '+row.pages;
  try{
   const src=await getImage(row,p);await decodeImage(src);
   if(token!==selection||row!==current||page!==p||ticket!==pageRequest||mode!=='single')return;
   const img=$('pageImage');img.onload=()=>{if(token===selection&&row===current&&page===p&&mode==='single'){updateCoverFit();scheduleView();}};
   img.dataset.postId=row.id;img.dataset.outputVersion=row.outputVersion;img.dataset.page=p;
   img.src=src;img.alt=row.pageLabels[p-1]+' '+p+'장';displayed={title:row.coverTitle,page:p,label:row.pageLabels[p-1]};
   loading=false;$('loadState').hidden=true;reviewReady(true);updateCoverFit();prefetch(row,p);
  }catch(e){if(ticket===pageRequest&&mode==='single')showLoadFailure(e,row,token,p);}
 }
 function renderVertical(){
  verticalObserver?.disconnect();visibleObserver?.disconnect();$('verticalPages').replaceChildren();if(mode!=='vertical'||!current)return;
  const row=current,token=selection,requests=new WeakMap();
  if(!row.hasOutput)return;
  visibleObserver=new IntersectionObserver(()=>{if(token===selection)scheduleView();}, {threshold:0.15});
  async function load(img){
   const p=Number(img.dataset.page),figure=img.parentElement,errorBox=figure.querySelector('.vertical-page-error'),ticket=(requests.get(img)||0)+1;requests.set(img,ticket);errorBox.hidden=true;
   try{const src=await getImage(row,p);await decodeImage(src);if(token!==selection||row!==current||mode!=='vertical'||!img.isConnected||requests.get(img)!==ticket)return;
    img.onload=()=>{visibleObserver.observe(img);scheduleView();};img.src=src;verticalFailures.delete(p);
    if(!verticalFailures.size&&!loadFailure?.stale){clearLoadFailure();reviewReady(true);}
   }catch(error){if(token!==selection||row!==current||mode!=='vertical'||!img.isConnected||requests.get(img)!==ticket)return;
    verticalFailures.set(p,error);errorBox.hidden=false;showLoadFailure(error,row,token,p);
   }
  }
  verticalObserver=new IntersectionObserver(records=>{for(const r of records)if(r.isIntersecting){verticalObserver.unobserve(r.target);load(r.target);}}, {rootMargin:'350px'});
  for(let p=1;p<=row.pages;p++){const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption'),errorBox=document.createElement('div'),retry=document.createElement('button');img.alt=row.pageLabels[p-1]+' '+p+'장';img.dataset.page=p;caption.textContent=row.pageLabels[p-1]+' · '+p+' / '+row.pages;errorBox.className='vertical-page-error';errorBox.hidden=true;errorBox.append(document.createTextNode(p+'장을 불러오지 못했습니다. 최신 회차를 확인하거나 다시 시도하세요.'));retry.type='button';retry.dataset.retryPage=p;retry.textContent=p+'장 다시 불러오기';retry.onclick=()=>{if(loadFailure?.stale)return;load(img);};errorBox.append(retry);figure.append(img,caption,errorBox);$('verticalPages').append(figure);verticalObserver.observe(img);}
 }
 async function select(id,options={}){
  const request=++navigation;rememberPosition();if(loadFailure?.stale){keepDraft(pendingSaves.has(current));await saveQueue.catch(()=>{});if(request!==navigation)return;keepDraft();dirty=false;saveQueue=Promise.resolve();}do{await flush();if(request!==navigation)return;}while(dirty&&!loadFailure?.stale);
  const row=entries.find(r=>r.id===id);if(!row)return;if(feedbackFocus!==row)feedbackFocus=null;current=row;page=Math.max(1,Math.min(row.pages,options.page||positions.get(row.id+':'+row.outputVersion)||row.progress?.lastPage||1));selection++;
  if(!loadFailure?.stale)clearLoadFailure();loading=false;$('showFullTitle').disabled=false;if(compactLayout)setLibraryCollapsed(true);$('reader').hidden=!row.hasOutput;$('unavailable').hidden=row.hasOutput;
  $('unavailable').textContent=row.hasOutput?'':'제작물이 없습니다. '+(row.sourceReason||'원본을 보완하거나 제작을 마친 뒤 다시 검토할 수 있습니다.');
  $('triage').hidden=false;$('reason').value=row.progress?.reasonCode||(!row.hasOutput?'source_insufficient':'material_unsuitable');$('triageNote').value=row.progress?.note||'';$('sourceReason').textContent=row.sourceReason||(!row.hasOutput?'원본과 과거 기록을 보존합니다. 원본 보완 또는 제작 후 다시 검토하세요.':'');paintProgress();if(!loadFailure)$('error').hidden=true;
  $('title').textContent=row.coverTitle;$('original').textContent=row.title===row.coverTitle?'':'원제 · '+row.title;$('postMeta').textContent=row.hasOutput?row.pages+'장 · '+(row.categoryLabel||'현재 제작 결과'):'제작물 없음 · '+({eligible:'검토 대상',held:'보류',rejected:'탈락'}[row.disposition]);
  $('note').value=row.current?.note||'';paintScore();status(row.current?'저장된 평가를 불러왔어요':'점수나 메모를 남겨주세요');
  $('previous').hidden=!row.previous;$('previous').textContent=row.previous?'이전 제작 버전 평가 · '+(row.previous.score??'점수 없음')+' / 10\n'+row.previous.note:'';
  $('pageSelect').replaceChildren();for(let n=1;n<=row.pages;n++){const option=document.createElement('option');option.value=n;option.textContent=n+' / '+row.pages;$('pageSelect').append(option);}
  paintDraft();reviewReady(row.hasOutput&&!loadFailure);paintList();renderVertical();await renderPage();
  if(request!==navigation||current!==row)return;
  if(options.preserveView&&mode==='vertical')$('verticalPages').querySelector('img[data-page="'+page+'"]')?.scrollIntoView({block:'start'});
  else window.scrollTo(0,options.preserveView?options.scroll||0:0);updateCoverFit();
 }
 function turn(delta){if(!current?.hasOutput||mode!=='single')return;const next=Math.max(1,Math.min(current.pages,page+delta));if(next===page)return;page=next;renderPage();$('stage').scrollIntoView({block:'start',behavior:'instant'});updateCoverFit();}
 for(let n=1;n<=10;n++){const b=document.createElement('button');b.type='button';b.dataset.score=n;b.setAttribute('aria-label',n+'점');b.setAttribute('aria-pressed','false');const star=document.createElement('span');star.textContent='★';star.setAttribute('aria-hidden','true');b.append(star,document.createTextNode(n));b.onclick=()=>{if(!current)return;current.current={...current.current,score:n,note:$('note').value};paintScore();schedule();flush().catch(showError);};$('scores').append(b);}
 $('note').oninput=schedule;$('save').onclick=()=>flush().catch(showError);$('prev').onclick=()=>turn(-1);$('next').onclick=()=>turn(1);$('pageSelect').onchange=()=>{page=Number($('pageSelect').value);renderPage();};
 $('topic').onchange=paintList;$('workflow').onchange=paintList;$('excludeSeen').onchange=paintList;$('randomPost').onclick=async()=>{try{await flush();await visitQueue;const row=await api.random({topic:$('topic').value,search:$('search').value});if(row){$('workflow').value='eligible';$('filter').value='all';await select(row.id);}else showError(Error('안 본 적격 제작물이 없습니다. 주제·검색 조건을 확인하세요.'));}catch(e){showError(e);}};$('holdPost').onclick=()=>decide('held').catch(showError);$('rejectPost').onclick=()=>decide('rejected').catch(showError);$('restorePost').onclick=()=>decide('eligible').catch(showError);$('fromCover').onclick=()=>{page=1;setMode('single');renderPage();$('stage').scrollIntoView({block:'start'});updateCoverFit();};
 $('search').oninput=paintList;$('filter').onchange=paintList;$('zoom').onchange=()=>{$('reader').classList.toggle('zoom',$('zoom').checked);updateCoverFit();scheduleView();};
 function setMode(value){pageRequest++;loading=false;$('loadState').hidden=true;mode=value;$('stage').hidden=value!=='single';$('pages').hidden=value!=='single';$('verticalPages').hidden=value!=='vertical';$('single').setAttribute('aria-pressed',String(value==='single'));$('vertical').setAttribute('aria-pressed',String(value==='vertical'));renderVertical();paintNavigation();updateCoverFit();}
 $('single').onclick=()=>{setMode('single');renderPage();};$('vertical').onclick=()=>setMode('vertical');
 document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable)return;if(mode==='single'&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();turn(e.key==='ArrowRight'?1:-1);}else if((e.key==='ArrowDown'||e.key==='ArrowUp')&&!e.repeat){e.preventDefault();movePost(e.key==='ArrowDown'?1:-1).catch(showError);}});
 let gesture=null;$('stage').addEventListener('pointerdown',e=>{if(e.target.tagName!=='IMG'||e.button!==0)return;gesture={x:e.clientX,y:e.clientY,id:e.pointerId,time:performance.now()};if(e.isTrusted)$('stage').setPointerCapture(e.pointerId);});$('stage').addEventListener('pointerup',e=>{const g=gesture;gesture=null;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4&&performance.now()-g.time<1500)turn(dx<0?1:-1);});for(const event of ['pointercancel','lostpointercapture'])$('stage').addEventListener(event,()=>{gesture=null;});$('pageImage').ondragstart=e=>e.preventDefault();
 $('openFolder').onclick=()=>api.openFolder().catch(showError);
 $('prevPost').onclick=()=>movePost(-1).catch(showError);$('nextPost').onclick=()=>movePost(1).catch(showError);$('dockPrev').onclick=()=>turn(-1);$('dockNext').onclick=()=>turn(1);$('jumpFeedback').onclick=()=>{document.querySelector('.feedback').scrollIntoView({block:'start',behavior:'smooth'});feedbackFocus=current;if(!$('note').disabled){feedbackFocus=null;$('note').focus({preventScroll:true});}};
 async function reload(){
  const ticket=++reloading,token=selection,nav=navigation,prior=current,priorPage=page,scroll=window.scrollY,oldRound=reviewRound;
  $('reloadLatest').disabled=true;$('reload').disabled=true;refreshing=true;reviewReady(false);
  try{
   if(loadFailure?.stale){keepDraft(pendingSaves.has(current));await saveQueue.catch(()=>{});if(ticket!==reloading||token!==selection||nav!==navigation)return;keepDraft();dirty=false;saveQueue=Promise.resolve();}
   else await flush();
   await visitQueue.catch(()=>{});
   const result=await api.list();
   if(ticket!==reloading||token!==selection||nav!==navigation)return;
   entries=result.entries;reviewRound=result.reviewRound;cacheEpoch++;cache.clear();pageRequest++;selection++;scheduledView=null;
   clearLoadFailure();$('loadState').hidden=true;loading=false;refreshing=false;paintTopics();
   $('roundLabel').textContent=reviewRound?'최신 전체 수정본 · '+reviewRound:'현재 제작본';
   const row=entries.find(r=>r.id===prior?.id),changed=oldRound!==reviewRound||prior&&row&&prior.outputVersion!==row.outputVersion;
   $('roundNotice').hidden=!changed;
   $('roundNotice').textContent=changed?'최신 제작물을 확인했습니다. 이전 제작물의 평가는 새 제작물로 옮기지 않았습니다.':'';
   paintList();
   if(row)await select(row.id,{page:priorPage,preserveView:true,scroll});
   else if(prior){
    current=null;page=1;paintNavigation();$('reader').hidden=true;$('triage').hidden=true;$('unavailable').hidden=false;
    $('unavailable').textContent='이 글은 최신 목록에 없습니다. 목록에서 다른 글을 선택해 주세요.';reviewReady(false);paintDraft(prior.id,null);
   }else if(visibleEntries()[0])await select(visibleEntries()[0].id);
   else{$('reader').hidden=true;$('unavailable').hidden=false;$('unavailable').textContent='현재 조건에 해당하는 제작물이 없습니다. 목록 조건을 확인해 주세요.';}
  }catch(error){if(ticket===reloading&&token===selection&&nav===navigation){if(current)showLoadFailure(error,current,selection,page);else showError(error);}}
  finally{if(ticket===reloading){refreshing=false;$('reloadLatest').disabled=false;$('reload').disabled=false;reviewReady(!!current?.hasOutput&&!loading&&!loadFailure);}}
 }
 $('reloadLatest').onclick=()=>reload();
 $('retryPage').onclick=()=>{if(loadFailure?.stale)return;if(mode==='vertical'){for(const p of [...verticalFailures.keys()])$('verticalPages').querySelector('button[data-retry-page="'+p+'"]')?.click();}else renderPage();};
 $('reload').onclick=()=>reload().catch(showError);$('openHistory').onclick=()=>api.openHistory().catch(showError);
 window.ThreadsPostReviewUI=Object.freeze({flush:async()=>{await flush();await visitQueue;},select,reload});
 if(!api){showError(Error('설치된 Threads 게시글 평가 프로그램에서 여세요.'));return;}
 api.onFilter?.(value=>{pendingFilter=value;(async()=>{await flush();$('workflow').value=value;$('filter').value='all';$('topic').value='';$('search').value='';$('excludeSeen').checked=false;paintList();const first=visibleEntries()[0];if(first)await select(first.id);else{current=null;selection++;$('reader').hidden=true;$('triage').hidden=true;}})().catch(showError);});
 api.onSelect(id=>{requestedId=id;if(entries.length)select(id).catch(showError);});
 api.list().then(result=>{$('workflow').value=pendingFilter||result.initialFilter||'eligible';entries=result.entries;paintTopics();reviewRound=result.reviewRound;$('roundLabel').textContent=reviewRound?'최신 전체 수정본 · '+reviewRound:'현재 제작본';paintList();if(entries.length)return select(requestedId||visibleEntries()[0]?.id);$('title').textContent='아직 제작된 글이 없습니다.';}).catch(showError);
})();
