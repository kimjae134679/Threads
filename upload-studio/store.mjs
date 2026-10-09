import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {captureHistory} from './history.mjs';
import {createState,validateState} from './domain.mjs';
const error=(code,status=500)=>Object.assign(new Error(code),{code,status});
// Windows may temporarily deny unlink while another contender reads the same owner.
// Retry only this nonce-qualified file; permanent permissions still fail closed.
export async function removeOwnerFile(file,unlink=fs.unlink,delay=()=>new Promise(r=>setTimeout(r,10))){
 for(let attempt=0;attempt<12;attempt++){
  try{await unlink(file);return;}catch(e){
   if(e.code==='ENOENT')return;
   if(!['EPERM','EBUSY'].includes(e.code)||attempt===11)throw e;
   await delay();
  }
 }
}
export async function removeEmptyLock(file,rmdir=fs.rmdir,delay=()=>new Promise(r=>setTimeout(r,10)),readdir=fs.readdir){
 for(let attempt=0;attempt<12;attempt++){
  try{await rmdir(file);return;}catch(e){
   if(['ENOENT','ENOTEMPTY','EEXIST'].includes(e.code))return;
   if(!['EPERM','EBUSY'].includes(e.code))throw e;
   // A contender may already own a fresh nonempty lock: do not remove it.
   try{if((await readdir(file)).length)return;}catch(readError){if(readError.code==='ENOENT')return;throw readError;}
   if(attempt===11)throw e;
   await delay();
  }
 }
}
export class StateStore {
  constructor(root){this.root=path.resolve(root);this.file=path.join(this.root,'state.json');this.backup=path.join(this.root,'state.backup.json');this.lock=path.join(this.root,'.state-lock');}
  async read(){try{return validateState(JSON.parse(await fs.readFile(this.file,'utf8')));}catch(e){if(e.code==='ENOENT')return createState();throw error('state_corrupt');}}
  async release(lease){await removeOwnerFile(path.join(this.lock,lease.ownerFile));await removeEmptyLock(this.lock);}
  async acquire(){
    await fs.mkdir(this.root,{recursive:true,mode:0o700});
    const nonce=randomUUID(),ownerFile='owner.'+nonce+'.json',candidate=path.join(this.root,'.state-candidate-'+nonce);
    await fs.mkdir(candidate,{mode:0o700});
    try {
      // Publish a complete nonempty directory atomically. A crash while preparing leaves no visible lock.
      const handle=await fs.open(path.join(candidate,ownerFile),'wx',0o600);try{await handle.writeFile(JSON.stringify({pid:process.pid,nonce}));await handle.sync();}finally{await handle.close();}
      for(let n=0;n<80;n++){
        try{await fs.rename(candidate,this.lock);return {ownerFile};}catch(e){if(!['EEXIST','ENOTEMPTY','EPERM'].includes(e.code))throw e;}
        try {
          const names=await fs.readdir(this.lock);
          if(!names.length){await fs.rmdir(this.lock).catch(ignoreGone);continue;}
          if(names.length!==1||!/^owner(?:\.[a-f0-9-]{36})?\.json$/.test(names[0]))throw error('state_lock_invalid');
          let owner;try{owner=JSON.parse(await fs.readFile(path.join(this.lock,names[0]),'utf8'));}catch(e){if(e.code==='ENOENT')continue;if(e instanceof SyntaxError)throw error('state_lock_invalid');throw e;}
          if(!Number.isInteger(owner.pid)||owner.pid<=0)throw error('state_lock_invalid');
          let dead=false;try{process.kill(owner.pid,0);}catch(e){if(e.code==='ESRCH')dead=true;else if(e.code!=='EPERM')throw e;}
          if(dead){
            // Only unlink the observed unique owner. A competing fresh owner has a different filename.
            await removeOwnerFile(path.join(this.lock,names[0]));await fs.rmdir(this.lock).catch(ignoreGone);
            continue;
          }
        }catch(e){if(e.code!=='ENOENT')throw e;}
        await new Promise(r=>setTimeout(r,25));
      }
      throw error('state_busy',409);
    } finally {
      // Candidate cleanup cannot remove the canonical lock or another contender's owner.
      await removeOwnerFile(path.join(candidate,ownerFile));
      await removeEmptyLock(candidate);
    }
  }
  async write(file,value){const temporary=path.join(this.root,'.'+path.basename(file)+'.'+randomUUID()+'.tmp');const handle=await fs.open(temporary,'wx',0o600);try{await handle.writeFile(JSON.stringify(value)+'\n');await handle.sync();}finally{await handle.close();}try{await fs.rename(temporary,file);}finally{await fs.rm(temporary,{force:true});}}
  async mutate(fn){const lease=await this.acquire();try{const previous=await this.read(),next=validateState(captureHistory(previous,validateState(await fn(previous)),new Date().toISOString()));if(next.revision===previous.revision)return previous;await this.write(this.backup,previous);await this.write(this.file,next);return next;}finally{await this.release(lease);}}
  async restoreBackup(){const lease=await this.acquire();try{let backup;try{backup=validateState(JSON.parse(await fs.readFile(this.backup,'utf8')));}catch{throw error('backup_unavailable');}try{await fs.rename(this.file,path.join(this.root,'state.corrupt.'+Date.now()+'.json'));}catch(e){if(e.code!=='ENOENT')throw e;}backup.revision++;await this.write(this.file,backup);return backup;}finally{await this.release(lease);}}
}
