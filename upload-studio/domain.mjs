// Credential-free domain model. No I/O, clocks, timers, or platform transports.
import {finalReviewStatus} from './final-review.mjs';
export {setFinalReview,finalReviewStatus,approvedReviewBundle} from './final-review.mjs';
import {cleanCaptionFirstLine,cleanDisplayTitle} from './title-normalization.mjs';
import {normalizeCommonTags,normalizeTopicTags,normalizeThreadsTopic,instagramTaggedCaption} from './tags.mjs';
export const PLATFORM_LIMITS = Object.freeze({instagram:{text:2200,images:10},threads:{text:500,images:20}});
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=(code)=>{throw Object.assign(new Error(code),{code,status:code==="revision_conflict"?409:400});};
const str=(x,max=100000)=>{if(typeof x!=="string"||x.length>max)fail("invalid_text");return x;};
const id=x=>{const v=str(x,200);if(!v||['__proto__','constructor','prototype'].includes(v)||!/^[-\w가-힣.: ]+$/.test(v))fail("invalid_identity");return v;};
const has=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
export function rejectSecrets(value){if(!value||typeof value!=="object")return;for(const [key,item]of Object.entries(value)){if(/(?:password|token|secret|credential|cookie|api[_-]?key)/i.test(key))fail("secret_field_forbidden");rejectSecrets(item);}}
export function createState(){return {schema:1,revision:0,common_tags:[],posts:[],jobs:[],dry_runs:[],publications:[],archived_posts:[]};}
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
function normalizeSource(s={}){const label=cleanDisplayTitle(str(s.label||s.display_title||"",300));return {url:str(s.url||"",2048),verified:s.verified===true,label,display_title:str(s.display_title||label,300),caption_input_title:str(s.caption_input_title||label,300),original_title:str(s.original_title||s.label||"",300),cover_title:str(s.cover_title||s.display_title||label,300)};}
function normalizeSafety(s={}){const result={};for(const k of ["fact","rights","privacy","defamation","platform_policy"]){const v=s[k]||"UNKNOWN";if(!["PASS","WARN","BLOCK","UNKNOWN"].includes(v))fail("invalid_safety");result[k]=v;}result.warn_note=str(s.warn_note||"",5000);return result;}
export function reviewNote(post){return typeof post.review_note==='string'?post.review_note:typeof post.review?.note==='string'?post.review.note:'';}
function preserveReviewNote(post){if(typeof post.review_note!=='string')post.review_note=reviewNote(post);if(post.review_note_updated_at===undefined)post.review_note_updated_at=null;}
function normalizeReviewNoteTime(value){if(value===null||value===undefined)return null;if(typeof value!=='string'||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)fail('invalid_review_note_time');return value;}
function normalizeReview(r){if(!r)return null;if(!Number.isInteger(r.score)||r.score<1||r.score>10||!["approved","pending","rejected"].includes(r.decision))fail("invalid_review");return {output_version:str(r.output_version,100),score:r.score,decision:r.decision,note:str(r.note||"",10000)};}
export function platformCaption(post,platform='instagram'){if(platform==='threads'&&post.threads_title_only)return post.source.cover_title||post.source.display_title||post.source.label||'';return post.platform_captions?.[platform]??post.caption??'';}
function captionsOf(post){return Object.fromEntries(['instagram','threads'].map(k=>[k,cleanCaptionFirstLine(str(post.platform_captions?.[k]??post.caption??''))]));}
function normalizeCaptionEdits(value){if(value===undefined)return {instagram:false,threads:false};if(!value||Object.keys(value).some(k=>!has(PLATFORM_LIMITS,k))||['instagram','threads'].some(k=>typeof value[k]!=='boolean'))fail('invalid_caption_edits');return {...value};}
function captionEdits(post){return post.platform_caption_edited||{instagram:!!post.caption||post.revision>1,threads:!!post.caption||post.revision>1};}
function normalizePost(p) {
  const settings=p.local_settings||{};const targets=settings.targets||["instagram","threads"];
  if(!Array.isArray(targets)||targets.some(x=>!has(PLATFORM_LIMITS,x))||new Set(targets).size!==targets.length)fail("invalid_platform");
  return {post_id:id(p.post_id),output_version:str(p.output_version,100),revision:1,inactive_for_this_batch:p.inactive_for_this_batch===true||(p.post_id.startsWith('source-')&&p.production_caption_status!=='authored'),threads_title_only:p.threads_title_only===true,caption:cleanCaptionFirstLine(str(p.platform_captions?.instagram??p.caption??"")),platform_captions:captionsOf(p),platform_caption_edited:normalizeCaptionEdits(p.platform_caption_edited),publication_title:str(p.publication_title||"",300),production_caption_version:p.production_caption_version||null,production_caption_status:str(p.production_caption_status||"local",100),production_feedback:normalizeProductionFeedback(p.production_feedback),tags:str(p.tags||"",10000),topic_tags:normalizeTopicTags(p.topic_tags),topic_tags_edited:p.topic_tags_edited===true,threads_topic_tag:normalizeThreadsTopic(p.threads_topic_tag),common_tags:normalizeCommonTags(p.common_tags),media_format:p.media_format==='reel'?'reel':'images',reel_video:p.reel_video||null,reel_playback_reviewed:false,music:{mode:p.music?.mode==='manual-app'?'manual-app':'silent'},review_note:has(p,'review_note')?str(p.review_note,10000):str(reviewNote(p),10000),review_note_updated_at:normalizeReviewNoteTime(p.review_note_updated_at),source:normalizeSource(p.source),images:normalizeImages(p.images),targets:[...targets],accounts:{instagram:"",threads:""},timing:localTiming(settings.timing),safety:normalizeSafety(),review:null,final_review:null,approval:null,publication_approval:null};
}
export function contentBasis(p){return JSON.stringify([p.post_id,p.output_version,p.caption,captionsOf(p),p.threads_title_only,p.tags,p.common_tags,p.topic_tags,p.threads_topic_tag,p.media_format,p.reel_video,p.reel_playback_reviewed,p.music,p.images,p.targets,p.accounts,p.timing,p.source,p.safety,p.review]);}
function postAt(s,postId){const p=s.posts.find(x=>x.post_id===postId);if(!p)fail("post_not_found");return p;}
function invalidate(s,postId){for(const job of s.jobs.filter(x=>x.post_id===postId&&!["cancelled","dry_run_complete"].includes(x.state))){job.stale=true;if(job.state!=="running"&&job.state!=="reconciliation")job.state="waiting";}}
export function importBundle(state,bundle){
  rejectSecrets(bundle);if(!bundle||!Array.isArray(bundle.posts)||!bundle.posts.length||bundle.posts.length>1000)fail("bundle_invalid");str(bundle.bundle_id,200);
  const s=clone(state),seen=new Set();for(const raw of bundle.posts){const p=normalizePost({...raw,common_tags:has(raw,'common_tags')?raw.common_tags:s.common_tags||[]});if(!has(raw,'platform_caption_edited'))p.platform_caption_edited={instagram:true,threads:true};if(seen.has(p.post_id))fail("duplicate_post");seen.add(p.post_id);const existing=s.posts.findIndex(x=>x.post_id===p.post_id);if(existing<0)s.posts.push(p);else {const prev=s.posts[existing];p.review_note=reviewNote(prev);p.review_note_updated_at=prev.review_note_updated_at||null;if(prev.output_version===p.output_version)fail("same_version_import_conflict");s.archived_posts.push(prev);p.revision=prev.revision+1;s.posts[existing]=p;invalidate(s,p.post_id);}}
  s.revision++;return s;
}
// Producer refresh never replaces local writing or creates publication jobs.
export function syncProductionBundle(state,bundle){
  rejectSecrets(bundle);if(!bundle||!Array.isArray(bundle.posts)||bundle.posts.length>1000)fail("bundle_invalid");
  const s=clone(state),seen=new Set();let changed=false;
  for(const raw of bundle.posts){
    if(seen.has(raw.post_id))fail("duplicate_post");seen.add(raw.post_id);
    const index=s.posts.findIndex(p=>p.post_id===raw.post_id);
    if(index<0){const added=normalizePost({...raw,common_tags:has(raw,'common_tags')?raw.common_tags:s.common_tags||[]});s.posts.push(added);changed=true;continue;}
    const previous=s.posts[index];
    if(previous.inactive_for_this_batch===undefined){previous.inactive_for_this_batch=previous.post_id.startsWith('source-')&&previous.production_caption_status!=='authored';changed=true;}
    if(!previous.topic_tags_edited&&raw.topic_tags!==undefined){const topics=normalizeTopicTags(raw.topic_tags),threadTopic=normalizeThreadsTopic(raw.threads_topic_tag);if(JSON.stringify(previous.topic_tags||[])!==JSON.stringify(topics)||(previous.threads_topic_tag||'')!==threadTopic){previous.topic_tags=topics;previous.threads_topic_tag=threadTopic;previous.revision++;preserveReviewNote(previous);previous.review=null;previous.final_review=null;previous.approval=null;previous.publication_approval=null;invalidate(s,previous.post_id);changed=true;}}
    if(previous.output_version!==raw.output_version){
      const next=normalizePost({...raw,common_tags:has(raw,'common_tags')?raw.common_tags:s.common_tags||[]});
      // Even a deliberately blank edited caption survives new production.
      for(const key of ["tags","targets","timing","common_tags","media_format","reel_video","music","topic_tags","topic_tags_edited","threads_topic_tag","review_note","review_note_updated_at"])if(previous[key]!==undefined)next[key]=clone(previous[key]);
      next.review_note=reviewNote(previous);next.review_note_updated_at=previous.review_note_updated_at||null;
      next.platform_caption_edited=clone(captionEdits(previous));
      for(const platform of ['instagram','threads'])if(next.platform_caption_edited[platform])next.platform_captions[platform]=previous.platform_captions?.[platform]??previous.caption??'';
      next.caption=next.platform_captions.instagram;
      next.inactive_for_this_batch=previous.inactive_for_this_batch;next.revision=previous.revision+1;s.archived_posts.push(previous);s.posts[index]=next;
      invalidate(s,next.post_id);changed=true;continue;
    }
    const incoming=normalizeSource(raw.source),nextSource={...previous.source,
      label:incoming.label,display_title:incoming.display_title,
      caption_input_title:incoming.caption_input_title,original_title:incoming.original_title,cover_title:incoming.cover_title};
    if(JSON.stringify(previous.source)!==JSON.stringify(nextSource)){
      previous.source=nextSource;previous.revision++;preserveReviewNote(previous);previous.review=null;previous.final_review=null;previous.approval=null;
      previous.publication_approval=null;invalidate(s,previous.post_id);changed=true;
    }
    if(raw.threads_title_only===true&&!previous.threads_title_only){previous.threads_title_only=true;previous.revision++;preserveReviewNote(previous);previous.review=null;previous.final_review=null;previous.approval=null;previous.publication_approval=null;invalidate(s,previous.post_id);changed=true;}
    if(has(raw,'platform_captions')||has(raw,'caption')||has(raw,'production_caption_status')){
    const oldBasis=contentBasis(previous),oldOrigin=previous.production_caption_version||null;
    const edits=captionEdits(previous),captions=captionsOf(previous),incomingCaptions=captionsOf(raw);
    for(const platform of ['instagram','threads'])if(!edits[platform])captions[platform]=incomingCaptions[platform];
    const fieldChange=JSON.stringify(previous.platform_captions)!==JSON.stringify(captions)||JSON.stringify(previous.platform_caption_edited)!==JSON.stringify(edits)||previous.production_caption_version!==(raw.production_caption_version||null)||previous.production_caption_status!==(raw.production_caption_status||'local');
    previous.platform_captions=captions;previous.platform_caption_edited=edits;previous.caption=captions.instagram;
    previous.production_caption_version=raw.production_caption_version||null;previous.production_caption_status=raw.production_caption_status||'local';previous.publication_title=raw.publication_title||previous.publication_title||'';
    if(fieldChange){changed=true;if(contentBasis(previous)!==oldBasis||oldOrigin!==previous.production_caption_version){previous.revision++;preserveReviewNote(previous);previous.review=null;previous.final_review=null;previous.approval=null;previous.publication_approval=null;invalidate(s,previous.post_id);}}
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
  if(Object.keys(patch).some(k=>!["caption","platform_captions","tags","images","targets","timing","source","safety","review","topic_tags","threads_topic_tag","media_format","reel_video","reel_playback_reviewed","music","review_note","review_note_updated_at"].includes(k)))fail("unknown_edit_field");
  if(has(patch,'review_note_updated_at')&&!has(patch,'review_note'))fail('review_note_required');
  let noteChanged=false;
  if(has(patch,'review_note')){const note=str(patch.review_note,10000),at=has(patch,'review_note_updated_at')?normalizeReviewNoteTime(patch.review_note_updated_at):(p.review_note_updated_at||null);noteChanged=note!==reviewNote(p)||at!==(p.review_note_updated_at||null);p.review_note=note;p.review_note_updated_at=at;}
  // Internal notes are metadata. They never change the reviewed publication input.
  if(Object.keys(patch).every(k=>['review_note','review_note_updated_at'].includes(k))){if(noteChanged){p.revision++;s.revision++;}return s;}
  preserveReviewNote(p);p.platform_captions=captionsOf(p);p.platform_caption_edited=captionEdits(p);const oldTopicEdited=p.topic_tags_edited===true;
  if(has(patch,'caption')){const text=cleanCaptionFirstLine(str(patch.caption));p.caption=text;for(const k of ['instagram','threads']){p.platform_captions[k]=text;p.platform_caption_edited[k]=true;}}
  if(has(patch,'platform_captions')){if(!patch.platform_captions||Object.keys(patch.platform_captions).some(k=>!has(PLATFORM_LIMITS,k)))fail('invalid_platform_caption');for(const[k,text]of Object.entries(patch.platform_captions)){p.platform_captions[k]=cleanCaptionFirstLine(str(text));p.platform_caption_edited[k]=true;}p.caption=p.platform_captions.instagram;}
  if(has(patch,'tags'))p.tags=str(patch.tags,10000);
  if(has(patch,'topic_tags')){p.topic_tags=normalizeTopicTags(patch.topic_tags);p.topic_tags_edited=true;}
  if(has(patch,'threads_topic_tag')){p.threads_topic_tag=normalizeThreadsTopic(patch.threads_topic_tag);p.topic_tags_edited=true;}
  if(has(patch,'media_format')){if(!['images','reel'].includes(patch.media_format))fail('invalid_media_format');p.media_format=patch.media_format;}
  if(has(patch,'reel_video')){const v=patch.reel_video;if(v&&(!/^[a-f0-9]{64}$/.test(v.asset_id||'')||!['video/mp4','video/quicktime'].includes(v.mime)||!v.metadata))fail('reel_video_required');p.reel_video=v;p.reel_playback_reviewed=false;}
  if(has(patch,'reel_playback_reviewed')){if(typeof patch.reel_playback_reviewed!=='boolean')fail('invalid_video_review');p.reel_playback_reviewed=patch.reel_playback_reviewed;}
  if(has(patch,'music')){if(!['silent','manual-app'].includes(patch.music?.mode))fail('invalid_music_mode');p.music={mode:patch.music.mode};}

  if(has(patch,"images")){p.images=normalizeImages(patch.images);if(p.reel_video?.source_images)p.reel_video=null;p.reel_playback_reviewed=false;}
  if(has(patch,"targets")){if(!Array.isArray(patch.targets)||new Set(patch.targets).size!==patch.targets.length||patch.targets.some(x=>!has(PLATFORM_LIMITS,x)))fail("invalid_platform");p.targets=["instagram","threads"].filter(x=>patch.targets.includes(x));}
  if(has(patch,"timing"))p.timing=localTiming(patch.timing);
  if(has(patch,"source"))p.source=normalizeSource(patch.source);
  if(has(patch,"safety"))p.safety=normalizeSafety(patch.safety);
  if(has(patch,"review"))p.review=normalizeReview(patch.review);
  if(contentBasis(p)===contentBasis(postAt(state,postId))){if(noteChanged){p.revision++;s.revision++;return s;}if(JSON.stringify(p.platform_caption_edited)!==JSON.stringify(postAt(state,postId).platform_caption_edited)||oldTopicEdited!==(p.topic_tags_edited===true))s.revision++;return s;}
  if(["caption","platform_captions","tags","topic_tags","threads_topic_tag","images","media_format","reel_video","reel_playback_reviewed","music"].some(k=>has(patch,k)))p.review=null;
  p.revision++;p.final_review=null;p.approval=null;p.publication_approval=null;invalidate(s,postId);s.revision++;return s;
}
export function readiness(post) {
  const reasons=[];const add=(code,label)=>reasons.push({code,label});
  if(!finalReviewStatus(post).passed)add("final_review_required","현재 문안·태그·이미지 순서·설정의 최종 검수가 필요합니다.");
  const sourceOk=/^https:\/\/[a-zA-Z0-9][a-zA-Z0-9.:-]*(?:[/?#][^\s]*)?$/.test(post.source.url);
  if(!post.source.verified||!sourceOk)add("source_unverified","원문·출처 확인이 필요합니다.");
  for(const [k,v]of Object.entries(post.safety)){if(k==="warn_note")continue;if(v==="UNKNOWN"||v==="BLOCK"||(v==="WARN"&&!post.safety.warn_note.trim()))add("safety_"+k,({fact:"사실 일치",rights:"권리",privacy:"개인정보·초상",defamation:"명예훼손",platform_policy:"플랫폼 원본성"}[k]||"검수 항목")+" 확인이 필요합니다.");}
  if(!post.review||post.review.output_version!==post.output_version||post.review.decision!=="approved")add("current_review_required","현재 제작 버전의 사용자 평가·검수가 필요합니다.");
  if(!post.caption.trim()&&!post.images.length)add("empty_content","문안 또는 이미지가 필요합니다.");
  if(post.production_caption_status?.startsWith('held-'))add('production_caption_hold','현재 제작 버전과 문안 입력 계약을 확인할 때까지 게시 보류');
  if(!post.targets.length)add("platform_required","플랫폼을 선택해 주세요.");
  for(const target of post.targets){const combined=finalCaption(post,target);if(!platformCaption(post,target).trim())add(target+'_caption_required',target+' 원문 기반 게시 문안 작성 대기');if(platformTextLength(combined,target)>PLATFORM_LIMITS[target].text)add(target==="instagram"?"instagram_caption_limit":"threads_text_limit",target+" 문안 길이 초과 · 원문은 그대로 보존됩니다.");if(target==="instagram"&&post.media_format==="reel"){if(!post.reel_video)add("reel_video_required","실제 릴스 영상 파일을 생성하거나 선택해 주세요.");if(!post.reel_playback_reviewed)add("reel_playback_review_required","릴스 영상을 끝까지 재생해 확인해 주세요.");if(post.music?.mode==="manual-app")add("manual_music_required","앱에서 음악을 직접 추가할 계획 · 자동 게시 보류");continue;}if(!post.images.length)add(target+"_images_required","이미지를 먼저 선택해 주세요.");if(post.images.length>PLATFORM_LIMITS[target].images)add(target+"_image_limit",target+"의 현재 어댑터 이미지 범위를 넘었습니다.");if(target==="instagram"&&post.images.some(x=>x.mime!=="image/jpeg"))add("instagram_jpeg_required","실제 Instagram 연결 전 JPEG 자산 준비가 필요합니다.");}
  if(post.targets.includes("instagram")&&instagramTaggedCaption(platformCaption(post,"instagram"),post).hashtag_count>5)add("instagram_hashtag_limit","Instagram 해시태그는 본문·공통·글별 태그를 합해 5개 이내로 준비합니다.");
  add("account_unconnected","계정 미연결 · 실제 게시 불가");add("public_media_required","공개 이미지 접근·권한 확인 전 · 외부 전송 없음");
  return reasons;
}
export function platformTextLength(text,platform){return [...text].reduce((n,c)=>{if(platform!=="threads"||!/[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]/u.test(c))return n+1;const cp=c.codePointAt(0);return n+(cp>65535?4:cp>2047?3:cp>127?2:1);},0);}
export function finalCaption(post,platform='instagram'){const body=cleanCaptionFirstLine(platformCaption(post,platform));return platform==='threads'?body:instagramTaggedCaption(body,post).text;}
function reviewReady(p){return readiness(p).filter(x=>!["account_unconnected","public_media_required","instagram_jpeg_required"].includes(x.code));}
export function approveDryRun(state,postId,expectedRevision){const s=clone(state),p=postAt(s,postId);if(p.revision!==expectedRevision)fail("revision_conflict");if(!isActivePost(p))fail('post_out_of_active_scope');if(reviewReady(p).length)fail("review_required");p.approval={scope:"dry-run",basis:contentBasis(p),output_version:p.output_version};s.revision++;return s;}
export function queuePost(state,postId,expectedRevision){
  const s=clone(state),p=postAt(s,postId);if(p.revision!==expectedRevision)fail("revision_conflict");if(!isActivePost(p))fail("post_out_of_active_scope");if(!finalReviewStatus(p).passed)fail("final_review_required");if(!p.targets.length)fail("platform_required");
  const key=JSON.stringify([p.post_id,p.output_version,p.revision,p.targets,p.accounts,p.timing]);if(s.jobs.some(x=>x.key===key&&x.state!=="cancelled"))return s;
  const n=s.jobs.length+1;s.jobs.push({id:"local-job-"+n,key,post_id:postId,output_version:p.output_version,post_revision:p.revision,basis:contentBasis(p),targets:[...p.targets],timing:clone(p.timing),state:p.timing.mode==="planned"?"scheduled":"waiting",stale:false,attempts:0,error:null,result_id:null,publication_url:null});s.revision++;return s;
}
function jobAt(s,id){const j=s.jobs.find(x=>x.id===id);if(!j)fail("job_not_found");return j;}
export function startDryRun(state,jobId){const s=clone(state),j=jobAt(s,jobId),p=postAt(s,j.post_id);if(!isActivePost(p))fail("post_out_of_active_scope");if(j.state==="reconciliation")fail("reconciliation_required");if(!["waiting","scheduled"].includes(j.state))fail("job_not_ready");if(j.stale||j.basis!==contentBasis(p))fail("stale_job");if(!p.approval||p.approval.scope!=="dry-run"||p.approval.basis!==contentBasis(p)||reviewReady(p).length)fail("review_required");j.state="running";j.attempts++;j.error=null;s.revision++;return s;}
export function finishDryRun(state,jobId,result){
  const s=clone(state),j=jobAt(s,jobId);if(j.state!=="running")fail("job_not_running");if(result.externalCalls!==0||!Array.isArray(result.plans)||result.plans.some(x=>x.dryRun!==true||x.externalCalls!==0))fail("live_result_forbidden");
  const record={id:"local-dry-run-"+(s.dry_runs.length+1),job_id:j.id,post_id:j.post_id,output_version:j.output_version,plans:clone(result.plans),externalCalls:0,kind:"dry-run",publication_url:null};s.dry_runs.push(record);j.state="dry_run_complete";j.result_id=record.id;s.revision++;return s;
}
export function failDryRun(state,jobId,code,ambiguous=false){const s=clone(state),j=jobAt(s,jobId);if(j.state==="cancelled")return s;j.state=ambiguous?"reconciliation":"failed";j.error={code:str(code,100),retryable:!ambiguous&&j.attempts<3};s.revision++;return s;}
export function cancelJobs(state,ids){const s=clone(state);if(!Array.isArray(ids)||ids.length>1000)fail("invalid_job_list");for(const jobId of ids){const j=jobAt(s,jobId);if(j.state==="running")fail("running_stop_required");if(!["cancelled","dry_run_complete","reconciliation"].includes(j.state))j.state="cancelled";}s.revision++;return s;}
export function retryJob(state,jobId){const s=clone(state),j=jobAt(s,jobId);if(j.state==="reconciliation")fail("reconciliation_required");if(j.state!=="failed"||!j.error?.retryable)fail("retry_forbidden");const p=postAt(s,j.post_id);if(j.stale||contentBasis(p)!==j.basis)fail("stale_job");j.state="waiting";j.error=null;s.revision++;return s;}
export function recoverJobs(state){const s=clone(state);let changed=false;for(const j of s.jobs){if(j.state==="running"){j.state="reconciliation";j.error={code:"restart_reconciliation_required",retryable:false};changed=true;}}if(changed)s.revision++;return s;}
export function validateState(value){if(!value||value.schema!==1||!Number.isInteger(value.revision)||!Array.isArray(value.posts)||!Array.isArray(value.jobs)||!Array.isArray(value.dry_runs)||!Array.isArray(value.publications)||!Array.isArray(value.archived_posts))fail("state_invalid");rejectSecrets(value);return value;}

export function setCommonTags(state,tags,expectedRevision){if(state.revision!==expectedRevision)fail('revision_conflict');const s=clone(state),value=normalizeCommonTags(tags);if(JSON.stringify(value)===JSON.stringify(s.common_tags||[]))return s;s.common_tags=value;for(const p of s.posts){p.common_tags=[...value];p.revision++;preserveReviewNote(p);p.review=null;p.final_review=null;p.approval=null;p.publication_approval=null;invalidate(s,p.post_id);}s.revision++;return s;}
export function moveQueueJob(state,jobId,direction,expectedRevision){if(state.revision!==expectedRevision)fail('revision_conflict');if(![-1,1].includes(direction))fail('invalid_queue_order');const s=clone(state),i=s.jobs.findIndex(j=>j.id===jobId),j=i+direction;if(i<0||j<0||j>=s.jobs.length)fail('invalid_queue_order');if([s.jobs[i],s.jobs[j]].some(j=>['running','reconciliation'].includes(j.state)))fail('running_stop_required');[s.jobs[i],s.jobs[j]]=[s.jobs[j],s.jobs[i]];s.revision++;return s;}

export function isActivePost(post){return !!post&&!post.inactive_for_this_batch&&(!post.post_id.startsWith('source-')||post.production_caption_status==='authored'||post.current_layout?.activated===true);}
export function activePostCounts(state){const active=state.posts.filter(isActivePost);return {active:active.length,stored:state.posts.length,held:state.posts.length-active.length,source_deleted:0};}
