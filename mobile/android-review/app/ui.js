import {initial,key,queueEdit,currentReview,resolveConflict} from './core.js';
import {openStore,readStore,writeStore} from './storage.js';
import {serviceConfig,requestJson,downloadAsset} from './transport.js';
import {syncReviews} from './sync-engine.js';
import {nativeGithub,openNativeConnection} from './native-api.js';
import {createAssetLoader} from './asset-loader.js';
// classifyTopic is generated from the verified desktop review model at build.
let db,state,selected=null,score=null,decision='unreviewed',syncing=false,serial=Promise.resolve();
let selection=null,loader,provider=null,providerBridge=null,providerConfig=null,listDirty=false,queueDirty=false,syncAgain=false,messageTimer;
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const labels={unreviewed:'미검토',needs_revision:'수정 필요',held:'보류',publish_approved:'게시 승인',pending:'기기에 저장 · 전송 대기',conflict:'충돌 · 확인 필요',stale:'이전 작업본',confirmed:'서버 저장 확인',resolved:'충돌 처리 완료'};
const serviceProvider=serviceConfig.approved?{request:(path,init)=>requestJson(serviceConfig,path,init),downloadAsset:image=>downloadAsset(serviceConfig,image)}:null;
function nativeConfig(){try{return globalThis.ReviewNative?.config()||'';}catch{return '';}}
function currentProvider(){
 const bridge=globalThis.ReviewNative,config=nativeConfig();
 if(bridge!==providerBridge||config!==providerConfig){providerBridge=bridge;providerConfig=config;provider=nativeGithub()||serviceProvider;}
 return provider;
}
function connectionUi(){
 let config={};try{config=JSON.parse(nativeConfig()||'{}');}catch{}
 const available=config.connectionAvailable===true&&typeof globalThis.ReviewNative?.openConnection==='function';$('connectGithub').hidden=!(available&&config.approved!==true);$('connectionAction').hidden=$('connectGithub').hidden;$('manageConnection').hidden=!available;
 const entries=state.manifest?.entries||[];$('empty').hidden=entries.length>0;$('connection').hidden=entries.length===0;$('filters').hidden=entries.length===0||!!selected;
 $('empty').querySelector('h2').textContent=config.connectionAvailable===true?'로그인하고 검토를 시작하세요':'아직 연결되지 않았어요';
 $('empty').querySelector('p').textContent=config.connectionAvailable===true?'로그인하면 글이 자동으로 나타나요. 평가와 메모는 이 기기에 먼저 저장해요.':'연결을 준비 중이에요. 글이 도착하면 여기서 검토할 수 있어요.';
 if(!currentProvider())$('connection').textContent='오프라인 · 기기에 저장된 글과 평가를 볼 수 있어요.';
}
function message(text){clearTimeout(messageTimer);$('message').textContent=text;$('message').style.display='block';messageTimer=setTimeout(()=>{$('message').style.display='none';},5000);}
function pending(){ $('pending').textContent=String(state.outbox.filter(o=>['pending','conflict'].includes(o.status)).length); }
function changed(){pending();connectionUi();if(!$('list').hidden)renderList();else listDirty=true;if(!$('queue').hidden)renderQueue();else queueDirty=true;}
async function commit(change){const task=serial.then(async()=>{const next=change(state);await writeStore(db,'state','current',next);state=next;changed();});serial=task.catch(()=>{});return task;}
function topic(entry){return {topic:entry.topic||classifyTopic(entry,{}).topic,topicLabel:entry.topicLabel||classifyTopic(entry,{}).topicLabel};}
function renderList(){
 const entries=state.manifest?.entries||[],topics=new Map(entries.map(e=>{const t=topic(e);return [t.topic,t.topicLabel];})),chosen=$('topic').value,search=$('search').value.toLocaleLowerCase();
 $('topic').replaceChildren(new Option('전체 카테고리',''));for(const [id,label] of topics)$('topic').add(new Option(label,id));$('topic').value=topics.has(chosen)?chosen:'';
 const fragment=document.createDocumentFragment();for(const entry of entries){const t=topic(entry);if(($('topic').value&&t.topic!==$('topic').value)||!entry.title.toLocaleLowerCase().includes(search))continue;
  const review=currentReview(state,entry),button=node('button',undefined,'post');button.dataset.postId=entry.id;button.append(node('span',t.topicLabel,'tag'),node('strong',entry.title),node('small',review?`${review.score??'점수 없음'} · ${labels[review.decision]}`:'검토 대기'));button.onclick=()=>showPost(entry);fragment.append(button);
 }
 $('list').replaceChildren(fragment);$('count').textContent=`${$('list').children.length}개 글`;$('empty').hidden=entries.length>0;listDirty=false;pending();
}
function retire(){if(!selection)return;selection.controller.abort();selection.observer?.disconnect();for(const url of selection.urls)URL.revokeObjectURL(url);selection=null;}
function backToList(){retire();selected=null;$('reader').hidden=true;$('list').hidden=false;$('filters').hidden=false;if(listDirty)renderList();}
function startPages(view){
 view.observer?.disconnect();view.observer=new IntersectionObserver(records=>{for(const record of records)if(record.isIntersecting)loadPage(view,view.pages.find(p=>p.figure===record.target));},{rootMargin:'100px 0px'});
 for(const page of view.pages)if(!page.loaded)view.observer.observe(page.figure);
}
async function loadPage(view,page){
 if(!page||page.loading||page.loaded||selection!==view||view.controller.signal.aborted)return;page.loading=true;page.status.textContent='이미지 받는 중…';page.retry.hidden=true;
 try{
  const blob=await loader.load(page.image,{signal:view.controller.signal});if(selection!==view||view.controller.signal.aborted||!page.figure.isConnected)return;
  const url=URL.createObjectURL(blob);view.urls.push(url);const image=node('img');image.src=url;image.alt=`${page.index+1} / ${view.pages.length} ${page.image.label||'페이지'}`;image.dataset.sha256=page.image.sha256;image.loading='lazy';page.content.replaceChildren(image);page.loaded=true;view.observer?.unobserve(page.figure);
 }catch(error){if(selection!==view||error.name==='AbortError')return;page.status.textContent='이미지를 아직 받지 못했어요. 연결 후 다시 시도해 주세요.';page.retry.hidden=false;}
 finally{page.loading=false;}
}
function showPost(original){
 const entry={...original,revision:state.revisions[key(original)]??original.revision,criteriaVersion:state.manifest.criteria.version};retire();selected=entry;
 const review=currentReview(state,entry)||{score:null,note:'',checks:{},decision:'unreviewed'};score=review.score;decision=review.decision;
 const target=$('reader');target.hidden=false;target.replaceChildren();$('list').hidden=true;$('filters').hidden=true;
 const view={entry,controller:new AbortController(),observer:null,urls:[],pages:[]};selection=view;
 const back=node('button','← 글 목록');back.onclick=backToList;target.append(back,node('h2',entry.title),node('small',`${topic(entry).topicLabel} · ${entry.images.length}페이지`));
 // Build review controls synchronously before any cache or network awaits.
 const controls=node('section',undefined,'review-controls');controls.append(node('h3','점수'));const scores=node('div',undefined,'score-grid');for(let n=1;n<=10;n++){const b=node('button',String(n));b.classList.toggle('active',n===score);b.setAttribute('aria-label',`${n}점`);b.onclick=()=>{score=n;for(const child of scores.children)child.classList.toggle('active',child===b);};scores.append(b);}controls.append(scores);
 const clear=node('button','점수 지우기');clear.onclick=()=>{score=null;for(const b of scores.children)b.classList.remove('active');};controls.append(clear,node('h3','메모'));const memo=node('textarea');memo.id='memo';memo.maxLength=10000;memo.value=review.note;memo.placeholder='좋았던 점이나 수정할 점을 적어 주세요.';controls.append(memo,node('h3','검토 기준'));
 const criteria=node('div');for(const criterion of state.manifest.criteria.items){const label=node('label',undefined,'criterion'),input=node('input');input.type='checkbox';input.dataset.criterion=criterion.id;input.checked=review.checks[criterion.id]===true;label.append(input,node('span',criterion.label));criteria.append(label);}controls.append(criteria,node('h3','게시 판단'));
 const decisions=node('div',undefined,'decisions'),selectDecision=d=>{decision=d;for(const b of decisions.children)b.classList.toggle('active',b.dataset.decision===d);};for(const d of ['unreviewed','needs_revision','held','publish_approved']){const b=node('button',labels[d]);b.dataset.decision=d;b.classList.toggle('active',d===decision);b.onclick=()=>{if(d==='publish_approved'){$('approve').showModal();$('approveYes').onclick=()=>{if(selection===view)selectDecision(d);$('approve').close();};}else selectDecision(d);};decisions.append(b);}controls.append(decisions,node('small','게시 여부를 기록해요. 자동으로 게시되지 않아요.'));
 const save=node('button','평가 저장','primary');save.id='saveReview';save.onclick=async()=>{save.disabled=true;try{const checks={};for(const c of criteria.querySelectorAll('input'))checks[c.dataset.criterion]=c.checked;const payload={score,note:memo.value,checks,decision};await commit(s=>queueEdit(s,entry,payload,crypto.randomUUID(),deviceId()));message('기기에 저장했어요. 연결되면 PC로 전송합니다.');sync();}catch(e){error(e);}finally{if(selection===view)save.disabled=false;}};controls.append(save);
 const pages=node('div',undefined,'pages');for(const [index,image] of entry.images.entries()){const figure=node('figure'),content=node('div',undefined,'page-image'),status=node('p','화면에 보이는 페이지부터 받아요.','missing'),retry=node('button','다시 받기');retry.hidden=true;content.append(status,retry);figure.append(content,node('small',`${index+1} / ${entry.images.length} · ${image.label||'페이지'}`));const page={figure,content,status,retry,image,index,loading:false,loaded:false};retry.onclick=()=>loadPage(view,page);view.pages.push(page);pages.append(figure);}
 const jump=node('button','평가하기');jump.id='reviewJump';jump.onclick=()=>controls.scrollIntoView({block:'start'});target.append(jump,pages,controls);target.scrollIntoView({block:'start'});startPages(view);
}
function deviceId(){let id=localStorage.getItem('threads-review-device');if(!id){id=crypto.randomUUID();localStorage.setItem('threads-review-device',id);}return id;}
function renderQueue(){
 const fragment=document.createDocumentFragment();if(!state.outbox.length)fragment.append(node('article','아직 저장한 평가가 없어요.'));
 for(const op of [...state.outbox].reverse()){const box=node('article',undefined,'operation'),entry=state.manifest?.entries.find(e=>e.id===op.id);box.append(node('h3',entry?.title||op.id),node('p',labels[op.status]),node('pre',JSON.stringify(op.payload,null,2)));
  if(op.status==='conflict'){box.append(node('p','서버에 저장된 평가'),node('pre',JSON.stringify(op.serverReview,null,2)));for(const [choice,label] of [['use_server','서버 평가 사용'],['keep_local','내 평가 다시 보내기']]){const b=node('button',label);b.onclick=()=>commit(s=>resolveConflict(s,op.operationId,choice,crypto.randomUUID())).then(()=>{message('충돌을 처리했어요.');if(selected)showPost(selected);}).catch(error);box.append(b);}}
  const detail=node('details'),summary=node('summary','작업 정보');detail.append(summary,node('small',`${op.id} · ${op.outputVersion.slice(0,10)} · ${op.createdAt}`));box.append(detail);fragment.append(box);
 }
 $('operations').replaceChildren(fragment);queueDirty=false;
}
function tab(name){for(const n of ['posts','queue','about'])$(n).hidden=n!==name;if(name==='queue'&&queueDirty)renderQueue();}
function error(e){message(e.message||String(e));}
async function sync(){
 if(syncing){syncAgain=true;return;}const current=currentProvider();connectionUi();if(!current)return;syncing=true;syncAgain=false;
 try{
  const request=async(path,init)=>{if(currentProvider()!==current)throw Error('연결이 변경됐어요. 다시 받아 주세요.');const result=await current.request(path,init);if(currentProvider()!==current)throw Error('연결이 변경됐어요. 다시 받아 주세요.');return result;};
  await syncReviews({getState:()=>state,commit,request});
  $('connection').textContent='글 목록 최신 · 이미지는 열어 볼 때 받아요.';
  if(selected&&(!state.manifest.entries.some(e=>key(e)===key(selected))||selected.criteriaVersion!==state.manifest.criteria.version)){selection?.controller.abort();$('saveReview').disabled=true;message('새 작업본이 도착했어요. 목록에서 다시 열어 주세요.');}
  else if(selection){for(const page of selection.pages)if(!page.loaded&&!page.loading)selection.observer?.observe(page.figure);}
 }catch(e){$('connection').textContent='연결 확인 필요 · 저장한 평가는 안전하게 대기 중이에요.';message('연결을 확인해 주세요. 저장한 평가는 그대로 남아 있어요.');}finally{syncing=false;if(syncAgain||currentProvider()!==current)queueMicrotask(sync);}
}
async function boot(){
 db=await openStore();state=await readStore(db,'state','current')||initial();if(state.schemaVersion!==1)throw Error('저장 데이터 버전을 확인해 주세요.');loader=createAssetLoader({read:h=>readStore(db,'assets',h),write:(h,b)=>writeStore(db,'assets',h,b),getProvider:currentProvider,concurrency:2});
 renderList();pending();queueDirty=true;connectionUi();const connect=()=>{if(!openNativeConnection())message('현재 연결을 준비 중이에요.');};$('connectGithub').onclick=connect;$('manageConnection').onclick=connect;$('search').oninput=renderList;$('topic').onchange=renderList;$('postsTab').onclick=()=>tab('posts');$('queueTab').onclick=()=>tab('queue');$('aboutTab').onclick=()=>tab('about');$('approveNo').onclick=()=>$('approve').close();$('refresh').onclick=()=>sync();window.addEventListener('online',sync);window.addEventListener('review-connection-changed',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});setInterval(()=>{if(!document.hidden)sync();},60000);await sync();
}
boot().catch(error);
