// Explicit one-shot PC entry. No credential discovery, schedule or default connection.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readCanonicalFile,withCanonicalWriter} from '../../../desktop/review-canonical-writer.cjs';
import {createBoundPcReviewPipeline} from './pc-binding.mjs';
import {dedicatedRepositoryMetadata} from './exchange.mjs';
import {validateManifest} from '../app/core.js';
const hash=b=>createHash('sha256').update(b).digest('hex'),plain=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const fail=code=>{throw Object.assign(Error('PC review configuration rejected'),{runnerCode:code});};
const fields=['schemaVersion','enabled','dataTransferApproved','canonicalMergeApproved','materialRoot','allowedMaterialWorkspace','stateRoot','allowedOutputRoot','completionPolicy','intakeEvidence','criteria','repository','credentialProvider','writerFleet'];
function only(value,keys){if(!plain(value)||Object.keys(value).some(k=>!keys.includes(k)))fail('configuration_invalid');}
function absolute(p){if(typeof p!=='string'||!path.isAbsolute(p)||p.includes('\0')||p.split(/[\\/]/).includes('..'))fail('configuration_invalid');return path.resolve(p);}
async function directory(p){const resolved=absolute(p),base=path.parse(resolved).root;let current=base;for(const part of resolved.slice(base.length).split(path.sep).filter(Boolean)){current=path.join(current,part);const s=await fs.lstat(current);if(!s.isDirectory()||s.isSymbolicLink())fail('configuration_invalid');}return resolved;}
function validate(c){
 only(c,fields);if(c.schemaVersion!==1||c.enabled!==true||c.dataTransferApproved!==true||typeof c.canonicalMergeApproved!=='boolean')fail('configuration_invalid');
 for(const k of ['materialRoot','allowedMaterialWorkspace','stateRoot','allowedOutputRoot'])absolute(c[k]);
 dedicatedRepositoryMetadata(c.repository);only(c.repository,['owner','repo','repositoryId','private','dedicatedReviewRepository','branch','excludedRepositories']);
 validateManifest({schemaVersion:1,reviewRound:'configuration-check',criteria:c.criteria,entries:[]});only(c.criteria,['version','items']);for(const item of c.criteria.items)only(item,['id','label']);
 if(c.completionPolicy!==undefined&&!['regenerated-only','verified-intake'].includes(c.completionPolicy))fail('configuration_invalid');
 if(c.intakeEvidence!==undefined){only(c.intakeEvidence,['allowedWorkspace','workRoot','sourceRoot']);for(const p of Object.values(c.intakeEvidence))absolute(p);}
 only(c.credentialProvider,['mode','id','module','allowedWorkspace','sha256','executionApproved']);
 if(!['registered','verified-module'].includes(c.credentialProvider.mode)||typeof c.credentialProvider.id!=='string'||!/^[-A-Za-z0-9_]{1,100}$/.test(c.credentialProvider.id))fail('configuration_invalid');
 if(c.credentialProvider.mode==='registered'&&Object.keys(c.credentialProvider).some(k=>!['mode','id'].includes(k)))fail('configuration_invalid');
 if(c.credentialProvider.mode==='verified-module'&&(c.credentialProvider.executionApproved!==true||!/^[a-f0-9]{64}$/.test(c.credentialProvider.sha256)))fail('configuration_invalid');
 if(c.canonicalMergeApproved){only(c.writerFleet,['materialRoot','canonicalWriterSha256','writers']);if(absolute(c.writerFleet.materialRoot)!==absolute(c.materialRoot)||!/^[a-f0-9]{64}$/.test(c.writerFleet.canonicalWriterSha256)||!Array.isArray(c.writerFleet.writers))fail('writer_fleet_unverified');for(const w of c.writerFleet.writers){only(w,['executablePath','asarSha256']);absolute(w.executablePath);if(!/^[a-f0-9]{64}$/.test(w.asarSha256))fail('writer_fleet_unverified');}}
 return structuredClone(c);
}
async function providerFor(c,deps){
 let provider;
 if(c.credentialProvider.mode==='registered')provider=deps.providers?.[c.credentialProvider.id];
 else{
  const p=c.credentialProvider,root=await directory(p.allowedWorkspace),bytes=await readCanonicalFile(root,absolute(p.module),{maxBytes:1024*1024});
  if(hash(bytes)!==p.sha256)fail('provider_identity_mismatch');
  const source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  // Approved adapter must be self-contained ESM (builtins allowed). Execute the
  // verified bytes, not a second read of a replaceable module path.
  if(/\bimport\s*\(/.test(source))fail('provider_identity_mismatch');
  for(const m of source.matchAll(/(?:\bfrom\s+|\bimport\s*)['"]([^'"]+)['"]/g))if(!m[1].startsWith('node:'))fail('provider_identity_mismatch');
  const module=await import('data:text/javascript;base64,'+bytes.toString('base64'));
  if(typeof module.createPcCredentialProvider!=='function')fail('provider_not_configured');
  provider=await module.createPcCredentialProvider({repository:structuredClone(c.repository),providerId:p.id});
 }
 if(provider?.contract!=='pc-review-credential-provider-v1'||typeof provider.getAccessToken!=='function')fail('provider_not_configured');
 return provider;
}
export async function inspectInstalledReviewWriters(){
 if(process.platform!=='win32')fail('writer_fleet_unverified');
 const r=spawnSync('powershell',['-NoProfile','-NonInteractive','-Command',"@(Get-CimInstance Win32_Process -Filter \"Name='Threads Cut Editor.exe'\" | Select-Object ProcessId,ExecutablePath) | ConvertTo-Json -Compress"],{windowsHide:true,encoding:'utf8',timeout:15000,maxBuffer:1000000});
 if(r.status!==0)fail('writer_fleet_unverified');const records=JSON.parse(r.stdout.trim()||'[]');return (Array.isArray(records)?records:[records]).map(p=>({executablePath:p.ExecutablePath}));
}
async function verifyFleet(c,inspect){
 if(!c.canonicalMergeApproved)return;
 const expected=hash(await fs.readFile(new URL('../../../desktop/review-canonical-writer.cjs',import.meta.url)));
 if(expected!==c.writerFleet.canonicalWriterSha256)fail('writer_fleet_unverified');
 const running=await inspect();if(!Array.isArray(running))fail('writer_fleet_unverified');
 for(const app of running){const executable=absolute(app.executablePath),w=c.writerFleet.writers.find(w=>absolute(w.executablePath).toLowerCase()===executable.toLowerCase());if(!w)fail('writer_fleet_unverified');const resources=path.join(path.dirname(executable),'resources'),asar=path.join(resources,'app.asar');if(hash(await fs.readFile(asar))!==w.asarSha256||hash(await fs.readFile(path.join(asar,'review-canonical-writer.cjs')))!==expected)fail('writer_fleet_unverified');}
}
async function saveResult(root,result){
 await directory(root);const folder=path.join(root,'pc-review-results');await fs.mkdir(folder,{recursive:true});await directory(folder);const reportFile=path.join(folder,randomUUID()+'.json'),bytes=Buffer.from(JSON.stringify({...result,reportFile},null,2)+'\n');
 if(bytes.length>16*1024*1024)fail('result_size_limit');const h=await fs.open(reportFile,'wx',0o600);try{await h.writeFile(bytes);await h.sync();}finally{await h.close();}return {...result,reportFile};
}
export function createPcReviewRunner(deps={}){
 return Object.freeze({async runOnce({config={},action='cycle',outputDirectory}={}){
  if(config?.enabled!==true||config?.dataTransferApproved!==true)return {status:'disabled',action};
  if(['import','recover'].includes(action)&&config?.canonicalMergeApproved!==true)return {status:'disabled',action};
  let c,safeStateRoot=false;
  try{
   c=validate(config);if(!['cycle','supply','import','recover'].includes(action))fail('configuration_invalid');
   for(const k of ['materialRoot','allowedMaterialWorkspace','stateRoot','allowedOutputRoot'])await directory(c[k]);
   const contains=(a,b)=>{const r=path.relative(a,b);return r===''||r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
   if(!contains(absolute(c.allowedMaterialWorkspace),absolute(c.materialRoot)))fail('configuration_invalid');
   const roots=['materialRoot','stateRoot','allowedOutputRoot'];for(let i=0;i<roots.length;i++)for(let j=i+1;j<roots.length;j++)if(contains(absolute(c[roots[i]]),absolute(c[roots[j]]))||contains(absolute(c[roots[j]]),absolute(c[roots[i]])))fail('configuration_invalid');
   safeStateRoot=true;
   await verifyFleet(c,deps.inspectWriters||inspectInstalledReviewWriters);const provider=await providerFor(c,deps);
   // No token is retained/configured/logged. The existing transport obtains it
   // through the approved adapter only when making its authorized request.
   const getAccessToken=()=>provider.getAccessToken({repository:structuredClone(c.repository),purpose:'private-review-data'});
   const bound=createBoundPcReviewPipeline({...c,getAccessToken,fetchImpl:deps.fetchImpl,api:deps.api});
   return await withCanonicalWriter(c.stateRoot,async()=>{
    const result={schemaVersion:1,action,startedAt:new Date().toISOString(),status:'completed'};
    if(action==='recover'||action==='cycle'&&c.canonicalMergeApproved){result.recovery=await bound.recoverOnce();if(!['none','unchanged','recovered','committed'].includes(result.recovery.status)&&result.recovery.status!=='disabled'){result.status='blocked';return saveResult(c.stateRoot,result);}}
    if(action==='recover')return saveResult(c.stateRoot,result);
    if(action==='cycle'||action==='supply'){
     const target=outputDirectory?absolute(outputDirectory):path.join(c.allowedOutputRoot,'release-'+randomUUID());result.supply=await bound.supplyOnce({outputDirectory:target});
     if(!['confirmed','noop'].includes(result.supply.status)){result.status=result.supply.status;return saveResult(c.stateRoot,result);}
    }
    if(action==='import'||action==='cycle'&&c.canonicalMergeApproved){result.import=await bound.importOnce();if(['conflict','blocked','pending','disabled'].includes(result.import.status))result.status=result.import.status;}
    result.finishedAt=new Date().toISOString();return saveResult(c.stateRoot,result);
   });
  }catch(error){
   const allowed=['configuration_invalid','provider_not_configured','provider_identity_mismatch','writer_fleet_unverified','result_size_limit'];
   const failure={schemaVersion:1,status:'blocked',action,reason:allowed.includes(error.runnerCode)?error.runnerCode:'run_failed',finishedAt:new Date().toISOString()};
   if(safeStateRoot){try{return await withCanonicalWriter(c.stateRoot,()=>saveResult(c.stateRoot,failure));}catch{return {...failure,reportPersistence:'failed'};}}
   return failure;
  }
 }});
}
export async function runPcReviewCommand(args=[],deps={}){
 const configArg=args.find(a=>a.startsWith('--pc-review-config='));if(!configArg)return {status:'disabled'};
 try{
  const file=absolute(configArg.slice('--pc-review-config='.length)),bytes=await readCanonicalFile(path.dirname(file),file,{maxBytes:128*1024});const config=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  const actionArg=args.find(a=>a.startsWith('--pc-review-action='));return createPcReviewRunner(deps).runOnce({config,action:actionArg?.slice('--pc-review-action='.length)||'cycle'});
 }catch{return {status:'blocked',reason:'configuration_invalid'};}
}
