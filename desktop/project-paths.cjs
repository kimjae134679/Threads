'use strict';
const fs=require('node:fs'),path=require('node:path');
const fail=code=>{throw Object.assign(Error(code),{code});};
const flavor=s=>/^[A-Za-z]:[\\/]|^\\\\/.test(s)?path.win32:path;
const norm=s=>flavor(s).normalize(s).replace(/[\\/]+$/,'');
const key=s=>flavor(s)===path.win32?norm(s).toLowerCase():norm(s);
function inside(root,file){const rel=path.relative(root,file);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))fail('project_path_escape');return file;}
function noLinks(file){const parsed=path.parse(file);let at=parsed.root;for(const p of file.slice(parsed.root.length).split(path.sep).filter(Boolean)){at=path.join(at,p);try{if(fs.lstatSync(at).isSymbolicLink())fail('project_path_symlink');}catch(e){if(e.code!=='ENOENT')throw e;}}}
function createPathResolver({projectRoot,pathMappings}){
 const root=path.resolve(projectRoot);noLinks(root);
 if(!Array.isArray(pathMappings))fail('project_path_map_invalid');
 const mappings=pathMappings.map(m=>{if(typeof m.sourceRoot!=='string'||!flavor(m.sourceRoot).isAbsolute(m.sourceRoot)||typeof m.destinationRoot!=='string'||path.isAbsolute(m.destinationRoot)||/^[A-Za-z]:|^\\/.test(m.destinationRoot))fail('project_path_map_invalid');return{source:norm(m.sourceRoot),target:inside(root,path.resolve(root,m.destinationRoot))};}).sort((a,b)=>b.source.length-a.source.length);
 return original=>{
  if(typeof original!=='string'||/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(original))fail('project_path_not_filesystem');
  if(!flavor(original).isAbsolute(original))fail('project_path_not_filesystem');
  let result;if(path.isAbsolute(original)&&(()=>{const r=path.relative(root,path.resolve(original));return !path.isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+path.sep);})())result=inside(root,path.resolve(original));
  else{const from=norm(original),mapping=mappings.find(m=>key(from)===key(m.source)||key(from).startsWith(key(m.source)+(flavor(m.source)===path.win32?'\\':path.sep)));if(!mapping)fail('project_path_unmapped');
   const relative=flavor(mapping.source).relative(mapping.source,from);result=inside(mapping.target,path.resolve(mapping.target,...relative.split(/[\\/]/)));
  }
  noLinks(result);return result;
 };
}
const resolverCache=new Map(),statKey=s=>JSON.stringify([s.dev,s.ino,s.size,s.mtimeMs,s.ctimeMs]);
function configuredState(root){
 const file=path.join(root,'local-private/migration-manifest.json');noLinks(file);const stat=fs.statSync(file),identity=statKey(stat),cacheKey=key(root);
 if(!stat.isFile()||stat.size>300*1024*1024)fail('project_path_manifest_invalid');const cached=resolverCache.get(cacheKey);if(cached?.identity===identity)return cached;
 const raw=fs.readFileSync(file);if(statKey(fs.statSync(file))!==identity)fail('project_path_manifest_changed');const m=JSON.parse(raw);
 if(m.schema!=='threads-unified-migration-v1'||path.resolve(m.projectRoot)!==root)fail('project_path_manifest_invalid');
 const state={identity,mapped:createPathResolver(m),wrapper:original=>configuredState(root).mapped(original)};resolverCache.set(cacheKey,state);return state;
}
function configuredResolver(projectRoot=process.env.THREADS_PROJECT_ROOT){
 return projectRoot?configuredState(path.resolve(projectRoot)).wrapper:null;
}
function resolveProjectPath(original,projectRoot){return configuredResolver(projectRoot)?.(original)||original;}
module.exports={createPathResolver,configuredResolver,resolveProjectPath};
