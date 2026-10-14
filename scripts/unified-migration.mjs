import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {section} from '../repo-candidates.mjs';
import {exactSourceUrl} from './normalize-existing-candidates.mjs';
import '../app/unified-material-txt.js';
import '../app/source-page-plan.js';
import {cleanDisplayTitle} from '../upload-studio/title-normalization.mjs';
import {readableSourceHtml} from './readable-source-html.mjs';
const C=globalThis.ThreadsUnifiedMaterialTxt,hash=b=>createHash('sha256').update(b).digest('hex');
const fail=(code)=>{throw Object.assign(Error(code),{code});};
const slash=s=>s.replaceAll(path.sep,'/');
function target(root,relative){
 if(typeof relative!=='string'||path.isAbsolute(relative)||/^[A-Za-z]:|^\\/.test(relative))fail('migration_destination_escape');
 const p=path.resolve(root,relative),rel=path.relative(root,p);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))fail('migration_destination_escape');return p;
}
async function noLinks(file,{missing=false}={}){
 const full=path.resolve(file),parsed=path.parse(full);let at=parsed.root;
 for(const part of full.slice(parsed.root.length).split(path.sep).filter(Boolean)){
  at=path.join(at,part);try{if((await fs.lstat(at)).isSymbolicLink())fail('migration_symlink');}catch(e){if(e.code==='ENOENT'&&missing)continue;throw e;}
 }
}
async function digest(file){const h=createHash('sha256');for await(const b of createReadStream(file,{highWaterMark:1024*1024}))h.update(b);return h.digest('hex');}
export function migrationWorkers(env=process.env){
 const value=env.THREADS_MIGRATION_WORKERS;if(value===undefined)return 4;
 if(!/^(?:[1-9]|1[0-6])$/.test(value))fail('migration_workers_invalid');return Number(value);
}
export async function forEachBounded(items,work){
 let next=0,failure=null;await Promise.all(Array.from({length:Math.min(migrationWorkers(),items.length)},async()=>{while(!failure&&next<items.length){const index=next++;try{await work(items[index],index);}catch(e){failure??=e;}}}));if(failure)throw failure;
}
async function snapshot(file){await noLinks(file);const a=await fs.stat(file);if(!a.isFile())fail('migration_not_regular');const sha256=await digest(file),b=await fs.stat(file);if(a.size!==b.size||a.mtimeMs!==b.mtimeMs)fail('migration_source_changed');return{bytes:a.size,sha256};}
const excludedReason=(rel)=>{
 const parts=rel.split('/'),name=parts.at(-1);
 if(parts.some(x=>['node_modules','.git','__pycache__'].includes(x)))return 'dependency or temporary cache, not original material evidence';
 if(/^(?:server\.pid|\.state-candidate.*|.*\.tmp)$/.test(name))return 'transient process/transaction marker; never restored as restart input';
 return null;
};
function candidateTxt(bytes,key){
 const md=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes),originalTitle=/^#\s+(.+)$/m.exec(md.replace(/^\ufeff/,''))?.[1]?.trim()||key.replace(/\.md$/,''),title=cleanDisplayTitle(originalTitle);
 const url=exactSourceUrl(md)||'';
 const summary=section(md,'글 내용|확인된 글 내용 요약')||/^-\s*whyGood\s*:\s*([^\r\n]+)/im.exec(md)?.[1]||'';
 const caption=section(md,'게시 설명글 초안').split(/\r?\n\r?\n- /)[0];
 return Buffer.from(C.serialize({human:{sourceUrl:url,title,body:summary,bodyKind:summary?'summary':'unavailable',platformCaptions:caption?{instagram:caption,threads:caption}:{}},records:{candidate:{originalKey:key,originalTitle,originalMarkdown:md,originalSha256:hash(bytes),publicationAllowed:false}}},{visibility:'public',lineEnding:md.includes('\r\n')?'\r\n':'\n'}));
}
async function programTxt(entry){
 const legacyFiles={};let htmlRaw=null;for(const f of entry.inputFiles){const raw=await fs.readFile(f.file);if(hash(raw)!==f.sha256)fail('migration_source_changed');if(f.relative==='source/source.html'){htmlRaw=raw;continue;}legacyFiles[f.relative]={sha256:f.sha256,bytes:raw.length,text:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)};}
 const json=name=>legacyFiles[name]?JSON.parse(legacyFiles[name].text.replace(/^\ufeff/,'')):null;
 const manifest=json('manifest.json'),source=json('source.json')||json('source/source.json');
 const title=source?.title||manifest?.title||entry.indexRow.title||entry.indexRow.id;
 const body=source?.body??legacyFiles['참고 기록/content.txt']?.text??legacyFiles['content.txt']?.text??'',sourceUrl=source?.sourceUrl||manifest?.sourceUrl||entry.indexRow.sourceUrl||'';
 const bodyKind=source?.schema==='threads-verbatim-source-v1'&&source.verbatim===true?'verbatim':body?'preserved':'unavailable';
 const human={title:globalThis.ThreadsPagePlan.titleInfo(title).displayTitle,sourceUrl,body,bodyKind,platformCaptions:{}};
 const records={manifest:manifest||null,source:source||null,indexRow:entry.indexRow,legacyFiles,migration:{originalId:manifest?.id||source?.intake?.id||entry.indexRow.id,publicationApprovalTransferred:false}};
 if(htmlRaw){if(source)fail('migration_multiple_original_sources');const acquisition=json('source/acquisition.json');human.body=readableSourceHtml(htmlRaw,acquisition?.contentType).body;human.bodyKind='preserved';records.sourceDocument={schema:'threads-source-document-v1',name:'source.html',relativePath:'source/source.html',originalTitle:title,sourceUrl,data:htmlRaw.toString('base64'),bytes:htmlRaw.length,sha256:hash(htmlRaw),acquisition};C.sourceDocument({human,records});}
 if(bodyKind==='verbatim')C.verbatimSource({human,records});
 return Buffer.from(C.serialize({human,records}));
}
async function generated(entry){
 const raw=await fs.readFile(entry.sourceFile);if(hash(raw)!==entry.sourceSha256)fail('migration_source_changed');
 if(entry.type==='candidate-md')return candidateTxt(raw,entry.originalKey);
 if(entry.type==='program-txt')return programTxt(entry);
 if(entry.type==='manual-txt'){
  const legacyFiles={};for(const f of entry.inputFiles){const bytes=await fs.readFile(f.file);if(hash(bytes)!==f.sha256)fail('migration_source_changed');legacyFiles[f.relative]={sha256:f.sha256,bytes:bytes.length,...(/\.(txt|json)$/.test(f.relative)?{text:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes)}:{})};}
  const body=legacyFiles['본문.txt']?.text,full=legacyFiles['전체문안.txt']?.text,binding=JSON.parse(legacyFiles['승인본 확인.json']?.text?.replace(/^\ufeff/,'')||'null');if(typeof body!=='string'||typeof full!=='string'||typeof binding?.postId!=='string'||typeof binding.outputVersion!=='string'||!Array.isArray(binding.images))fail('migration_manual_invalid');
  for(const [i,im]of binding.images.entries()){if(im.order!==i+1||typeof im.file!=='string'||path.basename(im.file)!==im.file||legacyFiles[im.file]?.sha256!==im.sha256)fail('migration_manual_image_binding');}
  return Buffer.from(C.serialize({human:{sourceUrl:binding.sourceUrl||'',title:cleanDisplayTitle(body.replace(/^\ufeff/,'').split(/\r?\n/)[0]),body:'',bodyKind:'unavailable',platformCaptions:{instagram:full}},records:{approvedBinding:binding,legacyFiles,publicationAuthorized:false,migration:{originalId:binding.postId,originalOutputVersion:binding.outputVersion,publicationApprovalTransferred:false,threadsCaptionUnrecorded:true}}}));
 }
 return raw;
}
function appendManualMaterials(plan){
 for(const body of plan.files.filter(f=>f.type==='copy'&&/^local-private\/project\/수동 업로드\/.+\/본문\.txt$/.test(f.destinationRelative))){
  const folder=path.posix.dirname(body.destinationRelative),destinationRelative=folder+'/자료.txt';if(plan.files.some(f=>f.destinationRelative===destinationRelative))continue;
  const originals=plan.files.filter(f=>f.type==='copy'&&path.posix.dirname(f.destinationRelative)===folder&&(/\.(txt|json|png)$/.test(f.destinationRelative))),inputFiles=originals.map(f=>({file:f.sourceFile,relative:path.posix.basename(f.destinationRelative),sha256:f.sourceSha256,bytes:f.sourceBytes}));if(!['본문.txt','전체문안.txt','해시태그.txt','승인본 확인.json'].every(name=>inputFiles.some(f=>f.relative===name)))continue;
  plan.files.push({scopeId:body.scopeId,type:'manual-txt',classification:'private',sourceFile:body.sourceFile,sourceRelative:body.sourceRelative,sourceSha256:body.sourceSha256,sourceBytes:body.sourceBytes,destinationRelative,inputFiles});plan.counts.types['manual-txt']=(plan.counts.types['manual-txt']||0)+1;plan.counts.scopes[body.scopeId]++;plan.counts.bytes+=body.sourceBytes;
 }
}
async function guards(config){const result=[];for(const g of config.guards||[]){const s=await snapshot(g.file);let json;if(g.revision!==undefined){json=JSON.parse(await fs.readFile(g.file,'utf8'));if(json.revision!==g.revision)fail('migration_revision_mismatch');}result.push({...g,...s});}return result;}
export async function planMigration(config){
 const projectRoot=path.resolve(config.projectRoot);await noLinks(projectRoot);
 if(!Array.isArray(config.scopes)||!config.scopes.length)fail('migration_scope_required');
 const extraGuards=[];
 const files=[],excluded=[],pathMappings=[],destinations=new Set(),counts={scopes:{},types:{},bytes:0};
 for(const scope of config.scopes){
  if(!scope.id||!['private','public'].includes(scope.classification)||!['copy','candidate-md','program-txt'].includes(scope.transform))fail('migration_scope_invalid');
  const destination=target(projectRoot,scope.destinationRoot);
  if(scope.classification==='private'&&!scope.destinationRoot.startsWith('local-private/'))fail('migration_private_scope_invalid');await noLinks(destination,{missing:true});const sourceRoot=path.resolve(scope.sourceRoot);await noLinks(sourceRoot);
  pathMappings.push({sourceRoot,destinationRoot:scope.destinationRoot,classification:scope.classification,scopeId:scope.id});counts.scopes[scope.id]=0;
  if(scope.transform==='program-txt'){
   const indexFile=path.join(sourceRoot,'index.json'),index=JSON.parse((await fs.readFile(indexFile,'utf8')).replace(/^\ufeff/,''));
   if(index.schema!=='threads-program-input-index-v1'||!Array.isArray(index.records))fail('migration_input_index_invalid');
   extraGuards.push({file:indexFile,...await snapshot(indexFile)});
   for(const row of index.records){
    if(typeof row.folder!=='string'||!row.id)fail('migration_input_index_invalid');const folder=target(sourceRoot,row.folder);await noLinks(folder);
    const names=['manifest.json','자료 안내.txt','content.txt','comments.txt','candidate.md','참고 기록/content.txt','참고 기록/comments.txt','참고 기록/candidate.md','source.json','source/source.json','source.txt','source/source.txt','source/source.html','source/acquisition.json','작업 정보/title-input.json','작업 정보/workflow-state.json','작업 정보/automation-status.json','작업 정보/capture-plan.json'],inputFiles=[];
    for(const relative of names){const file=target(folder,relative);try{const state=await snapshot(file);inputFiles.push({file,relative,...state});}catch(e){if(e.code!=='ENOENT')throw e;}}
    if(!inputFiles.length)fail('migration_input_missing');
    const main=inputFiles.find(x=>x.relative==='manifest.json')||inputFiles.find(x=>x.relative.endsWith('source.json'))||inputFiles[0],entry={scopeId:scope.id,type:'program-txt',classification:'private',sourceFile:main.file,sourceRelative:slash(path.relative(sourceRoot,main.file)),sourceSha256:main.sha256,sourceBytes:main.bytes,indexRow:row,inputFiles,destinationRelative:path.posix.join(scope.destinationRoot,slash(row.folder),'자료.txt')};
    const generated=await programTxt(entry);entry.targetSha256=hash(generated);entry.targetBytes=generated.length;
    if(destinations.has(entry.destinationRelative.toLowerCase()))fail('migration_destination_collision');destinations.add(entry.destinationRelative.toLowerCase());files.push(entry);counts.scopes[scope.id]++;counts.types['program-txt']=(counts.types['program-txt']||0)+1;
   }
   continue;
  }
  const walk=async(dir,rel='')=>{for(const ent of await fs.readdir(dir,{withFileTypes:true})){
   const relative=path.posix.join(rel,ent.name),file=path.join(dir,ent.name),reason=excludedReason(relative);
   if(scope.include&&!(scope.include.some(x=>relative===x||relative.startsWith(x+'/')||x.startsWith(relative+'/')))){excluded.push({scopeId:scope.id,relative,reason:'not an explicitly owned preservation member'});continue;}
   if(scope.transform==='candidate-md'&&ent.isDirectory()&&/^_|archive|retired|길이제외/i.test(ent.name)){excluded.push({scopeId:scope.id,relative,reason:'retired/archive evidence stays private, never an active candidate'});continue;}
   if(scope.exclude?.some(x=>relative===x||relative.startsWith(x+'/'))){excluded.push({scopeId:scope.id,relative,reason:'handled by an explicitly distinct source scope'});continue;}
   if(ent.isSymbolicLink()){excluded.push({scopeId:scope.id,relative,reason:'junction/symlink is not traversed; explicitly mapped actual targets are separate scopes'});continue;}
   if(reason){excluded.push({scopeId:scope.id,relative,reason});continue;}
   if(ent.isDirectory()){await walk(file,relative);continue;}if(!ent.isFile())continue;
   if(scope.transform==='candidate-md'&&(!ent.name.endsWith('.md')||/^README\.md$/i.test(ent.name))){excluded.push({scopeId:scope.id,relative,reason:'candidate canonical scope contains Markdown only; README/other evidence belongs to private preservation scope'});continue;}
   const observed=await snapshot(file),type=scope.transform,destinationRelative=path.posix.join(scope.destinationRoot,type==='candidate-md'?relative.replace(/\.md$/,'.txt'):relative);
   if(destinations.has(destinationRelative.toLowerCase()))fail('migration_destination_collision');destinations.add(destinationRelative.toLowerCase());
   const entry={scopeId:scope.id,type,classification:scope.classification,sourceFile:file,sourceRelative:relative,destinationRelative,sourceSha256:observed.sha256,sourceBytes:observed.bytes};
   if(type==='candidate-md'){entry.originalKey=ent.name;const result=candidateTxt(await fs.readFile(file),ent.name);entry.targetSha256=hash(result);entry.targetBytes=result.length;}else{entry.targetSha256=observed.sha256;entry.targetBytes=observed.bytes;}
   files.push(entry);counts.scopes[scope.id]++;counts.types[type]=(counts.types[type]||0)+1;counts.bytes+=entry.sourceBytes;
  }};if((await fs.stat(sourceRoot)).isFile()){const observed=await snapshot(sourceRoot),destinationRelative=scope.destinationRoot;if(destinations.has(destinationRelative.toLowerCase()))fail('migration_destination_collision');destinations.add(destinationRelative.toLowerCase());files.push({scopeId:scope.id,type:'copy',classification:scope.classification,sourceFile:sourceRoot,sourceRelative:path.basename(sourceRoot),destinationRelative,sourceSha256:observed.sha256,sourceBytes:observed.bytes,targetSha256:observed.sha256,targetBytes:observed.bytes});counts.scopes[scope.id]=1;counts.types.copy=(counts.types.copy||0)+1;counts.bytes+=observed.bytes;}else await walk(sourceRoot);
 }
 return{schema:'threads-unified-migration-v1',phase:'planned',projectRoot,createdAt:new Date().toISOString(),guards:[...await guards(config),...extraGuards],pathMappings,files,excluded,counts,sourceDeletionAllowed:false,approvalTransferAllowed:false,activationAllowed:false};
}
async function validatePlan(plan){
 if(plan.schema!=='threads-unified-migration-v1'||plan.sourceDeletionAllowed!==false||plan.approvalTransferAllowed!==false||plan.activationAllowed!==false)fail('migration_plan_invalid');
 await noLinks(plan.projectRoot);
 for(const g of plan.guards||[]){if((await snapshot(g.file)).sha256!==g.sha256)fail('migration_source_changed');if(g.revision!==undefined&&JSON.parse(await fs.readFile(g.file,'utf8')).revision!==g.revision)fail('migration_revision_mismatch');}
 await forEachBounded(plan.files,async f=>{target(plan.projectRoot,f.destinationRelative);for(const dep of [{file:f.sourceFile,sha256:f.sourceSha256},...(f.inputFiles||[])])if((await snapshot(dep.file)).sha256!==dep.sha256)fail('migration_source_changed');});
}
export function copySourceLookup(files){const result=new Map();for(const row of files){if(row.type!=='copy')continue;const key=path.resolve(row.sourceFile);if(!result.has(key))result.set(key,row);}return result;}
export async function refreshGeneratedMigration(plan,{previousManifestSha256}={}){
 if(!/^[a-f0-9]{64}$/.test(previousManifestSha256||'')||plan.schema!=='threads-unified-migration-v1'||plan.phase!=='planned'||plan.sourceDeletionAllowed!==false||plan.approvalTransferAllowed!==false||plan.activationAllowed!==false)fail('migration_plan_invalid');
 await noLinks(plan.projectRoot);
 for(const g of plan.guards||[]){if((await snapshot(g.file)).sha256!==g.sha256)fail('migration_source_changed');if(g.revision!==undefined&&JSON.parse(await fs.readFile(g.file,'utf8')).revision!==g.revision)fail('migration_revision_mismatch');}
 const next=JSON.parse(JSON.stringify(plan));appendManualMaterials(next);let refreshed=0;const copies=copySourceLookup(next.files);
 // Enrich old generated dependencies only from immutable original copy pins.
 for(const f of next.files.filter(f=>f.type==='program-txt'))for(const relative of ['source/source.html','source/acquisition.json']){
  if(f.inputFiles.some(dep=>dep.relative===relative))continue;
  const expected=path.join(path.dirname(f.sourceFile),...relative.split('/')),copy=copies.get(path.resolve(expected));
  if(copy)f.inputFiles.push({file:copy.sourceFile,relative,sha256:copy.sourceSha256,bytes:copy.sourceBytes});
 }
 for(const f of next.files){target(next.projectRoot,f.destinationRelative);if(f.type==='copy')continue;if(!['candidate-md','program-txt','manual-txt'].includes(f.type))fail('migration_plan_invalid');for(const dep of [{file:f.sourceFile,sha256:f.sourceSha256},...(f.inputFiles||[])])if((await snapshot(dep.file)).sha256!==dep.sha256)fail('migration_source_changed');const bytes=await generated(f);f.targetSha256=hash(bytes);f.targetBytes=bytes.length;refreshed++;}
 next.generatedRefresh={previousManifestSha256,at:new Date().toISOString(),entries:refreshed,copyPinsUnchanged:true,sourcePinsUnchanged:true,fullCopySourceValidationRequiredBeforeApply:true};
 return next;
}
export async function applyMigration(plan){
 await validatePlan(plan);let copied=0,skipped=0;
 // Preflight all collisions before writing any target.
 await forEachBounded(plan.files,async f=>{const dest=target(plan.projectRoot,f.destinationRelative);await noLinks(dest,{missing:true});try{if((await snapshot(dest)).sha256!==f.targetSha256)fail('migration_destination_conflict');}catch(e){if(e.code!=='ENOENT')throw e;}});
 await forEachBounded(plan.files,async f=>{const dest=target(plan.projectRoot,f.destinationRelative);await noLinks(dest,{missing:true});if((await snapshot(f.sourceFile)).sha256!==f.sourceSha256)fail('migration_source_changed');
  try{if((await snapshot(dest)).sha256===f.targetSha256){skipped++;return;}fail('migration_destination_conflict');}catch(e){if(e.code!=='ENOENT')throw e;}
  await fs.mkdir(path.dirname(dest),{recursive:true});await noLinks(path.dirname(dest));
  const temp=dest+'.migration-'+randomUUID();try{
   if(f.type==='copy')await fs.copyFile(f.sourceFile,temp);else await fs.writeFile(temp,await generated(f),{flag:'wx'});
   if((await snapshot(temp)).sha256!==f.targetSha256)fail('migration_target_hash_mismatch');
   // Link creates without replace, preventing a concurrent writer from being lost.
   await fs.link(temp,dest);copied++;
  }finally{await fs.rm(temp,{force:true});}
 });
 return{copied,skipped,verified:(await verifyMigration(plan)).verified,sourceDeletionAllowed:false,activationAllowed:false};
}
export async function verifyMigration(plan){
 let verified=0;await validatePlan(plan);await forEachBounded(plan.files,async f=>{const dest=target(plan.projectRoot,f.destinationRelative);if((await snapshot(dest)).sha256!==f.targetSha256)fail('migration_target_hash_mismatch');verified++;});return{verified,sourceBytesUnchanged:true,approvalTransferAllowed:false};
}
export function defaultScopeConfig(projectRoot){
 const collection='D:/A_KJ/AI/Workspace/Threads/source-collection-20261008-Sol',context='C:/Users/user/Documents/Codex/2026-10-09/threads-1-https-github-com-kimjae134679';
 const scope=(id,sourceRoot,destinationRoot,transform='copy',classification='private')=>({id,sourceRoot,destinationRoot,transform,classification});
 return{projectRoot,guards:[{file:'D:/A_KJ/AI/Workspace/Threads/upload-studio-20261009/.local/state.json',revision:168}],scopes:[
  scope('project-original','D:/A_KJ/AI/Projects/Threads','local-private/project'),
  scope('program-inputs-junction','C:/Users/user/source/repos/Threads-program-inputs/data/runtime/program_inputs','local-private/project/자료/01_후보 기록'),
  scope('production-inputs','D:/A_KJ/AI/Workspace/Threads/review-20261008-0311-photo/inputs','local-private/production-inputs'),
  scope('program-canonical','C:/Users/user/source/repos/Threads-program-inputs/data/runtime/program_inputs','local-private/project/자료/01_후보 기록','program-txt'),
  scope('production-canonical','D:/A_KJ/AI/Workspace/Threads/review-20261008-0311-photo/inputs','local-private/production-inputs','program-txt'),
  scope('operating-studio','D:/A_KJ/AI/Workspace/Threads/upload-studio-20261009/.local','local-private/operating-studio'),
  scope('installed-program','D:/A_KJ/AI/Applications/ThreadsProduction/0.3.38-cover.20261009.10','local-private/programs/ThreadsProduction/0.3.38-cover.20261009.10'),
  scope('collection-work',context+'/work','local-private/collection-context/work'),scope('collection-outputs',context+'/outputs','local-private/collection-context/outputs'),
  scope('collection-archive4',collection+'/data/_raw_batches/2026-10-10_길이제외','local-private/collection-context/length-excluded'),
  scope('collection29',collection+'/data/candidates/2026-10-09_신규수집','data/candidates/2026-10-09_신규수집','candidate-md','public'),
  scope('collection751',collection+'/data/candidates/2026-10-09_추가수집','data/candidates/2026-10-09_추가수집','candidate-md','public'),
  {...scope('existing1571',path.join(projectRoot,'data/candidates'),'data/candidates','candidate-md','public'),exclude:['2026-10-09_신규수집','2026-10-09_추가수집']},
  scope('editor-references','C:/Users/user/AppData/Roaming/threads-cut-editor/references','local-private/editor-references'),
  scope('legacy-controller','D:/A_KJ/AI/Scripts/ThreadsUploadStudio','local-private/legacy-program-history/ThreadsUploadStudio'),
  scope('owned-review-shortcut','D:/A_KJ/AI/Launchers/Threads 게시글 평가.lnk','local-private/legacy-program-history/Threads 게시글 평가.lnk'),
  {...scope('editor-profile-history','C:/Users/user/AppData/Roaming/threads-cut-editor','local-private/profile-history/editor'),include:['Local Storage','Session Storage','Preferences','Local State']},
  {...scope('review-profile-history','C:/Users/user/AppData/Roaming/ThreadsReview/0.3.38-cover.20261009.10','local-private/profile-history/review38'),include:['Local Storage','Session Storage','Preferences','Local State']},
  ...[
   ['C:/Users/user/Documents/Codex/2026-10-09/task-6/studio-control-proof/PC_READONLY_UI_AUDIT.json','task6/PC_READONLY_UI_AUDIT.json'],
   ...['stage-portrait-delivery.py','finalize-portrait-delivery.py','write-portrait-delivery-handoff.py'].map(f=>['C:/Users/user/Documents/Codex/2026-10-08/task-16/'+f,'task16/'+f]),
   ...['PORTRAIT_DELIVERY_PATH_CONTRACT_2026-10-10.md','PORTRAIT_LAYOUT_PRODUCTION_2026-10-09.md'].map(f=>['C:/Users/user/Documents/Codex/2026-10-08/task-16/cover-integration/docs/'+f,'task16/'+f])
  ].map(([src,dest],i)=>scope('handoff-'+(i+1),src,'local-private/legacy-program-history/'+dest))
 ]};
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
 const [command,...args]=process.argv.slice(2),value=k=>args[args.indexOf(k)+1],root=path.resolve(value('--project-root')||path.join(path.dirname(fileURLToPath(import.meta.url)),'..')),file=path.join(root,'local-private/migration-manifest.json');
 if(command==='plan'){
  const config=args.includes('--config')?JSON.parse(await fs.readFile(value('--config'),'utf8')):defaultScopeConfig(root),plan=await planMigration({...config,projectRoot:root});
  await fs.mkdir(path.dirname(file),{recursive:true});await noLinks(path.dirname(file));await fs.writeFile(file,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({phase:'planned',counts:plan.counts,excluded:plan.excluded.length,manifestSha256:await digest(file)}));
 }else if(['apply','verify','refresh-generated'].includes(command)){
  const raw=await fs.readFile(file);if(!value('--manifest-sha')||hash(raw)!==value('--manifest-sha'))fail('migration_manifest_cas_mismatch');const plan=JSON.parse(raw);if(path.resolve(plan.projectRoot)!==root)fail('migration_project_root_mismatch');
  if(command==='refresh-generated'){
   const next=await refreshGeneratedMigration(plan,{previousManifestSha256:hash(raw)}),updated=Buffer.from(JSON.stringify(next,null,2)+'\n'),temp=file+'.refresh-'+randomUUID();
   try{await fs.writeFile(temp,updated,{flag:'wx'});if(hash(await fs.readFile(file))!==hash(raw))fail('migration_manifest_cas_mismatch');await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}
   console.log(JSON.stringify({phase:'generated-refreshed',entries:next.generatedRefresh.entries,copyPinsUnchanged:true,sourcePinsUnchanged:true,manifestSha256:hash(updated)}));
  }else console.log(JSON.stringify(command==='apply'?await applyMigration(plan):await verifyMigration(plan)));
 }else fail('usage: plan|apply|verify --project-root ROOT [--config PRIVATE_CONFIG] [--manifest-sha SHA]');
}
