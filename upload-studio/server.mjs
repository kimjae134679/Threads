import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as domain from './domain.mjs';
import {StateStore} from './store.mjs';
import {OfflineConnectionPreparation} from './connection-preparation.mjs';
import {WindowsCredentialVault} from './credential-vault.mjs';
import {OAuthCallbackBroker} from './oauth-callback.mjs';
import {LocalVideoAssets,renderReel,buildReelDryRun} from './reels.mjs';
import {LocalAssets} from './local-assets.mjs';
import {ProductionInput,DEFAULT_MATERIAL_ROOT} from './production-input.mjs';
import {ProductionSync} from './production-sync.mjs';
import {DEFAULT_SCHEDULE,previewQueueSchedule,applyQueueSchedule} from './queue-schedule.mjs';
import {historyFor,undoPost,redoPost,restorePostSnapshot} from './history.mjs';
import {offlinePlan} from './adapter.mjs';
import {previewBufferPost,recoverBufferAttempts} from './buffer.mjs';
import {PublicationJournal} from './vendor/publication-journal.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{code,status});};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8'};
async function readBody(req){let bytes=0;const chunks=[];for await(const c of req){bytes+=c.length;if(bytes>16000000)fail('body_too_large',413);chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('invalid_json');}}
function send(res,status,value){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));}
export async function createStudioServer({root=path.join(here,'.local'),port=4387,materialRoot=DEFAULT_MATERIAL_ROOT}={}) {
  const store=new StateStore(root),assets=new LocalAssets(root),journal=new PublicationJournal(path.join(root,'dry-run-journal')),active=new Map();
  const connections=new OfflineConnectionPreparation(),videos=new LocalVideoAssets(root),callbackBroker=new OAuthCallbackBroker({preparation:connections,vault:new WindowsCredentialVault(root),live_authorized:false});
  const production=new ProductionInput(materialRoot,assets),productionSync=new ProductionSync(production,store);
  await store.mutate(s=>recoverBufferAttempts(domain.recoverJobs(s)));
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
      if(req.method==='GET'&&route==='/api/buffer/status')return send(res,200,{provider:'buffer',mode:'offline-only',apiConnected:false,externalCalls:0,queueLimitPerChannel:10,credentialConfigured:false});
      if(req.method==='GET'&&route==='/api/health')return send(res,200,{appId:'threads-upload-studio',mode:'offline-only',port:actualPort,accountsConnected:false,externalCalls:0});
      if(req.method==='GET'&&route==='/api/schedule-defaults')return send(res,200,{defaults:(await store.read()).schedule_defaults||DEFAULT_SCHEDULE});
      if(req.method==='GET'&&route==='/api/state')return send(res,200,{state:await store.read(),mode:'offline-only',accountsConnected:false});
      if(req.method==='GET'&&route==='/api/export')return send(res,200,{bundle_id:'upload-studio-local-export',posts:(await store.read()).posts.map(p=>({post_id:p.post_id,output_version:p.output_version,source:p.source,production_feedback:p.production_feedback,threads_title_only:p.threads_title_only,caption:p.caption,platform_captions:p.platform_captions,platform_caption_edited:p.platform_caption_edited,publication_title:p.publication_title,production_caption_version:p.production_caption_version,production_caption_status:p.production_caption_status,tags:p.tags,topic_tags:p.topic_tags,topic_tags_edited:p.topic_tags_edited,threads_topic_tag:p.threads_topic_tag,common_tags:p.common_tags,media_format:p.media_format,reel_video:p.reel_video,music:p.music,images:p.images,local_settings:{targets:p.targets,timing:p.timing}}))});
      if(req.method==='GET'&&/^\/assets\/[a-f0-9]{64}$/.test(route)){const {asset,bytes}=await assets.read(route.split('/').at(-1));res.writeHead(200,{'content-type':asset.mime,'content-length':bytes.length,'cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(bytes);}
      if(req.method==='POST'&&route.startsWith('/api/')){
        if(req.headers['x-studio-local']!=='1'||!String(req.headers['content-type']).startsWith('application/json'))fail('local_request_required',403);
        const body=await readBody(req);domain.rejectSecrets(body);let state;
        if(route==='/api/buffer/preview'){const saved=await store.read(),post=saved.posts.find(p=>p.post_id===body.post_id);if(!post)fail('post_not_found');if(body.expected_revision!==post.revision)fail('revision_conflict',409);return send(res,200,previewBufferPost(post,body.options||{}));}
        if(route.startsWith('/api/buffer/'))fail('live_operation_disabled',405);
        if(route==='/api/connection/prepare')return send(res,200,connections.prepare(body));
        if(route==='/api/common-tags')return send(res,200,{state:await store.mutate(s=>domain.setCommonTags(s,body.tags,body.expected_revision)),externalCalls:0});
        else if(route==='/api/queue/order')return send(res,200,{state:await store.mutate(s=>domain.moveQueueJob(s,body.job_id,body.direction,body.expected_revision)),externalCalls:0});
        else if(route==='/api/reels/stop'){const controller=active.get('reel-'+body.post_id);if(!controller)fail('job_not_running');controller.abort();return send(res,200,{stopping:true,externalCalls:0});}
        else if(route==='/api/reels/render'){const before=await store.read(),post=before.posts.find(p=>p.post_id===body.post_id);if(!post||post.revision!==body.expected_revision)fail('revision_conflict',409);const key='reel-'+post.post_id;if(active.has(key))fail('reel_busy',409);const controller=new AbortController();active.set(key,controller);try{const result=await renderReel({post,assets,root,signal:controller.signal});state=await store.mutate(s=>domain.editPost(s,post.post_id,{media_format:'reel',reel_video:{...result.asset,source_images:result.metadata.source_images}},body.expected_revision));}finally{active.delete(key);}return send(res,200,{state,externalCalls:0});}
        else if(route==='/api/assets')return send(res,200,{asset:await assets.add(body),externalCalls:0});
        if(route==='/api/production/sync')return send(res,200,await productionSync.run());
        else if(route==='/api/production/import')return send(res,200,await productionSync.run(body.selection));
        else if(route==='/api/bundles'){await assets.verifyPosts(body.posts||[]);for(const p of body.posts||[])if(p.reel_video)await videos.verify(p.reel_video);state=await store.mutate(s=>domain.importBundle(s,body));}
        else if(route.startsWith('/api/posts/')){const postId=decodeURIComponent(route.slice('/api/posts/'.length));if(body.patch?.images)await assets.verifyPosts([{images:body.patch.images}]);if(body.patch?.reel_video)body.patch.reel_video=await videos.verify(body.patch.reel_video);state=await store.mutate(s=>domain.editPost(s,postId,body.patch||{},body.expected_revision));}
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
      const files={'/':'public/index.html','/studio.js':'public/studio.js','/studio.css':'public/studio.css','/icons.mjs':'public/icons.mjs','/draft-backups.mjs':'public/draft-backups.mjs','/domain.mjs':'domain.mjs','/title-normalization.mjs':'title-normalization.mjs','/tags.mjs':'tags.mjs'};
      if(!files[route])fail('route_not_found',404);
      const file=path.join(here,files[route]),data=await fs.readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)],'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(data);
    }catch(e){const code=/^[a-z0-9_]+$/.test(e.code||'')?e.code:'local_operation_failed';send(res,e.status||500,{ok:false,code});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  const url='http://127.0.0.1:'+server.address().port;
  return {server,url,close:async()=>{for(const c of active.values())c.abort();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const portArg=process.argv.indexOf('--port');const port=portArg<0?4387:Number(process.argv[portArg+1]);
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid_local_port');
  const materialArg=process.argv.indexOf('--material-root');const materialRoot=materialArg<0?DEFAULT_MATERIAL_ROOT:process.argv[materialArg+1];if(!materialRoot)throw Error('invalid_material_root');
  const app=await createStudioServer({port,materialRoot});console.log('Upload Studio (offline only): '+app.url);for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
}
