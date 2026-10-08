'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {AsyncLocalStorage}=require('node:async_hooks');
const {constants}=require('node:fs');
const owners=new AsyncLocalStorage(),queues=new Map();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function key(root){const resolved=path.resolve(root);return process.platform==='win32'?resolved.toLowerCase():resolved;}
function ownerFor(root){const owner=owners.getStore()?.get(key(root));return owner?.active?owner:null;}
function isCanonicalWriterHeld(root){return Boolean(ownerFor(root));}
async function noLinks(file){let p=path.resolve(file);for(;;){try{if((await fs.lstat(p)).isSymbolicLink())throw Error('Canonical writer paths must not contain symbolic links.');}catch(e){if(e.code!=='ENOENT')throw e;}const parent=path.dirname(p);if(parent===p)break;p=parent;}}
async function read(file,deadline=Date.now()+1000){
 // Windows may deny opening an unlinked/delete-pending lock briefly. Retry
 // reading fresh bytes; denial never means missing, dead, or owned by us.
 const limit=Math.min(deadline,Date.now()+1000);
 for(;;){try{return await fs.readFile(file,'utf8');}catch(e){if(e.code==='ENOENT')return null;if(!['EPERM','EACCES','EBUSY'].includes(e.code)||Date.now()>=limit)throw e;await pause(Math.min(15,Math.max(1,limit-Date.now())));}}
}
function deadOwner(raw){let owner;try{owner=JSON.parse(raw);}catch{throw Error('Canonical lock owner is unknown; refusing reclamation.');}
 if(!Number.isInteger(owner.pid)||owner.pid<1||owner.host!==os.hostname())throw Error('Canonical lock owner is unknown; refusing reclamation.');
 try{process.kill(owner.pid,0);return false;}catch(e){if(e.code==='ESRCH')return true;if(e.code==='EPERM')return false;throw Error('Canonical lock owner death is unknown; refusing reclamation.',{cause:e});}
}
async function acquire(root){
 await noLinks(root);await fs.mkdir(root,{recursive:true});
 return claim(path.join(root,'review-canonical-writer.lock'),Date.now()+30000);
}
async function claim(file,deadline,depth=0){
 if(depth>8)throw Error('Canonical reclamation nesting is unknown; refusing further recovery.');
 await noLinks(file);
 const identity=JSON.stringify({schemaVersion:1,pid:process.pid,host:os.hostname(),nonce:crypto.randomUUID(),startedAt:new Date().toISOString()});
 let emptySince=null;
 for(;;){
  if(Date.now()>deadline)throw Error('Canonical writer lock is busy or its owner is unknown.');
  let handle;
  try{handle=await fs.open(file,'wx');}catch(e){if(e.code!=='EEXIST')throw e;}
  if(handle){
   try{await handle.writeFile(identity);await handle.sync();}catch(e){await handle.close();await fs.rm(file,{force:true});throw e;}
   return async()=>{await handle.close();if(await read(file)!==identity)throw Error('Canonical writer lock ownership changed; refusing release.');await fs.unlink(file);};
  }
  const raw=await read(file,deadline);if(raw===null)continue;
  // Exclusive create precedes owner write; briefly tolerate that publication gap.
  if(raw===''){emptySince??=Date.now();if(Date.now()-emptySince>1000)throw Error('Canonical lock owner is unknown; refusing reclamation.');await pause(15);continue;}
  emptySince=null;if(!deadOwner(raw)){await pause(15);continue;}
  // Reclaimers serialize before checking/removing the old identity. The guard
  // follows the same protocol so a reclaimer crash is also safely recoverable.
  const releaseGuard=await claim(file+'.reclaim',deadline,depth+1);
  try{
   const current=await read(file,deadline);
   // A second contender may already have recovered it. Never unlink its replacement.
   if(current===raw&&deadOwner(current))await fs.unlink(file);
  }finally{await releaseGuard();}
 }
}
function withCanonicalWriter(root,work,{serializeReentry=false}={}){
 if(typeof work!=='function')return Promise.reject(TypeError('Canonical writer work must be a function.'));
 const id=key(root),owned=ownerFor(root);
 if(owned){
  if(!serializeReentry)return Promise.resolve().then(work);
  const operation=owned.mutations.then(work);owned.mutations=operation.catch(()=>{});return operation;
 }
 const prior=queues.get(id)||Promise.resolve();
 const operation=prior.then(async()=>{
  const release=await acquire(path.resolve(root)),owner={active:true,mutations:Promise.resolve()},context=new Map(owners.getStore()||[]);context.set(id,owner);
  try{return await owners.run(context,work);}finally{await owner.mutations;owner.active=false;await release();}
 });
 const settled=operation.catch(()=>{});queues.set(id,settled);settled.then(()=>{if(queues.get(id)===settled)queues.delete(id);});return operation;
}
function bindCanonicalWriter(root){return work=>withCanonicalWriter(root,work);}
async function readCanonicalFile(root,file,{encoding=null,maxBytes=32*1024*1024}={}){
 const candidate=path.resolve(file),relative=path.relative(path.resolve(root),candidate);
 if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Canonical read is outside its root boundary.');
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw TypeError('Canonical read requires a finite byte bound.');
 await noLinks(candidate);
 const before=await fs.lstat(candidate,{bigint:true});
 function valid(stat){if(!stat.isFile()||stat.nlink!==1n||stat.size>BigInt(maxBytes))throw Error('Canonical read rejects linked, non-file, or oversized files.');}
 function same(a,b){return ['dev','ino','size','mtimeNs','ctimeNs'].every(field=>a[field]===b[field]);}
 valid(before);
 const handle=await fs.open(candidate,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{
  const opened=await handle.stat({bigint:true});valid(opened);if(!same(before,opened))throw Error('Canonical file identity changed before read.');
  const chunks=[];let size=0;
  for(;;){const buffer=Buffer.alloc(Math.min(65536,maxBytes-size+1)),{bytesRead}=await handle.read(buffer,0,buffer.length,null);if(!bytesRead)break;size+=bytesRead;if(size>maxBytes)throw Error('Canonical read exceeded its byte bound.');chunks.push(buffer.subarray(0,bytesRead));}
  const after=await handle.stat({bigint:true});valid(after);await noLinks(candidate);const named=await fs.lstat(candidate,{bigint:true});valid(named);
  if(!same(opened,after)||!same(after,named)||BigInt(size)!==after.size)throw Error('Canonical file identity, size or timestamps changed during read.');
  const bytes=Buffer.concat(chunks,size);return encoding?bytes.toString(encoding):bytes;
 }finally{await handle.close();}
}
module.exports={withCanonicalWriter,bindCanonicalWriter,isCanonicalWriterHeld,readCanonicalFile};
