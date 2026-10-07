import {initial,key,applyManifest,queueEdit,currentReview,acceptResult,resolveConflict} from './core.js';
import {openStore,readStore,writeStore} from './storage.js';
import {serviceConfig,requestJson,downloadAsset} from './transport.js';
import {syncReviews} from './sync-engine.js';
// classifyTopic is generated from verified desktop/review-workflow-model.cjs.
let db,state,selected=null,score=null,decision='unreviewed',syncing=false,serial=Promise.resolve(),objectUrls=[];
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
function message(text){$('message').textContent=text;$('message').style.display='block';}
async function commit(change){const task=serial.then(async()=>{const next=change(state);await writeStore(db,'state','current',next);state=next;renderList();renderQueue();});serial=task.catch(()=>{});return task;}
function renderList(){
 const entries=state.manifest?.entries||[],topics=new Map(entries.map(e=>[e.topic||classifyTopic(e,{}).topic,e.topicLabel||classifyTopic(e,{}).topicLabel]));
 const selectedTopic=$('topic').value;$('topic').replaceChildren(new Option('전체 카테고리',''));for(const [id,label] of topics)$('topic').add(new Option(label,id));$('topic').value=selectedTopic;
 $('list').replaceChildren();$('empty').hidden=entries.length>0;
 for(const e of entries.filter(e=>(!selectedTopic||(e.topic||classifyTopic(e,{}).topic)===selectedTopic)&&e.title.toLocaleLowerCase().includes($('search').value.toLocaleLowerCase()))){const r=currentReview(state,e),b=node('button',undefined,'post');b.append(node('span',e.topicLabel||classifyTopic(e,{}).topicLabel,'tag'),node('strong',e.title),node('small',r?`${r.score??'미평가'}점 · ${labels[r.decision]}`:'새 제작본 · 미평가'));b.onclick=()=>showPost(e).catch(error);$('list').append(b);}
 $('pending').textContent=String(state.outbox.filter(o=>['pending','conflict'].includes(o.status)).length);
}
const labels={unreviewed:'미검토',needs_revision:'수정 필요',held:'보류',publish_approved:'게시 승인',pending:'로컬 저장 · 서버 전송 대기',conflict:'충돌 · 선택 필요',stale:'옛 제작본 · 전송 차단',confirmed:'서버 반영 확인',resolved:'사용자 선택으로 처리'};
async function showPost(entry){
 entry={...entry,revision:state.revisions[key(entry)]??entry.revision,criteriaVersion:state.manifest.criteria.version};
 selected=entry;const r=currentReview(state,entry)||{score:null,note:'',checks:{},decision:'unreviewed'};score=r.score;decision=r.decision;
 const target=$('reader');target.hidden=false;target.replaceChildren();for(const u of objectUrls)URL.revokeObjectURL(u);objectUrls=[];
 const back=node('button','목록으로');back.onclick=()=>{selected=null;target.hidden=true;$('list').hidden=false;};target.append(back,node('h2',entry.title),node('small',`${entry.topicLabel||classifyTopic(entry,{}).topicLabel} · ${entry.reviewRound} · 제작 ${entry.outputVersion.slice(0,10)}`));$('list').hidden=true;
 const pages=node('div',undefined,'pages');target.append(pages);
 for(const [index,img] of entry.images.entries()){const figure=node('figure');figure.style.margin='10px 0';const bytes=await readStore(db,'assets',img.sha256);if(bytes){const u=URL.createObjectURL(bytes);objectUrls.push(u);const i=node('img');i.src=u;i.alt=`${index+1} / ${entry.images.length} ${img.label||'본문'}`;figure.append(i);}else figure.append(node('div','이미지 미수신 · 연결 후 자동 받기','missing'));figure.append(node('small',`${index+1} / ${entry.images.length} · ${img.label||'본문'}`));pages.append(figure);}
 target.append(node('h3','별점 1–10'));const scores=node('div',undefined,'score-grid');for(let n=1;n<=10;n++){const b=node('button',String(n));b.classList.toggle('active',n===score);b.setAttribute('aria-label',`${n}점`);b.onclick=()=>{score=n;for(const child of scores.children)child.classList.toggle('active',child===b);};scores.append(b);}target.append(scores);
 const clear=node('button','점수 비우기');clear.onclick=()=>{score=null;for(const b of scores.children)b.classList.remove('active');};target.append(clear,node('h3','메모'));const memo=node('textarea');memo.id='memo';memo.maxLength=10000;memo.value=r.note;memo.placeholder='고칠 점, 좋았던 점을 남겨 주세요';target.append(memo,node('h3','기준점 체크'));
 const criteria=node('div');for(const c of state.manifest.criteria.items){const label=node('label',undefined,'criterion'),input=node('input');input.type='checkbox';input.dataset.criterion=c.id;input.checked=r.checks[c.id]===true;label.append(input,node('span',c.label));criteria.append(label);}target.append(criteria,node('small',`기준 버전 ${state.manifest.criteria.version}`),node('h3','검토 결정'));
 const decisionsBox=node('div',undefined,'decisions');const selectDecision=d=>{decision=d;for(const b of decisionsBox.children)b.classList.toggle('active',b.dataset.decision===d);};for(const d of ['unreviewed','needs_revision','held','publish_approved']){const b=node('button',labels[d]);b.dataset.decision=d;b.classList.toggle('active',decision===d);b.onclick=()=>{if(d==='publish_approved'){$('approve').showModal();$('approveYes').onclick=()=>{selectDecision(d);$('approve').close();};}else selectDecision(d);};decisionsBox.append(b);}target.append(decisionsBox,node('p','게시 승인은 검토 기록입니다. 실제 게시 기능은 비활성입니다.'));
 const save=node('button','이 기기에 저장','primary');save.id='saveReview';save.onclick=async()=>{save.disabled=true;try{const checks={};for(const c of criteria.querySelectorAll('input'))checks[c.dataset.criterion]=c.checked;await commit(s=>queueEdit(s,entry,{score,note:memo.value,checks,decision},crypto.randomUUID(),deviceId()));message('로컬 저장 완료 · 서버 전송 대기');}catch(e){error(e);}finally{save.disabled=false;}};target.append(save);
}
function deviceId(){let id=localStorage.getItem('threads-review-device');if(!id){id=crypto.randomUUID();localStorage.setItem('threads-review-device',id);}return id;}
function renderQueue(){
 $('operations').replaceChildren();if(!state.outbox.length)$('operations').append(node('article','저장한 작업이 아직 없습니다.'));
 for(const op of [...state.outbox].reverse()){const box=node('article',undefined,'operation');box.append(node('h3',labels[op.status]),node('small',`${op.id} · 제작 ${op.outputVersion.slice(0,10)} · ${op.createdAt}`),node('pre',JSON.stringify(op.payload,null,2)));
  if(op.status==='conflict'){box.append(node('p','서버 기록'),node('pre',JSON.stringify(op.serverReview,null,2)));for(const [choice,label] of [['use_server','서버 기록 사용'],['keep_local','내 기록 다시 보내기']]){const b=node('button',label);b.onclick=()=>commit(s=>resolveConflict(s,op.operationId,choice,crypto.randomUUID())).then(()=>{message('충돌 선택 저장');if(selected)showPost(selected).catch(error);}).catch(error);box.append(b);}}
  $('operations').append(box);
 }
}
function tab(name){for(const n of ['posts','queue','about'])$(n).hidden=n!==name;}
function error(e){message(e.message||String(e));}
async function sync(){
 if(syncing)return;if(!serviceConfig.approved){$('connection').textContent='인터넷 동기화 차단 · 승인된 리뷰 서버 없음';return;}
 syncing=true;try{
  await syncReviews({getState:()=>state,commit,request:(path,init)=>requestJson(serviceConfig,path,init)});
  for(const e of state.manifest.entries)for(const img of e.images)if(!await readStore(db,'assets',img.sha256))await writeStore(db,'assets',img.sha256,await downloadAsset(serviceConfig,img));
  $('connection').textContent='서버 확인 · '+new Date().toLocaleTimeString();if(selected&&!state.manifest.entries.some(e=>key(e)===key(selected))){$('saveReview').disabled=true;message('새 제작본이 도착했습니다. 목록에서 다시 열어 주세요.');}
 }catch(e){$('connection').textContent='동기화 실패 · 로컬 평가 보존';error(e);}finally{syncing=false;}
}
async function boot(){db=await openStore();state=await readStore(db,'state','current')||initial();if(state.schemaVersion!==1)throw Error('로컬 데이터 버전 오류 · 기존 자료 보존');renderList();renderQueue();$('search').oninput=renderList;$('topic').onchange=renderList;$('postsTab').onclick=()=>tab('posts');$('queueTab').onclick=()=>tab('queue');$('aboutTab').onclick=()=>tab('about');$('approveNo').onclick=()=>$('approve').close();$('refresh').onclick=()=>{sync();if(!serviceConfig.approved)message('인터넷 동기화 차단 · 승인된 리뷰 서버 없음');};window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});setInterval(()=>{if(!document.hidden)sync();},60000);await sync();}
boot().catch(error);
