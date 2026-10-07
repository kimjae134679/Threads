'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {writeAtomic}=require('./atomic-file.cjs');
const {migrateFeedback}=require('./feedback-migration.cjs');
function contained(root,file){const rel=path.relative(root,file);if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('허용되지 않은 자료 경로입니다.');return file;}
function version(row){return crypto.createHash('sha256').update(JSON.stringify([row.sourceFingerprint,row.outputSha256,row.ruleVersion,row.images?.map(i=>i.sha256),...(row.reviewRound?[row.reviewRound]:[])])).digest('hex');}
function createPostReviewStore(materialRoot,{legacyFeedbackFile=null}={}){
 const root=path.resolve(materialRoot),output=path.join(root,'06_자동 제작 결과'),folder=path.join(root,'07_사용자 평가'),file=path.join(folder,'평가 기록.json');
 const historyFolder=path.join(root,'05_이전 작업','리뷰 과거');
 let queue=Promise.resolve(),migration=null;
 async function round(){try{return JSON.parse(await fs.readFile(path.join(root,'review-current.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async function deliveryReady(){try{const j=JSON.parse(await fs.readFile(path.join(root,'review-delivery-in-progress.json'),'utf8'));if(!j.complete)throw Error('새 수정본을 적용 중입니다. 완료 후 새로 보기를 눌러주세요.');}catch(e){if(e.code!=='ENOENT')throw e;}}
 async function report(){try{const data=JSON.parse(await fs.readFile(path.join(output,'status.json'),'utf8'));if(!Array.isArray(data.entries))throw Error('제작 목록 형식을 확인하세요.');await deliveryReady();const active=await round();if(active&&(data.reviewRound!==active.reviewRound||data.entries.some(e=>e.outputFolder&&e.reviewRound!==active.reviewRound)))throw Error('현재 수정본 회차가 일치하지 않습니다.');return data.entries.filter(r=>r.outputFolder&&Array.isArray(r.images)&&r.images.length);}catch(e){if(e.code==='ENOENT')return [];throw e;}}
 async function feedback(){
  await deliveryReady();const active=await round();const initial=active?{schemaVersion:1,recordType:'user_post_quality_feedback',reviewRound:active.reviewRound,evaluations:[]}:(await (migration??=migrateFeedback(file,legacyFeedbackFile)));
  try{const data=JSON.parse(await fs.readFile(file,'utf8'));if(active&&data.reviewRound!==active.reviewRound)throw Error('평가 기록의 검토 회차가 다릅니다. 기존 기록을 보존합니다.');if(data.schemaVersion!==1||!Array.isArray(data.evaluations))throw Error('평가 기록 형식을 확인하세요. 기존 기록을 보존합니다.');return data;}
  catch(e){if(e.code==='ENOENT')return initial;throw e;}
 }
 async function find(id){if(typeof id!=='string'||id.length>200)throw Error('글을 확인하세요.');const row=(await report()).find(r=>r.id===id);if(!row)throw Error('현재 제작 결과에 없는 글입니다.');return row;}
 async function safeFile(row,name){
  const base=contained(output,path.resolve(output,row.outputFolder)),candidate=contained(base,path.resolve(base,name));
  const [realOutput,realBase,realFile]=await Promise.all([fs.realpath(output),fs.realpath(base),fs.realpath(candidate)]);
  contained(realOutput,realBase);contained(realBase,realFile);return realFile;
 }
 async function list(){
  await queue;const [rows,data]=await Promise.all([report(),feedback()]);
  let queueRows=[];try{queueRows=JSON.parse(await fs.readFile(path.join(root,'08_제작 정리','제작 순서.json'),'utf8')).entries||[];}catch(e){if(e.code!=='ENOENT')throw e;}
  const entries=await Promise.all(rows.map(async row=>{
   const order=queueRows.find(q=>q.id===row.id)||{};
   const outputVersion=version(row);let plan={};
   try{plan=JSON.parse(await fs.readFile(await safeFile(row,'production-plan.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
   const current=data.evaluations.find(e=>e.id===row.id&&e.outputVersion===outputVersion)||null;
   const previous=row.reviewRound?null:data.evaluations.filter(e=>e.id===row.id&&e.outputVersion!==outputVersion).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]||null;
   return {category:order.category||'all',categoryLabel:order.categoryLabel||'',rank:order.rank||9999,productionNote:order.reason||'',id:row.id,title:row.title,coverTitle:plan.coverTitle||row.title,outputVersion,pages:row.images.length,ruleVersion:row.ruleVersion,current,previous,
    pageLabels:row.images.map((_,i)=>plan.pages?.[i]?.role==='cover'?'표지':plan.pages?.[i]?.role==='comments'?'원문 댓글':'본문')};
  }));
  const active=await round();return {entries,feedbackFile:file,reviewRound:active?.reviewRound||null,historyFolder};
 }
 async function image(id,page,outputVersion){
  const row=await find(id);if(version(row)!==outputVersion)throw Error('제작 결과가 바뀌었습니다. 목록을 다시 여세요.');
  if(!Number.isInteger(page)||page<1||page>row.images.length)throw Error('페이지 번호를 확인하세요.');
  const item=row.images[page-1];if(!/^rendered\/slide-\d{3,}\.png$/.test(item.name.replaceAll('\\','/')))throw Error('허용되지 않은 이미지입니다.');
  const real=await safeFile(row,item.name),stat=await fs.stat(real);if(!stat.isFile()||stat.size>25*1024*1024)throw Error('이미지 파일을 확인하세요.');
  const bytes=await fs.readFile(real);
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('제작 이미지가 변경됐습니다. 다시 제작한 결과를 사용하세요.');
  return 'data:image/png;base64,'+bytes.toString('base64');
 }
 function save(payload){
  const operation=queue.then(async()=>{
   if(!payload||typeof payload!=='object'||!(payload.score===null||Number.isInteger(payload.score)&&payload.score>=1&&payload.score<=10)||typeof payload.note!=='string'||payload.note.length>10000)throw Error('1~10점과 10,000자 이내 메모를 입력하세요.');
   const row=await find(payload.id),outputVersion=version(row);if(payload.outputVersion!==outputVersion)throw Error('평가 중 제작 결과가 바뀌었습니다. 다시 열고 평가하세요.');
   const data=await feedback(),updatedAt=new Date().toISOString();const active=await round();if(active&&row.reviewRound!==active.reviewRound)throw Error('새 수정본으로 전환됐습니다. 새로 보기를 눌러주세요.');
   const evaluation={id:row.id,outputVersion,sourceFingerprint:row.sourceFingerprint,outputSha256:row.outputSha256,ruleVersion:row.ruleVersion,title:row.title,score:payload.score,note:payload.note,updatedAt,...(row.reviewRound?{reviewRound:row.reviewRound}:{})};
   const i=data.evaluations.findIndex(e=>e.id===row.id&&e.outputVersion===outputVersion);
   if(i<0)data.evaluations.push(evaluation);else data.evaluations[i]=evaluation;
   data.updatedAt=updatedAt;await fs.mkdir(folder,{recursive:true});await writeAtomic(file,JSON.stringify(data,null,2)+'\n');return evaluation;
  });
  queue=operation.catch(()=>{});return operation;
 }
 return {root,folder,file,historyFolder,list,image,save};
}
module.exports={createPostReviewStore,version};
