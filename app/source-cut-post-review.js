(function(){
 'use strict';
 const $=id=>document.getElementById(id),api=window.ThreadsPostReview;
 let entries=[],current=null,page=1,mode='single',dirty=false,timer=0,saveQueue=Promise.resolve(),selection=0,requestedId=null,editRevision=0,reviewRound=null;
 const positions=new Map(),postCards=new Map();
 let selectionAbort=new AbortController(),pageAbort=new AbortController(),randomOrder=new Map(),shuffleFilterKey=null,listFrame=0;
 const loader=window.ThreadsReviewLoader.createLoader({load:({row,p,thumbnail})=>thumbnail&&api.thumbnail?api.thumbnail(row.id,row.outputVersion):api.image(row.id,p,row.outputVersion)});
 const abortError=()=>Object.assign(Error('이미지 요청 취소'),{name:'AbortError'});
 const signals=(...values)=>AbortSignal.any(values.filter(Boolean));
 let navigation=0,pendingFilter=null,compactLayout=innerWidth<=900;
 let displayed=null,pageRequest=0,loading=false,loadFailure=null,reloading=0,refreshing=false,feedbackFocus=null;
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
 function decodeImage(src,{signal}={}){return new Promise((resolve,reject)=>{if(signal?.aborted){reject(abortError());return;}const image=new Image(),release=()=>{signal?.removeEventListener('abort',cancel);image.onload=null;image.onerror=null;image.removeAttribute('src');},cancel=()=>{release();reject(abortError());};image.onload=()=>{release();resolve();};image.onerror=()=>{release();reject(Error('이미지를 화면에 표시할 수 없습니다.'));};signal?.addEventListener('abort',cancel,{once:true});image.src=src;});}
 function seen(row){return !!(row.seenAt||row.progress?.seenAt);}
 function filterKey(){return JSON.stringify([reviewRound,$('search').value,$('filter').value,$('topic').value,$('workflow').value,$('excludeSeen').checked]);}
 function visibleEntries(keepCurrent=true){const q=$('search').value.toLocaleLowerCase(),f=$('filter').value,t=$('topic').value,w=$('workflow').value;return entries.filter(r=>{const retained=keepCurrent&&(r===current||shuffleFilterKey===filterKey()&&randomOrder.has(r.id));return (r.title+' '+r.coverTitle).toLocaleLowerCase().includes(q)&&(!t||r.topic===t)&&(w==='all'||r.disposition===w)&&(!$('excludeSeen').checked||!seen(r)||retained)&&(retained||f==='all'||r.category===f||f==='unrated'&&r.current?.score==null||f==='rated'&&r.current?.score!=null||f==='low'&&r.current?.score!=null&&r.current.score<=5);}).sort((a,b)=>(randomOrder.get(a.id)??Infinity)-(randomOrder.get(b.id)??Infinity)||a.rank-b.rank);}
 function filterChanged(){shuffleFilterKey=null;paintList();}
 function paintTopics(){const value=$('topic').value;$('topic').replaceChildren(new Option('모든 주제',''));for(const [key,label] of new Map(entries.map(r=>[r.topic,r.topicLabel])))$('topic').append(new Option(label,key));$('topic').value=value;}
 let visitQueue=Promise.resolve(),visibleObserver=null;
 let scheduledView=null,viewFrame=0,coverFitFrame=0;const pendingSeen=new Set();
 function recordVisiblePage(){
  if(document.hidden||!current?.hasOutput||loading||loadFailure||refreshing)return;
  if(mode==='single'&&($('pageImage').dataset.postId!==current.id||$('pageImage').dataset.outputVersion!==current.outputVersion||Number($('pageImage').dataset.page)!==page))return;
  const images=mode==='single'?[$('pageImage')]:[...$('verticalPages').querySelectorAll('img')];
  const viewport=$('imageViewport').getBoundingClientRect();const visible=images.map(img=>{const b=img.getBoundingClientRect(),width=Math.max(0,Math.min(b.right,viewport.right)-Math.max(b.left,viewport.left)),height=Math.max(0,Math.min(b.bottom,viewport.bottom)-Math.max(b.top,viewport.top));return {img,b,ratio:b.width*b.height?width*height/(b.width*b.height):0};}).filter(v=>v.img.complete&&v.img.naturalWidth>0&&v.ratio>=.15).sort((a,b)=>Math.abs((a.b.top+a.b.bottom)/2-innerHeight/2)-Math.abs((b.b.top+b.b.bottom)/2-innerHeight/2));
  if(!visible.length)return;
  const p=mode==='single'?page:Number(visible[0].img.dataset.page),key=current.id+':'+current.outputVersion+':'+p;
  const row=current,newPages=visible.map(v=>mode==='single'?p:Number(v.img.dataset.page)).filter(n=>!row.progress?.pagesSeen?.includes(n)&&!pendingSeen.has(row.id+':'+row.outputVersion+':'+n));
  if(key===scheduledView&&!newPages.length)return;scheduledView=key;page=p;paintNavigation();
  for(const n of [...newPages.filter(n=>n!==p),p]){const seenKey=row.id+':'+row.outputVersion+':'+n;pendingSeen.add(seenKey);recordVisit(row,n).catch(()=>{scheduledView=null;}).finally(()=>pendingSeen.delete(seenKey));}
 }
 function updateCoverFit(){
  const reader=$('reader'),viewport=$('imageViewport');reader.style.setProperty('--reader-height',Math.max(330,innerHeight-Math.max(12,reader.getBoundingClientRect().top)-12)+'px');
  const stage=$('stage'),cover=mode==='single'&&current?.hasOutput&&(displayed&&(loading||loadFailure)?displayed.label:current.pageLabels?.[page-1])==='표지';
  stage.classList.toggle('cover-page',!!cover);
  if(cover){stage.style.setProperty('--cover-height',Math.max(120,(viewport?.clientHeight||innerHeight)-50)+'px');}
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
 window.addEventListener('scroll',()=>{syncVertical?.();scheduleView();},{passive:true});window.addEventListener('resize',()=>{const compact=innerWidth<=900;if(compact!==compactLayout){compactLayout=compact;setLibraryCollapsed(compact);}updateCoverFit();syncVertical?.();scheduleCoverFit();scheduleView();});document.addEventListener('visibilitychange',scheduleView);
 $('imageViewport').addEventListener('scroll',()=>{syncVertical?.();scheduleView();},{passive:true});

 function paintProgress(){if(!current)return;const p=current.progress;$('progressLabel').textContent=(p?.seenAt?'본 글 · '+(p.complete?'모든 장 표시':(p.pagesSeen?.length||0)+'/'+current.pages+'장 열람'):seen(current)?'이전에 본 글 · 현재 제작본 열람 전':'아직 안 본 글')+' · '+(current.current?.score!=null||current.current?.note?.trim()?'평가 기록 있음':'평가 기록 없음')+' · '+({eligible:'검토 대상',held:'보류',rejected:'탈락'}[current.disposition]);}
 function recordVisit(row,p){const token=selection;const operation=visitQueue.catch(()=>{}).then(async()=>{const saved=await api.visit({id:row.id,outputVersion:row.outputVersion,page:p});if(saved){row.progress=saved;row.seenAt??=saved.seenAt;}if(current===row){paintProgress();rememberPosition();}if(entries.includes(row))paintList();});visitQueue=operation;operation.catch(error=>{if(current===row&&token===selection)showLoadFailure(error,row,token,p);});return operation;}
 async function decide(disposition){if(!current)return;await flush();const row=current;row.progress=await api.decide({id:row.id,outputVersion:row.outputVersion,disposition,reasonCode:disposition==='eligible'?null:$('reason').value,note:$('triageNote').value});row.disposition=disposition;paintProgress();paintList();}
 function paintNavigation(){const rows=visibleEntries(),i=rows.findIndex(r=>r.id===current?.id);$('prevPost').disabled=i<=0;$('nextPost').disabled=i<0||i===rows.length-1;$('postPosition').textContent=i>=0?'글 '+(i+1)+' / '+rows.length:'선택한 글';$('dockPrev').disabled=!current||page===1;$('dockNext').disabled=!current||page===current.pages;$('dockPage').textContent=current?page+' / '+current.pages:'—';$('dockPages').hidden=mode!=='single';}
 async function movePost(delta){const rows=visibleEntries(),i=rows.findIndex(r=>r.id===current?.id),next=rows[i+delta];if(i>=0&&next)await select(next.id);}
 function rememberPosition(){if(current)positions.set(current.id+':'+current.outputVersion,page);}
 function prefetch(row,p){for(const n of [p-1,p+1])if(n>0&&n<=row.pages)getImage(row,n,{signal:selectionAbort.signal,priority:3}).catch(()=>{});}
 function showError(error){$('error').hidden=false;$('error').textContent=error.message||String(error);}
 function status(text,failed=false){$('saveStatus').textContent=text;$('saveStatus').classList.toggle('failed',failed);}
 async function getImage(row,p,{refresh=false}={}){
  const {signal,priority=0,thumbnail=false}=arguments[2]||{};
  return loader.request((thumbnail?'thumb:':'page:')+row.id+':'+row.outputVersion+':'+p,{row,p,thumbnail},{refresh,signal,priority});
 }
 const thumbRequests=new WeakMap(),thumbAborts=new WeakMap();
 function thumbnailFailure(img){if(!img.isConnected)return;img.alt='표지 오류';img.title='표지를 불러오지 못했습니다. 글을 눌러 재시도하세요.';const card=postCards.get(img.dataset.id);if(card?.img===img)card.b.title=img.title;}
 const thumbs=new IntersectionObserver(records=>{for(const r of records){const img=r.target,ticket=(thumbRequests.get(img)||0)+1;thumbRequests.set(img,ticket);thumbAborts.get(img)?.abort();img.dataset.visible=String(r.isIntersecting);if(!r.isIntersecting){img.removeAttribute('src');continue;}const row=entries.find(e=>e.id===img.dataset.id&&e.outputVersion===img.dataset.version);if(!row)continue;const control=new AbortController();thumbAborts.set(img,control);getImage(row,1,{thumbnail:true,signal:control.signal,priority:2}).then(src=>{if(img.isConnected&&thumbRequests.get(img)===ticket&&img.dataset.version===row.outputVersion)img.src=src;}).catch(error=>{if(error.name==='AbortError')return;if(img.isConnected&&thumbRequests.get(img)===ticket&&entries.includes(row)){thumbnailFailure(img);if(isStale(error)&&current)showLoadFailure(error,current,selection,page);}});}}, {root:$('posts'),rootMargin:'150px'});
 let verticalObserver=null,syncVertical=null;
 const listTop=document.createElement('div'),listBottom=document.createElement('div');listTop.className=listBottom.className='list-spacer';
 $('posts').addEventListener('scroll',()=>{if(!listFrame)listFrame=requestAnimationFrame(()=>{listFrame=0;paintList();});},{passive:true});
 function paintList(){
  const posts=$('posts'),all=visibleEntries(),rowHeight=120,scrollTop=Math.min(posts.scrollTop,Math.max(0,all.length*rowHeight-posts.clientHeight)),start=Math.max(0,Math.floor(scrollTop/rowHeight)-2),end=Math.min(all.length,start+Math.ceil((posts.clientHeight||500)/rowHeight)+5),rows=all.slice(start,end),ids=new Set(rows.map(r=>r.id));
  for(const [id,card]of postCards)if(!ids.has(id)){thumbAborts.get(card.img)?.abort();thumbs.unobserve(card.img);card.img.removeAttribute('src');card.b.remove();postCards.delete(id);}
  $('count').textContent=entries.length+'개 글 · '+entries.filter(r=>r.current?.score!=null).length+'개 평가 · 표시 '+all.length+'개';
  if(listTop.parentElement!==posts)posts.prepend(listTop);if(listBottom.parentElement!==posts)posts.append(listBottom);listTop.style.height=(start*rowHeight)+'px';listBottom.style.height=((all.length-end)*rowHeight)+'px';
  for(const [index,row]of rows.entries()){
   let card=postCards.get(row.id);
   if(!card){const b=document.createElement('button'),img=document.createElement('img'),text=document.createElement('div'),title=document.createElement('b'),meta=document.createElement('small'),category=document.createElement('small');b.type='button';b.dataset.id=row.id;img.alt='';img.dataset.id=row.id;img.onload=()=>{img.alt='';img.title='';b.title='';};img.onerror=()=>{if(img.getAttribute('src'))thumbnailFailure(img);};text.append(category,title,meta);b.append(img,text);card={b,img,title,meta,category};postCards.set(row.id,card);}
   const {b,img,title,meta,category}=card;b.className='post-card'+(current?.id===row.id?' active':'');b.setAttribute('aria-pressed',String(current?.id===row.id));
   if(img.dataset.version!==row.outputVersion){thumbs.unobserve(img);thumbRequests.set(img,(thumbRequests.get(img)||0)+1);img.removeAttribute('src');img.dataset.version=row.outputVersion;if(row.hasOutput)thumbs.observe(img);}
   title.textContent=row.coverTitle;title.title=row.coverTitle;category.textContent=row.categoryLabel||'';category.hidden=!row.categoryLabel;meta.textContent=(row.hasOutput?row.pages+'장':'제작물 없음')+' · '+(seen(row)?'본 글':'안 본 글')+' · '+(row.current?.score!=null?'★ '+row.current.score+'/10':'미평가');
   b.onclick=()=>{
    if(img.alt==='표지 오류'){const ticket=(thumbRequests.get(img)||0)+1;thumbRequests.set(img,ticket);getImage(row,1,{refresh:true,thumbnail:true,signal:thumbAborts.get(img)?.signal,priority:2}).then(src=>{if(img.isConnected&&thumbRequests.get(img)===ticket&&img.dataset.visible==='true'&&img.dataset.version===row.outputVersion)img.src=src;}).catch(error=>{if(error.name!=='AbortError'&&img.isConnected&&thumbRequests.get(img)===ticket&&img.dataset.version===row.outputVersion)thumbnailFailure(img);});}
    select(row.id).catch(showError);
   };
   const position=posts.children[index+1]||listBottom;if(position!==b)posts.insertBefore(b,position);
  }
  posts.scrollTop=scrollTop;paintNavigation();
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
 async function renderPage({retry=false}={}){
  pageAbort.abort();pageAbort=new AbortController();const signal=signals(pageAbort.signal,selectionAbort.signal);
  const row=current,token=selection,p=page,ticket=++pageRequest;if(!row||!row.hasOutput||mode!=='single')return;paintNavigation();rememberPosition();
  if(loadFailure?.stale){reviewReady(false);return;}
  loading=true;clearLoadFailure();previewLoading(p);updateCoverFit();
  $('prev').disabled=p===1;$('next').disabled=p===row.pages;$('pageSelect').value=String(p);$('pageLabel').textContent=row.pageLabels[p-1]+' · '+p+' / '+row.pages;
  try{
   const src=await getImage(row,p,{refresh:retry,signal});if(token!==selection||row!==current||page!==p||ticket!==pageRequest||mode!=='single')return;await decodeImage(src,{signal});
   if(token!==selection||row!==current||page!==p||ticket!==pageRequest||mode!=='single')return;
   const img=$('pageImage');img.onload=()=>{if(token===selection&&row===current&&page===p&&mode==='single'){updateCoverFit();scheduleView();}};
   img.onerror=()=>{if(img.getAttribute('src')&&token===selection&&row===current&&ticket===pageRequest)showLoadFailure(Error('이미지 표시가 중단됐습니다. 다시 불러오기를 눌러주세요.'),row,token,p);};
   img.dataset.postId=row.id;img.dataset.outputVersion=row.outputVersion;img.dataset.page=p;
   img.src=src;img.alt=row.pageLabels[p-1]+' '+p+'장';displayed={title:row.coverTitle,page:p,label:row.pageLabels[p-1]};
   loading=false;$('loadState').hidden=true;reviewReady(true);updateCoverFit();prefetch(row,p);
  }catch(e){if(e.name!=='AbortError'&&ticket===pageRequest&&mode==='single')showLoadFailure(e,row,token,p);}
 }
 function renderVertical(){
  syncVertical=null;verticalObserver?.disconnect();verticalObserver=null;visibleObserver?.disconnect();visibleObserver=null;for(const img of $('verticalPages').querySelectorAll('img'))img.removeAttribute('src');$('verticalPages').replaceChildren();if(mode!=='vertical'||!current)return;
  const row=current,token=selection,requests=new WeakMap(),pending=new WeakSet(),controls=new WeakMap(),recent=new Map();let recentBytes=0;
  if(!row.hasOutput)return;
  visibleObserver=new IntersectionObserver(()=>{if(token===selection)scheduleView();}, {root:$('imageViewport'),threshold:0.15});
  async function load(img,{retry=false}={}){
   if(pending.has(img)&&!retry)return;pending.add(img);
   controls.get(img)?.abort();const control=new AbortController();controls.set(img,control);const signal=signals(control.signal,selectionAbort.signal);
   const p=Number(img.dataset.page),figure=img.parentElement,errorBox=figure.querySelector('.vertical-page-error'),ticket=(requests.get(img)||0)+1;requests.set(img,ticket);errorBox.hidden=true;
   try{const src=await getImage(row,p,{refresh:retry,signal,priority:1});if(token!==selection||row!==current||mode!=='vertical'||!img.isConnected||requests.get(img)!==ticket)return;await decodeImage(src,{signal});if(token!==selection||row!==current||mode!=='vertical'||!img.isConnected||requests.get(img)!==ticket)return;
      img.onload=()=>{if(token!==selection||row!==current||mode!=='vertical'||requests.get(img)!==ticket)return;img.style.aspectRatio=img.naturalWidth+' / '+img.naturalHeight;visibleObserver.observe(img);syncVertical?.();scheduleView();};img.src=src;verticalFailures.delete(p);
    if(!verticalFailures.size&&!loadFailure?.stale){clearLoadFailure();reviewReady(true);}
   }catch(error){if(error.name==='AbortError'||token!==selection||row!==current||mode!=='vertical'||!img.isConnected||requests.get(img)!==ticket)return;
    verticalFailures.set(p,error);errorBox.hidden=false;showLoadFailure(error,row,token,p);
   }finally{if(requests.get(img)===ticket)pending.delete(img);}
  }
  syncVertical=()=>{
   if(token!==selection||row!==current||mode!=='vertical'||loadFailure?.stale)return;
   const viewport=$('imageViewport').getBoundingClientRect();const images=[...$('verticalPages').querySelectorAll('img')].map(img=>({img,bounds:img.getBoundingClientRect()})),visible=images.filter(({img,bounds:b})=>img.complete&&img.naturalWidth>0&&b.bottom>viewport.top&&b.top<viewport.bottom&&b.right>viewport.left&&b.left<viewport.right).sort((a,b)=>Math.abs((a.bounds.top+a.bounds.bottom)/2-innerHeight/2)-Math.abs((b.bounds.top+b.bounds.bottom)/2-innerHeight/2))[0]?.img;
   if(visible){const bytes=visible.naturalWidth*visible.naturalHeight*4;if(recent.has(visible)){recentBytes-=recent.get(visible);recent.delete(visible);}if(bytes<=16*1024*1024){recent.set(visible,bytes);recentBytes+=bytes;}while(recent.size>3||recentBytes>16*1024*1024){const oldest=recent.keys().next().value;recentBytes-=recent.get(oldest);recent.delete(oldest);}}
   for(const {img,bounds}of images){const near=bounds.bottom>=viewport.top-350&&bounds.top<=viewport.bottom+350&&bounds.right>viewport.left&&bounds.left<viewport.right;
    if(near){if(!img.getAttribute('src')&&img.parentElement.querySelector('.vertical-page-error').hidden)load(img);else if(img.complete&&img.naturalWidth>0)visibleObserver.observe(img);}
    else if(img.getAttribute('src')||pending.has(img)){controls.get(img)?.abort();requests.set(img,(requests.get(img)||0)+1);pending.delete(img);visibleObserver.unobserve(img);if(!recent.has(img))img.removeAttribute('src');}
   }
  };
  verticalObserver=new IntersectionObserver(()=>syncVertical?.(), {root:$('imageViewport'),rootMargin:'350px'});
  for(let p=1;p<=row.pages;p++){const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption'),errorBox=document.createElement('div'),retry=document.createElement('button');img.alt=row.pageLabels[p-1]+' '+p+'장';img.dataset.page=p;const size=row.pageSizes?.[p-1];if(Number.isFinite(size?.width)&&size.width>0&&Number.isFinite(size?.height)&&size.height>0)img.style.aspectRatio=size.width+' / '+size.height;caption.textContent=row.pageLabels[p-1]+' · '+p+' / '+row.pages;errorBox.className='vertical-page-error';errorBox.hidden=true;errorBox.append(document.createTextNode(p+'장을 불러오지 못했습니다. 최신 회차를 확인하거나 다시 시도하세요.'));retry.type='button';retry.dataset.retryPage=p;retry.textContent=p+'장 다시 불러오기';retry.onclick=()=>{if(loadFailure?.stale)return;load(img,{retry:true});};errorBox.append(retry);figure.append(img,caption,errorBox);$('verticalPages').append(figure);verticalObserver.observe(img);}
  syncVertical();
 }
 async function select(id,options={}){
  const request=++navigation;rememberPosition();if(loadFailure?.stale){keepDraft(pendingSaves.has(current));await saveQueue.catch(()=>{});if(request!==navigation)return;keepDraft();dirty=false;saveQueue=Promise.resolve();}do{await flush();if(request!==navigation)return;}while(dirty&&!loadFailure?.stale);
  const row=entries.find(r=>r.id===id);if(!row)return;selectionAbort.abort();selectionAbort=new AbortController();pageAbort.abort();if(feedbackFocus!==row)feedbackFocus=null;current=row;page=Math.max(1,Math.min(row.pages,options.page||positions.get(row.id+':'+row.outputVersion)||row.progress?.lastPage||1));selection++;
  if(!loadFailure?.stale)clearLoadFailure();loading=false;$('showFullTitle').disabled=false;if(compactLayout)setLibraryCollapsed(true);$('reader').hidden=!row.hasOutput;$('unavailable').hidden=row.hasOutput;
  $('unavailable').textContent=row.hasOutput?'':'제작물이 없습니다. '+(row.sourceReason||'원본을 보완하거나 제작을 마친 뒤 다시 검토할 수 있습니다.');
  $('triage').hidden=false;$('reason').value=row.progress?.reasonCode||(!row.hasOutput?'source_insufficient':'material_unsuitable');$('triageNote').value=row.progress?.note||'';$('sourceReason').textContent=row.sourceReason||(!row.hasOutput?'원본과 과거 기록을 보존합니다. 원본 보완 또는 제작 후 다시 검토하세요.':'');paintProgress();if(!loadFailure)$('error').hidden=true;
  $('title').textContent=row.coverTitle;$('original').textContent=row.title===row.coverTitle?'':'원제 · '+row.title;$('postMeta').textContent=row.hasOutput?row.pages+'장 · '+(row.categoryLabel||'현재 제작 결과'):'제작물 없음 · '+({eligible:'검토 대상',held:'보류',rejected:'탈락'}[row.disposition]);
  $('note').value=row.current?.note||'';paintScore();status(row.current?'저장된 평가를 불러왔어요':'점수나 메모를 남겨주세요');
  $('previous').hidden=!row.previous;$('previous').textContent=row.previous?'이전 제작 버전 평가 · '+(row.previous.score??'점수 없음')+' / 10\n'+row.previous.note:'';
  $('pageSelect').replaceChildren();for(let n=1;n<=row.pages;n++){const option=document.createElement('option');option.value=n;option.textContent=n+' / '+row.pages;$('pageSelect').append(option);}
  paintDraft();reviewReady(row.hasOutput&&!loadFailure);paintList();renderVertical();await renderPage();
  if(request!==navigation||current!==row)return;
  if(options.preserveView&&options.viewportScroll!==undefined){$('imageViewport').scrollTop=options.viewportScroll;window.scrollTo(0,options.scroll||0);syncVertical?.();}
  else if(options.preserveView&&mode==='vertical')$('verticalPages').querySelector('img[data-page="'+page+'"]')?.scrollIntoView({block:'start'});
  else{$('imageViewport').scrollTop=0;window.scrollTo(0,options.preserveView?options.scroll||0:0);}updateCoverFit();
 }
 function turn(delta){if(!current?.hasOutput||mode!=='single')return;const next=Math.max(1,Math.min(current.pages,page+delta));if(next===page)return;page=next;renderPage();$('stage').scrollIntoView({block:'start',behavior:'instant'});updateCoverFit();}
 for(let n=1;n<=10;n++){const b=document.createElement('button');b.type='button';b.dataset.score=n;b.setAttribute('aria-label',n+'점');b.setAttribute('aria-pressed','false');const star=document.createElement('span');star.textContent='★';star.setAttribute('aria-hidden','true');b.append(star,document.createTextNode(n));b.onclick=()=>{if(!current)return;current.current={...current.current,score:n,note:$('note').value};paintScore();schedule();flush().catch(showError);};$('scores').append(b);}
 $('note').oninput=schedule;$('save').onclick=()=>flush().catch(showError);$('prev').onclick=()=>turn(-1);$('next').onclick=()=>turn(1);$('pageSelect').onchange=()=>{page=Number($('pageSelect').value);renderPage();};
 $('topic').onchange=filterChanged;$('workflow').onchange=filterChanged;$('excludeSeen').onchange=filterChanged;$('randomPost').onclick=async()=>{try{await flush();await visitQueue;const rows=visibleEntries(false).filter(r=>r.hasOutput&&r.disposition==='eligible'&&!seen(r)&&r.current?.score==null&&!r.current?.note?.trim());if(!rows.length)throw Error('현재 목록 조건에 안 본 적격 제작물이 없습니다.');for(let i=rows.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rows[i],rows[j]]=[rows[j],rows[i]];}randomOrder=new Map(rows.map((r,i)=>[r.id,i]));shuffleFilterKey=filterKey();$('posts').scrollTop=0;paintList();await select(rows[0].id);}catch(e){showError(e);}};$('holdPost').onclick=()=>decide('held').catch(showError);$('rejectPost').onclick=()=>decide('rejected').catch(showError);$('restorePost').onclick=()=>decide('eligible').catch(showError);$('fromCover').onclick=()=>{page=1;setMode('single');renderPage();$('imageViewport').scrollTop=0;updateCoverFit();};
 $('search').oninput=filterChanged;$('filter').onchange=filterChanged;$('zoom').onchange=()=>{$('reader').classList.toggle('zoom',$('zoom').checked);updateCoverFit();scheduleView();};
 function setMode(value){selectionAbort.abort();selectionAbort=new AbortController();pageAbort.abort();pageRequest++;loading=false;$('loadState').hidden=true;mode=value;$('stage').hidden=value!=='single';$('pages').hidden=value!=='single';$('verticalPages').hidden=value!=='vertical';$('single').setAttribute('aria-pressed',String(value==='single'));$('vertical').setAttribute('aria-pressed',String(value==='vertical'));renderVertical();paintNavigation();updateCoverFit();}
 $('single').onclick=()=>{setMode('single');renderPage();};$('vertical').onclick=()=>setMode('vertical');
 document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable)return;if(mode==='single'&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();turn(e.key==='ArrowRight'?1:-1);}else if((e.key==='ArrowDown'||e.key==='ArrowUp')&&!e.repeat){e.preventDefault();movePost(e.key==='ArrowDown'?1:-1).catch(showError);}});
 let gesture=null;$('stage').addEventListener('pointerdown',e=>{if(e.target.tagName!=='IMG'||e.button!==0)return;gesture={x:e.clientX,y:e.clientY,id:e.pointerId,time:performance.now()};if(e.isTrusted)$('stage').setPointerCapture(e.pointerId);});$('stage').addEventListener('pointerup',e=>{const g=gesture;gesture=null;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4&&performance.now()-g.time<1500)turn(dx<0?1:-1);});for(const event of ['pointercancel','lostpointercapture'])$('stage').addEventListener(event,()=>{gesture=null;});$('pageImage').ondragstart=e=>e.preventDefault();
 $('openFolder').onclick=()=>api.openFolder().catch(showError);
 $('prevPost').onclick=()=>movePost(-1).catch(showError);$('nextPost').onclick=()=>movePost(1).catch(showError);$('dockPrev').onclick=()=>turn(-1);$('dockNext').onclick=()=>turn(1);$('jumpFeedback').onclick=()=>{document.querySelector('.feedback').scrollIntoView({block:'start',behavior:'smooth'});feedbackFocus=current;if(!$('note').disabled){feedbackFocus=null;$('note').focus({preventScroll:true});}};
 async function reload(){
  const ticket=++reloading,token=selection,nav=navigation,prior=current,priorPage=page,scroll=window.scrollY,viewportScroll=$('imageViewport').scrollTop,oldRound=reviewRound;
  $('reloadLatest').disabled=true;$('reload').disabled=true;refreshing=true;reviewReady(false);
  try{
   if(loadFailure?.stale){keepDraft(pendingSaves.has(current));await saveQueue.catch(()=>{});if(ticket!==reloading||token!==selection||nav!==navigation)return;keepDraft();dirty=false;saveQueue=Promise.resolve();}
   else await flush();
   await visitQueue.catch(()=>{});
   const result=await api.list();
   if(ticket!==reloading||token!==selection||nav!==navigation)return;
   entries=result.entries;reviewRound=result.reviewRound;loader.reset();selectionAbort.abort();pageAbort.abort();pageRequest++;selection++;scheduledView=null;
   clearLoadFailure();$('loadState').hidden=true;loading=false;refreshing=false;paintTopics();
   $('roundLabel').textContent=reviewRound?'최신 전체 수정본 · '+reviewRound:'현재 제작본';
   const row=entries.find(r=>r.id===prior?.id),changed=oldRound!==reviewRound||prior&&row&&prior.outputVersion!==row.outputVersion;
   $('roundNotice').hidden=!changed;
   $('roundNotice').textContent=changed?'최신 제작물을 확인했습니다. 이전 제작물의 평가는 새 제작물로 옮기지 않았습니다.':'';
   paintList();
   if(row)await select(row.id,{page:priorPage,preserveView:true,scroll,viewportScroll:changed?undefined:viewportScroll});
   else if(prior){
    current=null;page=1;paintNavigation();$('reader').hidden=true;$('triage').hidden=true;$('unavailable').hidden=false;
    $('unavailable').textContent='이 글은 최신 목록에 없습니다. 목록에서 다른 글을 선택해 주세요.';reviewReady(false);paintDraft(prior.id,null);
   }else if(visibleEntries()[0])await select(visibleEntries()[0].id);
   else{$('reader').hidden=true;$('unavailable').hidden=false;$('unavailable').textContent='현재 조건에 해당하는 제작물이 없습니다. 목록 조건을 확인해 주세요.';}
  }catch(error){if(ticket===reloading&&token===selection&&nav===navigation){if(current)showLoadFailure(error,current,selection,page);else showError(error);}}
  finally{if(ticket===reloading){refreshing=false;$('reloadLatest').disabled=false;$('reload').disabled=false;reviewReady(!!current?.hasOutput&&!loading&&!loadFailure);}}
 }
 $('reloadLatest').onclick=()=>reload();
 $('retryPage').onclick=()=>{if(loadFailure?.stale)return;if(mode==='vertical'){for(const p of [...verticalFailures.keys()])$('verticalPages').querySelector('button[data-retry-page="'+p+'"]')?.click();}else renderPage({retry:true});};
 $('reload').onclick=()=>reload().catch(showError);$('openHistory').onclick=()=>api.openHistory().catch(showError);
 window.ThreadsPostReviewUI=Object.freeze({flush:async()=>{await flush();await visitQueue;},select,reload});
 if(!api){showError(Error('설치된 Threads 게시글 평가 프로그램에서 여세요.'));return;}
 api.onFilter?.(value=>{pendingFilter=value;(async()=>{await flush();$('workflow').value=value;$('filter').value='all';$('topic').value='';$('search').value='';$('excludeSeen').checked=value==='eligible';paintList();const first=visibleEntries()[0];if(first)await select(first.id);else{current=null;selection++;$('reader').hidden=true;$('triage').hidden=true;}})().catch(showError);});
 api.onSelect(id=>{requestedId=id;if(entries.length)select(id).catch(showError);});
 api.list().then(result=>{$('workflow').value=pendingFilter||result.initialFilter||'eligible';entries=result.entries;paintTopics();reviewRound=result.reviewRound;$('roundLabel').textContent=reviewRound?'최신 전체 수정본 · '+reviewRound:'현재 제작본';paintList();if(entries.length)return select(requestedId||visibleEntries()[0]?.id);$('title').textContent='아직 제작된 글이 없습니다.';}).catch(showError);
})();
