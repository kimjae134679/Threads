'use strict';
// Build-only hook. extraResources from '.' removes matching files from app.asar;
// keep every active root CJS in ASAR, then copy only these two exact helper sets.
const fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
const helpers=Object.freeze(['atomic-file.cjs','editor-assets.cjs','feedback-migration.cjs','post-review-store.cjs','production-title.cjs','project-paths.cjs','review-canonical-writer.cjs','review-release.cjs','review-workflow-model.cjs']);
const fail=code=>{throw Error(code);},hash=data=>createHash('sha256').update(data).digest('hex');
function inside(root,file){const relative=path.relative(root,file);if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))fail('native_pack_path_escape');return file;}
async function noLinks(file){const full=path.resolve(file),parsed=path.parse(full);let at=parsed.root;for(const part of full.slice(parsed.root.length).split(path.sep).filter(Boolean)){at=path.join(at,part);try{if((await fs.lstat(at)).isSymbolicLink())fail('native_pack_path_link');}catch(e){if(e.code!=='ENOENT')throw e;}}}
async function sourceBytes(file){await noLinks(file);const stat=await fs.lstat(file);if(!stat.isFile()||stat.size>5*1024*1024)fail('native_pack_source_invalid');return fs.readFile(file);}
async function afterPack(context){
 const source=path.resolve(__dirname),project=path.resolve(context.packager.projectDir);if(source!==project||context.electronPlatformName!=='win32')fail('native_pack_project_invalid');
 const output=inside(path.join(source,'dist'),path.resolve(context.appOutDir)),resources=path.join(output,'resources'),archive=path.join(resources,'app.asar');await noLinks(archive);
 const asar=require('@electron/asar');asar.uncache(archive);const names=new Set(asar.listPackage(archive).map(name=>name.replaceAll('\\','/').replace(/^\//,'')));
 if([...names].some(name=>/^(?:production|production-editor|pc-review|local-private|data)(?:\/|$)/.test(name)||name==='after-pack.cjs'))fail('native_pack_inert_source');
 const active=(await fs.readdir(source,{withFileTypes:true})).filter(entry=>entry.isFile()&&entry.name.endsWith('.cjs')&&entry.name!=='after-pack.cjs').map(entry=>entry.name),snapshots=new Map();
 // All root CJS, not merely the entry point, must have their exact current bytes.
 for(const name of [...active,'image-requirements-schema.json']){const bytes=await sourceBytes(path.join(source,name));if(!names.has(name))fail('native_pack_missing:'+name);if(!asar.extractFile(archive,name).equals(bytes))fail('native_pack_source_mismatch:'+name);snapshots.set(name,bytes);}
 if(!names.has('package.json'))fail('native_pack_missing:package.json');
 for(const name of active){for(const match of snapshots.get(name).toString('utf8').matchAll(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)){
  const relative=path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1]));if(relative.startsWith('../'))fail('native_pack_relative_escape');
  if(![relative,relative+'.cjs',relative+'.js',relative+'.json',relative+'/index.cjs'].some(file=>names.has(file)))fail('native_pack_missing:'+relative);
 }}
 const configured=JSON.parse(await fs.readFile(path.join(source,'package.json'),'utf8')),packaged=JSON.parse(asar.extractFile(archive,'package.json'));
 if(packaged.main!==configured.main||packaged.version!==configured.version)fail('native_pack_package_mismatch');
 for(const folder of ['pc-review/desktop','unified-runtime/desktop']){
  const target=inside(resources,path.join(resources,...folder.split('/')));await noLinks(target);await fs.mkdir(target,{recursive:true});
  for(const name of helpers){const original=snapshots.get(name);if(!original)fail('native_pack_missing:'+name);const file=inside(target,path.join(target,name));await noLinks(file);await fs.copyFile(path.join(source,name),file);if(hash(await sourceBytes(file))!==hash(original)||hash(await sourceBytes(path.join(source,name)))!==hash(original))fail('native_pack_source_changed:'+name);}
  // These physical helper namespaces have the same exact relative dependency set.
  for(const name of helpers)for(const match of snapshots.get(name).toString('utf8').matchAll(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)){const relative=path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1]));if(!helpers.includes(relative)&&!helpers.includes(relative+'.cjs'))fail('native_pack_physical_dependency_missing:'+relative);}
 }
 console.log('Native pack closure verified: '+active.length+' active CJS; 9 exact helpers in each physical resource namespace.');
}
afterPack.helpers=helpers;module.exports=afterPack;
