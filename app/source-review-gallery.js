(function(){
 'use strict';
 window.ThreadsReviewGallery=Object.freeze({create({getRows,getImage,evaluate,flush}){
  const section=document.getElementById('productionViewer'),container=document.getElementById('productionGroups'),opened=new Map();
  let scroll=0,selected=null,observer=null,control=new AbortController(),revision=0;
  function state(view){document.body.classList.toggle('viewer-mode',view);section.hidden=!view;document.getElementById('reviewSurface').hidden=view;document.getElementById('screenLabel').textContent=view?'제작 뷰어':'게시글 평가';}
  function render(){
   const ticket=++revision;control.abort();control=new AbortController();observer?.disconnect();container.replaceChildren();
   const query=document.getElementById('viewerSearch').value.toLocaleLowerCase(),groups=window.ThreadsReviewBatches.groups(getRows()).map(group=>({...group,rows:group.rows.filter(row=>row.title.toLocaleLowerCase().includes(query))})).filter(group=>group.rows.length);document.getElementById('viewerCount').textContent=groups.reduce((n,g)=>n+g.rows.length,0)+'개 표지 · '+groups.length+'개 제작 묶음';
   observer=new IntersectionObserver(changes=>{for(const entry of changes){const image=entry.target,row=image.reviewRow;if(!entry.isIntersecting){image.pending?.abort();image.removeAttribute('src');continue;}if(image.getAttribute('src'))continue;image.pending?.abort();const pending=new AbortController();image.pending=pending;getImage(row,1,{thumbnail:true,priority:2,signal:AbortSignal.any([control.signal,pending.signal])}).then(src=>{if(ticket===revision&&image.isConnected&&!pending.signal.aborted)image.src=src;}).catch(e=>{if(e.name!=='AbortError'&&ticket===revision)image.alt='표지 로딩 실패 · 평가하기에서 다시 확인';});}}, {rootMargin:'250px'});
   for(const [index,group]of groups.entries()){
    if(!opened.has(group.id))opened.set(group.id,index===0);const details=document.createElement('details'),summary=document.createElement('summary'),grid=document.createElement('div');details.className='production-group';details.dataset.batchId=group.id;details.open=opened.get(group.id);summary.textContent=group.label+' · '+new Date(group.startedAt).toLocaleDateString('ko-KR')+' · '+group.rows.length+'개';grid.className='production-grid';
    details.addEventListener('toggle',()=>{opened.set(group.id,details.open);if(details.open)for(const image of grid.querySelectorAll('img'))observer.observe(image);else for(const image of grid.querySelectorAll('img')){observer.unobserve(image);image.pending?.abort();image.removeAttribute('src');}});
    for(const row of group.rows){const card=document.createElement('article'),image=document.createElement('img'),title=document.createElement('h3'),meta=document.createElement('p'),button=document.createElement('button');card.className='production-card';card.dataset.id=row.id;card.dataset.outputVersion=row.outputVersion;card.dataset.batchId=group.id;card.classList.toggle('selected',selected===row.id+':'+row.outputVersion);image.alt=row.coverTitle+' 표지';image.reviewRow=row;image.width=240;image.height=240;title.textContent=row.coverTitle;meta.textContent=(row.seenAt?'읽음':'안 읽음')+' · '+(row.current?.score!=null?row.current.score+'점':'미평가');button.type='button';button.className='evaluate-card';button.textContent='평가하기';button.onclick=async()=>{button.disabled=true;try{await flush();scroll=window.scrollY;selected=row.id+':'+row.outputVersion;state(false);document.getElementById('evaluationBatch').textContent=summary.textContent;await evaluate(row);window.scrollTo(0,0);}catch(e){document.getElementById('error').hidden=false;document.getElementById('error').textContent=e.message||String(e);}finally{button.disabled=false;}};card.append(image,title,meta,button);grid.append(card);}
    details.append(summary,grid);container.append(details);if(details.open)for(const image of grid.querySelectorAll('img'))observer.observe(image);
   }
   document.getElementById('viewerEmpty').hidden=groups.length>0;
  }
  async function show({initial=false}={}){if(!initial)await flush();state(true);render();await new Promise(resolve=>requestAnimationFrame(()=>{window.scrollTo(0,scroll);resolve();}));}
  document.getElementById('returnToViewer').onclick=()=>show().catch(e=>{const error=document.getElementById('error');error.hidden=false;error.textContent='평가 저장에 실패해 화면을 유지합니다. '+(e.message||String(e));});
  return {show,render,isVisible:()=>document.body.classList.contains('viewer-mode'),openEvaluation:()=>state(false),snapshot:()=>({scroll,selected,opened:Object.fromEntries(opened)})};
 }});
})();
