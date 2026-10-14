import {parentPort,workerData} from 'node:worker_threads';
// This worker is constructed with env:{}; no parent credentials are read.
globalThis.fetch=()=>{throw Object.assign(new Error('external_network_forbidden'),{code:'external_network_forbidden'});};
try {
  const {buildThreadsMediaDryRun}=await import('./vendor/threads.mjs');
  const {buildInstagramMediaDryRun}=await import('./vendor/instagram.mjs');
  const urls=workerData.images.map(x=>'https://example.invalid/local/'+x.asset_id+'.jpg');
  const plans=workerData.targets.map(platform=>{
    const plan=platform==='threads'?buildThreadsMediaDryRun({text:workerData.captions?.threads??workerData.caption,mediaUrls:urls}):buildInstagramMediaDryRun({caption:workerData.captions?.instagram??workerData.caption,mediaUrls:urls,env:Object.freeze({})});
    return {...plan,captionText:workerData.captions?.[platform]??workerData.caption,platform,externalCalls:0,localOnly:true,publicMediaPlaceholders:true,publicationUrl:null};
  });
  parentPort.postMessage({ok:true,plans});
} catch(e){parentPort.postMessage({ok:false,code:typeof e.code==='string'?e.code:'offline_plan_failed'});}
