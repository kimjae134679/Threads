// Private, read-only catalog. Stored reviews are evidence, never inherited authorization.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {finalCaption,platformCaption,finalReviewStatus,reviewNote,isActivePost,readiness} from './domain.mjs';
import {instagramTaggedCaption} from './tags.mjs';
import {ProductionInput,productionVersion} from './production-input.mjs';
import {cleanCaptionFirstLine} from './title-normalization.mjs';
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
 constructor({root,materialRoot,readState}){this.root=path.resolve(root);this.materialRoot=path.resolve(materialRoot);this.readState=readState;this.production=new ProductionInput(this.materialRoot,null);}
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
  cacheKey=JSON.stringify([state.revision,signature,captionSignature]);if(this.cache?.cacheKey===cacheKey)return this.cache;
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
  const counts={current:0,historical:0,producer:0,intake:0,currentDecisions:{},currentStages:{},uniquePosts:new Set([...live.keys(),...producerIds,...[...records.values()].map(r=>r.postId)]).size,producerTotal:producer.entries.length,sourceOccurrences,duplicatesGrouped:sourceOccurrences-[...records.values()].filter(r=>r.scope!=='intake').length,imageReferences:state.posts.reduce((n,p)=>n+p.images.length,0),evaluationRecords:evaluations.length};
  for(const r of records.values()){counts[r.scope]++;if(r.scope==='current'){counts.currentDecisions[r.decision]=(counts.currentDecisions[r.decision]||0)+1;counts.currentStages[r.stage]=(counts.currentStages[r.stage]||0)+1;}}
  return this.cache={cacheKey,state,records,assetRoots:[...assetRoots],producer,evaluations,counts,warnings,duplicateProducerIds};
 }
 async index(){const c=await this.load({fresh:true});return {schema:1,kind:'unified-private-material-catalog',revision:c.state.revision,readOnly:true,publicationAuthorized:false,counts:c.counts,warnings:c.warnings,records:[...c.records.values()].map(({key,scope,postId,outputVersion,title,decision,stage,statusLabel,currentFinalPass,active,completeMetadata,reviewedAt,imageCount,originalStatus,sources,fingerprint})=>({key,scope,postId,outputVersion,title,decision,stage,statusLabel,currentFinalPass,active,completeMetadata,reviewedAt,imageCount,originalStatus,sourceCount:sources.length,fingerprint}))};}
 async record(key,{fresh=false}={}){const c=await this.load({fresh}),r=c.records.get(key);if(!r)fail('material_version_changed',409);return {c,r};}
 async sourceFiles(c,r){
  const files=[];
  if(r.producerRow)for(const name of ['production-plan.json','publish-captions.json','integrity-audit.json'])try{const file=await this.production.safeFile(r.producerRow,name),stat=await fs.stat(file);files.push({name:'제작 결과/'+name,file,root:this.materialRoot,bytes:stat.size});}catch(e){if(e.code!=='ENOENT')throw e;}
  if(!c.producer.inputFolder||!r.row?.relativePath)return files;
  const root=path.resolve(c.producer.inputFolder),base=inside(root,path.resolve(root,r.row.relativePath));
  const walk=async(dir,depth)=>{if(depth>4)return;let rows;try{for(let cur=dir;;cur=path.dirname(cur)){const stat=await fs.lstat(cur);if(stat.isSymbolicLink()||!stat.isDirectory())fail('material_path_invalid');if(cur===root)break;}rows=await fs.readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}for(const row of rows.sort((a,b)=>a.name.localeCompare(b.name))){if(row.isSymbolicLink())fail('material_path_invalid');if(/^(?:credentials?|secrets?|tokens?|cookies?|passwords?|\.env)(?:[._-]|$)/i.test(row.name))continue;const file=inside(root,path.join(dir,row.name));if(row.isDirectory())await walk(file,depth+1);else if(row.isFile()&&/\.(txt|md|html|png|jpe?g|webp|json(?:\.pre-[\w-]+)?|zip)$/i.test(row.name)){if(files.length>=500)fail('material_source_file_limit');const stat=await fs.stat(file);files.push({name:path.relative(base,file).split(path.sep).join('/'),file,root,bytes:stat.size});}}};
  await walk(base,0);return files;
 }
 async detail(key){
  const {c,r}=await this.record(key),p=r.post,sourceFiles=await this.sourceFiles(c,r),saved=p?.final_review||null;
  const original=sourceFiles.find(f=>['참고 기록/content.txt','source/source.txt','source/content.txt'].includes(f.name)),originalText=original&&original.bytes<=2*1024*1024?(await regular(original.root,original.file,2*1024*1024)).toString('utf8'):null;
  return {schema:1,key:r.key,scope:r.scope,postId:r.postId,outputVersion:r.outputVersion,title:r.title,decision:r.decision,stage:r.stage,statusLabel:r.statusLabel,revision:c.state.revision,fingerprint:r.fingerprint,active:r.active,currentFinalPass:r.currentFinalPass,publicationAuthorized:false,completeMetadata:r.completeMetadata,tagInputs:p?{legacy:p.tags||'',common:p.common_tags??null,topic:p.topic_tags??null,threadsTopic:p.threads_topic_tag??null}:null,originalStatus:r.originalStatus,originalReason:r.row?.reason||null,originalText,originalTextSource:original?.name||null,sources:r.sources,savedReview:saved?{decision:saved.decision,outputVersion:saved.output_version,reviewedAt:saved.reviewed_at,reviewedRevision:saved.reviewed_revision,validForThisSnapshot:r.reviewCurrent===true}:null,evaluation:{review:p?.review||null,note:p?reviewNote(p):'',productionFeedback:p?.production_feedback||null,producerEvaluations:c.evaluations.filter(e=>e.id===r.postId).map(e=>({...clone(e),versionMatches:e.outputVersion===r.outputVersion}))},blockers:r.scope==='current'?readiness(p).map(x=>x.code):[],texts:p?texts(p,r.completeMetadata,r.scope==='current'):null,images:(p?.images||[]).map((im,i)=>({order:im.order,sha256:im.asset_id,mime:im.mime,name:String(i+1).padStart(2,'0')+'.'+(extension[im.mime]||'bin'),url:'/api/materials/'+key+'/image/'+(i+1)})),sourceFiles:sourceFiles.map((f,i)=>({name:f.name,bytes:f.bytes,url:'/api/materials/'+key+'/source/'+sha(f.file)})),reviewUrl:r.scope==='current'?'/?post='+encodeURIComponent(r.postId):null};
 }
 async image(key,index){
  const {c,r}=await this.record(key);return this.readImage(c,r,index);
 }
 async readImage(c,r,index){
  const im=r.post?.images?.[index-1];if(!im||im.order!==index||!/^[a-f0-9]{64}$/.test(im.asset_id))fail('material_image_order_invalid');
  if(r.producerRow){const file=await this.production.safeFile(r.producerRow,r.producerRow.images[index-1].name),bytes=await regular(this.materialRoot,file,30*1024*1024);if(sha(bytes)!==im.asset_id)fail('material_asset_hash_mismatch');if(sniff(bytes)!==im.mime)fail('material_asset_mime_mismatch');return {bytes,mime:im.mime,name:String(index).padStart(2,'0')+'.png',file};}
  for(const root of c.assetRoots){const file=path.join(root,im.asset_id);let b;try{b=await regular(this.root,file,30*1024*1024);}catch(e){if(e.code==='ENOENT')continue;throw e;}if(sha(b)!==im.asset_id)fail('material_asset_hash_mismatch');if(sniff(b)!==im.mime)fail('material_asset_mime_mismatch');return {bytes:b,mime:im.mime,name:String(index).padStart(2,'0')+'.'+extension[im.mime],file};}fail('material_asset_missing',404);
 }
 async source(key,index){const {c,r}=await this.record(key),files=await this.sourceFiles(c,r),f=typeof index==='string'&&/^[a-f0-9]{64}$/.test(index)?files.find(f=>sha(f.file)===index):files[Number(index)];if(!f)fail('material_source_missing',404);return {bytes:await regular(f.root,f.file,128*1024*1024),name:path.basename(f.name),mime:'application/octet-stream'};}
 async packageFiles(key,platform,{expectedScope}={}){
  if(!['instagram','threads'].includes(platform))fail('material_platform_invalid',400);
  const {c,r}=await this.record(key,{fresh:true}),d=await this.detail(key),files=[],add=(name,value)=>files.push({name,bytes:Buffer.from(value)});let bytes=0;
  if(expectedScope&&d.scope!==expectedScope)fail('material_version_changed');
  if(r.scope==='intake')fail('material_production_not_ready',409);
  for(const im of d.images){const image=await this.readImage(c,r,im.order);bytes+=image.bytes.length;if(bytes>512*1024*1024)fail('material_package_size_limit',413);files.push({name:im.name,bytes:image.bytes});}
  const t=d.texts?.[platform];if(t){add('본문.txt',t.body);add('해시태그.txt',t.hashtags);if(t.rawTags!==t.hashtags)add('원래 해시태그.txt',t.rawTags);if(t.fullText!==null)add('전체문안.txt',t.fullText);if(platform==='threads')add('Threads 주제태그.txt',t.topicTag);}
  add('검토상태.txt',d.statusLabel+'\n'+scopeLabel[d.scope]+'\n게시 전 현재 판정과 버전을 검토 프로그램에서 다시 확인하세요.\n');
  add('자료정보.json',JSON.stringify({...d,platform,exportedAt:new Date().toISOString(),images:d.images.map(({url,...im})=>im)},null,2));add('보기.html',snapshotHtml(d,platform));
  // If a current verdict/content changed during verification, never download an old-looking current bundle.
  await this.record(key,{fresh:true});const fresh=await this.detail(key);if(fresh.fingerprint!==d.fingerprint||fresh.decision!==d.decision||fresh.scope!==d.scope)fail('material_version_changed');return files;
 }
 async audit(onProgress=()=>{}){
  const c=await this.load(),beforeRevision=c.state.revision,problems=[],verified=new Map(),sourcePins=[],acquisitionUnavailable=[];let imageReferences=0,verifiedReferences=0,sourceFiles=0,sourceBytes=0,sourceFolders=0;
  for(const r of c.records.values()){
   if(r.row?.relativePath){try{const files=await this.sourceFiles(c,r);if(!files.length)problems.push({key:r.key,postId:r.postId,code:'material_source_files_missing'});else sourceFolders++;if(!files.some(f=>f.name.startsWith('source/')))acquisitionUnavailable.push({postId:r.postId,originalStatus:r.row.status,scope:r.scope});for(const f of files){const b=await regular(f.root,f.file,128*1024*1024);if(b.length!==f.bytes)fail('material_source_file_changed');sourceBytes+=b.length;sourceFiles++;sourcePins.push([r.postId,f.name,b.length,sha(b)]);}}catch(e){problems.push({key:r.key,postId:r.postId,code:e.code||'material_read_failed'});}}
   if(r.scope==='intake')continue;
   for(const [i,im]of r.post.images.entries()){imageReferences++;try{if(im.order!==i+1)fail('material_image_order_invalid');if(r.producerRow||!verified.has(im.asset_id)){const image=await this.readImage(c,r,i+1);verified.set(im.asset_id,{mime:image.mime,bytes:image.bytes.length,sha256:im.asset_id});}if(verified.get(im.asset_id).mime!==im.mime)fail('material_asset_mime_mismatch');verifiedReferences++;}catch(e){problems.push({key:r.key,postId:r.postId,order:i+1,sha256:im.asset_id,code:e.code||'material_read_failed'});}}
   onProgress({records:c.records.size,verifiedUniqueImages:verified.size,imageReferences});
  }
  const after=await this.readState();return {schema:1,revision:beforeRevision,checkedAt:new Date().toISOString(),stableRevision:after.revision===beforeRevision,counts:c.counts,records:c.records.size,imageReferences,verifiedReferences,verifiedUniqueImages:verified.size,verifiedImageBytes:[...verified.values()].reduce((n,im)=>n+im.bytes,0),sourceFolders,sourceFiles,sourceBytes,sourceInventoryFingerprint:sha(canonical(sourcePins.sort((a,b)=>canonical(a).localeCompare(canonical(b))))),currentTextFingerprint:sha(canonical(c.state.posts.map(p=>[p.post_id,p.output_version,p.caption,p.platform_captions,p.tags,p.common_tags,p.topic_tags,p.threads_topic_tag]).sort((a,b)=>a[0].localeCompare(b[0])))),acquisitionUnavailable,duplicateProducerIds:c.duplicateProducerIds,warnings:c.warnings,problems,readOnly:true,externalCalls:0};
 }
}
