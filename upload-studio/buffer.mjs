// Buffer contract and durable local transitions only. No HTTP, credentials or timers.
import {createHash} from 'node:crypto';
import {contentBasis,finalCaption,readiness,isActivePost,rejectSecrets} from './domain.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=code=>{throw Object.assign(new Error(code),{code,status:code==='revision_conflict'?409:400});};
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export const BUFFER_CREATE_QUERY='mutation StudioCreate($input: CreatePostInput!) { createPost(input: $input) { __typename ... on PostActionSuccess { post { id channelId status dueAt externalLink } } ... on MutationError { message } } }';
export const BUFFER_QUEUE_QUERY='query StudioQueue($input: PostsInput!, $after: String) { posts(first: 100, after: $after, input: $input) { edges { node { id channelId status } } pageInfo { hasNextPage endCursor } } }';
export const BUFFER_STATUS_QUERY='query StudioStatus($input: PostInput!) { post(input: $input) { id channelId status dueAt externalLink } }';
const providerStates={draft:'provider_draft',error:'publication_failed',needs_approval:'awaiting_provider_approval',scheduled:'scheduled',sending:'sending',sent:'published'};
const heldStates=new Set(['reserved','reconciliation',...Object.values(providerStates),'rejected']);
function publicMedia(record){
 if(!record?.public_verified||!record.stable)return null;
 try{
  const u=new URL(record.url);
  // No probe is made here; a future authorized uploader must verify bytes and reachability.
  const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||
    !host.includes('.')||host.endsWith('.local')||host.endsWith('.localhost')||
    /^\d+(?:\.\d+){3}$/.test(host)||host.includes(':')||
    ['localhost','drive.google.com','www.dropbox.com','dropbox.com'].includes(host))return null;
  return u.href;
 }catch{return null;}
}
export function previewBufferPost(post,{platform='instagram',channel_id='',due_at='',media={},now=Date.now()}={}){
 rejectSecrets({platform,channel_id,due_at,media});
 if(!['instagram','threads'].includes(platform))fail('invalid_platform');
 const blockers=readiness({...post,targets:[platform]}).filter(r=>!['account_unconnected','public_media_required'].includes(r.code)).map(r=>r.code);
 if(!isActivePost(post))blockers.push('inactive_post');
 if(!post.targets.includes(platform))blockers.push('platform_not_selected');
 if(typeof channel_id!=='string'||!channel_id.trim()||channel_id.length>200)blockers.push('buffer_channel_required');
 const due=Date.parse(due_at);
 if(!Number.isFinite(due)||due<=now)blockers.push('future_schedule_required');
 const input={channelId:channel_id,text:finalCaption(post,platform),assets:[],schedulingType:'automatic',mode:'customScheduled',dueAt:Number.isFinite(due)?new Date(due).toISOString():null,needsApproval:false};
 const reel=platform==='instagram'&&post.media_format==='reel';
 const originalAssets=reel?[post.reel_video].filter(Boolean):post.images;
 for(const asset of originalAssets){
  const url=publicMedia(media[asset.asset_id]);
  if(!url){blockers.push('public_media_required');continue;}
  input.assets.push(reel?{video:{url}}:{image:{url}});
 }
 if(reel)input.metadata={instagram:{type:'reel',shouldShareToFeed:true}};
 else if(platform==='instagram')input.metadata={instagram:{type:'post',shouldShareToFeed:true}};
 else if(post.threads_topic_tag)input.metadata={threads:{topic:post.threads_topic_tag}};
 const approval_basis=digest([contentBasis(post),platform,input]);
 const a=post.publication_approval;
 if(a?.scope!=='buffer-schedule'||a.basis!==approval_basis||a.output_version!==post.output_version)blockers.push('buffer_publication_approval_required');
 return {provider:'buffer',mode:'offline-preview',external_calls:0,post_id:post.post_id,output_version:post.output_version,platform,channel_id,input,approval_basis,key:digest(['buffer',post.post_id,post.output_version,platform,channel_id,approval_basis]),ready:blockers.length===0,blockers:[...new Set(blockers)],original_image_count:post.images.length,original_asset_ids:originalAssets.map(a=>a.asset_id)};
}
export function approveBufferPlan(state,plan,expectedRevision,now=Date.now()){
 if(state.revision!==expectedRevision)fail('revision_conflict');
 if(plan.blockers.some(c=>c!=='buffer_publication_approval_required'))fail('buffer_review_required');
 const s=clone(state),p=s.posts.find(p=>p.post_id===plan.post_id);
 if(!p||p.output_version!==plan.output_version||!isActivePost(p))fail('buffer_stale_plan');
 const currentBlocks=readiness({...p,targets:[plan.platform]}).filter(r=>!['account_unconnected','public_media_required'].includes(r.code));
 if(currentBlocks.length||!p.targets.includes(plan.platform))fail('buffer_review_required');
 if(digest([contentBasis(p),plan.platform,plan.input])!==plan.approval_basis||plan.input.channelId!==plan.channel_id)fail('buffer_stale_plan');
 // This transition is not exposed by the offline HTTP server. Future callers must
 // show this exact account, caption, images and date before explicit user approval.
 p.publication_approval={scope:'buffer-schedule',basis:plan.approval_basis,output_version:p.output_version,approved_at:new Date(now).toISOString()};
 p.revision++;s.revision++;return s;
}
function requireSnapshot(snapshot,now){
 if(!snapshot?.complete||!Number.isFinite(snapshot.observed_at)||snapshot.observed_at>now||now-snapshot.observed_at>300000||
  !snapshot.channels||Object.values(snapshot.channels).some(n=>!Number.isInteger(n)||n<0))fail('queue_snapshot_required');
}
function pendingCount(state,channel,snapshot){
 const remote=new Set(snapshot.provider_ids||[]);
 return (state.buffer_attempts||[]).filter(a=>a.channel_id===channel&&heldStates.has(a.state)&&(!a.provider_id||!remote.has(a.provider_id))&&a.state!=='published').length;
}
function duplicate(state,plan){return (state.buffer_attempts||[]).some(a=>a.post_id===plan.post_id&&a.channel_id===plan.channel_id&&heldStates.has(a.state));}
export function refillBufferPlans(plans,snapshot,state,now=Date.now()){
 requireSnapshot(snapshot,now);
 const occupied={...snapshot.channels};
 for(const channel of Object.keys(occupied))occupied[channel]+=pendingCount(state,channel,snapshot);
 const selected=[],held=[],seen=new Set();
 for(const plan of plans){
  let reason=null;
  if(!plan.ready)reason='review_or_approval_required';
  else if(duplicate(state,plan)||seen.has(plan.post_id+'\0'+plan.channel_id))reason='duplicate_buffer_handoff';
  else if(!Object.hasOwn(occupied,plan.channel_id)||occupied[plan.channel_id]>=10)reason='buffer_queue_full';
  if(reason){held.push({key:plan.key,reason});continue;}
  selected.push(plan);seen.add(plan.post_id+'\0'+plan.channel_id);occupied[plan.channel_id]++;
 }
 return {selected,held,occupied,external_calls:0};
}
export function bufferRequestBudget(times,now=Date.now()){
 const windows=[{ms:900000,limit:100},{ms:86400000,limit:250},{ms:2592000000,limit:3000}].map(w=>({...w,used:times.filter(t=>Number.isFinite(t)&&t>now-w.ms&&t<=now).length}));
 return {allowed:windows.every(w=>w.used<w.limit),windows,scope:'local-client-only',provider_headers_required:true};
}
export function reserveBufferPlan(state,plan,snapshot,expectedRevision,now=Date.now()){
 if(state.revision!==expectedRevision)fail('revision_conflict');
 if(duplicate(state,plan))fail('duplicate_buffer_handoff');
 const post=state.posts.find(p=>p.post_id===plan.post_id),a=post?.publication_approval;
 if(!post||post.output_version!==plan.output_version||a?.scope!=='buffer-schedule'||a.basis!==plan.approval_basis||a.output_version!==post.output_version)fail('buffer_stale_plan');
 const due=Date.parse(plan.input?.dueAt),currentBlocks=readiness({...post,targets:[plan.platform]}).filter(r=>!['account_unconnected','public_media_required'].includes(r.code));
 if(!['instagram','threads'].includes(plan.platform)||!isActivePost(post)||!post.targets.includes(plan.platform)||currentBlocks.length||!Number.isFinite(due)||due<=now)fail('buffer_review_required');
 if(!plan.ready)fail('buffer_stale_plan');
 const expected=digest([contentBasis(post),plan.platform,plan.input]);
 if(expected!==plan.approval_basis||plan.channel_id!==plan.input.channelId)fail('buffer_stale_plan');
 if(!refillBufferPlans([plan],snapshot,state,now).selected.length)fail('buffer_queue_full');
 if(!bufferRequestBudget(state.buffer_request_times||[],now).allowed)fail('buffer_request_budget');
 const s=clone(state);
 s.buffer_attempts||=[];s.buffer_request_times||=[];
 s.buffer_attempts.push({key:plan.key,post_id:plan.post_id,output_version:plan.output_version,channel_id:plan.channel_id,platform:plan.platform,approval_basis:plan.approval_basis,state:'reserved',provider_id:null,success_url:null,attempted_at:new Date(now).toISOString(),retry_allowed:false});
 s.buffer_request_times.push(now);s.revision++;return s;
}
function safeSuccessUrl(url,platform){
 try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&
  (platform==='instagram'?['www.instagram.com','instagram.com'].includes(u.hostname):['www.threads.com','threads.com','www.threads.net','threads.net'].includes(u.hostname))?u.href:null;}catch{return null;}
}
export function finishBufferAttempt(state,key,response,now=Date.now()){
 const s=clone(state),a=s.buffer_attempts?.find(x=>x.key===key);
 if(!a)fail('buffer_attempt_not_found');
 if(!['reserved','reconciliation'].includes(a.state))fail('buffer_attempt_already_finished');
 const result=response?.data?.createPost,post=result?.post;
 a.updated_at=new Date(now).toISOString();a.retry_allowed=false;a.success_url=null;
 if(typeof post?.id==='string'&&/^[\w-]{1,200}$/.test(post.id)&&post.channelId===a.channel_id){
  a.provider_id=post.id;a.provider_status=Object.hasOwn(providerStates,post.status)?post.status:null;a.due_at=post.dueAt||null;
  a.state=response.errors?.length?'reconciliation':(providerStates[post.status]||'reconciliation');
  if(a.state==='published')a.success_url=safeSuccessUrl(post.externalLink,a.platform);
  a.failure_code=a.state==='publication_failed'?'provider_publication_failed':a.state==='reconciliation'?'provider_outcome_unknown':null;
 }else if(!response?.errors?.length&&['InvalidInputError','LimitReachedError','ChannelRefreshRequired','NotAllowedError'].includes(result?.__typename)){
  a.state='rejected';a.failure_code=result.__typename;
 }else{a.state='reconciliation';a.failure_code='provider_outcome_unknown';}
 // Raw GraphQL messages, headers and request bodies are deliberately not persisted.
 s.revision++;return s;
}
export function refreshBufferStatus(state,key,response,now=Date.now()){
 const s=clone(state),a=s.buffer_attempts?.find(x=>x.key===key);
 if(!a?.provider_id)fail('buffer_provider_id_required');
 if(!Number.isFinite(now)||now<Date.parse(a.updated_at||a.attempted_at||''))fail('buffer_status_stale');
 // Published is a terminal fact. Delayed reads cannot reopen its slot or retry fence.
 if(a.state==='published')return s;
 const post=response?.data?.post;
 a.updated_at=new Date(now).toISOString();a.retry_allowed=false;a.success_url=null;
 if(!response?.errors?.length&&post?.id===a.provider_id&&post.channelId===a.channel_id&&Object.hasOwn(providerStates,post.status)){
  a.provider_status=post.status;a.state=providerStates[post.status];a.due_at=post.dueAt||null;
  a.failure_code=a.state==='publication_failed'?'provider_publication_failed':null;
  if(a.state==='published')a.success_url=safeSuccessUrl(post.externalLink,a.platform);
 }else{a.state='reconciliation';a.failure_code='provider_outcome_unknown';}
 // A queue's absence is never evidence of publication. Refresh the known ID only.
 s.revision++;return s;
}
export function recoverBufferAttempts(state){
 const s=clone(state);let changed=false;
 for(const a of s.buffer_attempts||[])if(a.state==='reserved'){a.state='reconciliation';a.failure_code='interrupted_result_unknown';a.retry_allowed=false;changed=true;}
 if(changed)s.revision++;return s;
}
export function bufferQueueSnapshot(pages,channelIds,now=Date.now()){
 const channels=Object.fromEntries(channelIds.map(c=>[c,0])),ids=new Set();let complete=pages.length>0;
 for(let i=0;i<pages.length;i++){
  const page=pages[i]?.data?.posts;
  if(pages[i]?.errors?.length||!Array.isArray(page?.edges)||!page.pageInfo){complete=false;continue;}
  if(i===pages.length-1&&page.pageInfo.hasNextPage)complete=false;
  for(const edge of page.edges){
   const node=edge?.node;
   if(!node?.id||!Object.hasOwn(channels,node.channelId)||!Object.hasOwn(providerStates,node.status)){complete=false;continue;}
   if(node.status!=='sent'&&!ids.has(node.id)){ids.add(node.id);channels[node.channelId]++;}
  }
 }
 return {complete,observed_at:now,channels,provider_ids:[...ids]};
}
