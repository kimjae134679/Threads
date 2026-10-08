'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const schema = require('./image-requirements-schema.json');
const hash = data => createHash('sha256').update(data).digest('hex');
const VERSION = 'threads-image-prompt-v1';
const provenance = () => ({kind:'ai_generated',displayText:false,persistInManifest:true,actualScene:false});

// Deliberately implements only the keywords used in the checked-in contract.
function shape(value, rule, at, errors) {
  if (rule.$ref) rule = schema.$defs[rule.$ref.split('/').pop()];
  if (rule.anyOf) {
    if (!rule.anyOf.some(r => {const e=[];shape(value,r,at,e);return !e.length;})) errors.push(at+': type/shape');
    return;
  }
  const type = value===null?'null':Array.isArray(value)?'array':typeof value;
  if (rule.type && !(rule.type==='integer'?Number.isInteger(value):type===rule.type)) {errors.push(at+': '+rule.type+' required');return;}
  if ('const' in rule && JSON.stringify(value)!==JSON.stringify(rule.const)) errors.push(at+': constant mismatch');
  if (rule.enum && !rule.enum.includes(value)) errors.push(at+': enum');
  if (type==='string') {
    if (rule.minLength && value.trim().length<rule.minLength) errors.push(at+': empty');
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) errors.push(at+': pattern');
    if (rule.format==='date-time' && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))) errors.push(at+': date-time');
  }
  if (type==='number') {
    if (rule.minimum!==undefined && value<rule.minimum || rule.maximum!==undefined && value>rule.maximum) errors.push(at+': range');
  }
  if (type==='array') {
    if (rule.minItems && value.length<rule.minItems) errors.push(at+': minItems');
    if (rule.maxItems!==undefined && value.length>rule.maxItems) errors.push(at+': maxItems');
    if (rule.uniqueItems && new Set(value.map(v=>JSON.stringify(v))).size!==value.length) errors.push(at+': duplicates');
    value.forEach((v,i)=>shape(v,rule.items,at+'['+i+']',errors));
  }
  if (type==='object') {
    for (const key of rule.required||[]) if (!(key in value)) errors.push(at+'.'+key+': required');
    for (const [key,v] of Object.entries(value)) {
      if (rule.properties?.[key]) shape(v,rule.properties[key],at+'.'+key,errors);
      else if (rule.additionalProperties===false) errors.push(at+'.'+key+': unknown field');
    }
  }
}
function compilePrompt(item) {
  const s=item.scene,c=item.composition;
  return {version:VERSION,noText:true,titleBy:'program',text:[
    '원문에 근거한 비식별 연출 일러스트. 실제 사건 사진이나 증거처럼 표현하지 않는다.',
    '장면: '+s.setting+'. 행동: '+s.action+'. 인물 수: '+s.peopleCount+'명.',
    '이 글 전용 시각 선택: '+s.visualDesign.style+', '+s.visualDesign.framing+', 색 '+s.visualDesign.palette.join('/')+', 표정 '+s.visualDesign.expression+'. 다른 글에 이 장면을 재사용하지 않는다.',
    '구도: '+c.aspectRatio+', '+c.subjectRegion+', '+c.crop+'. 여백: '+JSON.stringify(c.safeArea)+'.',
    '이미지 안에 글씨, 제목, 숫자, 말풍선, 댓글, 로고, 서명, 워터마크, AI 연출 표시 문구를 넣지 않는다. 제목만 프로그램이 별도 합성하며 생성 이력은 내부 기록으로 보존한다.',
    '추가하지 말 것: '+item.mustNotInvent.join('; ')+'.',
  ].join('\n')};
}
function validateImageRequirements(record, identity={}) {
  if (record===undefined) return [];
  const errors=[];shape(record,schema,'imageRequirements',errors);if(errors.length)return errors;
  const r=record;
  const url=v=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password;}catch{return false;}};
  if (!url(r.sourceUrl)) errors.push('sourceUrl: public URL required');
  if (identity.postId && identity.postId!==r.postId) errors.push('postId: input mismatch');
  if (identity.sourceUrl && identity.sourceUrl!==r.sourceUrl) errors.push('sourceUrl: input mismatch');
  if (identity.productionVersion && identity.productionVersion!==r.productionLink.productionVersion) errors.push('productionVersion: input mismatch');
  if (r.productionLink.postId!==r.postId) errors.push('productionLink.postId: mismatch');
  if (r.identity.sourceId!==r.postId) errors.push('identity.sourceId: input mismatch');
  const {canonicalUrl}=require('./intake-policy.cjs');
  try{if(r.identity.canonicalSourceUrl!==canonicalUrl(r.sourceUrl))errors.push('canonicalSourceUrl: existing intake canonicalUrl mismatch');}catch{errors.push('canonicalSourceUrl: invalid');}
  const seen=r.identity.seenBefore;
  if(seen.status!=='unknown'&&(!seen.reference||!seen.sha256||!seen.checkedAt))errors.push('seenBefore: checked progress snapshot required');
  if(seen.status==='seen'&&!seen.matchedOutputVersions.length)errors.push('seenBefore: seen version required');
  if(seen.status!=='seen'&&seen.matchedOutputVersions.length)errors.push('seenBefore: cannot transfer old seen status');
  const choice=r.selection.choice;
  if(r.selection.originalDecision==='usable'&&choice!=='source_image')errors.push('selection: usable original has priority');
  if(r.selection.originalDecision!=='usable'&&r.selection.externalDecision==='usable'&&choice!=='external_image')errors.push('selection: usable external image has priority');
  if(choice==='source_image'&&r.selection.originalDecision!=='usable'||choice==='external_image'&&r.selection.externalDecision!=='usable')errors.push('selection: selected image needs usability/rights review');
  const selected=r.selection.selectedAsset;
  if(['source_image','external_image'].includes(choice)){
    if(!selected)errors.push('selectedAsset: file/hash/source/relevance/commercial rights evidence required');
    else {
      if(selected.kind!==choice||!url(selected.sourceUrl))errors.push('selectedAsset: kind/sourceUrl mismatch');
      if(choice==='source_image'&&selected.sourceUrl!==r.sourceUrl)errors.push('selectedAsset: original source binding required');
      if(!/^(?:(?:source\/media|media|작업 정보\/selected-media)\/)?[\w-]+\.(png|jpe?g|webp)$/i.test(selected.file))errors.push('selectedAsset: bounded local media path required');
    }
    if(r.clearance.status!=='cleared_for_illustration'||!r.clearance.evidence||!r.clearance.reviewedBy)errors.push('selectedAsset: source/privacy clearance required');
  }else if(selected)errors.push('selectedAsset: only original/external image choice may carry selected file');
  if(choice==='ai_illustration'&&r.selection.originalDecision==='not_needed')errors.push('selection: do not force AI for text content');
  if(r.items.some(i=>['generation_needed','ready'].includes(i.status))&&
    (r.selection.originalDecision==='unknown'||r.selection.externalDecision==='unknown'))errors.push('selection: original/external image suitability must be checked before AI dispatch');
  if(r.items.length&&choice!=='ai_illustration')errors.push('selection: AI items require ai_illustration choice');
  if(r.collection){
    if(!r.collection.sourceChain.every(url))errors.push('collection.sourceChain: public URLs required');
    if(r.collection.originalSourceUrl!==null&&!url(r.collection.originalSourceUrl))errors.push('collection.originalSourceUrl: invalid');
    if((r.collection.reviewReference===null)!==(r.collection.reviewSha256===null))errors.push('collection.review: reference/hash pair required');
  }
  for(const receipt of r.generationReceipts||[]){
    if(receipt.sourcePostId!==r.postId)errors.push('generationReceipt: sourcePostId mismatch');
    if(receipt.productionVersion!==null)errors.push('generationReceipt: not_applied productionVersion must be null');
    if(receipt.prompt.sha256!==hash(receipt.prompt.text))errors.push('generationReceipt: prompt hash mismatch');
    if(receipt.tool.model!==null&&!receipt.tool.modelEvidence||receipt.tool.model===null&&receipt.tool.modelEvidence!==null)errors.push('generationReceipt: confirmed model/evidence pair required');
  }
  const bodyRead=r.read.status==='body_read';
  if (bodyRead && (!r.read.readAt||!r.read.reference||!r.read.sha256)) errors.push('body_read: read time/file/hash required');
  if (!bodyRead && (r.read.readAt!==null||r.read.excerpts.length)) errors.push('body_read: unread source must not assert read time/quotes');
  const evidence=new Set(r.read.excerpts.map(e=>e.id));
  if(evidence.size!==r.read.excerpts.length) errors.push('read.excerpts: duplicate id');
  if (r.status==='not_needed' && (r.shortage.insufficient!==false||r.items.length)) errors.push('not_needed: no generation items allowed');
  if(['generation_needed','ready'].includes(r.status)&&!r.items.length)errors.push('outgoing status: items required');
  if (r.shortage.insufficient!==true && r.items.length) errors.push('shortage: generation only when insufficient=true');
  if (!bodyRead && r.status!=='source_hold') errors.push('body_read: status must be source_hold');
  if (r.status==='source_hold' && !r.holdReasons?.length) errors.push('source_hold: holdReasons required');
  const ids=new Set(),positions=new Set();
  for (const i of r.items) {
    if(ids.has(i.id)) errors.push('items: duplicate id');ids.add(i.id);
    const p=i.placement.position+':'+i.placement.order;if(positions.has(p))errors.push('placement: duplicate order');positions.add(p);
    if(i.placement.position==='cover' && (i.placement.order!==0||i.placement.afterSourceId!==null))errors.push('cover: order=0 and no body anchor required');
    if(i.placement.position==='body' && !evidence.has(i.placement.afterSourceId))errors.push('body placement: evidence anchor required');
    const shipping=['generation_needed','ready'].includes(i.status);
    if(!bodyRead && (i.prompt!==null||i.scene!==null))errors.push('body_read: no final scene/prompt for unread source');
    if(shipping && (!bodyRead||r.clearance.status!=='cleared_for_illustration'||!r.clearance.evidence||!r.clearance.reviewedBy))errors.push('clearance: reviewed source use required');
    if(shipping && !r.productionLink.productionVersion)errors.push('productionVersion: required for outgoing item');
    if(shipping && (!i.scene||!i.prompt))errors.push('scene/prompt: required for outgoing item');
    if(['rights_hold','source_hold'].includes(i.status) && !i.holdReasons.length)errors.push('held item: reason required');
    if(i.status!== 'ready' && i.asset!==null)errors.push('asset: only ready status may carry generated file');
    if(i.status==='ready' && !i.asset)errors.push('ready: asset required');
    if(i.scene){
      if(!i.scene.evidenceIds.every(id=>evidence.has(id))||!i.scene.evidenceIds.length)errors.push('scene: missing source evidence');
      if(!i.scene.reviewedBy)errors.push('scene: human grounding review required');
      if(i.prompt && i.prompt.text!==compilePrompt(i).text)errors.push('prompt: differs from grounded compiler/version');
    }
    const a=i.asset;
    if(a){
      if(a.postId!==r.postId||a.productionVersion!==r.productionLink.productionVersion)errors.push('asset: post/production binding mismatch');
      if(a.receiptOriginalSha256){
        const receipts=(r.generationReceipts||[]).filter(receipt=>receipt.originalFile.sha256===a.receiptOriginalSha256),receipt=receipts[0];
        if(receipts.length!==1||!receipt.originalFile.textFree||receipt.originalFile.sha256!==a.sha256||receipt.prompt.sha256!==a.promptSha256||receipt.prompt.version!==a.promptVersion||receipt.generatedAt!==a.generatedAt||JSON.stringify(receipt.tool)!==JSON.stringify(a.tool))errors.push('asset: receipt binding mismatch');
      }else if(a.generatedAt===null||a.promptVersion!==i.prompt?.version||a.promptSha256!==hash(i.prompt?.text||''))errors.push('asset: prompt binding mismatch');
      if(a.tool.model!==null && !a.tool.modelEvidence || a.tool.model===null && a.tool.modelEvidence!==null)errors.push('model: confirmed value/evidence pair required');
      if(!/^[\w-]+\.(png|jpe?g|webp)$/i.test(a.file))errors.push('asset.file: local basename only');
      if(!['user_owned','licensed_commercial'].includes(a.rights.status)||!a.rights.evidence)errors.push('asset: commercial rights evidence required');
    }
  }
  const expected=r.items.length ? (r.items.some(i=>i.status==='source_hold')?'source_hold':r.items.some(i=>i.status==='rights_hold')?'rights_hold':r.items.some(i=>i.status==='generation_needed')?'generation_needed':'ready') : r.status;
  if(r.status!==expected)errors.push('status: aggregate mismatch');
  return errors;
}
async function boundedRead(file,max=5*1024*1024) {
  const s=await fs.lstat(file);if(!s.isFile()||s.isSymbolicLink()||s.size>max)throw Error('file type/size: '+file);
  return fs.readFile(file);
}
function textValues(value){return typeof value==='string'?[value]:value&&typeof value==='object'?Object.values(value).flatMap(textValues):[];}
async function buildImageHandoff(record,{root,identity={},representativeOnly=false}={}) {
  const errors=validateImageRequirements(record,identity);if(errors.length)throw Error(errors.join('\n'));
  if(record===undefined)return null;
  const r=record,out={schema:'threads-image-handoff-v1',postId:r.postId,sourceUrl:r.sourceUrl,productionVersion:r.productionLink.productionVersion,
    identity:r.identity,selection:r.selection,excludeFromRediscovery:r.identity.seenBefore.status==='seen',
    generationReceipts:r.generationReceipts||[],provenancePolicy:provenance(),representativeOnly,
    publicationAllowed:false,generationRequests:[],compositionAssets:[],selectedCoverAsset:null,held:[],requiresCompositionSupport:false};
  if(root)for(const receipt of r.generationReceipts||[]){
    for(const evidence of [receipt.recordFile,receipt.originalFile]){
      const bytes=await boundedRead(path.resolve(root,evidence.reference),12*1024*1024);
      if(hash(bytes)!==evidence.sha256)throw Error('generationReceipt: file hash mismatch');
    }
  }
  // Dispatchable records must be checked against the bytes actually read, not a bodyRead flag.
  if(r.read.status==='body_read' && (root||r.items.some(i=>['generation_needed','ready'].includes(i.status)))){
    if(!root)throw Error('root required for outgoing source hash validation');
    const bytes=await boundedRead(path.resolve(root,r.read.reference));if(hash(bytes)!==r.read.sha256)throw Error('source hash mismatch');
    let values;try{values=textValues(JSON.parse(bytes.toString('utf8')));}catch{values=[bytes.toString('utf8')];}
    if(r.read.excerpts.some(e=>!values.some(s=>s.includes(e.text))))throw Error('source excerpt mismatch');
  }
  const seen=r.identity.seenBefore;
  if(seen.status!=='unknown'){
    if(!root)throw Error('root required for seen progress validation');
    const bytes=await boundedRead(path.resolve(root,seen.reference));if(hash(bytes)!==seen.sha256)throw Error('seen progress hash mismatch');
    const progress=JSON.parse(bytes.toString('utf8'));
    if(!Array.isArray(progress.entries))throw Error('seen progress entries required');
    const versions=[...new Set(progress.entries.filter(e=>e.id===r.postId&&e.seenAt&&e.pagesSeen?.length!==0).map(e=>e.outputVersion))].sort();
    if((versions.length?'seen':'unseen')!==seen.status||JSON.stringify(versions)!==JSON.stringify([...seen.matchedOutputVersions].sort()))throw Error('seen progress mismatch');
  }
  if(r.selection.selectedAsset&&(!out.excludeFromRediscovery||representativeOnly)){
    if(!root)throw Error('root required for selectedAsset validation');
    const selected=r.selection.selectedAsset,file=path.join(root,...selected.file.split('/'));
    const realRoot=await fs.realpath(root),realFile=await fs.realpath(file);
    if(!realFile.toLowerCase().startsWith((realRoot+path.sep).toLowerCase()))throw Error('selectedAsset: file outside root');
    const bytes=await boundedRead(file,12*1024*1024);if(hash(bytes)!==selected.sha256)throw Error('selectedAsset: file hash mismatch');
    out.selectedCoverAsset={...selected,file,titleBy:'program',actualScene:false};
  }
  for(const i of r.items){
    const base={itemId:i.id,postId:r.postId,productionVersion:r.productionLink.productionVersion,placement:i.placement,composition:i.composition,
      titleBy:'program',provenance:provenance(),actualScene:false};
    if(out.excludeFromRediscovery&&!(representativeOnly&&i.status==='ready')){out.held.push({itemId:i.id,status:'already_seen',reasons:['sourceId already viewed; suppress repeat delivery']});continue;}
    if(i.status==='generation_needed')out.generationRequests.push({...base,prompt:i.prompt,scene:i.scene,mustNotInvent:i.mustNotInvent,
      evidence:i.scene.evidenceIds.map(id=>r.read.excerpts.find(e=>e.id===id)),sourceRead:r.read,
      tool:{name:null,model:null,modelEvidence:null}});
    else if(i.status==='ready'){
      if(!root)throw Error('root required for generated image hash validation');
      const target=path.join(root,'작업 정보','generated-media',i.asset.file);
      // Standalone records may keep media directly beside the contract; callers choose root.
      const file=await fs.lstat(target).then(()=>target).catch(e=>{if(e.code==='ENOENT')return path.join(root,i.asset.file);throw e;});
      const realRoot=await fs.realpath(root),realFile=await fs.realpath(file);
      if(!realFile.toLowerCase().startsWith((realRoot+path.sep).toLowerCase()))throw Error('asset path outside root');
      const bytes=await boundedRead(file,12*1024*1024);if(hash(bytes)!==i.asset.sha256)throw Error('asset hash mismatch');
      const png=bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a',jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,
        webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
      if(!( /\.png$/i.test(file)?png:/\.webp$/i.test(file)?webp:jpg))throw Error('asset type mismatch');
      out.compositionAssets.push({...base,asset:i.asset,file,anchorText:i.placement.position==='body'?r.read.excerpts.find(e=>e.id===i.placement.afterSourceId)?.text:null,overlays:[]});
    }else out.held.push({itemId:i.id,status:i.status,reasons:i.holdReasons});
  }
  if(r.status==='source_hold'&&!r.items.length)out.held.push({itemId:null,status:r.status,reasons:r.holdReasons});
  out.requiresCompositionSupport=out.compositionAssets.length>0||out.selectedCoverAsset!==null;
  return out;
}
async function loadImageRequirements(root,identity={},options={}) {
  let manifest=null,sidecar=null;
  const read=async file=>{try{return JSON.parse((await boundedRead(file,256*1024)).toString('utf8').replace(/^\ufeff/,''));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
  manifest=await read(path.join(root,'manifest.json'));
  sidecar=await read(path.join(root,'작업 정보','image-requirements.json'));
  const embedded=manifest?.imageRequirements;
  if(embedded&&sidecar&&JSON.stringify(embedded)!==JSON.stringify(sidecar))throw Error('imageRequirements: manifest/sidecar conflict');
  const record=sidecar||embedded;
  return buildImageHandoff(record,{root,representativeOnly:options.representativeOnly===true,identity:{...identity,postId:identity.postId||manifest?.id,sourceUrl:identity.sourceUrl||manifest?.sourceUrl}});
}
// Remove only a top-level metadata property, preserving all other JSON bytes.
// This retains the old production fingerprint even for embedded contracts.
function stripEmbeddedContract(text){
  try{if(!Object.hasOwn(JSON.parse(text.replace(/^\ufeff/,'')),'imageRequirements'))return text;}catch{return text;}
  const open=text.indexOf('{'),parts=[];let start=open+1,depth=0,quoted=false,escaped=false;
  for(let n=open;n<text.length;n++){
    const c=text[n];
    if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
    if(c==='"'){quoted=true;continue;}
    if(c==='{'||c==='[')depth++;
    else if(c==='}'||c===']'){
      depth--;if(depth===0){parts.push({start,end:n});break;}
    }else if(c===','&&depth===1){parts.push({start,end:n});start=n+1;}
  }
  const index=parts.findIndex(p=>{try{return Object.hasOwn(JSON.parse('{'+text.slice(p.start,p.end)+'}'),'imageRequirements');}catch{return false;}});
  if(index<0)return text;
  const part=parts[index];
  if(index<parts.length-1)return text.slice(0,part.start)+text.slice(part.end+1);
  const trailing=/\s*$/.exec(text.slice(part.start,part.end))[0];
  return text.slice(0,index?parts[index-1].end:part.start)+trailing+text.slice(part.end);
}
function renderingJob(job){
  const {imageHandoff,...render}=job;
  if(render.imageComposition){
    const c=render.imageComposition;
    render.imageComposition={schema:c.schema,rendererVersion:c.rendererVersion,postId:c.postId,productionVersion:c.productionVersion,
      assets:c.assets.map(({data,...asset})=>asset)};
  }
  if(render.sourceName==='manifest.json'&&typeof render.sourceText==='string')render.sourceText=stripEmbeddedContract(render.sourceText);
  return render;
}
module.exports={compilePrompt,validateImageRequirements,buildImageHandoff,loadImageRequirements,renderingJob};
