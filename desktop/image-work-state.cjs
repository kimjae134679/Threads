'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
const hash=b=>createHash('sha256').update(b).digest('hex');
function validateReviewProgress(data){
 if(data?.schemaVersion!==1||data.recordType!=='user_review_workflow'||!Array.isArray(data.entries)||data.entries.some(e=>typeof e.id!=='string'||!e.id||e.seenAt!=null&&typeof e.seenAt!=='string'))throw Error('최신 검토 진행 기록 형식 불일치: 제작 보류');
 return data;
}
async function readReviewProgress(file){
 const bytes=await fs.readFile(file),current=validateReviewProgress(JSON.parse(bytes)),entries=[...current.entries],history=[];
 const folder=path.join(path.dirname(path.dirname(file)),'05_이전 작업','리뷰 과거');let dirs=[];
 try{dirs=await fs.readdir(folder,{withFileTypes:true});}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const dir of dirs){if(!dir.isDirectory()||dir.isSymbolicLink())continue;const archived=path.join(folder,dir.name,'07_사용자 평가','검토 진행.json');
  let bytes;try{bytes=await fs.readFile(archived);}catch(e){if(e.code==='ENOENT')continue;throw e;}
  const old=validateReviewProgress(JSON.parse(bytes));history.push({file:archived,sha256:hash(bytes)});
  entries.push(...old.entries.filter(e=>e.seenAt).map(e=>({id:e.id,seenAt:e.seenAt,outputVersion:e.outputVersion,history:true})));
 }
 return {...current,entries,history,currentEvidence:{file,sha256:hash(bytes)}};
}
module.exports={readReviewProgress,validateReviewProgress};
