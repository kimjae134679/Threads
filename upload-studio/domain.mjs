// Credential-free domain model. No I/O, clocks, timers, or platform transports.
import {cleanCaptionFirstLine,cleanDisplayTitle} from './title-normalization.mjs';
export const PLATFORM_LIMITS = Object.freeze({instagram:{text:2200,images:10},threads:{text:500,images:20}});
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=(code)=>{throw Object.assign(new Error(code),{code,status:code==="revision_conflict"?409:400});};
const str=(x,max=100000)=>{if(typeof x!=="string"||x.length>max)fail("invalid_text");return x;};
const id=x=>{const v=str(x,200);if(!v||!/^[-\w가-힣.: ]+$/.test(v))fail("invalid_identity");return v;};
const has=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
export function rejectSecrets(value){if(!value||typeof value!=="object")return;for(const [key,item]of Object.entries(value)){if(/(?:password|token|secret|credential|cookie|api[_-]?key)/i.test(key))fail("secret_field_forbidden");rejectSecrets(item);}}
export function createState(){return {schema:1,revision:0,posts:[],jobs:[],dry_runs:[],publications:[],archived_posts:[]};}
export function localTiming(t={mode:"now"}) {
  if(t.mode==="now")return {mode:"now",local:"",offset_minutes:null,due_at:null};
  if(t.mode!=="planned"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t.local||"")||!Number.isInteger(t.offset_minutes)||Math.abs(t.offset_minutes)>840)fail("invalid_local_time");
  const [y,m,d,h,mi]=t.local.split(/[-T:]/).map(Number),stamp=Date.UTC(y,m-1,d,h,mi),check=new Date(stamp);
  if(y<2000||y>2100||check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d||h>23||mi>59)fail("invalid_local_time");
  return {mode:"planned",local:t.local,offset_minutes:t.offset_minutes,due_at:new Date(stamp+t.offset_minutes*60000).toISOString()};
}
function normalizeImages(images=[]) {
  if(!Array.isArray(images)||images.length>200)fail("image_count_invalid");
  return images.map((im,i)=>{if(im.order!==i+1||!/^([a-f0-9]{64})$/.test(im.asset_id||"")||!["image/jpeg","image/png","image/webp"].includes(im.mime))fail("image_order_invalid");return {asset_id:im.asset_id,order:i+1,mime:im.mime};});
}
function normalizeProductionFeedback(f){if(!f)return null;const result={};for(const key of ['current','previous']){const value=f[key];if(!value){result[key]=null;continue;}if(!(value.score===null||Number.isInteger(value.score)&&value.score>=1&&value.score<=10))fail('invalid_production_feedback');result[key]={output_version:str(value.output_version,100),score:value.score,note:str(value.note||'',10000),updated_at:str(value.updated_at||'',100)};}return result;}
export function refreshProductionFeedback(state,posts){const s=clone(state);let changed=false;for(const item of posts){const p=s.posts.find(x=>x.post_id===item.post_id&&x.output_version===item.output_version);if(!p)continue;const feedback=normalizeProductionFeedback(item.production_feedback);if(JSON.stringify(p.production_feedback||null)!==JSON.stringify(feedback)){p.production_feedback=feedback;changed=true;}}if(changed)s.revision++;return s;}
function normalizeSource(s={}){const label=cleanDisplayTitle(str(s.label||s.display_title||"",300));return {url:str(s.url||"",2048),verified:s.verified===true,label,display_title:str(s.display_title||label,300),caption_input_title:str(s.caption_input_title||label,300),original_title:str(s.original_title||s.label||"",300)};}
function normalizeSafety(s={}){const result={};for(const k of ["fact","rights","privacy","defamation","platform_policy"]){const v=s[k]||"UNKNOWN";if(!["PASS","WARN","BLOCK","UNKNOWN"].includes(v))fail("invalid_safety");result[k]=v;}result.warn_note=str(s.warn_note||"",5000);return result;}
function normalizeReview(r){if(!r)return null;if(!Number.isInteger(r.score)||r.score<1||r.score>10||!["approved","pending","rejected"].includes(r.decision))fail("invalid_review");return {output_version:str(r.output_version,100),score:r.score,decision:r.decision,note:str(r.note||"",10000)};}
function normalizePost(p) {
  const settings=p.local_settings||{};const targets=settings.targets||["instagram","threads"];
  if(!Array.isArray(targets)||targets.some(x=>!has(PLATFORM_LIMITS,x))||new Set(targets).size!==targets.length)fail("invalid_platform");
  return {post_id:id(p.post_id),output_version:str(p.output_version,100),revision:1,caption:cleanCaptionFirstLine(str(p.caption||"")),production_feedback:normalizeProductionFeedback(p.production_feedback),tags:str(p.tags||"",10000),source:normalizeSource(p.source),images:normalizeImages(p.images),targets:[...targets],accounts:{instagram:"",threads:""},timing:localTiming(settings.timing),safety:normalizeSafety(),review:null,approval:null,publication_approval:null};
}
export function contentBasis(p){return JSON.stringify([p.post_id,p.output_version,p.caption,p.tags,p.images,p.targets,p.accounts,p.timing,p.source,p.safety,p.review]);}
function postAt(s,postId){const p=s.posts.find(x=>x.post_id===postId);if(!p)fail("post_not_found");return p;}
function invalidate(s,postId){for(const job of s.jobs.filter(x=>x.post_id===postId&&!["cancelled","dry_run_complete"].includes(x.state))){job.stale=true;if(job.state!=="running"&&job.state!=="reconciliation")job.state="waiting";}}
export function importBundle(state,bundle){
  rejectSecrets(bundle);if(!bundle||!Array.isArray(bundle.posts)||!bundle.posts.length||bundle.posts.length>1000)fail("bundle_invalid");str(bundle.bundle_id,200);
  const s=clone(state),seen=new Set();for(const raw of bundle.posts){const p=normalizePost(raw);if(seen.has(p.post_id))fail("duplicate_post");seen.add(p.post_id);const existing=s.posts.findIndex(x=>x.post_id===p.post_id);if(existing<0)s.posts.push(p);else {const prev=s.posts[existing];if(prev.output_version===p.output_version)fail("same_version_import_conflict");s.archived_posts.push(prev);p.revision=prev.revision+1;s.posts[existing]=p;invalidate(s,p.post_id);}}
  s.revision++;return s;
}
// Producer refresh never replaces local writing or creates publication jobs.
export function syncProductionBundle(state,bundle){
  rejectSecrets(bundle);if(!bundle||!Array.isArray(bundle.posts)||bundle.posts.length>1000)fail("bundle_invalid");
  const s=clone(state),seen=new Set();let changed=false;
  for(const raw of bundle.posts){
    if(seen.has(raw.post_id))fail("duplicate_post");seen.add(raw.post_id);
    const index=s.posts.findIndex(p=>p.post_id===raw.post_id);
    if(index<0){s.posts.push(normalizePost(raw));changed=true;continue;}
    const previous=s.posts[index];
    if(previous.output_version!==raw.output_version){
      const next=normalizePost(raw);
      // Even a deliberately blank edited caption survives new production.
      for(const key of ["caption","tags","targets","timing"])next[key]=clone(previous[key]);
      next.revision=previous.revision+1;s.archived_posts.push(previous);s.posts[index]=next;
      invalidate(s,next.post_id);changed=true;continue;
    }
    const incoming=normalizeSource(raw.source),nextSource={...previous.source,
      label:incoming.label,display_title:incoming.display_title,
      caption_input_title:incoming.caption_input_title,original_title:incoming.original_title};
    if(JSON.stringify(previous.source)!==JSON.stringify(nextSource)){
      previous.source=nextSource;previous.revision++;previous.approval=null;
      previous.publication_approval=null;invalidate(s,previous.post_id);changed=true;
    }
    const feedback=normalizeProductionFeedback(raw.production_feedback);
    if(JSON.stringify(previous.production_feedback||null)!==JSON.stringify(feedback)){
      previous.production_feedback=feedback;changed=true;
    }
  }
  if(changed)s.revision++;return s;
}
export function editPost(state,postId,patch,expectedRevision) {
  rejectSecrets(patch);const s=clone(state),p=postAt(s,postId);if(p.revision!==expectedRevision)fail("revision_conflict");
  if(Object.keys(patch).some(k=>!["caption","tags","images","targets","timing","source","safety","review"].includes(k)))fail("unknown_edit_field");
  for(const key of ["caption","tags"])if(has(patch,key))p[key]=key==="caption"?cleanCaptionFirstLine(str(patch[key])):str(patch[key],10000);
  if(has(patch,"images"))p.images=normalizeImages(patch.images);
  if(has(patch,"targets")){if(!Array.isArray(patch.targets)||new Set(patch.targets).size!==patch.targets.length||patch.targets.some(x=>!has(PLATFORM_LIMITS,x)))fail("invalid_platform");p.targets=["instagram","threads"].filter(x=>patch.targets.includes(x));}
  if(has(patch,"timing"))p.timing=localTiming(patch.timing);
  if(has(patch,"source"))p.source=normalizeSource(patch.source);
  if(has(patch,"safety"))p.safety=normalizeSafety(patch.safety);
  if(has(patch,"review"))p.review=normalizeReview(patch.review);
  if(contentBasis(p)===contentBasis(postAt(state,postId)))return s;
  if(["caption","tags","images"].some(k=>has(patch,k)))p.review=null;
  p.revision++;p.approval=null;p.publication_approval=null;invalidate(s,postId);s.revision++;return s;
}
export function readiness(post) {
  const reasons=[];const add=(code,label)=>reasons.push({code,label});
  const sourceOk=/^https:\/\/[a-zA-Z0-9][a-zA-Z0-9.:-]*(?:[/?#][^\s]*)?$/.test(post.source.url);
  if(!post.source.verified||!sourceOk)add("source_unverified","원문·출처 확인이 필요합니다.");
  for(const [k,v]of Object.entries(post.safety)){if(k==="warn_note")continue;if(v==="UNKNOWN"||v==="BLOCK"||(v==="WARN"&&!post.safety.warn_note.trim()))add("safety_"+k,"검수 항목 "+k+" 확인이 필요합니다.");}
  if(!post.review||post.review.output_version!==post.output_version||post.review.decision!=="approved")add("current_review_required","현재 제작 버전의 사용자 평가·검수가 필요합니다.");
  if(!post.caption.trim()&&!post.images.length)add("empty_content","문안 또는 이미지가 필요합니다.");
  if(!post.targets.length)add("platform_required","플랫폼을 선택해 주세요.");
  const combined=finalCaption(post);
  for(const target of post.targets){if(platformTextLength(combined,target)>PLATFORM_LIMITS[target].text)add(target==="instagram"?"instagram_caption_limit":"threads_text_limit",target+" 문안 길이 초과 · 원문은 그대로 보존됩니다.");if(!post.images.length)add(target+"_images_required","이미지를 먼저 선택해 주세요.");if(post.images.length>PLATFORM_LIMITS[target].images)add(target+"_image_limit",target+"의 현재 어댑터 이미지 범위를 넘었습니다.");if(target==="instagram"&&post.images.some(x=>x.mime!=="image/jpeg"))add("instagram_jpeg_required","실제 Instagram 연결 전 JPEG 자산 준비가 필요합니다.");}
  add("account_unconnected","계정 미연결 · 실제 게시 불가");add("public_media_required","공개 이미지 접근·권한 확인 전 · 외부 전송 없음");
  return reasons;
}
export function platformTextLength(text,platform){return [...text].reduce((n,c)=>{if(platform!=="threads"||!/[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]/u.test(c))return n+1;const cp=c.codePointAt(0);return n+(cp>65535?4:cp>2047?3:cp>127?2:1);},0);}
export function finalCaption(post){return cleanCaptionFirstLine(post.caption)+(post.tags?"\n\n"+post.tags:"");}
function reviewReady(p){return readiness(p).filter(x=>!["account_unconnected","public_media_required","instagram_jpeg_required"].includes(x.code));}
export function approveDryRun(state,postId,expectedRevision){const s=clone(state),p=postAt(s,postId);if(p.revision!==expectedRevision)fail("revision_conflict");if(reviewReady(p).length)fail("review_required");p.approval={scope:"dry-run",basis:contentBasis(p),output_version:p.output_version};s.revision++;return s;}
export function queuePost(state,postId,expectedRevision){
  const s=clone(state),p=postAt(s,postId);if(p.revision!==expectedRevision)fail("revision_conflict");if(!p.targets.length)fail("platform_required");
  const key=JSON.stringify([p.post_id,p.output_version,p.revision,p.targets,p.accounts,p.timing]);if(s.jobs.some(x=>x.key===key&&x.state!=="cancelled"))return s;
  const n=s.jobs.length+1;s.jobs.push({id:"local-job-"+n,key,post_id:postId,output_version:p.output_version,post_revision:p.revision,basis:contentBasis(p),targets:[...p.targets],timing:clone(p.timing),state:p.timing.mode==="planned"?"scheduled":"waiting",stale:false,attempts:0,error:null,result_id:null,publication_url:null});s.revision++;return s;
}
function jobAt(s,id){const j=s.jobs.find(x=>x.id===id);if(!j)fail("job_not_found");return j;}
export function startDryRun(state,jobId){const s=clone(state),j=jobAt(s,jobId),p=postAt(s,j.post_id);if(j.state==="reconciliation")fail("reconciliation_required");if(!["waiting","scheduled"].includes(j.state))fail("job_not_ready");if(j.stale||j.basis!==contentBasis(p))fail("stale_job");if(!p.approval||p.approval.scope!=="dry-run"||p.approval.basis!==contentBasis(p)||reviewReady(p).length)fail("review_required");j.state="running";j.attempts++;j.error=null;s.revision++;return s;}
export function finishDryRun(state,jobId,result){
  const s=clone(state),j=jobAt(s,jobId);if(j.state!=="running")fail("job_not_running");if(result.externalCalls!==0||!Array.isArray(result.plans)||result.plans.some(x=>x.dryRun!==true||x.externalCalls!==0))fail("live_result_forbidden");
  const record={id:"local-dry-run-"+(s.dry_runs.length+1),job_id:j.id,post_id:j.post_id,output_version:j.output_version,plans:clone(result.plans),externalCalls:0,kind:"dry-run",publication_url:null};s.dry_runs.push(record);j.state="dry_run_complete";j.result_id=record.id;s.revision++;return s;
}
export function failDryRun(state,jobId,code,ambiguous=false){const s=clone(state),j=jobAt(s,jobId);if(j.state==="cancelled")return s;j.state=ambiguous?"reconciliation":"failed";j.error={code:str(code,100),retryable:!ambiguous&&j.attempts<3};s.revision++;return s;}
export function cancelJobs(state,ids){const s=clone(state);if(!Array.isArray(ids)||ids.length>1000)fail("invalid_job_list");for(const jobId of ids){const j=jobAt(s,jobId);if(j.state==="running")fail("running_stop_required");if(!["cancelled","dry_run_complete","reconciliation"].includes(j.state))j.state="cancelled";}s.revision++;return s;}
export function retryJob(state,jobId){const s=clone(state),j=jobAt(s,jobId);if(j.state==="reconciliation")fail("reconciliation_required");if(j.state!=="failed"||!j.error?.retryable)fail("retry_forbidden");const p=postAt(s,j.post_id);if(j.stale||contentBasis(p)!==j.basis)fail("stale_job");j.state="waiting";j.error=null;s.revision++;return s;}
export function recoverJobs(state){const s=clone(state);let changed=false;for(const j of s.jobs){if(j.state==="running"){j.state="reconciliation";j.error={code:"restart_reconciliation_required",retryable:false};changed=true;}}if(changed)s.revision++;return s;}
export function validateState(value){if(!value||value.schema!==1||!Number.isInteger(value.revision)||!Array.isArray(value.posts)||!Array.isArray(value.jobs)||!Array.isArray(value.dry_runs)||!Array.isArray(value.publications)||!Array.isArray(value.archived_posts))fail("state_invalid");rejectSecrets(value);return value;}
