// Windows CurrentUser DPAPI. No credential creation/read happens until an authorized callback uses this store.
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
const fail=code=>{throw Object.assign(new Error(code),{code,status:400});};
export function dpapi(operation,value){
 if(process.platform!=='win32')return Promise.reject(Object.assign(new Error('secure_store_windows_required'),{code:'secure_store_windows_required'}));
 if(!['protect','unprotect'].includes(operation)||typeof value!=='string'||value.length>100000)fail('secure_store_input_invalid');
 const script="Add-Type -AssemblyName System.Security; $payload=[Console]::In.ReadToEnd(); "+(operation==='protect'?"$data=[Text.Encoding]::UTF8.GetBytes($payload); $sealed=[Security.Cryptography.ProtectedData]::Protect($data,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($sealed)); [Array]::Clear($data,0,$data.Length)":"$sealed=[Convert]::FromBase64String($payload); $data=[Security.Cryptography.ProtectedData]::Unprotect($sealed,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Text.Encoding]::UTF8.GetString($data)); [Array]::Clear($data,0,$data.Length)");
 const windowsRoot=process.env.SystemRoot||'C:\\Windows';
 return new Promise((resolve,reject)=>{let out='',completed=false;const child=spawn(path.join(windowsRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{shell:false,windowsHide:true,env:{SystemRoot:windowsRoot},stdio:['pipe','pipe','ignore']});const end=(error)=>{if(completed)return;completed=true;clearTimeout(timer);error?reject(Object.assign(new Error('secure_store_failed'),{code:'secure_store_failed'})):resolve(out);};const timer=setTimeout(()=>{child.kill();end(true);},10000);child.on('error',()=>end(true));child.stdout.on('data',b=>{out+=b.toString('utf8');if(out.length>150000){child.kill();end(true);}});child.on('close',code=>end(code!==0));child.stdin.on('error',()=>end(true));child.stdin.end(value);});
}
export class WindowsCredentialVault {
 constructor(root,{crypt=dpapi}={}){this.root=path.resolve(root);this.crypt=crypt;}
 async folder(){await fs.mkdir(this.root,{recursive:true,mode:0o700});const base=await fs.realpath(this.root),folder=path.join(base,'auth-vault');await fs.mkdir(folder,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});const stat=await fs.lstat(folder);if(stat.isSymbolicLink()||!stat.isDirectory()||await fs.realpath(folder)!==folder)fail('secure_store_path_invalid');return folder;}
 async put(value){const plaintext=JSON.stringify(value);if(!plaintext||plaintext.length>100000)fail('secure_store_input_invalid');const ciphertext=await this.crypt('protect',plaintext);if(!/^[A-Za-z0-9+/=]+$/.test(ciphertext))fail('secure_store_failed');const folder=await this.folder(),id=randomUUID(),file=path.join(folder,id+'.dpapi');const h=await fs.open(file,'wx',0o600);try{await h.writeFile(ciphertext);await h.sync();}finally{await h.close();}return id;}
 async get(id){if(!/^[a-f0-9-]{36}$/.test(id))fail('secure_store_input_invalid');const file=path.join(await this.folder(),id+'.dpapi'),stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>150000)fail('secure_store_path_invalid');try{return JSON.parse(await this.crypt('unprotect',await fs.readFile(file,'utf8')));}catch{fail('secure_store_failed');}}
}
