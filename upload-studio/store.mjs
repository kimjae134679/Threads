import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createState,validateState} from './domain.mjs';
const error=(code,status=500)=>Object.assign(new Error(code),{code,status});
export class StateStore {
  constructor(root){this.root=path.resolve(root);this.file=path.join(this.root,'state.json');this.backup=path.join(this.root,'state.backup.json');this.lock=path.join(this.root,'.state-lock');}
  async read(){try{return validateState(JSON.parse(await fs.readFile(this.file,'utf8')));}catch(e){if(e.code==='ENOENT')return createState();throw error('state_corrupt');}}
  async acquire(){await fs.mkdir(this.root,{recursive:true,mode:0o700});for(let n=0;n<80;n++){try{await fs.mkdir(this.lock,{mode:0o700});await fs.writeFile(path.join(this.lock,'owner.json'),JSON.stringify({pid:process.pid}),{mode:0o600});return;}catch(e){if(e.code!=='EEXIST')throw e;try{const owner=JSON.parse(await fs.readFile(path.join(this.lock,'owner.json'),'utf8'));if(!Number.isInteger(owner.pid)||owner.pid<=0)throw error('state_lock_invalid');try{process.kill(owner.pid,0);}catch(pe){if(pe.code==='ESRCH'){await fs.rm(this.lock,{recursive:true,force:true});continue;}if(pe.code!=='EPERM')throw pe;}}catch(le){if(le.code!=='ENOENT')throw le;}await new Promise(r=>setTimeout(r,25));}}throw error('state_busy',409);}
  async write(file,value){const temporary=path.join(this.root,'.'+path.basename(file)+'.'+randomUUID()+'.tmp');const handle=await fs.open(temporary,'wx',0o600);try{await handle.writeFile(JSON.stringify(value)+'\n');await handle.sync();}finally{await handle.close();}try{await fs.rename(temporary,file);}finally{await fs.rm(temporary,{force:true});}}
  async mutate(fn){await this.acquire();try{const previous=await this.read(),next=validateState(await fn(previous));if(next.revision===previous.revision)return previous;await this.write(this.backup,previous);await this.write(this.file,next);return next;}finally{await fs.rm(this.lock,{recursive:true,force:true});}}
  async restoreBackup(){await this.acquire();try{let backup;try{backup=validateState(JSON.parse(await fs.readFile(this.backup,'utf8')));}catch{throw error('backup_unavailable');}try{await fs.rename(this.file,path.join(this.root,'state.corrupt.'+Date.now()+'.json'));}catch(e){if(e.code!=='ENOENT')throw e;}backup.revision++;await this.write(this.file,backup);return backup;}finally{await fs.rm(this.lock,{recursive:true,force:true});}}
}
