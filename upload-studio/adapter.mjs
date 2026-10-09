import {Worker} from 'node:worker_threads';
import {finalCaption} from './domain.mjs';
export function offlinePlan(post,{signal}={}) {
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./planner-worker.mjs',import.meta.url),{env:{},workerData:{caption:finalCaption(post),images:post.images,targets:post.targets},execArgv:[]});
    let done=false;
    const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(value);};
    const abort=()=>finish(Object.assign(new Error('dry_run_interrupted'),{code:'dry_run_interrupted'}));
    const timer=setTimeout(()=>finish(Object.assign(new Error('offline_plan_timeout'),{code:'offline_plan_timeout'})),10000);
    worker.once('message',r=>r.ok?finish(null,r.plans):finish(Object.assign(new Error(r.code),{code:r.code})));
    worker.once('error',()=>finish(Object.assign(new Error('offline_worker_failed'),{code:'offline_worker_failed'})));
    worker.once('exit',code=>{if(!done)finish(Object.assign(new Error('offline_worker_exit'),{code:'offline_worker_exit'}));});
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  });
}
