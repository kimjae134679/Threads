// Private, read-only catalog. Stored reviews are evidence, never inherited authorization.
import fs from 'node:fs/promises';
import path from 'node:path';import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {finalCaption,platformCaption,finalReviewStatus,reviewNote,isActivePost,readiness} from './domain.mjs';
import {instagramTaggedCaption} from './tags.mjs';
import {ProductionInput,productionVersion} from './production-input.mjs';
import {cleanCaptionFirstLine} from './title-normalization.mjs';
import '../app/unified-material-txt.js';
import {configuredResolver} from '../desktop/project-paths.cjs';
import {loadRepoCandidates,section} from '../repo-candidates.mjs';
const MaterialTxt=globalThis.ThreadsUnifiedMaterialTxt;
let archiveReader;
async function readSourceArchive(bytes){
 if(!archiveReader)archiveReader=(async()=>{const c=vm.createContext({Blob,TextEncoder,TextDecoder,Uint8Array,DataView});vm.runInContext('window=globalThis',c);for(const name of ['source-cut-zip.js','source-bundle-zip.js'])vm.runInContext(await fs.readFile(new URL('../app/'+name,import.meta.url),'utf8'),c);return{read:c.ThreadsSourceBundleZip.read,crc32:c.ThreadsSourceCutZip.crc32};})();
 const reader=await archiveReader,entries=await reader.read(new Blob([bytes])),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=bytes.length-22;
 if(end<0||v.getUint32(end,true)!==0x06054b50||v.getUint16(end+4,true)||v.getUint16(end+6,true)||v.getUint16(end+20,true)||v.getUint16(end+8,true)!==entries.size||v.getUint16(end+10,true)!==entries.size)throw Error('source_zip_directory_invalid');
 let at=v.getUint32(end+16,true);if(at+v.getUint32(end+12,true)!==end)throw Error('source_zip_directory_invalid');
 for(const [name,data]of entries){if(at+46>end||v.getUint32(at,true)!==0x02014b50||v.getUint16(at+10,true)!==0||v.getUint16(at+8,true)&8||v.getUint32(at+16,true)!==reader.crc32(data)||v.getUint32(at+20,true)!==data.length||v.getUint32(at+24,true)!==data.length)throw Error('source_zip_directory_invalid');const n=v.getUint16(at+28,true),extra=v.getUint16(at+30,true),comment=v.getUint16(at+32,true),next=at+46+n+extra+comment;if(next>end||new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(at+46,at+46+n))!==name)throw Error('source_zip_directory_invalid');at=next;}
 if(at!==end)throw Error('source_zip_directory_invalid');return entries;
}
let sourceMetadataParser;
async function sourceUrlRelation(plan,current,entries){
 if(plan.sourceUrl===current)return{kind:'exact'};
 let a,b;try{a=new URL(plan.sourceUrl);b=new URL(current);}catch{fail('material_current_source_url_invalid');}
 const invalid=()=>fail('material_current_source_url_invalid');
 if(a.href!==plan.sourceUrl||b.href!==current||a.protocol!=='https:'||a.username||a.password||a.port||a.hash||b.hash||a.search||a.protocol!==b.protocol||a.host!==b.host||a.pathname!==b.pathname)invalid();
 const query=[...b.searchParams];if(query.length!==1||b.search!==('?'+query[0][0]+'='+query[0][1]))invalid();
 const [name,value]=query[0],allowed=a.hostname==='www.inven.co.kr'&&/^\/board\/webzine\/\d+\/\d+$/.test(a.pathname)?name==='iskin'&&value==='webzine':a.hostname==='theqoo.net'&&/^\/review\/\d+$/.test(a.pathname)?name==='listStyle'&&value==='viewer'||name==='category'&&['25894','25889','25892'].includes(value):false;
 if(!allowed||plan.sourceType!=='html'||!/\.html?$/i.test(plan.input?.file||''))invalid();
 if(!sourceMetadataParser)sourceMetadataParser=(async()=>{try{return await import(new URL('../vendor/linkedom-worker.mjs',import.meta.url));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return import('linkedom/worker');}})();
 const {DOMParser}=await sourceMetadataParser,doc=new DOMParser().parseFromString(new TextDecoder('utf-8').decode(entries.get(plan.input.file)),'text/html'),links=[...doc.head.querySelectorAll('link[rel]')].filter(node=>node.getAttribute('rel')==='canonical'),og=[...doc.head.querySelectorAll('meta[property]')].filter(node=>node.getAttribute('property')==='og:url');
 if(links.length!==1||og.length!==1||links[0].getAttribute('href')!==plan.sourceUrl||og[0].getAttribute('content')!==plan.sourceUrl)invalid();
 return{kind:'html-canonical-known-layout-query',parameter:{name,value}};
}
const sourceFileKey=f=>sha(f.entry?JSON.stringify([f.file,f.archiveSha256,f.entry]):f.file);
const sha=x=>createHash('sha256').update(x).digest('hex');
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=(code,status=409)=>{throw Object.assign(Error(code),{code,status});};
export const MATERIAL_LABELS={unreviewed:'미검토',reviewing:'검토 중 · 미확정',passed:'사용자 통과',discard:'폐기',revise:'수정',hold:'보류'};
const extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
const scopeLabel={current:'현재 저장본',historical:'과거 기록 · 현재 게시용 승인 없음',producer:'제작 폴더 별도 버전 · 검토 미확정',intake:'원본 검토·제작 대기'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function canonical(x){return Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);}
function postKey(p){const {revision,...input}=p;return sha(canonical(input));}
function inside(root,file){const rel=path.relative(root,file);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))fail('material_path_invalid');return file;}
async function regular(root,file,max=128*1024*1024){
 inside(root,file);for(let cur=file;;cur=path.dirname(cur)){const stat=await fs.lstat(cur);if(stat.isSymbolicLink())fail('material_path_invalid');if(cur===root)break;}
 const stat=await fs.stat(file);if(!stat.isFile()||stat.size>max)fail('material_file_invalid');return fs.readFile(file);
}
async function json(root,file,max){return JSON.parse((await regular(root,file,max)).toString('utf8'));}
function sniff(b){return b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':b.subarray(0,3).equals(Buffer.from([255,216,255]))?'image/jpeg':b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP'?'image/webp':null;}
function texts(p,complete,current){return Object.fromEntries(['instagram','threads'].map(platform=>{const body=platformCaption(p,platform),tagBase=current?cleanCaptionFirstLine(body):body,fullText=!complete?null:current?finalCaption(p,platform):platform==='instagram'?instagramTaggedCaption(body,p).text:body;return [platform,{body,rawTags:p.tags||'',hashtags:platform!=='instagram'?'':!complete?instagramTaggedCaption('',{tags:p.tags||'',common_tags:p.common_tags||[],topic_tags:p.topic_tags||[]}).text.replace(/^\n\n/,''):fullText?.startsWith(tagBase)?fullText.slice(tagBase.length).replace(/^\n\n/,''):'',fullText,topicTag:platform==='threads'?p.threads_topic_tag||'':'',exactFinalText:complete,textBasis:current?'current_saved_publication_inputs':'historical_saved_inputs'}]}));}
function snapshotHtml(detail,platform){
 const t=detail.texts?.[platform];return '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(detail.title)+'</title><style>body{font:16px system-ui;max-width:900px;margin:auto;padding:24px;background:#fafafa}textarea{width:100%;min-height:140px;box-sizing:border-box}img{width:100%;height:auto}article{margin:24px 0}.badge{padding:12px;background:#ffe8af}button{padding:10px;margin:6px}</style><h1>'+esc(detail.title)+'</h1><p class="badge">'+esc(detail.statusLabel)+' · '+scopeLabel[detail.scope]+'</p><p>'+esc(detail.postId)+' · '+esc(detail.outputVersion)+' · '+esc(platform)+'</p><p>이 파일은 자료 스냅샷입니다. 업로드 전에 검토 프로그램에서 현재 버전과 판정을 다시 확인하세요.</p>'+ (t?['body','hashtags','fullText'].map((k,i)=>'<section><h2>'+['본문','해시태그','전체문안'][i]+'</h2><textarea id="t'+i+'" readonly>'+esc(t[k]??'현재 기록에는 완전한 최종 문안 정보가 없습니다.')+'</textarea><button onclick="navigator.clipboard.writeText(document.getElementById(\'t'+i+'\').value)">복사</button></section>').join(''):'<p>게시 문안이 준비되지 않은 원본 검토 자료입니다.</p>')+detail.images.map(im=>'<article><h2>'+im.order+' / '+detail.images.length+'</h2><img loading="lazy" src="'+im.name+'" alt="'+im.order+'번째 원본 이미지"></article>').join('')+'</html>';
}
export class MaterialCatalog {
 constructor({root,materialRoot,readState,currentSourceBinding=null,repositoryRoot=process.env.THREADS_PROJECT_ROOT||null}){this.pathResolver=configuredResolver();this.root=path.resolve(this.pathResolver?this.pathResolver(root):root);this.materialRoot=path.resolve(this.pathResolver?this.pathResolver(materialRoot):materialRoot);this.repositoryRoot=repositoryRoot?path.resolve(repositoryRoot):null;this.readState=readState;this.currentSourceBinding=currentSourceBinding;this.production=new ProductionInput(this.materialRoot,null);}
 async archiveFiles(){
  const files=[],base=path.join(this.root,'replaced');
  for(const file of [path.join(this.root,'state.backup.json')])try{await fs.lstat(file);files.push(file);}catch(e){if(e.code!=='ENOENT')throw e;}
  const scan=async(dir,depth)=>{if(depth>4)fail('material_archive_depth_limit');for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(['assets','receipts'].includes(entry.name))continue;if(entry.isSymbolicLink())fail('material_path_invalid');const file=path.join(dir,entry.name);if(entry.isDirectory())await scan(file,depth+1);else if(entry.isFile()&&['state.json','state.backup.json','previous-post.json'].includes(entry.name))files.push(file);}};
  try{await scan(base,0);}catch(e){if(e.code!=='ENOENT')throw e;}return files.sort();
 }
 async load({fresh=false}={}){
  const state=await this.readState(),archiveFiles=await this.archiveFiles(),producerFile=path.join(this.materialRoot,'06_자동 제작 결과','status.json'),evaluationFile=path.join(this.materialRoot,'07_사용자 평가','평가 기록.json');
  const signature=[];for(const file of [...archiveFiles,producerFile,evaluationFile])try{const st=await fs.stat(file);signature.push([file,st.size,st.mtimeMs]);}catch(e){if(e.code!=='ENOENT')throw e;}
  let cacheKey;
  let producer={entries:[]},evaluations=[];const warnings=[];
  try{producer=await json(this.materialRoot,producerFile,32*1024*1024);if(!Array.isArray(producer.entries))fail('material_producer_invalid');}catch(e){if(e.code!=='ENOENT')warnings.push({source:'producer',code:e.code||'invalid_json'});}
  try{const data=await json(this.materialRoot,evaluationFile,20*1024*1024);evaluations=data.evaluations||[];}catch(e){if(e.code!=='ENOENT')warnings.push({source:'evaluations',code:e.code||'invalid_json'});}
  const producerStamp=JSON.stringify(signature.find(s=>s[0]===producerFile));let captionSignature=this.captionSignature?.value;
  if(fresh||this.captionSignature?.stamp!==producerStamp||Date.now()-(this.captionSignature?.at||0)>1000){captionSignature=[];for(const row of producer.entries)if(row.outputFolder&&row.images?.length)for(const name of ['production-plan.json','publish-captions.json'])try{const f=await this.production.safeFile(row,name),stat=await fs.stat(f);captionSignature.push([row.id,name,stat.size,stat.mtimeMs]);}catch(e){captionSignature.push([row.id,name,e.code||'invalid']);}this.captionSignature={stamp:producerStamp,at:Date.now(),value:captionSignature};}
  const collection=[];if(this.repositoryRoot)try{for(const candidate of (await loadRepoCandidates(this.repositoryRoot)).items){const file=inside(this.repositoryRoot,path.resolve(this.repositoryRoot,candidate.repoCandidatePath)),bytes=await regular(this.repositoryRoot,file,16*1024*1024),snapshot=MaterialTxt.isUnifiedText(bytes)?MaterialTxt.parse(bytes):null,markdown=snapshot?.records.candidate.originalMarkdown||bytes.toString('utf8');collection.push({candidate,file,bytes:bytes.length,fileSha256:sha(bytes),markdown,snapshot});}}catch(e){if(e.code!=='ENOENT')throw e;warnings.push({source:'repository_collection',code:'material_collection_missing'});}
  cacheKey=JSON.stringify([state.revision,signature,captionSignature,collection.map(r=>[r.candidate.repoCandidatePath,r.fileSha256])]);if(this.cache?.cacheKey===cacheKey)return this.cache;
  const records=new Map(),assetRoots=new Set([path.join(this.root,'assets')]),live=new Map(state.posts.map(p=>[p.post_id,p]));let sourceOccurrences=0;
  const add=(p,scope,source,partial=false)=>{
   if(!p||typeof p.post_id!=='string'||!Array.isArray(p.images))return;
   sourceOccurrences++;const key=(scope==='producer'?'producer-':partial?'edit-':'post-')+postKey(p),prior=records.get(key);
   if(prior){prior.sources.push(source);return;}
   const status=partial?{decision:'unreviewed',passed:false,current:false,reviewed_at:null}:finalReviewStatus(p),current=scope==='current',stage=status.decision==='unreviewed'&&(reviewNote(p)||p.review?.output_version===p.output_version)?'reviewing':status.decision;
   records.set(key,{key,post:clone(p),scope,partial,sources:[source],postId:p.post_id,outputVersion:p.output_version,title:p.source?.display_title||p.source?.label||p.publication_title||p.caption?.split('\n')[0]||p.post_id,decision:status.decision,stage,statusLabel:MATERIAL_LABELS[stage],reviewCurrent:status.current,currentFinalPass:current&&status.passed&&isActivePost(p),fingerprint:partial?sha(canonical(p)):sha(status.basis),active:current&&isActivePost(p),completeMetadata:!partial,reviewedAt:status.reviewed_at,imageCount:p.images.length,originalStatus:null});
  };
  for(const p of state.posts)add(p,'current',{kind:'current',file:'state.json',revision:state.revision});
  for(const p of state.archived_posts||[])add(p.post||p,'historical',{kind:'archived_post',file:'state.json'});
  for(const [id,h]of Object.entries(state.post_history||{}))for(const e of h.entries||[])add({...e.snapshot,post_id:id},'historical',{kind:'edit_history',file:'state.json',entryId:e.id,savedAt:e.saved_at},true);
  for(const file of archiveFiles){try{const old=await json(this.root,file,128*1024*1024);if(!Array.isArray(old.posts)&&!old.post)fail('material_archive_invalid');assetRoots.add(path.join(path.dirname(file),'assets'));for(const p of [...(old.posts||[]),...(old.post?[old.post]:[]),...(old.archived_posts||[]).map(p=>p.post||p)])add(p,'historical',{kind:'state_archive',file:path.relative(this.root,file),revision:old.revision});const histories=old.post_history||(old.post&&old.history?{[old.post.post_id]:old.history}:{});for(const [id,h]of Object.entries(histories))for(const e of h.entries||[])add({...e.snapshot,post_id:id},'historical',{kind:'archived_edit_history',file:path.relative(this.root,file),entryId:e.id,savedAt:e.saved_at},true);}catch(e){warnings.push({source:path.relative(this.root,file),code:e.code||'invalid_json'});}}
  const producerIds=new Set(),duplicateProducerIds=[];
  for(const [rowIndex,row]of producer.entries.entries()){
   if(typeof row.id!=='string')continue;if(producerIds.has(row.id))duplicateProducerIds.push(row.id);producerIds.add(row.id);
   if(row.outputFolder&&row.images?.length){try{
    const version=productionVersion(row),plan=await this.production.plan(row),titles=this.production.titles(row,plan);let captions;try{captions=await this.production.captions(row,plan);}catch(e){warnings.push({source:row.id,code:e.code||'material_caption_unavailable'});captions={caption:'',platform_captions:{instagram:'',threads:''},production_caption_status:'held-unverified-caption'};}
    const images=row.images.map((im,i)=>{if(!/^rendered\/slide-\d{3,}\.png$/.test(im.name?.replaceAll('\\','/')||'')||Number(im.name.replaceAll('\\','/').match(/slide-(\d+)\.png$/)[1])!==i+1||!/^[a-f0-9]{64}$/.test(im.sha256||''))fail('material_producer_images_invalid');return {asset_id:im.sha256,order:i+1,mime:'image/png'};});
    const p={...captions,post_id:row.id,output_version:version,images,tags:'',threads_title_only:false,source:{url:row.sourceUrl||'',label:titles.display,display_title:titles.display,cover_title:titles.display},review:null,final_review:null,production_feedback:this.production.evaluation(evaluations,row.id,version)};
    add(p,'producer',{kind:'producer_output',file:row.outputFolder,producerRow:rowIndex},true);const r=records.get('producer-'+postKey(p));r.row=clone(row);r.producerRow=clone(row);r.statusLabel='제작 저장본 · 미검토';r.originalStatus=row.status||'unknown';continue;
   }catch(e){warnings.push({source:row.id,code:e.code||'material_producer_unavailable'});}}
   const key='intake-'+sha(canonical(row)),prior=records.get(key);if(prior){prior.sources.push({kind:'producer',file:'status.json',producerRow:rowIndex});continue;}records.set(key,{key,scope:'intake',row:clone(row),sources:[{kind:'producer',file:'status.json',producerRow:rowIndex}],postId:row.id,outputVersion:row.outputSha256||null,title:row.title||row.id,decision:'unreviewed',stage:'unreviewed',statusLabel:'원본 검토·제작 대기',currentFinalPass:false,active:false,completeMetadata:false,imageCount:0,originalStatus:row.status||'unknown',fingerprint:sha(canonical(row))});
  }
  for(const item of collection){const candidate=item.candidate,key='collection-'+sha(canonical([candidate.id,candidate.repoCandidatePath,item.fileSha256]));records.set(key,{key,scope:'collection',collection:item,sources:[{kind:'repository_collection',file:candidate.repoCandidatePath,sha256:item.fileSha256}],postId:candidate.id,outputVersion:null,title:candidate.title,decision:'unreviewed',stage:'unreviewed',statusLabel:'수집 원문 · 미제작·미승인',currentFinalPass:false,active:false,completeMetadata:false,imageCount:0,originalStatus:candidate.sourceMeta.candidateStage+'/'+candidate.sourceMeta.assetStage+'/'+candidate.sourceMeta.publishStage,fingerprint:item.fileSha256});}
  const counts={current:0,historical:0,producer:0,intake:0,collection:0,currentDecisions:{},currentStages:{},uniquePosts:new Set([...live.keys(),...producerIds,...[...records.values()].map(r=>r.postId)]).size,producerTotal:producer.entries.length,sourceOccurrences,duplicatesGrouped:sourceOccurrences-[...records.values()].filter(r=>!['intake','collection'].includes(r.scope)).length,imageReferences:state.posts.reduce((n,p)=>n+p.images.length,0),evaluationRecords:evaluations.length};
  for(const r of records.values()){counts[r.scope]++;if(r.scope==='current'){counts.currentDecisions[r.decision]=(counts.currentDecisions[r.decision]||0)+1;counts.currentStages[r.stage]=(counts.currentStages[r.stage]||0)+1;}}
  return this.cache={cacheKey,state,records,assetRoots:[...assetRoots],producer,evaluations,counts,warnings,duplicateProducerIds};
 }
 async index(){const c=await this.load({fresh:true});return {schema:1,kind:'unified-private-material-catalog',revision:c.state.revision,readOnly:true,publicationAuthorized:false,counts:c.counts,warnings:c.warnings,records:[...c.records.values()].map(({key,scope,postId,outputVersion,title,decision,stage,statusLabel,currentFinalPass,active,completeMetadata,reviewedAt,imageCount,originalStatus,sources,fingerprint})=>({key,scope,postId,outputVersion,title,decision,stage,statusLabel,currentFinalPass,active,completeMetadata,reviewedAt,imageCount,originalStatus,sourceCount:sources.length,fingerprint}))};}
 async record(key,{fresh=false}={}){const c=await this.load({fresh}),r=c.records.get(key);if(!r)fail('material_version_changed',409);return {c,r};}
 async currentSource(c,r){
  r.sourceBundle=null;r.sourceMaterial=null;r.sourceRow=null;r.originalBundleText=null;r.sourceBinding={connected:false,reason:'material_current_source_unmapped',publicationAuthorized:false};
  if(!this.currentSourceBinding)return[];const b=await this.currentSourceBinding(r.postId,r.outputVersion);if(!b||b.sourceZipPreserved!==true)return[];
  const rows=c.producer.entries.filter(row=>row.id===r.postId),row=rows[0],invalid=()=>fail('material_current_source_changed');
  if(rows.length!==1||!row||!b.row||!b.post||postKey(b.post)!==postKey(r.post)||b.row.id!==r.postId||typeof row.relativePath!=='string'||!row.relativePath||path.isAbsolute(row.relativePath)||path.win32.isAbsolute(row.relativePath)||row.relativePath.split(String.fromCharCode(92)).join('/').split('/').some(part=>part==='..'||!part)||row.relativePath!==b.row.relativePath||typeof row.sourceUrl!=='string'||!row.sourceUrl||row.sourceUrl!==b.row.sourceUrl||row.sourceUrl!==r.post.source?.url||!/^[a-f0-9]{64}$/.test(row.sourceZipSha256||'')||row.sourceZipSha256!==b.row.sourceZipSha256||!Buffer.isBuffer(b.bytes)||sha(b.bytes)!==row.sourceZipSha256)invalid();
  inside(path.resolve(b.root),path.resolve(b.sourceFile));await regular(path.resolve(b.root),path.resolve(b.sourceFile),128*1024*1024).then(bytes=>{if(sha(bytes)!==row.sourceZipSha256)invalid();});
  let entries,plan;try{entries=await readSourceArchive(b.bytes);plan=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(entries.get('bundle.json')));}catch{fail('material_current_source_zip_invalid');}
  if(!plan||typeof plan!=='object'||Array.isArray(plan)||plan.schema!=='threads-curated-source-v1'||typeof plan.sourceUrl!=='string'||typeof plan.originalTitle!=='string'||!plan.originalTitle.trim()||!Array.isArray(plan.segments)||!Array.isArray(plan.comments)||!Array.isArray(plan.media)||!entries.has(plan.input?.file)||!/^[a-f0-9]{64}$/.test(plan.input?.sha256||'')||sha(Buffer.from(entries.get(plan.input.file)))!==plan.input.sha256)fail('material_current_source_checksum_invalid');
  const urlRelation=await sourceUrlRelation(plan,row.sourceUrl,entries);
  for(const im of plan.media)if(!im||!entries.has(im.file)||!/^[a-f0-9]{64}$/.test(im.sha256||'')||sha(Buffer.from(entries.get(im.file)))!==im.sha256)fail('material_current_source_media_invalid');
  const body=[];for(const segment of plan.segments){if(!segment||typeof segment!=='object')fail('material_current_source_body_invalid');if(segment.kind==='text'){if(typeof segment.text!=='string')fail('material_current_source_body_invalid');body.push(segment.text);}else if(segment.kind==='image'){if(typeof segment.mediaName!=='string')fail('material_current_source_media_invalid');body.push('['+(segment.coverOnly?'별도 표지 자산':'원문 이미지')+': '+segment.mediaName+' — 픽셀·OCR·권리 미확인]');}else fail('material_current_source_body_invalid');}
  r.sourceRow=clone(row);r.sourceMaterial=plan;r.originalBundleText=body.join('\n\n');r.sourceBinding={connected:true,kind:'pinned-current-source-bundle',requestedSourceUrl:row.sourceUrl,bundleSourceUrl:plan.sourceUrl,sourceUrlRelation:urlRelation,sourceZipSha256:row.sourceZipSha256,sourceFingerprint:b.row.sourceFingerprint??null,producerSourceFingerprint:row.sourceFingerprint??null,sourceZipPreserved:true,publicationAuthorized:false};
  const entryOrder=[...entries].map(([name,data])=>({name,bytes:data.length,sha256:sha(Buffer.from(data))}));r.sourceBundle={file:b.sourceFile,root:b.root,bytes:b.bytes.length,sha256:row.sourceZipSha256,data:b.bytes.toString('base64'),entryOrder};
  return[{name:'source-bundle.zip',file:b.sourceFile,root:b.root,bytes:b.bytes.length,sha256:row.sourceZipSha256,data:b.bytes},...[...entries].map(([name,data])=>({name,file:b.sourceFile,root:b.root,entry:name,archiveSha256:row.sourceZipSha256,bytes:data.length,sha256:sha(Buffer.from(data)),data:Buffer.from(data)}))];
 }
 async sourceFiles(c,r){
  if(r.scope==='current')return this.currentSource(c,r);
  const files=[];
  if(r.collection)return[{name:r.collection.candidate.repoCandidatePath,file:r.collection.file,root:this.repositoryRoot,bytes:r.collection.bytes}];
  if(r.producerRow)for(const name of ['production-plan.json','publish-captions.json','integrity-audit.json'])try{const file=await this.production.safeFile(r.producerRow,name),stat=await fs.stat(file);files.push({name:'제작 결과/'+name,file,root:this.materialRoot,bytes:stat.size});}catch(e){if(e.code!=='ENOENT')throw e;}
  if(!c.producer.inputFolder||!r.row?.relativePath)return files;
  const root=path.resolve(this.pathResolver?this.pathResolver(c.producer.inputFolder):c.producer.inputFolder),base=inside(root,path.resolve(root,r.row.relativePath));
  const walk=async(dir,depth)=>{if(depth>4)return;let rows;try{for(let cur=dir;;cur=path.dirname(cur)){const stat=await fs.lstat(cur);if(stat.isSymbolicLink()||!stat.isDirectory())fail('material_path_invalid');if(cur===root)break;}rows=await fs.readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}for(const row of rows.sort((a,b)=>a.name.localeCompare(b.name))){if(row.isSymbolicLink())fail('material_path_invalid');if(/^(?:credentials?|secrets?|tokens?|cookies?|passwords?|\.env)(?:[._-]|$)/i.test(row.name))continue;const file=inside(root,path.join(dir,row.name));if(row.isDirectory())await walk(file,depth+1);else if(row.isFile()&&/\.(txt|md|html|png|jpe?g|webp|json(?:\.pre-[\w-]+)?|zip)$/i.test(row.name)){if(files.length>=500)fail('material_source_file_limit');const stat=await fs.stat(file);files.push({name:path.relative(base,file).split(path.sep).join('/'),file,root,bytes:stat.size});}}};
  await walk(base,0);return files;
 }
 async detail(key){
  const {c,r}=await this.record(key),p=r.post,sourceFiles=await this.sourceFiles(c,r),saved=p?.final_review||null;
  if(r.collection){const item=r.collection,caption=section(item.markdown,'게시 설명글 초안').split(/\r?\n\r?\n- /)[0],platformCaptions=item.snapshot?.human.platformCaptions||{instagram:caption,threads:caption};return{schema:1,key:r.key,scope:r.scope,postId:r.postId,outputVersion:null,title:r.title,decision:'unreviewed',stage:'unreviewed',statusLabel:r.statusLabel,revision:c.state.revision,fingerprint:r.fingerprint,active:false,currentFinalPass:false,publicationAuthorized:false,completeMetadata:false,originalStatus:r.originalStatus,originalText:item.markdown,originalTextSource:item.candidate.repoCandidatePath,sources:r.sources,savedReview:null,evaluation:null,blockers:['unproduced_collection','rights_unverified'],tagInputs:null,images:[],sourceFiles:sourceFiles.map(f=>({name:f.name,bytes:f.bytes,sha256:f.sha256||null,url:'/api/materials/'+key+'/source/'+sourceFileKey(f)})),reviewUrl:null,texts:Object.fromEntries(Object.entries(platformCaptions).map(([name,body])=>[name,{body,fullText:body,hashtags:'',topicTag:'',exactFinalText:false,textBasis:'unapproved_collection_draft'}]))};}
  const original=sourceFiles.find(f=>f.name==='자료.txt')||sourceFiles.find(f=>['참고 기록/content.txt','source/source.txt','source/content.txt'].includes(f.name)),originalRaw=original&&original.bytes<=16*1024*1024?await regular(original.root,original.file,16*1024*1024):null;
  const originalSnapshot=originalRaw&&MaterialTxt.isUnifiedText(originalRaw)?MaterialTxt.parse(originalRaw):null,originalText=r.sourceBundle?r.originalBundleText:originalSnapshot?originalSnapshot.human.body:originalRaw?.toString('utf8')||null,originalTextKind=r.scope==='current'&&!r.sourceBundle?'unavailable':r.sourceBundle?'preserved':originalSnapshot?.human.bodyKind||'preserved';
  return {schema:1,key:r.key,scope:r.scope,postId:r.postId,outputVersion:r.outputVersion,title:r.title,decision:r.decision,stage:r.stage,statusLabel:r.statusLabel,revision:c.state.revision,fingerprint:r.fingerprint,active:r.active,currentFinalPass:r.currentFinalPass,publicationAuthorized:false,completeMetadata:r.completeMetadata,tagInputs:p?{legacy:p.tags||'',common:p.common_tags??null,topic:p.topic_tags??null,threadsTopic:p.threads_topic_tag??null}:null,originalStatus:r.originalStatus,originalReason:r.row?.reason||null,originalText,originalTextKind,sourceMaterial:r.sourceMaterial||originalSnapshot,sourceBinding:r.sourceBinding||null,originalTextSource:r.sourceBundle?'현재 제작 원문 ZIP의 보존된 선별 기록 — 원문 전체 일치·권리 미검증':original?.name||null,sources:r.sources,savedReview:saved?{decision:saved.decision,outputVersion:saved.output_version,reviewedAt:saved.reviewed_at,reviewedRevision:saved.reviewed_revision,validForThisSnapshot:r.reviewCurrent===true}:null,evaluation:{review:p?.review||null,note:p?reviewNote(p):'',productionFeedback:p?.production_feedback||null,producerEvaluations:c.evaluations.filter(e=>e.id===r.postId).map(e=>({...clone(e),versionMatches:e.outputVersion===r.outputVersion}))},blockers:r.scope==='current'?readiness(p).map(x=>x.code):[],texts:p?texts(p,r.completeMetadata,r.scope==='current'):null,images:(p?.images||[]).map((im,i)=>({order:im.order,sha256:im.asset_id,mime:im.mime,name:String(i+1).padStart(2,'0')+'.'+(extension[im.mime]||'bin'),url:'/api/materials/'+key+'/image/'+(i+1)})),sourceFiles:sourceFiles.map((f,i)=>({name:f.name,bytes:f.bytes,sha256:f.sha256||null,url:'/api/materials/'+key+'/source/'+sourceFileKey(f)})),reviewUrl:r.scope==='current'?'/?post='+encodeURIComponent(r.postId):null};
 }
 async image(key,index){
  const {c,r}=await this.record(key);return this.readImage(c,r,index);
 }
 async readImage(c,r,index){
  const im=r.post?.images?.[index-1];if(!im||im.order!==index||!/^[a-f0-9]{64}$/.test(im.asset_id))fail('material_image_order_invalid');
  if(r.producerRow){const file=await this.production.safeFile(r.producerRow,r.producerRow.images[index-1].name),bytes=await regular(this.materialRoot,file,30*1024*1024);if(sha(bytes)!==im.asset_id)fail('material_asset_hash_mismatch');if(sniff(bytes)!==im.mime)fail('material_asset_mime_mismatch');return {bytes,mime:im.mime,name:String(index).padStart(2,'0')+'.png',file};}
  for(const root of c.assetRoots){const file=path.join(root,im.asset_id);let b;try{b=await regular(this.root,file,30*1024*1024);}catch(e){if(e.code==='ENOENT')continue;throw e;}if(sha(b)!==im.asset_id)fail('material_asset_hash_mismatch');if(sniff(b)!==im.mime)fail('material_asset_mime_mismatch');return {bytes:b,mime:im.mime,name:String(index).padStart(2,'0')+'.'+extension[im.mime],file};}fail('material_asset_missing',404);
 }
 async source(key,index){const {c,r}=await this.record(key),files=await this.sourceFiles(c,r),f=typeof index==='string'&&/^[a-f0-9]{64}$/.test(index)?files.find(f=>sourceFileKey(f)===index):files[Number(index)];if(!f)fail('material_source_missing',404);return {bytes:f.data||await regular(f.root,f.file,128*1024*1024),name:path.basename(f.name),mime:'application/octet-stream'};}
 async unifiedText(key,platform='instagram',{expectedScope}={}){
  if(!['instagram','threads'].includes(platform))fail('material_platform_invalid',400);
  const {r}=await this.record(key,{fresh:true}),d=await this.detail(key);
  if(expectedScope&&d.scope!==expectedScope)fail('material_version_changed');
  if(r.collection){const item=r.collection,data=item.snapshot||{human:{sourceUrl:item.candidate.url||item.candidate.sourceMeta.provenanceUrl||'',title:item.candidate.title,body:section(item.markdown,'글 내용|확인된 글 내용 요약'),bodyKind:'summary',platformCaptions:Object.fromEntries(Object.entries(d.texts).map(([k,v])=>[k,v.body]))},records:{candidate:{originalKey:path.basename(item.candidate.repoCandidatePath),originalMarkdown:item.markdown,originalSha256:item.fileSha256,publicationAllowed:false}}};return{name:'자료.txt',bytes:Buffer.from(MaterialTxt.serialize({...data,records:{...data.records,material:d,publicationAuthorized:false}},{visibility:'private'})),mime:'text/plain; charset=utf-8'};}
  const platformCaptions=Object.fromEntries(Object.entries(d.texts||{}).map(([name,t])=>[name,t.fullText??t.body]));
  const value={human:{sourceUrl:r.post?.source?.url||r.row?.sourceUrl||'',title:d.title,body:d.originalText||'',bodyKind:d.originalText?'preserved':'unavailable',platformCaptions},records:{material:d,post:r.post||null,producerRow:r.row||null,sourceBundle:r.sourceBundle||null,selectedPlatform:platform,exportedAt:new Date().toISOString(),publicationAuthorized:false}};
  let text=MaterialTxt.serialize(value,{visibility:'private'});if(Buffer.byteLength(text)>16*1024*1024&&value.records.sourceBundle){const {data,...reference}=value.records.sourceBundle;value.records.sourceBundle={...reference,embedded:false,reason:'single_txt_16_mib_limit',rawBytesAvailableInReferencedArchive:true};text=MaterialTxt.serialize(value,{visibility:'private'});}if(Buffer.byteLength(text)>16*1024*1024)fail('material_single_text_size_limit',413);
  await this.record(key,{fresh:true});const fresh=await this.detail(key);if(fresh.fingerprint!==d.fingerprint||fresh.decision!==d.decision||fresh.scope!==d.scope)fail('material_version_changed');
  return{name:'자료.txt',bytes:Buffer.from(text),mime:'text/plain; charset=utf-8'};
 }
 async packageFiles(key,platform,{expectedScope}={}){
  if(!['instagram','threads'].includes(platform))fail('material_platform_invalid',400);
  const {c,r}=await this.record(key,{fresh:true}),d=await this.detail(key),files=[],add=(name,value)=>files.push({name,bytes:Buffer.from(value)});let bytes=0;
  if(expectedScope&&d.scope!==expectedScope)fail('material_version_changed');
  if(['intake','collection'].includes(r.scope))fail('material_production_not_ready',409);
  for(const im of d.images){const image=await this.readImage(c,r,im.order);bytes+=image.bytes.length;if(bytes>512*1024*1024)fail('material_package_size_limit',413);files.push({name:im.name,bytes:image.bytes});}
  // One human-readable TXT carries both platform captions/tags and every exact
  // existing post/producer field. This private snapshot grants no authorization.
  files.push(await this.unifiedText(key,platform,{expectedScope}));
  add('보기.html',snapshotHtml(d,platform));
  // If a current verdict/content changed during verification, never download an old-looking current bundle.
  await this.record(key,{fresh:true});const fresh=await this.detail(key);if(fresh.fingerprint!==d.fingerprint||fresh.decision!==d.decision||fresh.scope!==d.scope)fail('material_version_changed');return files;
 }
 async audit(onProgress=()=>{}){
  const c=await this.load(),beforeRevision=c.state.revision,problems=[],verified=new Map(),sourcePins=[],acquisitionUnavailable=[];let imageReferences=0,verifiedReferences=0,sourceFiles=0,sourceBytes=0,sourceFolders=0;
  for(const r of c.records.values()){
   if(r.row?.relativePath){try{const files=await this.sourceFiles(c,r);if(!files.length)problems.push({key:r.key,postId:r.postId,code:'material_source_files_missing'});else sourceFolders++;if(!files.some(f=>f.name.startsWith('source/')))acquisitionUnavailable.push({postId:r.postId,originalStatus:r.row.status,scope:r.scope});for(const f of files){const b=await regular(f.root,f.file,128*1024*1024);if(b.length!==f.bytes)fail('material_source_file_changed');sourceBytes+=b.length;sourceFiles++;sourcePins.push([r.postId,f.name,b.length,sha(b)]);}}catch(e){problems.push({key:r.key,postId:r.postId,code:e.code||'material_read_failed'});}}
   if(['intake','collection'].includes(r.scope))continue;
   for(const [i,im]of r.post.images.entries()){imageReferences++;try{if(im.order!==i+1)fail('material_image_order_invalid');if(r.producerRow||!verified.has(im.asset_id)){const image=await this.readImage(c,r,i+1);verified.set(im.asset_id,{mime:image.mime,bytes:image.bytes.length,sha256:im.asset_id});}if(verified.get(im.asset_id).mime!==im.mime)fail('material_asset_mime_mismatch');verifiedReferences++;}catch(e){problems.push({key:r.key,postId:r.postId,order:i+1,sha256:im.asset_id,code:e.code||'material_read_failed'});}}
   onProgress({records:c.records.size,verifiedUniqueImages:verified.size,imageReferences});
  }
  const after=await this.readState();return {schema:1,revision:beforeRevision,checkedAt:new Date().toISOString(),stableRevision:after.revision===beforeRevision,counts:c.counts,records:c.records.size,imageReferences,verifiedReferences,verifiedUniqueImages:verified.size,verifiedImageBytes:[...verified.values()].reduce((n,im)=>n+im.bytes,0),sourceFolders,sourceFiles,sourceBytes,sourceInventoryFingerprint:sha(canonical(sourcePins.sort((a,b)=>canonical(a).localeCompare(canonical(b))))),currentTextFingerprint:sha(canonical(c.state.posts.map(p=>[p.post_id,p.output_version,p.caption,p.platform_captions,p.tags,p.common_tags,p.topic_tags,p.threads_topic_tag]).sort((a,b)=>a[0].localeCompare(b[0])))),acquisitionUnavailable,duplicateProducerIds:c.duplicateProducerIds,warnings:c.warnings,problems,readOnly:true,externalCalls:0};
 }
}
