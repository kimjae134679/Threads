'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {writeAtomic}=require('./atomic-file.cjs');
function validate(data){if(data.schemaVersion!==1||!Array.isArray(data.evaluations)||data.evaluations.some(e=>!e.id||!e.outputVersion||!Number.isFinite(Date.parse(e.updatedAt))))throw Error('평가 기록 형식을 확인하세요. 기존 기록을 보존합니다.');return data;}
function mergeFeedback(current,legacy){
 validate(current);validate(legacy);const rows=new Map();
 for(const e of [...legacy.evaluations,...current.evaluations]){
  const key=JSON.stringify([e.id,e.outputVersion]),old=rows.get(key);
  if(!old||Date.parse(e.updatedAt)>=Date.parse(old.updatedAt))rows.set(key,e);
 }
 return {...current,evaluations:[...rows.values()],updatedAt:[current.updatedAt,legacy.updatedAt].filter(Boolean).sort().at(-1)};
}
async function migrateFeedback(file,legacyFile){
 let current,legacy;
 try{current=validate(JSON.parse(await fs.readFile(file,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;current={schemaVersion:1,recordType:'user_post_quality_feedback',evaluations:[]};}
 if(!legacyFile||path.resolve(file)===path.resolve(legacyFile))return current;
 let raw;try{raw=await fs.readFile(legacyFile);legacy=validate(JSON.parse(raw));}catch(e){if(e.code==='ENOENT')return current;throw e;}
 const merged=mergeFeedback(current,legacy);
 if(JSON.stringify(merged.evaluations)!==JSON.stringify(current.evaluations)){
  await fs.mkdir(path.dirname(file),{recursive:true});
  const digest=crypto.createHash('sha256').update(raw).digest('hex');
  await writeAtomic(path.join(path.dirname(file),'이전 평가-'+digest+'.json'),raw);
  try{const old=await fs.readFile(file);await writeAtomic(path.join(path.dirname(file),'이동 전 평가-'+crypto.createHash('sha256').update(old).digest('hex')+'.json'),old);}catch(e){if(e.code!=='ENOENT')throw e;}
  await writeAtomic(file,JSON.stringify(merged,null,2)+'\n');
 }
 return merged;
}
module.exports={mergeFeedback,migrateFeedback};
