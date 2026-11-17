// Explicit native actions only. Reading a source never starts work or changes state.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {writeAtomic} from '../desktop/atomic-file.cjs';
import {readSourceArchive} from './material-catalog.mjs';import {createPathResolver} from '../desktop/project-paths.cjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),fail=code=>{throw Object.assign(Error(code),{code,status:409});};
const tuple=c=>({key:c.key,postId:c.postId,outputVersion:c.outputVersion,fingerprint:c.fingerprint});
function base64(value,max){if(typeof value!=='string'||value.length>Math.ceil(max/3)*4||value.length%4!==0||/[^A-Za-z0-9+/=]/.test(value))fail('studio_production_bytes_invalid');const bytes=Buffer.from(value,'base64');if(bytes.length>max||bytes.toString('base64')!==value)fail('studio_production_bytes_invalid');return bytes;}
export class StudioProduction{
 constructor({projectRoot,catalog,commit,readOnly=false}){this.root=path.resolve(projectRoot);this.catalog=catalog;this.commit=commit;this.readOnly=readOnly;this.resolve=createPathResolver({projectRoot:this.root,pathMappings:[]});}
 async guard(context){if(this.readOnly)fail('read_only_inspection');return this.catalog.toolContext(tuple(context));}
 folder(context,version){if(!/^[a-f0-9]{64}$/.test(version))fail('studio_production_missing');return this.resolve(path.join(this.root,'local-private/studio-production',hash(context.postId),version));}
 async save(context,result){
  await this.guard(context);if(!context.source||['summary','unavailable'].includes(context.bodyKind))fail('studio_source_unavailable');
  const sourceBytes=base64(result.sourceZip,16*1024*1024),outputBytes=base64(result.zip,512*1024*1024),entries=await readSourceArchive(sourceBytes),sourcePlan=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(entries.get('bundle.json')));
  const previous=context.source.kind==='archive'?context.source.plan:null,expectedInput=previous?.input?.sha256||(context.source.kind==='job'?hash(context.source.job.sourceData?base64(context.source.job.sourceData,5*1024*1024):Buffer.from(context.source.job.sourceText)):null),originalTitle=previous?.originalTitle||context.source.job?.originalTitle||context.source.job?.title;
  if(sourcePlan.schema!=='threads-curated-source-v1'||!expectedInput||sourcePlan.input?.sha256!==expectedInput||sourcePlan.originalTitle!==originalTitle||!entries.has(sourcePlan.input.file)||hash(Buffer.from(entries.get(sourcePlan.input.file)))!==expectedInput||JSON.stringify(sourcePlan)!==JSON.stringify(result.sourcePlan))fail('studio_production_source_changed');
  if(previous&&(sourcePlan.sourceUrl!==previous.sourceUrl||sourcePlan.sourceType!==previous.sourceType||sourcePlan.input.file!==previous.input.file))fail('studio_production_source_changed');
  if(previous){for(const role of ['segments','comments','media']){const fields=role==='segments'?['id','kind','text','mediaName']:role==='comments'?['id','text','likes']:['name','file','sha256'];const identity=values=>values.map(v=>Object.fromEntries(fields.map(k=>[k,v[k]])));if(JSON.stringify(identity(sourcePlan[role]))!==JSON.stringify(identity(previous[role])))fail('studio_production_source_changed');}}
  for(const media of sourcePlan.media||[])if(!entries.has(media.file)||hash(Buffer.from(entries.get(media.file)))!==media.sha256)fail('studio_production_source_changed');
  const output=await readSourceArchive(outputBytes);if(!output.has('source-bundle.zip')||!Buffer.from(output.get('source-bundle.zip')).equals(sourceBytes)||!Array.isArray(result.images)||!result.images.length||result.images.length!==result.productionPlan?.pages?.length)fail('studio_production_output_invalid');
  const images=result.images.map((image,i)=>{const name='rendered/slide-'+String(i+1).padStart(3,'0')+'.png',bytes=base64(image.data,30*1024*1024);if(image.name!==name||!output.has(name)||!Buffer.from(output.get(name)).equals(bytes)||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail('studio_production_output_invalid');return{name,sha256:hash(bytes),bytes:bytes.length,mime:'image/png',order:i+1};});
  const outputSha256=hash(outputBytes),sourceZipSha256=hash(sourceBytes),outputVersion=hash(JSON.stringify([context.postId,context.outputVersion,sourceZipSha256,outputSha256,result.productionPlan.ruleVersion,images.map(im=>im.sha256)])),folder=this.folder(context,outputVersion),record={schema:1,selection:tuple(context),outputVersion,sourceZipSha256,outputSha256,images,sourcePlan,productionPlan:result.productionPlan,basePost:context.post||null,publicationAllowed:false};
  await this.guard(context);await fs.mkdir(folder,{recursive:true});for(const [name,bytes]of [['output.zip',outputBytes],['production.json',Buffer.from(JSON.stringify(record))]]){const file=this.resolve(path.join(folder,name));try{const before=await fs.readFile(file);if(!before.equals(bytes))fail('studio_production_collision');}catch(e){if(e.code!=='ENOENT')throw e;await fs.writeFile(file,bytes,{flag:'wx'});}}
  return{postId:context.postId,outputVersion,pages:images.length,instagramCarouselExceeded:images.length>20,publicationAllowed:false};
 }
 validateSelection(context,plan){
  if(!context.source||['summary','unavailable'].includes(context.bodyKind)||!plan||plan.schema!=='threads-curated-source-v1')fail('studio_source_unavailable');
  const previous=context.source.kind==='archive'?context.source.plan:null,job=context.source.job,expected=previous?.input?.sha256||(job?hash(job.sourceData?base64(job.sourceData,5*1024*1024):Buffer.from(job.sourceText)):null);
  if(!expected||plan.input?.sha256!==expected||plan.originalTitle!==(previous?.originalTitle||job?.originalTitle||job?.title))fail('studio_production_source_changed');
  if(previous){if(plan.sourceUrl!==previous.sourceUrl||plan.sourceType!==previous.sourceType)fail('studio_production_source_changed');for(const role of ['segments','comments']){const fields=role==='segments'?['id','kind','text','mediaName']:['id','text','likes'],identity=values=>values.map(v=>Object.fromEntries(fields.map(k=>[k,v[k]])));if(!Array.isArray(plan[role])||JSON.stringify(identity(plan[role]))!==JSON.stringify(identity(previous[role])))fail('studio_production_source_changed');}}
  return plan;
 }
 selectionFolder(context){return this.resolve(path.join(this.root,'local-private/studio-selection-drafts',hash(context.postId),hash(JSON.stringify(tuple(context)))));}
 async saveSelection(context,plan){
  await this.guard(context);this.validateSelection(context,plan);const bytes=Buffer.from(JSON.stringify({schema:1,selection:tuple(context),plan}));if(bytes.length>16*1024*1024)fail('studio_selection_size_limit');
  const digest=hash(bytes),folder=this.selectionFolder(context),file=this.resolve(path.join(folder,digest+'.json'));await fs.mkdir(folder,{recursive:true});try{await fs.writeFile(file,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST'||!(await fs.readFile(file)).equals(bytes))throw e;}await writeAtomic(this.resolve(path.join(folder,'latest')),digest);return{sha256:digest,publicationAllowed:false};
 }
 async loadSelection(context){
  const folder=this.selectionFolder(context),pointer=this.resolve(path.join(folder,'latest'));let digest;try{const st=await fs.lstat(pointer);if(!st.isFile()||st.size!==64)fail('studio_selection_changed');digest=await fs.readFile(pointer,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}
  if(!/^[a-f0-9]{64}$/.test(digest))fail('studio_selection_changed');const file=this.resolve(path.join(folder,digest+'.json')),st=await fs.lstat(file);if(!st.isFile()||st.size>16*1024*1024)fail('studio_selection_changed');
  const bytes=await fs.readFile(file);if(hash(bytes)!==digest)fail('studio_selection_changed');const record=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(record.schema!==1||JSON.stringify(record.selection)!==JSON.stringify(tuple(context)))fail('studio_selection_changed');return this.validateSelection(context,record.plan);
 }
 async currentSource(post){
  if(!post?.post_id||typeof post.output_version!=='string'||!/^[a-f0-9]{64}$/.test(post.output_version))return null;
  const folder=this.folder({postId:post.post_id},post.output_version),file=this.resolve(path.join(folder,'output.zip'));let record,bytes;
  try{record=JSON.parse(await fs.readFile(this.resolve(path.join(folder,'production.json')),'utf8'));bytes=await fs.readFile(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}
  const bad=()=>fail('studio_production_changed'),images=record.images;
  if(record.schema!==1||record.selection?.postId!==post.post_id||record.outputVersion!==post.output_version||!Array.isArray(images)||images.length!==post.images?.length||hash(bytes)!==record.outputSha256||images.some((im,i)=>im.order!==i+1||im.sha256!==post.images[i].asset_id||im.mime!==post.images[i].mime))bad();
  const expectedVersion=hash(JSON.stringify([post.post_id,record.selection.outputVersion,record.sourceZipSha256,record.outputSha256,record.productionPlan?.ruleVersion,images.map(im=>im.sha256)]));if(expectedVersion!==post.output_version)bad();
  const output=await readSourceArchive(bytes),sourceBytes=Buffer.from(output.get('source-bundle.zip')||[]);if(hash(sourceBytes)!==record.sourceZipSha256)bad();
  for(const im of images){const data=Buffer.from(output.get(im.name)||[]);if(data.length!==im.bytes||hash(data)!==im.sha256)bad();}
  const source=await readSourceArchive(sourceBytes),plan=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(source.get('bundle.json')));if(JSON.stringify(plan)!==JSON.stringify(record.sourcePlan)||post.source?.original_title&&post.source.original_title!==plan.originalTitle)bad();
  return{kind:'local-generated-source-bundle',post,bytes:sourceBytes,sourceFile:file,root:this.root,sourceZipSha256:record.sourceZipSha256,sourceZipPreserved:true,archiveEntry:'source-bundle.zip',archiveSha256:record.outputSha256,archiveBytes:bytes.length,originSelection:record.selection,sourceFingerprint:null,producerSourceFingerprint:null};
 }
 async saveProject(context,project){
  await this.guard(context);if(!project||typeof project!=='object'||!/^[A-Za-z0-9_-]{1,100}$/.test(project.projectId||'')||project.source?.candidateId!==context.postId||project.source?.extraction?.outputVersion!==context.outputVersion||!Array.isArray(project.assets)||!project.assets.length||project.assets.length>30)fail('studio_editor_source_changed');
  const expected=(context.editorFiles||[]).map(im=>im.sha256).sort(),actual=project.assets.map(asset=>{const match=/^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(asset.dataUrl||'');if(!match)fail('studio_editor_source_changed');return hash(base64(match[1],30*1024*1024));}).sort();
  if(JSON.stringify(expected)!==JSON.stringify(actual))fail('studio_editor_source_changed');
  const bytes=Buffer.from(JSON.stringify(project));if(bytes.length>100*1024*1024)fail('studio_editor_size_limit');
  const sha256=hash(bytes),folder=this.resolve(path.join(this.root,'local-private/editor-projects',hash(context.postId),hash(context.outputVersion||context.fingerprint))),file=this.resolve(path.join(folder,sha256+'.json'));await this.guard(context);await fs.mkdir(folder,{recursive:true});try{await fs.writeFile(file,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST'||!(await fs.readFile(file)).equals(bytes))throw e;}return{sha256,publicationAllowed:false};
 }
 async handoff(context,version){
  await this.guard(context);const folder=this.folder(context,version);let record,bytes;try{record=JSON.parse(await fs.readFile(this.resolve(path.join(folder,'production.json')),'utf8'));bytes=await fs.readFile(this.resolve(path.join(folder,'output.zip')));}catch(e){if(e.code==='ENOENT')fail('studio_production_missing');throw e;}
  if(record.outputVersion!==version||JSON.stringify(record.selection)!==JSON.stringify(tuple(context))||hash(bytes)!==record.outputSha256)fail('studio_production_changed');
  const entries=await readSourceArchive(bytes),images=record.images.map(im=>{const bytes=Buffer.from(entries.get(im.name)||[]);if(bytes.length!==im.bytes||hash(bytes)!==im.sha256)fail('studio_production_changed');return{...im,data:bytes};});
  const base=record.basePost||{post_id:context.postId,caption:'',platform_captions:{instagram:'',threads:''},tags:'',source:{url:context.sourceUrl,label:context.title},production_caption_status:'held-unverified-caption'},post={...base,post_id:context.postId,output_version:version,images,review:null,final_review:null,approval:null,publication_approval:null};
  if(typeof this.commit!=='function')fail('studio_production_handoff_unavailable');return this.commit(context,post,record);
 }
}
