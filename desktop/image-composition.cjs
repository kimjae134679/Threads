'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
const hash=b=>createHash('sha256').update(b).digest('hex');
async function prepareImageComposition(handoff){
 if(!handoff)return null;
 if(handoff.generationRequests?.length)throw Error('image generation consumer is not connected; required imagery remains pending before cache lookup');
 const inputs=[...(handoff.compositionAssets||[])];
 if(handoff.selectedCoverAsset){const a=handoff.selectedCoverAsset;inputs.push({itemId:'selected-cover',file:a.file,asset:a,placement:{position:'cover',afterSourceId:null,order:0},composition:{aspectRatio:'1:1',crop:'contain',subjectRegion:'center',safeArea:{top:0,right:0,bottom:0,left:0}},provenance:{kind:a.kind,actualScene:false,displayText:false,persistInManifest:true}});}
 if(!inputs.length)return null;
 if(inputs.some(i=>i.placement.position!=='cover'))throw Error('body image composition held: current approved scope is cover only');
 if(handoff.held?.some(i=>i.status!=='already_seen'))throw Error('image requirements held: '+handoff.held.flatMap(i=>i.reasons).join('; '));
 if(inputs.filter(i=>i.placement.position==='cover').length>1)throw Error('Multiple selected covers; choose one reviewed asset');
 const assets=[];
 for(const [index,i] of inputs.entries()){
  const stat=await fs.lstat(i.file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>12*1024*1024)throw Error('composition asset file type/size');
  const data=await fs.readFile(i.file);if(hash(data)!==i.asset.sha256)throw Error('composition asset hash mismatch');
  const ext=path.extname(i.file).toLowerCase(),type=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';
  const valid=ext==='.png'?data.subarray(0,8).toString('hex')==='89504e470d0a1a0a':ext==='.webp'?data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP':data[0]===255&&data[1]===216;
  if(!valid)throw Error('composition asset type mismatch');
  const {file,...metadata}=i.asset;
  assets.push({itemId:i.itemId,name:'composition-'+index+ext,type,data:data.toString('base64'),sha256:i.asset.sha256,placement:i.placement,composition:i.composition,
   anchorText:i.anchorText||null,provenance:i.provenance,asset:metadata,overlays:[]});
 }
 return {schema:'threads-image-composition-v1',rendererVersion:'2026-10-09.7',postId:handoff.postId,productionVersion:handoff.productionVersion,
  assets,generationReceipts:handoff.generationReceipts||[],representativeOnly:!!handoff.representativeOnly,publicationAllowed:false};
}
module.exports={prepareImageComposition};
