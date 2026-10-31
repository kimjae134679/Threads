// Local immutable reviewed-input snapshots. No transport, scheduling or publication.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {finalCaption,isActivePost,readiness} from './domain.mjs';
import {finalReviewStatus} from './final-review.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const fail=code=>{throw Object.assign(new Error(code),{code,status:400});};
const sha=value=>createHash('sha256').update(value).digest('hex');
function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
 return JSON.stringify(value);
}
function validState(state){
 if(!state||!Number.isSafeInteger(state.revision)||state.revision<0||!Array.isArray(state.posts))fail('handoff_invalid_state');
 const ids=new Set();
 for(const post of state.posts){
  if(!post||typeof post.post_id!=='string'||ids.has(post.post_id))fail('handoff_invalid_state');
  ids.add(post.post_id);
 }
}
export function reviewHandoffProjection(state){
 validState(state);
 const review_statuses=state.posts.map(post=>{
  const status=finalReviewStatus(post),active=isActivePost(post);
  return {postId:post.post_id,outputVersion:post.output_version,decision:status.decision,current:status.current,
   passed:status.passed,active,eligible:active&&status.passed,fingerprint:sha(status.basis),
   reviewedAt:status.reviewed_at,reviewedRevision:status.reviewed_revision};
 });
 const eligible_post_ids=review_statuses.filter(status=>status.eligible).map(status=>status.postId);
 const identity={schema:1,type:'threads-final-review-handoff',state_revision:state.revision,review_statuses,eligible_post_ids};
 return {...identity,handoff_id:sha(canonical(identity)),count:eligible_post_ids.length,externalCalls:0};
}
function within(root,target){
 const relative=path.relative(root,target);
 return relative===''||!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep);
}
// Inspect every existing component, including ancestors of the supplied state root.
// Junctions and symlinks are rejected rather than followed into another directory.
async function checkPath(target,kind,{allowMissing=false}={}){
 const absolute=path.resolve(target),base=path.parse(absolute).root;
 let current=base;
 const parts=absolute.slice(base.length).split(path.sep).filter(Boolean);
 for(let i=-1;i<parts.length;i++){
  if(i>=0)current=path.join(current,parts[i]);
  let stat;
  try{stat=await fs.lstat(current);}catch(error){
   if(error.code==='ENOENT'&&allowMissing)return null;
   throw error;
  }
  if(stat.isSymbolicLink()||i<parts.length-1&&!stat.isDirectory())fail('handoff_unsafe_path');
  if(i===parts.length-1){
   if(kind==='directory'&&!stat.isDirectory()||kind==='file'&&!stat.isFile())fail('handoff_unsafe_path');
   return stat;
  }
 }
}
async function readOwnedFile(file){
 const before=await checkPath(file,'file');
 const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const opened=await handle.stat();
  if(!opened.isFile()||opened.dev!==before.dev||opened.ino!==before.ino)fail('handoff_unsafe_path');
  const bytes=await handle.readFile();
  await checkPath(file,'file');
  return bytes;
 }finally{await handle.close();}
}
function imageMime(bytes){
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'image/png';
 if(bytes.length>=12&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return 'image/webp';
 return null;
}
function semanticHash(manifest){
 const {generated_at,...semantic}=manifest;
 return sha(canonical(semantic));
}
export class ReviewHandoff {
 constructor(root,assets){
  if(typeof root!=='string'||!path.isAbsolute(root)||!assets||typeof assets.read!=='function'||
   typeof assets.root!=='string'||!path.isAbsolute(assets.root))fail('handoff_unsafe_path');
  this.root=path.resolve(root);this.assets=assets;this.assetsRoot=path.resolve(assets.root);
  this.directory=path.join(this.root,'final-review-handoff');
  if(!within(this.root,this.assetsRoot)||this.assetsRoot===this.root)fail('handoff_unsafe_path');
 }
 async image(image,index){
  if(image.order!==index+1||!/^[a-f0-9]{64}$/.test(image.asset_id||'')||
   !['image/jpeg','image/png','image/webp'].includes(image.mime))fail('handoff_invalid_image');
  const file=path.join(this.assetsRoot,image.asset_id),metadata=file+'.json';
  await checkPath(this.assetsRoot,'directory');
  await checkPath(file,'file');await checkPath(metadata,'file');
  const {asset,bytes}=await this.assets.read(image.asset_id);
  // Compare both LocalAssets' read result and the actual owned file. Never trust
  // only the stored asset metadata or a caller-provided asset identifier.
  const ownedBytes=await readOwnedFile(file);
  await checkPath(metadata,'file');
  if(!bytes||sha(bytes)!==image.asset_id||sha(ownedBytes)!==image.asset_id)fail('handoff_asset_hash_mismatch');
  if(!asset||asset.asset_id!==image.asset_id||asset.mime!==image.mime||
   imageMime(bytes)!==image.mime||imageMime(ownedBytes)!==image.mime)fail('handoff_asset_mime_mismatch');
  return {order:image.order,sha256:image.asset_id,mime:image.mime,local_file:file,approved_image_url:null};
 }
 async write(state,now=Date.now()){
  // Snapshot synchronously before the first await; later caller mutations cannot
  // change the reviewed data halfway through this export.
  const snapshot=clone(state),projection=reviewHandoffProjection(snapshot);
  if(!['number','string'].includes(typeof now)||!Number.isFinite(new Date(now).getTime()))fail('handoff_invalid_time');
  const generated_at=new Date(now).toISOString(),posts=[];
  await checkPath(this.root,'directory');
  const eligible=new Set(projection.eligible_post_ids);
  for(const post of snapshot.posts.filter(post=>eligible.has(post.post_id))){
   const status=finalReviewStatus(post);
   const images=[];
   for(let i=0;i<post.images.length;i++)images.push(await this.image(post.images[i],i));
   const blockers=clone(readiness(post));
   if(post.media_format==='reel')blockers.push({code:'reel_handoff_unsupported',label:'현재 로컬 전달 계약은 이미지 전용입니다. 릴스 영상 전송은 지원하지 않습니다.'});
   posts.push({postId:post.post_id,outputVersion:post.output_version,
    approval:{status:'passed',reviewedAt:status.reviewed_at,fingerprint:sha(status.basis)},
    captions:Object.fromEntries(post.targets.map(platform=>[platform,finalCaption(post,platform)])),
    tags:{common:clone(post.common_tags||[]),topic:clone(post.topic_tags||[]),legacy:post.tags||'',threads_topic:post.threads_topic_tag||''},
    images,platforms:clone(post.targets),media_format:post.media_format||'images',
    reel_video:clone(post.reel_video||null),media_contract:{kind:'images-only',reel_upload_supported:false},
    source:clone(post.source),safety:clone(post.safety),review:clone(post.review),blockers});
  }
  const {count,externalCalls,...identity}=projection;
  const manifest={...identity,generated_at,posts,external_calls:0,
   consumer_contract:{selection:'highest_state_revision',state_file:path.join(this.root,'state.json'),
    require_live_revision_and_fingerprint:true,require_asset_hash_and_mime:true,revalidate:'Immediately before any future upload, read live state.json and require identical state_revision, handoff_id, eligible post IDs and current review fingerprints; reverify each local image SHA-256 and MIME. Older immutable manifests never authorize previous versions.',
    publication_authorized:false,results_directory:path.join(this.root,'final-review-results')}};
  const file=path.join(this.directory,'handoff.'+snapshot.revision+'.'+projection.handoff_id+'.json');
  await checkPath(this.directory,'directory',{allowMissing:true});
  try{await fs.mkdir(this.directory,{mode:0o700});}catch(error){if(error.code!=='EEXIST')throw error;}
  await checkPath(this.directory,'directory');
  const result={path:file,count,state_revision:snapshot.revision,handoff_id:projection.handoff_id,externalCalls:0};
  const reuse=async()=>{
   let existing;
   try{existing=JSON.parse((await readOwnedFile(file)).toString('utf8'));}
   catch(error){if(error.code==='handoff_unsafe_path')throw error;fail('handoff_collision');}
   if(existing.handoff_id!==manifest.handoff_id||semanticHash(existing)!==semanticHash(manifest))fail('handoff_collision');
   return result;
  };
  if(await checkPath(file,'file',{allowMissing:true}))return reuse();
  const temporary=path.join(this.directory,'.handoff.'+randomUUID()+'.tmp');
  let handle,created=false;
  try{
   await checkPath(this.directory,'directory');
   handle=await fs.open(temporary,'wx',0o600);created=true;
   await handle.writeFile(JSON.stringify(manifest,null,2)+'\n','utf8');
   await handle.sync();await handle.close();handle=null;
   await checkPath(this.directory,'directory');await checkPath(temporary,'file');
   // Hard-link creation is atomic and fails on any existing destination. Unlike
   // rename, it can never replace a previous immutable manifest.
   try{await fs.link(temporary,file);}catch(error){if(error.code==='EEXIST')return await reuse();throw error;}
   await checkPath(file,'file');
   return result;
  }finally{
   if(handle)await handle.close();
   if(created){await checkPath(this.directory,'directory');await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
  }
 }
}
