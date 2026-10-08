// Content-addressed, bounded loading. A retired consumer cannot receive a result;
// an active duplicate can still use the same transfer. Only PNGs matching the
// manifest's exact SHA-256 enter the durable cache, including on offline reads.
const aborted=()=>new DOMException('Image selection retired','AbortError');
async function verified(blob,sha256){
 if(!(blob instanceof Blob)||blob.size>25*1024*1024)throw Error('Invalid PNG asset size');
 const bytes=new Uint8Array(await blob.arrayBuffer());
 if([137,80,78,71,13,10,26,10].some((b,i)=>bytes[i]!==b))throw Error('PNG signature mismatch');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==sha256)throw Error('PNG asset hash mismatch');return blob;
}
export function createAssetLoader({read,write,getProvider,concurrency=2}){
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>2)throw Error('Asset concurrency must be 1 or 2');
 const jobs=new Map(),queue=[];let active=0;
 async function run(job){
  try{
   const cached=await read(job.image.sha256);let value;
   if(cached)try{value=await verified(cached,job.image.sha256);}catch{/* Replace corrupt cache only with verified bytes. */}
   if(!job.consumers.size)throw aborted();
   if(!value){
    const provider=getProvider();if(!provider)throw Error('Image unavailable offline: connection disabled');
    value=await verified(await provider.downloadAsset(job.image),job.image.sha256);
    if(getProvider()!==provider)throw Error('Image connection provider changed; retry on the current connection');
    if(!job.consumers.size)throw aborted();
    await write(job.image.sha256,value);
   }
   for(const consumer of job.consumers)consumer.finish(null,value);
  }catch(error){for(const consumer of job.consumers)consumer.finish(error);}
  finally{if(jobs.get(job.image.sha256)===job)jobs.delete(job.image.sha256);active--;pump();}
 }
 function pump(){while(active<concurrency&&queue.length){const job=queue.shift();if(!job.consumers.size){if(jobs.get(job.image.sha256)===job)jobs.delete(job.image.sha256);continue;}active++;run(job);}}
 function load(image,{signal}={}){
  if(signal?.aborted)return Promise.reject(aborted());
  if(!/^[a-f0-9]{64}$/.test(image?.sha256))return Promise.reject(Error('Invalid image hash'));
  let job=jobs.get(image.sha256);if(!job){job={image,consumers:new Set()};jobs.set(image.sha256,job);queue.push(job);}
  const result=new Promise((resolve,reject)=>{
   const consumer={finish(error,value){signal?.removeEventListener('abort',cancel);job.consumers.delete(consumer);error?reject(error):resolve(value);}};
   const cancel=()=>consumer.finish(aborted());job.consumers.add(consumer);signal?.addEventListener('abort',cancel,{once:true});
  });pump();return result;
 }
 return Object.freeze({load});
}
