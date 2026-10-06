'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
const hash=data=>createHash('sha256').update(data).digest('hex');
async function loadCoverAsset(root){
 const work=path.join(root,'작업 정보'),record=path.join(work,'cover-asset.json');
 let raw;try{raw=await fs.readFile(record,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(Buffer.byteLength(raw)>32768)throw new Error('표지 보완 이미지 기록 용량 초과');
 const asset=JSON.parse(raw);
 if(asset.schema!=='threads-cover-asset-v1'||!['related','ai_generated'].includes(asset.kind)||
  !asset.relevance?.trim()||asset.actualScene!==false||asset.coverOnly!==true||
  !/^[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp)$/.test(asset.name||'')||
  !/^[a-f0-9]{64}$/.test(asset.sha256||'')||
  !asset.attribution?.trim()||!asset.license?.trim()||
  (asset.kind==='related'&&!/^https:\/\//.test(asset.sourceUrl||''))||
  (asset.kind==='ai_generated'&&(!asset.prompt?.trim()||!asset.generator?.trim())))
  throw new Error('표지 보완 이미지의 출처·종류·내용 근거를 확인하세요.');
 const target=path.join(work,'cover-media',asset.name),stat=await fs.lstat(target);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>12*1024*1024)throw new Error('표지 보완 이미지 파일 형식·용량을 확인하세요.');
 const data=await fs.readFile(target);
 if(hash(data)!==asset.sha256)throw new Error('표지 보완 이미지가 검증 기록과 다릅니다.');
 const ext=path.extname(asset.name).toLowerCase(),type=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';
 if(type==='image/png'&&!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||
    type==='image/jpeg'&&!(data[0]===255&&data[1]===216&&data[2]===255)||
    type==='image/webp'&&!(data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'))
  throw new Error('표지 보완 이미지 내용과 확장자가 다릅니다.');
 return {asset,file:{name:asset.name,type,data:data.toString('base64')}};
}
module.exports={loadCoverAsset};
