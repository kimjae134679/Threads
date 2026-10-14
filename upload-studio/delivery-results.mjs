// Read-only consumer of Buffer-owned delivery receipts. Never writes review state or results.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {finalReviewStatus} from './final-review.mjs';

const platforms=new Set(['instagram','threads']);
const statuses=new Set(['draft','scheduled','sending','sent','error']);
const MAX_BYTES=16384,MAX_FILES=2000;
const text=(value,max=512)=>typeof value==='string'&&value.length>0&&value.length<=max&&value.trim()===value&&!/[\u0000-\u001f\u007f]/.test(value);
function date(value){
 if(typeof value!=='string'||value.length>64||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return false;
 const time=Date.parse(value),day=Date.parse(value.slice(0,10)+'T00:00:00Z');
 return Number.isFinite(time)&&Number.isFinite(day)&&new Date(day).toISOString().slice(0,10)===value.slice(0,10)&&Number(value.slice(11,13))<24&&Number(value.slice(14,16))<60&&Number(value.slice(17,19))<60;
}
function httpsUrl(value){
 if(!text(value,4096)||/\s/.test(value))return false;
 try{const url=new URL(value);return url.protocol==='https:'&&!!url.hostname&&!url.username&&!url.password&&!url.search&&!url.hash&&!/[?#]/.test(value);}catch{return false;}
}
function normalizeRecord(row){
 if(!row||typeof row!=='object'||Array.isArray(row)||row.schema!==1||!text(row.postId)||!text(row.outputVersion)||
  typeof row.fingerprint!=='string'||!/[a-f0-9]{64}/.test(row.fingerprint)||row.fingerprint.length!==64||
  !platforms.has(row.platform)||!statuses.has(row.status)||!date(row.recordedAt))return null;
 if(row.providerPostId!=null&&!text(row.providerPostId))return null;
 if(row.externalUrl!=null&&!httpsUrl(row.externalUrl))return null;
 for(const field of ['providerVerifiedAt','publishedAt','scheduledAt'])if(row[field]!=null&&!date(row[field]))return null;
 if(row.status==='sent'&&(!text(row.providerPostId)||!httpsUrl(row.externalUrl)||!date(row.providerVerifiedAt)||!date(row.publishedAt)))return null;
 if(row.status==='scheduled'&&!date(row.scheduledAt))return null;
 return {schema:1,postId:row.postId,outputVersion:row.outputVersion,fingerprint:row.fingerprint,platform:row.platform,
  providerPostId:row.providerPostId??null,status:row.status,externalUrl:row.externalUrl??null,
  providerVerifiedAt:row.providerVerifiedAt??null,publishedAt:row.publishedAt??null,scheduledAt:row.scheduledAt??null,recordedAt:row.recordedAt};
}
export const deliveryFingerprint=post=>createHash('sha256').update(finalReviewStatus(post).basis).digest('hex');
const emptyPlatform=(status='pending')=>({status,completed:false,providerPostId:null,externalUrl:null,providerVerifiedAt:null,publishedAt:null,scheduledAt:null,recordedAt:null});
export function deliveryResultsProjection(stateOrPosts,records=[]){
 const posts=Array.isArray(stateOrPosts)?stateOrPosts:stateOrPosts.posts;
 const valid=Array.isArray(records)?records.map(normalizeRecord).filter(Boolean):[];
 return posts.map(post=>{
  const fingerprint=deliveryFingerprint(post),selectedPlatforms=[...new Set((post.targets||[]).filter(platform=>platforms.has(platform)))],result={};
  for(const platform of selectedPlatforms){
   const matches=valid.filter(row=>row.postId===post.post_id&&row.outputVersion===post.output_version&&row.fingerprint===fingerprint&&row.platform===platform);
   matches.sort((a,b)=>Date.parse(b.recordedAt)-Date.parse(a.recordedAt));
   const row=matches[0];
   if(!row){result[platform]=emptyPlatform();continue;}
   // Conflicting receipts at the same instant cannot establish completion.
   if(matches.some(other=>Date.parse(other.recordedAt)===Date.parse(row.recordedAt)&&JSON.stringify(other)!==JSON.stringify(row))){result[platform]=emptyPlatform('error');continue;}
   const completed=row.status==='sent';
   result[platform]={status:row.status,completed,providerPostId:row.providerPostId,
    externalUrl:completed?row.externalUrl:null,providerVerifiedAt:row.providerVerifiedAt,
    publishedAt:completed?row.publishedAt:null,scheduledAt:row.scheduledAt,recordedAt:row.recordedAt};
  }
  const completedPlatforms=selectedPlatforms.filter(platform=>result[platform].completed),values=Object.values(result);
  const deliveryStatus=selectedPlatforms.length&&completedPlatforms.length===selectedPlatforms.length?'posted':
   completedPlatforms.length?'partially_posted':values.some(row=>row.status==='error')?'error':
   values.some(row=>row.status==='sending')?'sending':values.some(row=>row.status==='scheduled')?'scheduled':'pending';
  return {postId:post.post_id,outputVersion:post.output_version,fingerprint,deliveryStatus,selectedPlatforms,completedPlatforms,platforms:result};
 });
}
const unsafe=code=>Object.assign(new Error(code),{code});
async function safeDirectory(directory){
 const root=path.parse(directory).root;let current=root;
 for(const part of [null,...path.relative(root,directory).split(path.sep).filter(Boolean)]){
  if(part!==null)current=path.join(current,part);
  const stat=await fs.lstat(current);
  if(stat.isSymbolicLink()||!stat.isDirectory())throw unsafe('unsafe_results_directory');
 }
}
async function readRecord(file){
 const before=await fs.lstat(file);
 if(before.isSymbolicLink()||!before.isFile())throw unsafe('unsafe_result_file');
 if(before.size>MAX_BYTES)throw unsafe('result_too_large');
 const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const stat=await handle.stat(),real=await fs.realpath(file);
  const samePath=process.platform==='win32'?real.toLowerCase()===file.toLowerCase():real===file;
  if(!stat.isFile()||stat.dev!==before.dev||stat.ino!==before.ino||!samePath)throw unsafe('unsafe_result_file');
  if(stat.size>MAX_BYTES)throw unsafe('result_too_large');
  const buffer=Buffer.alloc(MAX_BYTES+1);let length=0;
  while(length<buffer.length){const {bytesRead}=await handle.read(buffer,length,buffer.length-length,length);if(!bytesRead)break;length+=bytesRead;}
  if(length>MAX_BYTES)throw unsafe('result_too_large');
  let row;try{row=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,length)));}catch{throw unsafe('invalid_result_json');}
  const record=normalizeRecord(row);if(!record)throw unsafe('invalid_result_record');return record;
 }finally{await handle.close();}
}
export async function readDeliveryResults(localRoot){
 const directory=path.resolve(localRoot,'final-review-results'),records=[],warnings=[];
 let entries;
 try{await safeDirectory(directory);entries=await fs.readdir(directory);}
 catch(error){if(error.code!=='ENOENT')warnings.push({file:null,code:error.code==='unsafe_results_directory'?error.code:'results_read_failed'});return {records,warnings};}
 const files=entries.filter(name=>name.endsWith('.json')).sort();
 if(files.length>MAX_FILES){warnings.push({file:null,code:'too_many_result_files'});return {records:[],warnings};}
 for(const name of files.slice(0,MAX_FILES)){
  if(name.length>200||name.includes('/')||name.includes('\\')){warnings.push({file:null,code:'unsafe_result_file'});continue;}
  try{await safeDirectory(directory);records.push(await readRecord(path.join(directory,name)));}
  catch(error){warnings.push({file:name,code:['unsafe_results_directory','unsafe_result_file','result_too_large','invalid_result_json','invalid_result_record'].includes(error.code)?error.code:'result_read_failed'});}
 }
 return {records,warnings};
}
