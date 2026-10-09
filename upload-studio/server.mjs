import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as domain from './domain.mjs';
import {StateStore} from './store.mjs';
import {LocalAssets} from './local-assets.mjs';
import {ProductionInput,DEFAULT_MATERIAL_ROOT} from './production-input.mjs';
import {offlinePlan} from './adapter.mjs';
import {PublicationJournal} from './vendor/publication-journal.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{code,status});};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8'};
async function readBody(req){let bytes=0;const chunks=[];for await(const c of req){bytes+=c.length;if(bytes>16000000)fail('body_too_large',413);chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('invalid_json');}}
function send(res,status,value){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));}
export async function createStudioServer({root=path.join(here,'.local'),port=4387,materialRoot=DEFAULT_MATERIAL_ROOT}={}) {
  const store=new StateStore(root),assets=new LocalAssets(root),journal=new PublicationJournal(path.join(root,'dry-run-journal')),active=new Map();
  const production=new ProductionInput(materialRoot,assets);
  await store.mutate(domain.recoverJobs);
  const server=http.createServer(async(req,res)=>{
    try {
      const actualPort=server.address().port,hosts=['127.0.0.1:'+actualPort,'localhost:'+actualPort];
      if(!hosts.includes(req.headers.host))fail('invalid_host',403);
      if(req.headers.origin&&!['http://127.0.0.1:'+actualPort,'http://localhost:'+actualPort].includes(req.headers.origin))fail('foreign_origin',403);
      res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");
      const url=new URL(req.url,'http://127.0.0.1:'+actualPort),route=url.pathname;
      if(route==='/api/publish'||route==='/api/schedule'||route==='/api/connect')fail('live_operation_disabled',405);
      if(req.method==='GET'&&route==='/api/production')return send(res,200,await production.catalog());
      if(req.method==='GET'&&route==='/api/state')return send(res,200,{state:await store.read(),mode:'offline-only',accountsConnected:false});
      if(req.method==='GET'&&route==='/api/export')return send(res,200,{bundle_id:'upload-studio-local-export',posts:(await store.read()).posts.map(p=>({post_id:p.post_id,output_version:p.output_version,source:p.source,caption:p.caption,tags:p.tags,images:p.images,local_settings:{targets:p.targets,timing:p.timing}}))});
      if(req.method==='GET'&&/^\/assets\/[a-f0-9]{64}$/.test(route)){const {asset,bytes}=await assets.read(route.split('/').at(-1));res.writeHead(200,{'content-type':asset.mime,'content-length':bytes.length,'cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(bytes);}
      if(req.method==='POST'&&route.startsWith('/api/')){
        if(req.headers['x-studio-local']!=='1'||!String(req.headers['content-type']).startsWith('application/json'))fail('local_request_required',403);
        const body=await readBody(req);domain.rejectSecrets(body);let state;
        if(route==='/api/assets')return send(res,200,{asset:await assets.add(body),externalCalls:0});
        if(route==='/api/production/import'){const bundle=await production.bundle(body.selection);state=await store.mutate(s=>{const fresh=bundle.posts.filter(p=>!s.posts.some(x=>x.post_id===p.post_id&&x.output_version===p.output_version));return fresh.length?domain.importBundle(s,{...bundle,posts:fresh}):s;});}
        else if(route==='/api/bundles'){await assets.verifyPosts(body.posts||[]);state=await store.mutate(s=>domain.importBundle(s,body));}
        else if(route.startsWith('/api/posts/')){const postId=decodeURIComponent(route.slice('/api/posts/'.length));if(body.patch?.images)await assets.verifyPosts([{images:body.patch.images}]);state=await store.mutate(s=>domain.editPost(s,postId,body.patch||{},body.expected_revision));}
        else if(route==='/api/approve')state=await store.mutate(s=>domain.approveDryRun(s,body.post_id,body.expected_revision));
        else if(route==='/api/queue')state=await store.mutate(s=>domain.queuePost(s,body.post_id,body.expected_revision));
        else if(route==='/api/cancel')state=await store.mutate(s=>domain.cancelJobs(s,body.job_ids));
        else if(route==='/api/retry')state=await store.mutate(s=>domain.retryJob(s,body.job_id));
        else if(route==='/api/restore-backup')state=await store.restoreBackup();
        else if(route==='/api/stop'){const controller=active.get(body.job_id);if(!controller)fail('job_not_running');controller.abort();state=await store.read();}
        else if(route==='/api/dry-run'){
          state=await store.mutate(s=>domain.startDryRun(s,body.job_id));const job=state.jobs.find(j=>j.id===body.job_id),post=state.posts.find(p=>p.post_id===job.post_id),controller=new AbortController();active.set(job.id,controller);
          try {
            const key=createHash('sha256').update(job.key).digest('hex');
            const out=await journal.execute({provider:'offline-preview',candidateId:post.post_id,approvalBasis:key,accountKey:JSON.stringify(job.targets.map(t=>'unconnected-'+t)),payload:{caption:domain.finalCaption(post),images:post.images,targets:job.targets},publish:async()=>({plans:await offlinePlan(post,{signal:controller.signal}),externalCalls:0,dryRun:true})});
            state=await store.mutate(s=>domain.finishDryRun(s,job.id,out.result));
          }catch(e){state=await store.mutate(s=>domain.failDryRun(s,job.id,typeof e.code==='string'?e.code:'offline_plan_failed',true));}
          finally {active.delete(job.id);}
        }else fail('route_not_found',404);
        return send(res,200,{state,externalCalls:0});
      }
      if(req.method!=='GET')fail('method_not_allowed',405);
      const files={'/':'public/index.html','/studio.js':'public/studio.js','/studio.css':'public/studio.css','/icons.mjs':'public/icons.mjs','/domain.mjs':'domain.mjs'};
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
