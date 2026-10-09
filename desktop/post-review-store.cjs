'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {classifyTopic,hasOutput,initialDisposition}=require('./review-workflow-model.cjs');
const {writeAtomic}=require('./atomic-file.cjs');
const {migrateFeedback}=require('./feedback-migration.cjs');
const {withCanonicalWriter,bindCanonicalWriter,createCanonicalReader}=require('./review-canonical-writer.cjs');
function contained(root,file){const rel=path.relative(root,file);if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('허용되지 않은 자료 경로입니다.');return file;}
function version(row){return crypto.createHash('sha256').update(JSON.stringify([row.sourceFingerprint,row.outputSha256,row.ruleVersion,row.images?.map(i=>i.sha256),...(row.reviewRound?[row.reviewRound]:[])])).digest('hex');}
function createPostReviewStore(materialRoot,{legacyFeedbackFile=null,readOnly=false,requireUserImages=true}={}){
 const root=path.resolve(materialRoot),output=path.join(root,'06_자동 제작 결과'),folder=path.join(root,'07_사용자 평가'),file=path.join(folder,'평가 기록.json');
 const workflowFile=path.join(folder,'검토 진행.json');
 const historyFolder=path.join(root,'05_이전 작업','리뷰 과거');
 let migration=null;
 const readFile=createCanonicalReader(root);
 async function round(){try{return JSON.parse(await readFile(path.join(root,'review-current.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async function deliveryReady(){try{const j=JSON.parse(await readFile(path.join(root,'review-delivery-in-progress.json'),'utf8'));if(!j.complete)throw Error('새 수정본을 적용 중입니다. 완료 후 새로 보기를 눌러주세요.');}catch(e){if(e.code!=='ENOENT')throw e;}}
 async function report(){try{const data=JSON.parse(await readFile(path.join(output,'status.json'),'utf8'));if(!Array.isArray(data.entries))throw Error('제작 목록 형식을 확인하세요.');await deliveryReady();const active=await round();if(active&&(data.reviewRound!==active.reviewRound||data.entries.some(e=>e.outputFolder&&e.reviewRound!==active.reviewRound)))throw Error('현재 수정본 회차가 일치하지 않습니다.');return requireUserImages?data.entries.map(row=>row.outputFolder&&!row.coverRefresh?.consumedGeneratedRecordSha256?{...row,outputFolder:null,images:[],disposition:'held',status:'waiting_for_image'}:row):data.entries;}catch(e){if(e.code==='ENOENT')return [];throw e;}}
 async function feedback(){
  await deliveryReady();const active=await round();const initial=active||readOnly?{schemaVersion:1,recordType:'user_post_quality_feedback',reviewRound:active?.reviewRound||null,evaluations:[]}:(await (migration??=migrateFeedback(file,legacyFeedbackFile,root,{serializeReentry:false})));
  try{const data=JSON.parse(await readFile(file,'utf8'));if(active&&data.reviewRound!==active.reviewRound)throw Error('평가 기록의 검토 회차가 다릅니다. 기존 기록을 보존합니다.');if(data.schemaVersion!==1||!Array.isArray(data.evaluations))throw Error('평가 기록 형식을 확인하세요. 기존 기록을 보존합니다.');return data;}
  catch(e){if(e.code==='ENOENT')return initial;throw e;}
 }
 async function find(id){if(typeof id!=='string'||id.length>200)throw Error('글을 확인하세요.');const row=(await report()).find(r=>r.id===id);if(!row)throw Error('현재 제작 결과에 없는 글입니다.');return row;}
 async function safeFile(row,name){
  if(!hasOutput(row))throw Error('현재 제작물이 없는 소재입니다. 원본을 보완하고 제작하세요.');
  const base=contained(output,path.resolve(output,row.outputFolder)),candidate=contained(base,path.resolve(base,name));
  const [realOutput,realBase,realFile]=await Promise.all([fs.realpath(output),fs.realpath(base),fs.realpath(candidate)]);
  contained(realOutput,realBase);contained(realBase,realFile);return realFile;
 }
 function eligibleImage(row,plan){return Boolean(row.coverRefresh?.consumedGeneratedRecordSha256&&plan.universalCover?.aiAsset?.sourceId===row.id&&plan.universalCover.aiAsset.generationRecordSha256===row.coverRefresh.consumedGeneratedRecordSha256);}
 async function requireImage(row){if(!requireUserImages)return;const plan=JSON.parse(await readFile(await safeFile(row,'production-plan.json'),'utf8'));if(!eligibleImage(row,plan))throw Error('대응 이미지가 있는 제작 결과만 평가할 수 있습니다.');}
 function list(){return withCanonicalWriter(root,listOwned,{serializeReentry:true});}
 async function listOwned(){
  const [rows,data,flow]=await Promise.all([report(),feedback(),workflow()]);
  const seen=new Map();
  const addSeen=entries=>{for(const e of entries)if(typeof e.id==='string'&&typeof e.seenAt==='string'&&(!seen.has(e.id)||e.seenAt<seen.get(e.id)))seen.set(e.id,e.seenAt);};
  addSeen(flow.entries);
  try{for(const archive of await fs.readdir(historyFolder,{withFileTypes:true})){
   if(!archive.isDirectory()||archive.isSymbolicLink())continue;
   try{const old=JSON.parse(await readFile(path.join(historyFolder,archive.name,'07_사용자 평가','검토 진행.json'),'utf8'));if(old.schemaVersion===1&&old.recordType==='user_review_workflow'&&Array.isArray(old.entries))addSeen(old.entries);}
   catch(e){if(e.code!=='ENOENT')throw e;}
  }}catch(e){if(e.code!=='ENOENT')throw e;}
  let queueRows=[];try{queueRows=JSON.parse(await readFile(path.join(root,'08_제작 정리','제작 순서.json'),'utf8')).entries||[];}catch(e){if(e.code!=='ENOENT')throw e;}
  const entries=await Promise.all(rows.map(async row=>{
   const order=queueRows.find(q=>q.id===row.id)||{};
   const outputVersion=version(row);let plan={};
   try{if(hasOutput(row))plan=JSON.parse(await readFile(await safeFile(row,'production-plan.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
   const current=data.evaluations.find(e=>e.id===row.id&&e.outputVersion===outputVersion)||null;
   const previous=row.reviewRound?null:data.evaluations.filter(e=>e.id===row.id&&e.outputVersion!==outputVersion).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]||null;
   const progress=flow.entries.find(e=>e.id===row.id&&e.outputVersion===outputVersion)||null;
   return {...classifyTopic(row,plan),hasOutput:hasOutput(row),progress,seenAt:progress?.seenAt||null,previousSeenAt:seen.get(row.id)||null,disposition:progress?.disposition||initialDisposition(row),sourceStatus:row.status||'',sourceReason:row.reason||'',category:order.category||'all',categoryLabel:order.categoryLabel||'',rank:order.rank||9999,productionNote:order.reason||'',id:row.id,title:row.title,coverTitle:plan.coverTitle||row.title,productionBatch:row.productionBatch||null,imageEligible:eligibleImage(row,plan),outputVersion,pages:row.images?.length||0,ruleVersion:row.ruleVersion,current,previous,
    pageSizes:(row.images||[]).map(i=>({width:i.width,height:i.height})),pageLabels:(row.images||[]).map((_,i)=>plan.pages?.[i]?.role==='cover'?'표지':plan.pages?.[i]?.role==='comments'?'댓글':'본문')};
  }));
  const active=await round();return {entries,workflowFile,feedbackFile:file,reviewRound:active?.reviewRound||null,historyFolder};
 }
 function image(id,page,outputVersion){return withCanonicalWriter(root,()=>imageOwned(id,page,outputVersion),{serializeReentry:true});}
 async function imageOwned(id,page,outputVersion){
  const row=await find(id);await requireImage(row);if(!hasOutput(row))throw Error('현재 제작물이 없는 소재입니다.');if(version(row)!==outputVersion)throw Error('제작 결과가 바뀌었습니다. 목록을 다시 여세요.');
  if(!Number.isInteger(page)||page<1||page>row.images.length)throw Error('페이지 번호를 확인하세요.');
  const item=row.images[page-1];if(!/^rendered\/slide-\d{3,}\.png$/.test(item.name.replaceAll('\\','/')))throw Error('허용되지 않은 이미지입니다.');
  const real=await safeFile(row,item.name),stat=await fs.stat(real);if(!stat.isFile()||stat.size>25*1024*1024)throw Error('이미지 파일을 확인하세요.');
  const bytes=await readFile(real);
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('제작 이미지가 변경됐습니다. 다시 제작한 결과를 사용하세요.');
  return 'data:image/png;base64,'+bytes.toString('base64');
 }
 function save(payload){
  if(readOnly)return Promise.reject(Error('읽기 전용 검증입니다.'));
  const operation=withCanonicalWriter(root,async()=>{
   if(!payload||typeof payload!=='object'||!(payload.score===null||Number.isInteger(payload.score)&&payload.score>=1&&payload.score<=10)||typeof payload.note!=='string'||payload.note.length>10000)throw Error('1~10점과 10,000자 이내 메모를 입력하세요.');
   const row=await find(payload.id),outputVersion=version(row);await requireImage(row);if(!hasOutput(row))throw Error('현재 제작물이 없는 소재는 평가할 수 없습니다.');if(payload.outputVersion!==outputVersion||payload.batchId!==undefined&&payload.batchId!==row.productionBatch?.id)throw Error('평가 중 제작 결과가 바뀌었습니다. 다시 열고 평가하세요.');
   const data=await feedback(),updatedAt=new Date().toISOString();const active=await round();if(active&&row.reviewRound!==active.reviewRound)throw Error('새 수정본으로 전환됐습니다. 새로 보기를 눌러주세요.');
   const evaluation={id:row.id,outputVersion,...(row.productionBatch?.id?{batchId:row.productionBatch.id}:{}),sourceFingerprint:row.sourceFingerprint,outputSha256:row.outputSha256,ruleVersion:row.ruleVersion,title:row.title,score:payload.score,note:payload.note,updatedAt,...(row.reviewRound?{reviewRound:row.reviewRound}:{})};
   const i=data.evaluations.findIndex(e=>e.id===row.id&&e.outputVersion===outputVersion);
   if(i<0)data.evaluations.push(evaluation);else data.evaluations[i]=evaluation;
   data.updatedAt=updatedAt;await fs.mkdir(folder,{recursive:true});await writeAtomic(file,JSON.stringify(data,null,2)+'\n');return evaluation;
  },{serializeReentry:true});
  return operation;
 }

 async function workflow(){
  try{const data=JSON.parse(await readFile(workflowFile,'utf8'));if(data.schemaVersion!==1||data.recordType!=='user_review_workflow'||!Array.isArray(data.entries))throw Error('검토 진행 기록 형식을 확인하세요. 기존 기록을 보존합니다.');return data;}
  catch(e){if(e.code==='ENOENT')return {schemaVersion:1,recordType:'user_review_workflow',entries:[]};throw e;}
 }
 function change(payload,kind){
  if(readOnly)return Promise.reject(Error('읽기 전용 검증입니다.'));
  const operation=withCanonicalWriter(root,async()=>{
   if(!payload||typeof payload!=='object')throw Error('검토 요청을 확인하세요.');
   const row=await find(payload.id),outputVersion=version(row);await requireImage(row);
   if(payload.outputVersion!==outputVersion)throw Error('검토 중 제작 결과가 바뀌었습니다. 다시 열어주세요.');
   const data=await workflow(),now=new Date().toISOString(),index=data.entries.findIndex(e=>e.id===row.id&&e.outputVersion===outputVersion);
   const entry={id:row.id,outputVersion,reviewRound:row.reviewRound||null,disposition:initialDisposition(row),reasonCode:null,note:'',...(index>=0?data.entries[index]:{}),updatedAt:now};
   if(kind==='visit'){
    if(!hasOutput(row)||!Number.isInteger(payload.page)||payload.page<1||payload.page>row.images.length)throw Error('실제 제작물 페이지를 확인하세요.');
    entry.seenAt??=now;entry.lastViewedAt=now;entry.lastPage=payload.page;entry.pagesSeen=[...new Set([...(entry.pagesSeen||[]),payload.page])].sort((a,b)=>a-b);entry.complete=entry.pagesSeen.length===row.images.length;
   }else{
    if(!['eligible','held','rejected'].includes(payload.disposition)||typeof payload.note!=='string'||payload.note.length>10000)throw Error('보류·탈락 사유를 확인하세요.');
    if(payload.disposition!=='eligible'&&!['material_unsuitable','source_insufficient','production_error'].includes(payload.reasonCode)||payload.disposition==='eligible'&&payload.reasonCode!==null)throw Error('소재 부적합·원본 부족·제작 오류 중 사유를 선택하세요.');
    const previous=index>=0?data.entries[index]:null;entry.decisions=[...(entry.decisions||(previous?[{disposition:previous.disposition,reasonCode:previous.reasonCode,note:previous.note,updatedAt:previous.updatedAt}]:[])),{disposition:payload.disposition,reasonCode:payload.reasonCode,note:payload.note,updatedAt:now}];
    entry.disposition=payload.disposition;entry.reasonCode=payload.reasonCode;entry.note=payload.note;
   }
   if(index<0)data.entries.push(entry);else data.entries[index]=entry;data.updatedAt=now;await fs.mkdir(folder,{recursive:true});await writeAtomic(workflowFile,JSON.stringify(data,null,2)+'\n');return entry;
  },{serializeReentry:true});return operation;
 }
 async function random({topic='',search=''}={}){
  if(typeof topic!=='string'||typeof search!=='string')throw Error('검색 조건을 확인하세요.');
  const rows=(await list()).entries.filter(r=>r.hasOutput&&r.disposition==='eligible'&&!r.seenAt&&r.current?.score==null&&!r.current?.note?.trim()&&(!topic||r.topic===topic)&&(r.title+' '+r.coverTitle).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return rows.length?rows[crypto.randomInt(rows.length)]:null;
 }

 return {root,folder,file,workflowFile,historyFolder,list,image,save,visit:p=>change(p,'visit'),decide:p=>change(p,'decide'),random,withCanonicalWriter:bindCanonicalWriter(root)};
}
module.exports={createPostReviewStore,version};
