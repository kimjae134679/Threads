import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as domain from './domain.mjs';
import {StateStore} from './store.mjs';
import {migrateTitleFormat,validateTitleEditApproval} from './title-format.mjs';
import {readDeliveryResults,deliveryResultsProjection} from './delivery-results.mjs';
import {seedReviewTags} from './review-tags.mjs';
import {reviewDecisionProjection} from './review-decisions.mjs';
import {ReviewHandoff,reviewHandoffProjection} from './review-handoff.mjs';
import {OfflineConnectionPreparation} from './connection-preparation.mjs';
import {WindowsCredentialVault} from './credential-vault.mjs';
import {OAuthCallbackBroker} from './oauth-callback.mjs';
import {LocalVideoAssets,renderReel,buildReelDryRun} from './reels.mjs';
import {LocalAssets} from './local-assets.mjs';
import {ProductionInput,DEFAULT_MATERIAL_ROOT} from './production-input.mjs';
import {ProductionSync} from './production-sync.mjs';
import {CurrentProduction} from './current-production.mjs';
import {AutoProductionLink} from './auto-production-link.mjs';
import {ReadOnlyViewer} from './read-only-viewer.mjs';
import {DEFAULT_SCHEDULE,previewQueueSchedule,applyQueueSchedule} from './queue-schedule.mjs';
import {historyFor,undoPost,redoPost,restorePostSnapshot} from './history.mjs';
import {offlinePlan} from './adapter.mjs';
import {previewBufferPost,recoverBufferAttempts} from './buffer.mjs';
import {PublicationJournal} from './vendor/publication-journal.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{code,status});};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8'};
async function readBody(req){let bytes=0;const chunks=[];for await(const c of req){bytes+=c.length;if(bytes>16000000)fail('body_too_large',413);chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('invalid_json');}}
function sendJson(res,status,value){if(value?.state?.posts)value={...value,state:{...value.state,posts:value.state.posts.map(p=>({...p,review_note:domain.reviewNote(p),review_note_updated_at:p.review_note_updated_at||null,final_review_status:domain.finalReviewStatus(p).decision}))}};res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));}
// Private local edit authorization is never imported from requests or producer input.
export async function readTitleEditApproval(root){
  const file=path.join(root,'title-edit-approval.json'),limit=1048576;
  let before;try{before=await fs.lstat(file);}catch(error){if(error.code==='ENOENT')return null;fail('title_edit_approval_invalid');}
  if(!before.isFile()||before.isSymbolicLink()||before.size>limit)fail('title_edit_approval_invalid');
  let handle;
  try{
    const [rootReal,fileReal]=await Promise.all([fs.realpath(root),fs.realpath(file)]);
    if(path.relative(rootReal,fileReal)!=='title-edit-approval.json')fail('title_edit_approval_invalid');
    handle=await fs.open(file,'r');
    const actual=await handle.stat();
    if(!actual.isFile()||actual.size>limit||actual.dev!==before.dev||actual.ino!==before.ino)fail('title_edit_approval_invalid');
    const bytes=Buffer.alloc(limit+1);let length=0;
    while(length<bytes.length){
      const {bytesRead}=await handle.read(bytes,length,bytes.length-length,length);
      if(!bytesRead)break;length+=bytesRead;
    }
    if(length>limit)fail('title_edit_approval_invalid');
    const value=JSON.parse(bytes.subarray(0,length).toString('utf8'));
    if(value===null)fail('title_edit_approval_invalid');
    return validateTitleEditApproval(value);
  }catch{fail('title_edit_approval_invalid');}
  finally{if(handle)await handle.close();}
}
export async function createStudioServer({root=path.join(here,'.local'),port=4387,materialRoot=DEFAULT_MATERIAL_ROOT,seedTags=true,projectManifest=path.resolve(DEFAULT_MATERIAL_ROOT,'..','project.control.json')}={}) {
  let lastDelivery={records:[],warnings:[]};
  const send=(res,status,value)=>{if(value?.state)value={...value,finalReview:{...(value.finalReview||{}),deliveryResults:deliveryResultsProjection(value.state,lastDelivery.records).filter(row=>Object.values(row.platforms||{}).some(platform=>platform.recordedAt!=null||platform.status==='error')),deliveryWarnings:lastDelivery.warnings}};return sendJson(res,status,value);};
  const assets=new LocalAssets(root),handoff=new ReviewHandoff(root,assets);
  const viewer=new ReadOnlyViewer(projectManifest,()=>store.read());
  let handoffStatus={path:null,count:0,state_revision:null,handoff_id:null,pending:true,code:'handoff_pending'};
  let pendingHandoff=null,activeHandoff=null,handoffTask=null,handoffScheduled=null,desiredHandoffKey=null,desiredHandoffRevision=null,closing=false;
  const handoffWaiters=new Map(),clone=value=>JSON.parse(JSON.stringify(value));
  const handoffError=(code,status=400)=>Object.assign(new Error(code),{code,status});
  const handoffKey=projection=>projection.state_revision+':'+projection.handoff_id;
  const pendingStatus=projection=>({path:null,count:projection.count,state_revision:projection.state_revision,handoff_id:projection.handoff_id,pending:true,code:'handoff_pending'});
  const currentHandoffStatus=(state,projection=reviewHandoffProjection(state))=>handoffStatus.state_revision===state.revision&&handoffStatus.handoff_id===projection.handoff_id?{...handoffStatus}:pendingStatus(projection);
  function settleHandoff(key,error,result){
    const waiting=handoffWaiters.get(key)||[];handoffWaiters.delete(key);
    for(const waiter of waiting)if(error)waiter.reject(error);else waiter.resolve(result);
  }
  function scheduleHandoff(){
    if(closing||handoffTask||handoffScheduled||!pendingHandoff)return;
    handoffScheduled=setImmediate(()=>{
      handoffScheduled=null;
      handoffTask=runHandoffs().finally(()=>{handoffTask=null;scheduleHandoff();});
    });
  }
  function requestHandoff(state,authoritative=false){
    if(closing)throw handoffError('server_closing',503);
    const snapshot=clone(state),projection=reviewHandoffProjection(snapshot),key=handoffKey(projection);
    if(!authoritative&&desiredHandoffRevision!==null&&(projection.state_revision<desiredHandoffRevision||projection.state_revision===desiredHandoffRevision&&key!==desiredHandoffKey))throw handoffError('revision_conflict',409);
    desiredHandoffRevision=projection.state_revision;desiredHandoffKey=key;handoffStatus=pendingStatus(projection);
    for(const oldKey of handoffWaiters.keys())if(oldKey!==key)settleHandoff(oldKey,handoffError('revision_conflict',409));
    // Coalesce repeated requests for the active or already pending snapshot.
    if(activeHandoff?.key!==key&&pendingHandoff?.key!==key)pendingHandoff={state:snapshot,projection,key};
    scheduleHandoff();
    return key;
  }
  function waitForHandoff(state){
    const projection=reviewHandoffProjection(state),key=handoffKey(projection);
    const promise=new Promise((resolve,reject)=>{const waiting=handoffWaiters.get(key)||[];waiting.push({resolve,reject});handoffWaiters.set(key,waiting);});
    try{requestHandoff(state);}catch(error){settleHandoff(key,error);}
    return promise;
  }
  async function runHandoffs(){
    while(pendingHandoff&&!closing){
      const task=pendingHandoff;pendingHandoff=null;activeHandoff=task;
      try{
        // Wait for the save lease to finish, then release it before any image I/O.
        const before=await store.mutate(state=>state);
        if(before.revision!==task.state.revision||handoffKey(reviewHandoffProjection(before))!==task.key)throw handoffError('revision_conflict',409);
        const result=await handoff.write(task.state);
        // Hash/MIME validation stays in the full exporter. Only a matching live
        // revision and fingerprint set may become the advertised latest export.
        await store.mutate(state=>{
          if(closing||desiredHandoffKey!==task.key||state.revision!==task.state.revision||handoffKey(reviewHandoffProjection(state))!==task.key)throw handoffError('revision_conflict',409);
          handoffStatus={...result,pending:false,code:null};return state;
        });
        settleHandoff(task.key,null,result);
      }catch(error){
        if(desiredHandoffKey===task.key)handoffStatus={...pendingStatus(task.projection),pending:false,code:/^[a-z0-9_]+$/.test(error.code||'')?error.code:'handoff_write_failed'};
        settleHandoff(task.key,error);
      }finally{activeHandoff=null;}
    }
  }
  const decisionFile=path.join(root,'final-review-decisions.json');
  const refreshDecisions=state=>store.write(decisionFile,reviewDecisionProjection(state));
  const store=new StateStore(root,{onSaved:async state=>{await refreshDecisions(state);requestHandoff(state,true);}}),journal=new PublicationJournal(path.join(root,'dry-run-journal')),active=new Map();
  const connections=new OfflineConnectionPreparation(),videos=new LocalVideoAssets(root),callbackBroker=new OAuthCallbackBroker({preparation:connections,vault:new WindowsCredentialVault(root),live_authorized:false});
  const rawProduction=new ProductionInput(materialRoot,assets),production=new CurrentProduction(rawProduction,root,store,assets),productionSync=new ProductionSync(production,store),autoProduction=new AutoProductionLink(rawProduction,root,store,assets);
  let runtimeStatusTail=Promise.resolve(),runtimeStatusTimer=null;
  function observeRuntime(){const task=runtimeStatusTail.then(async()=>{
    let stateLock=0;try{await fs.lstat(store.lock);stateLock=1;}catch(e){if(e.code!=='ENOENT')throw e;}
    const status={schemaVersion:1,appId:'threads-upload-studio',checkedAt:new Date().toISOString(),processId:process.pid,
      activeJobs:active.size+Number(autoProduction.progress.running)+Number(Boolean(handoffTask||handoffScheduled))+stateLock};
    await store.write(path.join(root,'controller-runtime-status.json'),status);return status;
  });runtimeStatusTail=task.catch(()=>{});return task;}
  const titleEditApproval=await readTitleEditApproval(root);
  await store.mutate(s=>{const next=migrateTitleFormat(recoverBufferAttempts(domain.recoverJobs(s)),titleEditApproval).state;if(!seedTags||next.review_tags_initialized)return next;const seeded=seedReviewTags(next);seeded.review_tags_initialized=true;if(seeded.revision===next.revision)seeded.revision++;return seeded;});
  // Recreate the small decision file under the existing state lock without changing any review.
  await store.mutate(async state=>{await refreshDecisions(state);requestHandoff(state,true);return state;});
  const server=http.createServer(async(req,res)=>{
    try {
      const actualPort=server.address().port,hosts=['127.0.0.1:'+actualPort,'localhost:'+actualPort];
      if(!hosts.includes(req.headers.host))fail('invalid_host',403);
      if(req.headers.origin&&!['http://127.0.0.1:'+actualPort,'http://localhost:'+actualPort].includes(req.headers.origin))fail('foreign_origin',403);
      res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");
      const url=new URL(req.url,'http://127.0.0.1:'+actualPort),route=url.pathname;
      if(req.method==='GET'&&/^\/oauth\/callback\/(instagram|threads)$/.test(route)){if(!callbackBroker.live_authorized)fail('oauth_permission_required',405);fail('oauth_exchange_not_configured',405);}
      if(route==='/api/publish'||route==='/api/schedule'||route==='/api/connect')fail('live_operation_disabled',405);
      if(req.method==='GET'&&route==='/api/history')return send(res,200,historyFor(await store.read(),url.searchParams.get('post_id')));
      if(req.method==='GET'&&route==='/api/connection-guide')return send(res,200,{connected:false,externalCalls:0,configured_account_label:'@aftertalk2026',professional_status:'user_reported_not_api_verified',supported:['instagram','threads'],audio_api:'Facebook Login 연결과 별도 권한 확인 후 지원 준비',next_steps:['공개 앱 ID와 등록한 HTTPS 회신 주소 입력','최소 권한·계정·회신 주소 확인','사용자가 OAuth 동의 화면과 인증 교환을 별도 승인'],live_consent_enabled:false});
      if(req.method==='GET'&&/^\/videos\/[a-f0-9]{64}$/.test(route)){const {asset,bytes}=await videos.read(route.split('/').at(-1));res.writeHead(200,{'content-type':asset.mime,'content-length':bytes.length,'cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(bytes);}
      if(req.method==='POST'&&route==='/api/videos'){if(req.headers['x-studio-local']!=='1'||!['video/mp4','video/quicktime'].includes(req.headers['content-type']))fail('local_request_required',403);const asset=await videos.add({stream:req,mime:req.headers['content-type'],name:'local-video'});return send(res,200,{asset,externalCalls:0});}
      if(req.method==='GET'&&route==='/api/production')return send(res,200,await production.catalog());
      if(req.method==='GET'&&route==='/api/production/sync-status')return send(res,200,productionSync.progress);
      if(req.method==='GET'&&route==='/api/production/auto-status')return send(res,200,autoProduction.progress);
      if(req.method==='GET'&&route==='/api/navigation')return send(res,200,await viewer.status());
      if(req.method==='GET'&&route==='/api/integration/status')return send(res,200,await observeRuntime());
      if(req.method==='GET'&&(route==='/viewer'||route.startsWith('/viewer/'))){const out=await viewer.read(route);res.writeHead(200,{'content-type':out.mime,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':out.csp});return res.end(out.bytes);}
      if(req.method==='GET'&&route==='/api/final-review/handoff'){const state=await store.read(),projection=reviewHandoffProjection(state);return send(res,200,{...projection,latest:currentHandoffStatus(state,projection)});}
      if(req.method==='GET'&&route==='/api/buffer/status')return send(res,200,{provider:'buffer',mode:'offline-only',apiConnected:false,externalCalls:0,queueLimitPerChannel:10,credentialConfigured:false});
      if(req.method==='GET'&&route==='/api/health')return send(res,200,{appId:'threads-upload-studio',mode:'offline-only',port:actualPort,accountsConnected:false,externalCalls:0});
      if(req.method==='GET'&&route==='/api/schedule-defaults')return send(res,200,{defaults:(await store.read()).schedule_defaults||DEFAULT_SCHEDULE});
      if(req.method==='GET'&&route==='/api/state'){const state=await store.read();lastDelivery=await readDeliveryResults(root);return send(res,200,{state,mode:'offline-only',accountsConnected:false});}
      if(req.method==='GET'&&route==='/api/export')return send(res,200,{bundle_id:'upload-studio-local-export',posts:(await store.read()).posts.map(p=>({post_id:p.post_id,output_version:p.output_version,source:p.source,production_feedback:p.production_feedback,review_note:domain.reviewNote(p),review_note_updated_at:p.review_note_updated_at||null,threads_title_only:p.threads_title_only,caption:p.caption,platform_captions:p.platform_captions,platform_caption_edited:p.platform_caption_edited,publication_title:p.publication_title,production_caption_version:p.production_caption_version,production_caption_status:p.production_caption_status,tags:p.tags,topic_tags:p.topic_tags,topic_tags_edited:p.topic_tags_edited,threads_topic_tag:p.threads_topic_tag,common_tags:p.common_tags,media_format:p.media_format,reel_video:p.reel_video,music:p.music,images:p.images,local_settings:{targets:p.targets,timing:p.timing}}))});
      if(req.method==='GET'&&/^\/assets\/[a-f0-9]{64}$/.test(route)){const {asset,bytes}=await assets.read(route.split('/').at(-1));res.writeHead(200,{'content-type':asset.mime,'content-length':bytes.length,'cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(bytes);}
      if(req.method==='POST'&&route.startsWith('/api/')){
        if(req.headers['x-studio-local']!=='1'||!String(req.headers['content-type']).startsWith('application/json'))fail('local_request_required',403);
        const body=await readBody(req);domain.rejectSecrets(body);let state;
        if(route==='/api/buffer/preview'){const saved=await store.read(),post=saved.posts.find(p=>p.post_id===body.post_id);if(!post)fail('post_not_found');if(body.expected_revision!==post.revision)fail('revision_conflict',409);return send(res,200,previewBufferPost(post,body.options||{}));}
        if(route.startsWith('/api/buffer/'))fail('live_operation_disabled',405);
        if(route==='/api/connection/prepare')return send(res,200,connections.prepare(body));
        if(route==='/api/final-review/handoff'){const snapshot=await store.read(),projection=reviewHandoffProjection(snapshot);if(snapshot.revision!==body.expected_revision)fail('revision_conflict',409);let completion;await store.mutate(async s=>{if(s.revision!==snapshot.revision||handoffKey(reviewHandoffProjection(s))!==handoffKey(projection))fail('revision_conflict',409);await refreshDecisions(s);completion=waitForHandoff(snapshot).then(value=>({value}),error=>({error}));return s;});const outcome=await completion;if(outcome.error)throw outcome.error;const result=outcome.value;await store.mutate(s=>{if(s.revision!==snapshot.revision||handoffKey(reviewHandoffProjection(s))!==handoffKey(projection))fail('revision_conflict',409);return s;});return send(res,200,result);}
        if(route==='/api/final-review'){const saved=await store.mutate(s=>{const p=s.posts.find(p=>p.post_id===body.post_id);if(p&&(body.expected_output_version!==undefined&&body.expected_output_version!==p.output_version||body.expected_basis!==undefined&&body.expected_basis!==domain.finalReviewStatus(p).basis))fail('review_form_version_changed',409);return domain.setFinalReview(s,body.post_id,body.decision,body.expected_revision,Date.now());});return send(res,200,{state:saved,handoff:currentHandoffStatus(saved),externalCalls:0});}
        if(route==='/api/common-tags')return send(res,200,{state:await store.mutate(s=>domain.setCommonTags(s,body.tags,body.expected_revision)),externalCalls:0});
        else if(route==='/api/queue/order')return send(res,200,{state:await store.mutate(s=>domain.moveQueueJob(s,body.job_id,body.direction,body.expected_revision)),externalCalls:0});
        else if(route==='/api/reels/stop'){const controller=active.get('reel-'+body.post_id);if(!controller)fail('job_not_running');controller.abort();return send(res,200,{stopping:true,externalCalls:0});}
        else if(route==='/api/reels/render'){const before=await store.read(),post=before.posts.find(p=>p.post_id===body.post_id);if(!post||post.revision!==body.expected_revision)fail('revision_conflict',409);const key='reel-'+post.post_id;if(active.has(key))fail('reel_busy',409);const controller=new AbortController();active.set(key,controller);try{const result=await renderReel({post,assets,root,signal:controller.signal});state=await store.mutate(s=>domain.editPost(s,post.post_id,{media_format:'reel',reel_video:{...result.asset,source_images:result.metadata.source_images}},body.expected_revision));}finally{active.delete(key);}return send(res,200,{state,externalCalls:0});}
        else if(route==='/api/assets')return send(res,200,{asset:await assets.add(body),externalCalls:0});
        if(route==='/api/production/sync')return send(res,200,await productionSync.run());
        else if(route==='/api/production/import')return send(res,200,await productionSync.run(body.selection));
        else if(route==='/api/bundles'){await assets.verifyPosts(body.posts||[]);for(const p of body.posts||[])if(p.reel_video)await videos.verify(p.reel_video);state=await store.mutate(s=>domain.importBundle(s,body));}
        else if(route.startsWith('/api/posts/')){const postId=decodeURIComponent(route.slice('/api/posts/'.length));if(body.patch?.images)await assets.verifyPosts([{images:body.patch.images}]);if(body.patch?.reel_video)body.patch.reel_video=await videos.verify(body.patch.reel_video);state=await store.mutate(s=>{const patch={...(body.patch||{})};if(Object.hasOwn(patch,'review_note'))patch.review_note_updated_at=new Date().toISOString();return domain.editPost(s,postId,patch,body.expected_revision);});}
        else if(route==='/api/approve')state=await store.mutate(s=>domain.approveDryRun(s,body.post_id,body.expected_revision));
        else if(route==='/api/queue-schedule/preview')return send(res,200,previewQueueSchedule(await store.read(),body.config));
        else if(route==='/api/queue-schedule/apply')state=await store.mutate(s=>applyQueueSchedule(s,body.config,body.expected_revision));
        else if(route==='/api/history/undo')state=await store.mutate(s=>undoPost(s,body.post_id,body.expected_revision));
        else if(route==='/api/history/redo')state=await store.mutate(s=>redoPost(s,body.post_id,body.expected_revision));
        else if(route==='/api/history/restore')state=await store.mutate(s=>restorePostSnapshot(s,body.post_id,body.entry_id,body.expected_revision));
        else if(route==='/api/queue'){const p=(await store.read()).posts.find(p=>p.post_id===body.post_id);if(!p||!domain.isActivePost(p))fail('post_out_of_active_scope');state=await store.mutate(s=>domain.queuePost(s,body.post_id,body.expected_revision));}
        else if(route==='/api/cancel')state=await store.mutate(s=>domain.cancelJobs(s,body.job_ids));
        else if(route==='/api/retry')state=await store.mutate(s=>domain.retryJob(s,body.job_id));
        else if(route==='/api/restore-backup')state=await store.restoreBackup();
        else if(route==='/api/stop'){const controller=active.get(body.job_id);if(!controller)fail('job_not_running');controller.abort();state=await store.read();}
        else if(route==='/api/dry-run'){
          state=await store.mutate(s=>domain.startDryRun(s,body.job_id));const job=state.jobs.find(j=>j.id===body.job_id),post=state.posts.find(p=>p.post_id===job.post_id),controller=new AbortController();active.set(job.id,controller);
          try {
            const key=createHash('sha256').update(job.key).digest('hex');
            const out=await journal.execute({provider:'offline-preview',candidateId:post.post_id,approvalBasis:key,accountKey:JSON.stringify(job.targets.map(t=>'unconnected-'+t)),payload:{caption:domain.finalCaption(post),platform_captions:post.platform_captions,images:post.images,targets:job.targets},publish:async()=>{const imageTargets=post.targets.filter(t=>!(t==='instagram'&&post.media_format==='reel'));const plans=imageTargets.length?await offlinePlan({...post,targets:imageTargets},{signal:controller.signal}):[];if(post.targets.includes('instagram')&&post.media_format==='reel'){const video=await videos.verify(post.reel_video);plans.push(buildReelDryRun({caption:domain.finalCaption(post,'instagram'),videoUrl:'https://media.invalid/reel.mp4',video}));}for(const plan of plans)if(plan.provider==='threads'||plan.platform==='threads')plan.topic_tag=post.threads_topic_tag||'';return {plans,externalCalls:0,dryRun:true};}});
            state=await store.mutate(s=>domain.finishDryRun(s,job.id,out.result));
          }catch(e){state=await store.mutate(s=>domain.failDryRun(s,job.id,typeof e.code==='string'?e.code:'offline_plan_failed',true));}
          finally {active.delete(job.id);}
        }else fail('route_not_found',404);
        return send(res,200,{state,externalCalls:0});
      }
      if(req.method!=='GET')fail('method_not_allowed',405);
      const files={'/':'public/index.html','/studio.js':'public/studio.js','/studio.css':'public/studio.css','/icons.mjs':'public/icons.mjs','/draft-backups.mjs':'public/draft-backups.mjs','/domain.mjs':'domain.mjs','/final-review.mjs':'final-review.mjs','/title-normalization.mjs':'title-normalization.mjs','/tags.mjs':'tags.mjs'};
      if(!files[route])fail('route_not_found',404);
      const file=path.join(here,files[route]),data=await fs.readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)],'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(data);
    }catch(e){const code=/^[a-z0-9_]+$/.test(e.code||'')?e.code:'local_operation_failed';send(res,e.status||500,{ok:false,code});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  const url='http://127.0.0.1:'+server.address().port;
  await autoProduction.start();
  await observeRuntime();runtimeStatusTimer=setInterval(()=>observeRuntime().catch(()=>{}),2000);runtimeStatusTimer.unref();
  return {server,url,close:async()=>{clearInterval(runtimeStatusTimer);await runtimeStatusTail;await autoProduction.stop();closing=true;pendingHandoff=null;if(handoffScheduled){clearImmediate(handoffScheduled);handoffScheduled=null;}for(const key of handoffWaiters.keys())settleHandoff(key,handoffError('server_closing',503));for(const c of active.values())c.abort();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await handoffTask;}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const portArg=process.argv.indexOf('--port');const port=portArg<0?4387:Number(process.argv[portArg+1]);
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid_local_port');
  const materialArg=process.argv.indexOf('--material-root');const materialRoot=materialArg<0?DEFAULT_MATERIAL_ROOT:process.argv[materialArg+1];if(!materialRoot)throw Error('invalid_material_root');
  const app=await createStudioServer({port,materialRoot});console.log('Upload Studio (offline only): '+app.url);for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
}
