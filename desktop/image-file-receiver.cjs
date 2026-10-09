'use strict';
// Receives supported files only. Never generates, reconstructs a data URL or changes review state.
const fs=require('node:fs/promises'),constants=require('node:fs').constants,path=require('node:path');
const {createHash,randomUUID}=require('node:crypto'),{inflateSync}=require('node:zlib'),{spawn}=require('node:child_process');
const {writeAtomic}=require('./atomic-file.cjs');
const MAX=12*1024*1024,HASH=/^[a-f0-9]{64}$/,ID=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const sha=b=>createHash('sha256').update(b).digest('hex'),norm=p=>process.platform==='win32'?path.resolve(p).toLowerCase():path.resolve(p);
const inside=(root,file)=>norm(file)===norm(root)||norm(file).startsWith(norm(root)+path.sep);
function fields(value,allowed,label){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw Error(label+': unknown field or object required');}
function absolute(value){return typeof value==='string'&&path.isAbsolute(value)&&!value.includes('\0')&&!/^[\\/]{2}/.test(value)&&(process.platform!=='win32'||!value.slice(path.parse(value).root.length).includes(':'));}
function validateRequest(r){
 fields(r,['schema','postId','requestId','storageRoot','source','generation','compose','retryCheckpointSha256'],'request');
 if(r.schema!=='threads-image-file-receive-v1'||!ID.test(r.postId||'')||!ID.test(r.requestId||''))throw Error('identity: schema/postId/requestId');
 if([r.postId,r.requestId].some(value=>/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(value)))throw Error('identity: reserved device name');
 if(!absolute(r.storageRoot))throw Error('storageRoot: absolute path required');
 fields(r.source,['path','sha256','sizeBytes','width','height','transport'],'source');
 if(!absolute(r.source.path)||path.extname(r.source.path).toLowerCase()!=='.png')throw Error('source.path: supported local PNG path required');
 if(!HASH.test(r.source.sha256||''))throw Error('source hash required');
 if(!Number.isInteger(r.source.sizeBytes)||r.source.sizeBytes<57||r.source.sizeBytes>MAX)throw Error('source size outside limit');
 if(![r.source.width,r.source.height].every(n=>Number.isInteger(n)&&n>0&&n<=4096))throw Error('source dimensions outside limit');
 fields(r.source.transport,['kind','reference'],'transport');
 if(!['supported_local_file','library_materialized_file'].includes(r.source.transport.kind)||typeof r.source.transport.reference!=='string'||!r.source.transport.reference.trim()||r.source.transport.reference.length>512)throw Error('transport: supported file reference required');
 fields(r.generation,['promptSha256','tool','generatedAt'],'generation');
 if(!HASH.test(r.generation.promptSha256||''))throw Error('generation prompt hash required');
 fields(r.generation.tool,['name','model','modelEvidence'],'tool');
 const tool=r.generation.tool;
 if(typeof tool.name!=='string'||!tool.name.trim()||tool.name.length>120||!(tool.model===null||typeof tool.model==='string'&&tool.model.length<=120)||!(tool.modelEvidence===null||typeof tool.modelEvidence==='string'&&tool.modelEvidence.length<=1000)||(tool.model===null)!==(tool.modelEvidence===null))throw Error('tool: confirmed model/evidence pair required');
 if(r.generation.generatedAt!==null&&(typeof r.generation.generatedAt!=='string'||!Number.isFinite(Date.parse(r.generation.generatedAt))))throw Error('generation date required or null');
 if(r.compose){fields(r.compose,['requestFile','executable','executableSha256'],'compose');if(!absolute(r.compose.requestFile)||!absolute(r.compose.executable)||!HASH.test(r.compose.executableSha256||''))throw Error('compose: pinned executable and request paths required');}
 if(r.retryCheckpointSha256!==undefined&&!HASH.test(r.retryCheckpointSha256))throw Error('retry checkpoint hash required');
 return sha(JSON.stringify({postId:r.postId,requestId:r.requestId,source:{sha256:r.source.sha256,sizeBytes:r.source.sizeBytes,width:r.source.width,height:r.source.height,transport:r.source.transport},generation:r.generation}));
}
async function noLinks(file){
 let current=path.resolve(file);const parents=[];
 while(true){parents.push(current);const next=path.dirname(current);if(next===current)break;current=next;}
 for(const name of parents.reverse()){try{const stat=await fs.lstat(name);if(stat.isSymbolicLink())throw Error('link path refused: '+name);}catch(e){if(e.code!=='ENOENT')throw e;}}
}
async function secureRead(file,max=MAX){
 await noLinks(file);const handle=await fs.open(file,constants.O_RDONLY|(process.platform==='win32'?0:constants.O_NOFOLLOW));
 try{const before=await handle.stat();if(!before.isFile()||before.size>max)throw Error('file type/size limit');const data=await handle.readFile();const after=await handle.stat();if(data.length!==before.size||before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw Error('file changed during read');return data;}finally{await handle.close();}
}
async function fileHash(file,max=256*1024*1024){
 await noLinks(file);const handle=await fs.open(file,'r');
 try{const before=await handle.stat();if(!before.isFile()||before.size>max)throw Error('file type/size limit');const hash=createHash('sha256');for await(const part of handle.createReadStream({autoClose:false}))hash.update(part);const after=await handle.stat();if(before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw Error('file changed during digest');return hash.digest('hex');}finally{await handle.close();}
}
function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let j=0;j<8;j++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}return(crc^0xffffffff)>>>0;}
function inspectPng(data){
 if(data.length<57||data.length>MAX||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('PNG signature/size');
 let offset=8,ihdr=null,end=false;const idats=[];let palette=false,idatEnded=false;
 while(offset<data.length){if(offset+12>data.length)throw Error('PNG truncated chunk');const length=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8),next=offset+length+12;
  if(next>data.length||length>MAX)throw Error('PNG chunk length');
  if(crc32(data.subarray(offset+4,next-4))!==data.readUInt32BE(next-4))throw Error('PNG CRC mismatch');
  const chunk=data.subarray(offset+8,next-4);
  if(!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type)||type[0]===type[0].toUpperCase()&&!['IHDR','PLTE','IDAT','IEND'].includes(type))throw Error('PNG unsupported critical chunk');
  if(!ihdr&&type!=='IHDR')throw Error('PNG IHDR missing');
  if(type==='IHDR'){if(ihdr||length!==13)throw Error('PNG IHDR');ihdr=chunk;}
  if(type==='PLTE'){if(palette||idats.length||length<3||length%3||length>768)throw Error('PNG palette');palette=true;}
  if(type==='IDAT'){if(idatEnded)throw Error('PNG noncontiguous IDAT');idats.push(chunk);}else if(idats.length)idatEnded=true;
  offset=next;if(type==='IEND'){if(length!==0||offset!==data.length)throw Error('PNG IEND/trailing bytes');end=true;break;}
 }
 if(!end||!ihdr||!idats.length)throw Error('PNG missing image data');
 const width=ihdr.readUInt32BE(0),height=ihdr.readUInt32BE(4),depth=ihdr[8],color=ihdr[9];
 const legal={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]},channels={0:1,2:3,3:1,4:2,6:4};
 if(!width||!height||width>4096||height>4096||!legal[color]?.includes(depth)||ihdr[10]!==0||ihdr[11]!==0||ihdr[12]!==0||color===3&&!palette)throw Error('PNG unsupported dimensions/format/interlace');
 const rowBytes=Math.ceil(width*channels[color]*depth/8),expected=height*(rowBytes+1);
 if(expected>72*1024*1024)throw Error('PNG decoded raster limit');
 const pixels=inflateSync(Buffer.concat(idats),{maxOutputLength:expected});
 if(pixels.length!==expected)throw Error('PNG raster length');
 for(let row=0;row<height;row++)if(pixels[row*(rowBytes+1)]>4)throw Error('PNG row filter');
 return{width,height,mimeType:'image/png'};
}
async function atomicCreate(file,data){
 await noLinks(path.dirname(file));const temporary=file+'.'+randomUUID()+'.tmp';let handle;
 try{handle=await fs.open(temporary,'wx');await handle.writeFile(data);await handle.sync();await handle.close();handle=null;await noLinks(file);await fs.link(temporary,file);}
 finally{await handle?.close();await fs.rm(temporary,{force:true});}
}
async function jsonMaybe(file){try{return JSON.parse((await secureRead(file,256*1024)).toString('utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
function validOriginal(bytes,r){const info=inspectPng(bytes);if(bytes.length!==r.source.sizeBytes)throw Error('source size mismatch');if(sha(bytes)!==r.source.sha256)throw Error('source hash mismatch');if(info.width!==r.source.width||info.height!==r.source.height)throw Error('source dimension mismatch');return info;}
async function prepareComposition(r){
 const bytes=await secureRead(r.compose.requestFile,64*1024),p=JSON.parse(bytes.toString('utf8'));
 if(p.schema!=='threads-image-production-request-v1'||p.postId!==r.postId)throw Error('composition postId/schema mismatch');
 if(!['input','work','output','existingOutput'].every(k=>absolute(p[k])))throw Error('composition paths required');
 for(const dir of [p.output,p.work])if(inside(r.storageRoot,dir)||inside(dir,r.storageRoot))throw Error('composition output/work overlaps received originals');
 const {loadBatchInput}=require('./batch-input.cjs'),{fingerprintFor}=require('./folder-batch.cjs');
 const job=await loadBatchInput(p.input,{id:p.postId,sourceUrl:p.sourceUrl,title:p.title,representativeOnly:p.representativeOnly===true,coverOnly:true});
 const assets=job?.imageComposition?.assets;
 if(!assets||assets.length!==1||assets[0].placement.position!=='cover'||assets[0].sha256!==r.source.sha256||assets[0].asset.promptSha256!==r.generation.promptSha256||['name','model','modelEvidence'].some(k=>assets[0].asset.tool?.[k]!==r.generation.tool[k])||assets[0].asset.generatedAt!==r.generation.generatedAt)throw Error('reviewed composition must bind received original and generation prompt/tool');
 if(job.imageHandoff?.held?.length||job.imageHandoff?.excludeFromRediscovery&&p.representativeOnly!==true)throw Error('composition held/seen');
 if(await fileHash(r.compose.executable)!==r.compose.executableSha256)throw Error('composer executable hash mismatch');
 return{production:p,requestSha256:sha(bytes),consumedInputFingerprint:fingerprintFor(job),checkpoint:path.join(p.work,'checkpoints',r.postId+'.json')};
}
async function verifyComposition(r,prepared){
 const bytes=await secureRead(prepared.checkpoint,256*1024),cp=JSON.parse(bytes.toString('utf8')),p=prepared.production;
 if(cp.state!=='complete'||cp.postId!==r.postId||cp.bodyPngPreserved!==true||cp.reviewRegistered!==false||cp.publicationAllowed!==false||cp.consumedInputFingerprint!==prepared.consumedInputFingerprint||norm(cp.input)!==norm(p.input)||norm(cp.existingOutput)!==norm(p.existingOutput)||cp.runtime?.version!=='0.3.26'||cp.runtime?.packaged!==true||norm(cp.runtime?.executable||'.')!==norm(r.compose.executable)||!!cp.representativeOnly!==!!p.representativeOnly)throw Error('composition checkpoint/runtime binding mismatch');
 if(!absolute(cp.target)||!inside(path.join(p.output,r.postId),cp.target)||!Array.isArray(cp.images)||!cp.images.length||cp.images.length>200)throw Error('composition output path/images');
 const files=[{file:'review-preview.zip',sha256:cp.outputSha256},{file:'source-bundle.zip',sha256:cp.sourceZipSha256},{file:'production-plan.json',sha256:cp.planSha256},...cp.images];
 for(const f of files){if(typeof f.file!=='string'||path.isAbsolute(f.file)||f.file.split(/[\\/]/).includes('..')||!HASH.test(f.sha256||''))throw Error('composition output identity');const file=path.resolve(cp.target,f.file);if(!inside(cp.target,file)||await fileHash(file)!==f.sha256)throw Error('composition output hash mismatch');}
 const cover=await secureRead(path.join(cp.target,cp.images[0].file)),info=inspectPng(cover);
 if(info.width!==1080||info.height!==1080)throw Error('composition square cover dimensions');
 const plan=JSON.parse((await secureRead(path.join(cp.target,'production-plan.json'),5*1024*1024)).toString('utf8'));
 if(plan.originalTitle!==p.title)throw Error('composition full title mismatch');
 if(!Array.isArray(plan.pages)||!plan.pages.length||plan.pages.length!==cp.images.length||cp.bodyImages!==plan.pages.length-1||!HASH.test(cp.fingerprint||'')||path.basename(cp.target)!==cp.fingerprint)throw Error('composition page/body count mismatch');
 const slides=plan.pages.map((_page,index)=>'rendered/slide-'+String(index+1).padStart(3,'0')+'.png');
 const actualSlides=(await fs.readdir(path.join(cp.target,'rendered'))).filter(name=>/\.png$/i.test(name)).sort().map(name=>'rendered/'+name);
 if(JSON.stringify(cp.images.map(i=>i.file))!==JSON.stringify(slides)||JSON.stringify(actualSlides)!==JSON.stringify(slides))throw Error('composition slide set mismatch');
 const priorPlan=JSON.parse((await secureRead(path.join(p.existingOutput,'production-plan.json'),5*1024*1024)).toString('utf8')),preserved=plan.bodyPreservation;
 if(!Array.isArray(priorPlan.pages)||JSON.stringify(plan.pages.slice(1))!==JSON.stringify(priorPlan.pages.slice(1))||preserved?.mode!=='copy_existing_png'||!absolute(preserved.sourceOutput)||norm(preserved.sourceOutput)!==norm(p.existingOutput)||!Array.isArray(preserved.images)||preserved.images.length!==cp.bodyImages||await fileHash(path.join(p.existingOutput,'source-bundle.zip'))!==preserved.sourceBundleSha256)throw Error('composition preserved body plan/source mismatch');
 for(const [index,image] of cp.images.entries()){
  const page=plan.pages[index],size=inspectPng(await secureRead(path.join(cp.target,image.file)));
  if(page.number!==index+1||size.width!==1080||size.width!==page.width||size.height!==page.height||size.width!==image.width||size.height!==image.height)throw Error('composition slide dimensions mismatch');
  if(index){const before=await fileHash(path.join(p.existingOutput,image.file)),record=preserved.images[index-1];if(before!==image.sha256||record.name!==image.file||record.sha256!==before)throw Error('composition preserved body hash mismatch');}
 }
 const {editorRoot}=require('./editor-assets.cjs'),policyModule={exports:{}};
 require('node:vm').runInNewContext((await secureRead(path.join(editorRoot(),'source-page-plan.js'),256*1024)).toString('utf8'),{module:policyModule},{timeout:1000});
 const policy=policyModule.exports;
 const expectedTitle=policy.titleInfo(p.title).displayTitle,titleOps=plan.pages[0].operations?.filter(o=>o.kind==='text'&&o.role==='title')||[];
 const text=value=>typeof value==='string'?value.replace(/\s+/g,' ').trim():null;
 if(plan.pages[0].role!=='cover'||!titleOps.length||titleOps.some(o=>typeof o.text!=='string'||!o.text.trim())||text(titleOps.map(o=>o.text).join(' '))!==text(expectedTitle)||plan.pages[0].geometry?.title!==expectedTitle||JSON.stringify(plan.pages[0].geometry?.lines)!==JSON.stringify(titleOps.map(o=>o.text)))throw Error('composition rendered title lines mismatch');
 return{productionCheckpoint:prepared.checkpoint,productionCheckpointSha256:sha(bytes),target:cp.target,cover:path.join(cp.target,cp.images[0].file),coverSha256:sha(cover),bodyImages:cp.bodyImages,representativeOnly:!!p.representativeOnly,runtime:cp.runtime};
}
function launchInstalled(executable,requestFile){
 return new Promise((resolve,reject)=>{const child=spawn(executable,['--image-production-request='+requestFile],{windowsHide:true,stdio:'ignore'});child.once('error',reject);child.once('exit',(code,signal)=>code===0&&!signal?resolve():reject(Error('composition process failed: '+(signal||code))));});
}
async function receiveImage(r,{afterSave=async()=>{},launch=launchInstalled}={}){
 const fingerprint=validateRequest(r),root=path.resolve(r.storageRoot);await noLinks(root);await fs.mkdir(root,{recursive:true});await noLinks(root);
 const directory=path.join(root,r.postId,r.requestId),locks=path.join(root,'.receiver-locks');await fs.mkdir(locks,{recursive:true});await noLinks(locks);
 const lockFile=path.join(locks,r.postId+'--'+r.requestId+'.lock');let lock;
 try{lock=await fs.open(lockFile,'wx');}catch(e){if(e.code==='EEXIST')return{state:'skipped_running',postId:r.postId,requestId:r.requestId,lockFile,regenerationRequested:false};throw e;}
 const originalFile=path.join(directory,'original.png'),receiptFile=path.join(directory,'receipt.json'),checkpoint=path.join(directory,'checkpoint.json');
 let mayWriteCheckpoint=false,old=null,receipt=null,prepared=null,hadReceipt=false;
 const base={postId:r.postId,requestId:r.requestId,requestFingerprint:fingerprint,originalFile,receiptFile,checkpoint,publicationAllowed:false,reviewRegistered:false,regenerationRequested:false,compositionAllowed:false};
 const save=state=>writeAtomic(checkpoint,JSON.stringify({...base,...state},null,2)+'\n');
 try{
  await lock.writeFile(JSON.stringify({pid:process.pid,nonce:randomUUID(),postId:r.postId,requestId:r.requestId,createdAt:new Date().toISOString()}));
  await noLinks(directory);await fs.mkdir(directory,{recursive:true});await noLinks(directory);
  old=await jsonMaybe(checkpoint);receipt=await jsonMaybe(receiptFile);
  hadReceipt=!!receipt;
  if(old&&old.requestFingerprint!==fingerprint||receipt&&receipt.requestFingerprint!==fingerprint)throw Error('request_conflict: existing identity belongs to different content/prompt');
  mayWriteCheckpoint=true;
  if(receipt){
   try{
    if(receipt.schema!=='threads-image-file-receipt-v1'||receipt.postId!==r.postId||receipt.requestId!==r.requestId||!absolute(receipt.originalFile)||norm(receipt.originalFile)!==norm(originalFile)||receipt.sha256!==r.source.sha256||receipt.sizeBytes!==r.source.sizeBytes||receipt.width!==r.source.width||receipt.height!==r.source.height||receipt.reviewStatus!=='pending_asset_and_layout_review'||receipt.publicationAllowed!==false||receipt.reviewRegistered!==false||validateRequest({schema:r.schema,postId:receipt.postId,requestId:receipt.requestId,storageRoot:root,source:receipt.source,generation:receipt.generation})!==fingerprint)throw Error('stored content/metadata identity changed');
   }catch(e){throw Error('receipt_metadata: '+e.message);}
   try{validOriginal(await secureRead(originalFile),r);}catch(e){throw Error('stored_original: '+e.message);}
  }else{
   if(old&&['complete','composing'].includes(old.state))throw Error('receipt_missing_after_composition');
   await save({state:'receiving',updatedAt:new Date().toISOString()});
   let bytes;
   if(old){try{bytes=await secureRead(originalFile);validOriginal(bytes,r);}catch(e){if(e.code!=='ENOENT')throw Error('stored_original: '+e.message);}}
   if(!bytes){
    try{bytes=await secureRead(r.source.path);}catch(e){throw Error('source_unavailable: '+e.message);}
    validOriginal(bytes,r);
    try{await atomicCreate(originalFile,bytes);}catch(e){if(e.code!=='EEXIST')throw e;try{validOriginal(await secureRead(originalFile),r);}catch(error){throw Error('stored_original: '+error.message);}}
   }
   const info=validOriginal(bytes,r);
   await afterSave();
   receipt={schema:'threads-image-file-receipt-v1',postId:r.postId,requestId:r.requestId,requestFingerprint:fingerprint,source:{...r.source},generation:r.generation,originalFile,sha256:r.source.sha256,sizeBytes:bytes.length,...info,receivedAt:new Date().toISOString(),reviewStatus:'pending_asset_and_layout_review',publicationAllowed:false,reviewRegistered:false};
   await atomicCreate(receiptFile,Buffer.from(JSON.stringify(receipt,null,2)+'\n'));
   await save({state:'received',updatedAt:new Date().toISOString()});
  }
  if(!r.compose){
   if(hadReceipt&&old?.state!=='received'&&old?.state!=='complete'&&!old?.compositionRequestSha256)await save({state:'received',updatedAt:new Date().toISOString(),resumedAfterReceipt:true});
   return{...base,state:hadReceipt?'already_received':'received',note:'원본 수신 완료; 검토된 이미지 계약 연결 전'};
  }
  prepared=await prepareComposition(r);
  if(old?.state==='complete'){
   if(old.compositionRequestSha256!==prepared.requestSha256)throw Error('request_conflict: completed composition request changed');
   const output=await verifyComposition(r,prepared);return{...base,...output,state:'already_done',compositionAllowed:true};
  }
  if(old?.state==='held'&&old.compositionRequestSha256===prepared.requestSha256){
   const digest=await fileHash(checkpoint);
   if(r.retryCheckpointSha256!==digest)return{...base,state:'held',reason:old.reason,retryCheckpointSha256:digest,nextAction:'명시적 재시도 또는 검토 입력 수정 필요'};
  }
  await save({state:'composing',compositionRequestSha256:prepared.requestSha256,updatedAt:new Date().toISOString()});
  await launch(r.compose.executable,r.compose.requestFile);
  const output=await verifyComposition(r,prepared),done={...output,state:'complete',compositionAllowed:true,compositionRequestSha256:prepared.requestSha256,completedAt:new Date().toISOString()};
  await save(done);return{...base,...done};
 }catch(error){
  const held={state:'held',reason:error.message,compositionRequestSha256:prepared?.requestSha256||null,failedAt:new Date().toISOString(),nextAction:'지원 파일·해시·검토 계약 확인; 이미지 재생성 금지'};
  if(mayWriteCheckpoint)await save(held);return{...base,...held};
 }finally{const owned=await lock.stat();const current=await fs.lstat(lockFile).catch(()=>null);await lock.close();if(current&&!current.isSymbolicLink()&&current.dev===owned.dev&&current.ino===owned.ino)await fs.rm(lockFile,{force:true});}
}
module.exports={receiveImage,inspectPng,validateRequest,verifyComposition,MAX};
