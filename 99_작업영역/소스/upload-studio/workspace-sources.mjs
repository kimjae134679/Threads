// Explicit public repository roots are read-only; operating state stays in projectRoot.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const REPORT=['03_참고자료','02_도구조사','2026-11-17_인스타그램_시장조사.md'];
const error=code=>{throw Object.assign(Error(code),{code,status:409});};
function inside(root,file){const r=path.relative(root,file);if(r==='..'||r.startsWith('..'+path.sep)||path.isAbsolute(r))error('workspace_sources_path_invalid');return file;}
async function noLinks(file){
 const resolved=path.resolve(file),parts=resolved.slice(path.parse(resolved).root.length).split(path.sep).filter(Boolean);let current=path.parse(resolved).root;
 for(const part of parts){current=path.join(current,part);if((await fs.lstat(current)).isSymbolicLink())error('workspace_sources_path_invalid');}
 const real=await fs.realpath(resolved);if((process.platform==='win32'?real.toLowerCase():real)!==(process.platform==='win32'?resolved.toLowerCase():resolved))error('workspace_sources_path_invalid');
 return resolved;
}
async function bounded(file,max){await noLinks(file);const s=await fs.stat(file);if(!s.isFile()||s.size>max)error('workspace_sources_file_invalid');return fs.readFile(file);}
export async function resolveWorkspaceSources({projectRoot=null,projectManifest,defaultRepositoryRoot}={}){
 const fallback={configured:false,repositoryRoot:null,candidateRepositoryRoot:defaultRepositoryRoot||null,privateRoot:projectRoot,marketReport:null};
 let record;try{record=JSON.parse((await bounded(projectManifest,1024*1024)).toString('utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}
 const config=record.workspace_sources;if(config===undefined)return fallback;
 if(!config||typeof config!=='object'||Array.isArray(config)||config.schema!==1||typeof config.repositoryRoot!=='string'||!path.isAbsolute(config.repositoryRoot)||Object.keys(config).some(k=>!['schema','repositoryRoot'].includes(k)))error('workspace_sources_invalid');
 const repositoryRoot=await noLinks(config.repositoryRoot);if(!(await fs.stat(repositoryRoot)).isDirectory())error('workspace_sources_invalid');
 const candidateRepositoryRoot=inside(repositoryRoot,path.join(repositoryRoot,'99_작업영역','소스'));
 let pkg;try{pkg=JSON.parse((await bounded(inside(repositoryRoot,path.join(candidateRepositoryRoot,'package.json')),256*1024)).toString('utf8'));}catch{error('workspace_sources_invalid');}
 if(pkg.name!=='threads-ai-content-lab')error('workspace_sources_invalid');
 const candidates=inside(repositoryRoot,path.join(candidateRepositoryRoot,'data','candidates'));await noLinks(candidates);if(!(await fs.stat(candidates)).isDirectory())error('workspace_sources_invalid');
 return{configured:true,repositoryRoot,candidateRepositoryRoot,privateRoot:projectRoot,marketReport:inside(repositoryRoot,path.join(repositoryRoot,...REPORT))};
}
export async function readWorkspaceResearch(sources){
 if(!sources?.configured)return{available:false,code:'workspace_sources_unconfigured',content:null};
 try{const file=inside(sources.repositoryRoot,sources.marketReport),bytes=await bounded(file,2*1024*1024);return{available:true,title:'인스타그램 시장조사',content:new TextDecoder('utf-8',{fatal:true}).decode(bytes),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),externalCalls:0};}
 catch(e){if(e.code==='ENOENT')return{available:false,code:'workspace_research_missing',content:null};throw e;}
}
