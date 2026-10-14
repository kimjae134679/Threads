'use strict';
const path=require('node:path'),{createHash}=require('node:crypto');
// Node24 can load the common UMD/ESM source. Packaged Electron reads the same
// classic-script codec from its explicit editor resource, not an external repo.
const packaged=!!process.versions.electron&&require('electron').app.isPackaged;
const codecFile=packaged?path.join(process.resourcesPath,'editor','unified-material-txt.js'):path.join(__dirname,'..','app','unified-material-txt.js');
const loaded=require(codecFile),codec=loaded.parse?loaded:globalThis.ThreadsUnifiedMaterialTxt;
function sourceRecord(data,metadata={}){
 const id=codec.existingId(data);
 if(metadata.id&&id&&metadata.id!==id)throw Error('unified_material_id_conflict');
 const source=codec.verbatimSource(data,require('./production-title.cjs').titleInfo),original=data.records.sourceOriginal;
 if(original){
  if(original.name!=='source.json'||typeof original.text!=='string'||createHash('sha256').update(original.text).digest('hex')!==original.sha256||JSON.stringify(JSON.parse(original.text.replace(/^\ufeff/,'')))!==JSON.stringify(source))throw Error('unified_material_source_mismatch');
 }
 return source;
}
function existingId(data){
 return codec.existingId(data);
}
function sourceDocument(data,metadata={}){
 const id=codec.existingId(data);if(metadata.id&&id&&metadata.id!==id)throw Error('unified_material_id_conflict');
 const doc=codec.sourceDocument(data,require('./production-title.cjs').titleInfo),raw=Buffer.from(doc.data,'base64');
 if(raw.length!==doc.bytes||createHash('sha256').update(raw).digest('hex')!==doc.sha256)throw Error('unified_material_document_hash_mismatch');
 return{...doc,raw};
}
// A preserved note is not a verbatim source. Only a pinned original manifest
// plus all original image bytes can retain the old saved-media inspection job.
async function savedMedia(data,root,metadata={}){
 const id=existingId(data),manifest=data.records.manifest,legacy=data.records.legacyFiles?.['manifest.json'];
 if(metadata.id&&id!==metadata.id)throw Error('unified_material_id_conflict');
 if(!['preserved','unavailable'].includes(data.human.bodyKind)||data.records.source||data.records.sourceDocument||manifest?.schema!=='threads-program-input-v1'||!id||!Array.isArray(manifest.media)||!manifest.media.length||!legacy||typeof legacy.text!=='string')throw Error('unified_material_saved_media_invalid');
 const hash=b=>createHash('sha256').update(b).digest('hex'),raw=Buffer.from(legacy.text,'utf8');
 if(raw.length!==legacy.bytes||hash(raw)!==legacy.sha256||JSON.stringify(JSON.parse(legacy.text.replace(/^\ufeff/,'')))!==JSON.stringify(manifest)||manifest.sourceUrl!==data.human.sourceUrl||metadata.sourceUrl&&metadata.sourceUrl!==manifest.sourceUrl||require('./production-title.cjs').titleInfo(manifest.title).displayTitle!==data.human.title)throw Error('unified_material_saved_media_mismatch');
 const fs=require('node:fs/promises'),resolve=require('./project-paths.cjs').createPathResolver({projectRoot:path.resolve(root),pathMappings:[]}),file=resolve(path.join(root,'manifest.json'));
 if(!(await fs.readFile(file)).equals(raw))throw Error('unified_material_saved_media_mismatch');
 for(const name of ['SOURCE.md','intake-manifest.json']){try{await fs.lstat(resolve(path.join(root,name)));throw Error('unified_material_saved_media_unpinned');}catch(e){if(e.code!=='ENOENT')throw e;}}
 for(const [i,asset]of manifest.media.entries()){
  if(asset.sequence!==i+1||typeof asset.file!=='string'||!/^media\/[^/\\]+\.(?:jpe?g|png|webp)$/i.test(asset.file)||!Number.isInteger(asset.bytes)||asset.bytes<=0||asset.bytes>25*1024*1024||!/^[a-f0-9]{64}$/i.test(asset.sha256||''))throw Error('unified_material_saved_media_invalid');
  const image=resolve(path.join(root,...asset.file.split('/'))),stat=await fs.lstat(image);if(!stat.isFile()||stat.size!==asset.bytes)throw Error('unified_material_saved_media_mismatch');
  if(hash(await fs.readFile(image))!==asset.sha256.toLowerCase())throw Error('unified_material_saved_media_mismatch');
 }
 const images=await require('./saved-materials.cjs').loadSavedMaterials(root);
 if(images.metadata.integrity!=='sha256-verified'||images.metadata.imageDirectory!=='media'||images.files.length!==manifest.media.length||images.files.some((file,i)=>file.name!==path.posix.basename(manifest.media[i].file)||hash(Buffer.from(file.data,'base64'))!==manifest.media[i].sha256.toLowerCase()))throw Error('unified_material_saved_media_mismatch');
 return{sourceName:'manifest.json',sourceText:legacy.text,files:images.files,imageDirectory:'media',intakeText:'',title:images.metadata.title,sourceUrl:images.metadata.sourceUrl,inputKind:'saved-media',sourceCheckedAt:metadata.sourceCheckedAt||null,sourcePublishedAt:metadata.sourcePublishedAt||null,collectedAt:metadata.collectedAt||null};
}
module.exports={...codec,sourceRecord,existingId,sourceDocument,savedMedia};
