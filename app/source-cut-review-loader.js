(function(root){
 'use strict';
 const aborted=()=>Object.assign(Error('Image request cancelled'),{name:'AbortError'});
 function createLoader({load,limit=3,maxEntries=60,maxBytes=16*1024*1024}){
  const jobs=new Map(),allJobs=new Set(),cache=new Map();let active=0,bytes=0,sequence=0;
  function pump(){
   const queued=[...jobs.values()].filter(j=>!j.started&&j.clients.size).sort((a,b)=>a.priority-b.priority||a.sequence-b.sequence);
   while(active<limit&&queued.length){
    const job=queued.shift();job.started=true;active++;
    Promise.resolve().then(()=>load(job.payload)).then(value=>{
     if(jobs.get(job.key)===job&&job.clients.size&&value.length*2<=maxBytes){
      if(cache.has(job.key)){bytes-=cache.get(job.key).length*2;cache.delete(job.key);}
      cache.set(job.key,value);bytes+=value.length*2;
      while(cache.size>maxEntries||bytes>maxBytes){const key=cache.keys().next().value;bytes-=cache.get(key).length*2;cache.delete(key);}
     }
     for(const c of [...job.clients])c.finish(null,value);
    },error=>{for(const c of [...job.clients])c.finish(error);}).finally(()=>{
     active--;allJobs.delete(job);if(jobs.get(job.key)===job)jobs.delete(job.key);pump();
    });
   }
  }
  function request(key,payload,{signal,priority=1,refresh=false}={}){
   if(signal?.aborted)return Promise.reject(aborted());
   if(refresh&&cache.has(key)){bytes-=cache.get(key).length*2;cache.delete(key);}
   if(!refresh&&cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return Promise.resolve(value);}
   const prior=jobs.get(key);
   if(refresh&&prior&&!prior.started){for(const c of [...prior.clients])c.finish(aborted());jobs.delete(key);allJobs.delete(prior);}
   let job=!refresh&&jobs.get(key);
   if(!job){job={key,payload,clients:new Set(),priority,sequence:sequence++,started:false};jobs.set(key,job);allJobs.add(job);}
   job.priority=Math.min(job.priority,priority);
   const promise=new Promise((resolve,reject)=>{
    const client={finish(error,value){signal?.removeEventListener('abort',cancel);job.clients.delete(client);error?reject(error):resolve(value);}};
    const cancel=()=>{client.finish(aborted());if(!job.clients.size&&jobs.get(key)===job)jobs.delete(key);if(!job.started&&!job.clients.size)allJobs.delete(job);};
    job.clients.add(client);signal?.addEventListener('abort',cancel,{once:true});
   });pump();return promise;
  }
  function reset(){for(const job of [...allJobs]){for(const c of [...job.clients])c.finish(aborted());if(!job.started)allJobs.delete(job);}jobs.clear();cache.clear();bytes=0;}
  return {request,reset,stats:()=>({active,queued:[...jobs.values()].filter(j=>!j.started).length,entries:cache.size,bytes})};
 }
 const api={createLoader};if(typeof module==='object')module.exports=api;else root.ThreadsReviewLoader=api;
})(typeof window==='object'?window:globalThis);
