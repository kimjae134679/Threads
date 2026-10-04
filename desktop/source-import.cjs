'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const {hash,decodeHtml}=require('./public-source.cjs');
const {discoverCandidates}=require('./folder-batch.cjs');
const {writeAtomic}=require('./atomic-file.cjs');
const imageTypes=/\.(png|jpe?g|webp|gif)$/i;
const label=v=>String(v||'가져온 글').replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,45);
async function readBounded(file,max){const stat=await fs.stat(file);if(!stat.isFile()||stat.size>max)throw new Error('파일 종류 또는 용량을 확인하세요.');return fs.readFile(file);}
async function localImages(folder){
  const found=[],queue=[folder];
  while(queue.length){const current=queue.shift();for(const item of await fs.readdir(current,{withFileTypes:true}).catch(()=>[])){
    if(item.isDirectory()){if(queue.length<40)queue.push(path.join(current,item.name));}
    else if(item.isFile()&&imageTypes.test(item.name))found.push(path.join(current,item.name));
    if(found.length>1000)throw new Error('이미지 파일이 너무 많습니다. 글 한 건의 저장 폴더를 선택하세요.');
  }}return found;
}
async function importSavedSource({file,root,parseHtml}){
  const bytes=await readBounded(file,5*1024*1024),extension=path.extname(file).toLowerCase();
  let draft,sourceText,sourceName;
  if(['.html','.htm'].includes(extension)){sourceText=decodeHtml(bytes);draft=await parseHtml(sourceText);sourceName='source.html';}
  else if(extension==='.json'){
    sourceText=bytes.toString('utf8').replace(/^\ufeff/,'');const v=JSON.parse(sourceText);
    if(v.schema!=='threads-verbatim-source-v1'||v.verbatim!==true||!v.title?.trim()||typeof v.body!=='string'||!v.body.trim())throw new Error('원문 JSON의 제목·본문·verbatim 표시를 확인하세요.');
    draft={originalTitle:v.title,sourceUrl:v.sourceUrl,segments:[...v.body.matchAll(/^\[IMAGE:([^\]\r\n]+)\]/gm)].map(m=>({kind:'image',mediaName:m[1]}))};sourceName='source.json';
  }else if(extension==='.txt'){
    sourceText=bytes.toString('utf8').replace(/^\ufeff/,'');const title=/^\[TITLE\]\r?\n([^\r\n]+)/m.exec(sourceText)?.[1];
    if(!title||!/^\[BODY\]\r?\n/m.test(sourceText))throw new Error('원문 TXT에 [TITLE]과 [BODY] 구역이 필요합니다.');
    draft={originalTitle:title,segments:[...sourceText.matchAll(/^\[IMAGE:([^\]\r\n]+)\]/gm)].map(m=>({kind:'image',mediaName:m[1]}))};sourceName='source.txt';
  }else throw new Error('HTML·원문 JSON·원문 TXT 파일을 선택하세요.');
  if(!draft.originalTitle?.trim())throw new Error('원문 제목을 찾지 못했습니다.');
  const sourceUrl=draft.sourceUrl||'',id='import-'+hash(sourceUrl||bytes).slice(0,16);
  const indexPath=path.join(root,'index.json');
  let index;
  try{index=JSON.parse(await fs.readFile(indexPath,'utf8'));}catch(error){
    if(error.code!=='ENOENT')throw error;await fs.mkdir(root,{recursive:true});
    const records=[];
    for(const candidate of await discoverCandidates(root)){
      if(candidate.relativePath==='.')throw new Error('글 한 건의 폴더가 아닌 전체 자료 폴더에 가져오세요.');
      let metadata={};try{metadata=JSON.parse(await fs.readFile(path.join(candidate.folder,'manifest.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
      records.push({id:metadata.id||hash(candidate.folder).slice(0,16),title:metadata.title||candidate.title||path.basename(candidate.folder),sourceUrl:metadata.sourceUrl||candidate.sourceUrl||'',folder:candidate.relativePath});
    }
    index={schema:'threads-program-input-index-v1',records};
  }
  if(index.schema!=='threads-program-input-index-v1'||!Array.isArray(index.records))throw new Error('입력 목록을 확인하세요.');
  const existing=index.records.find(r=>r.id===id||sourceUrl&&r.sourceUrl===sourceUrl);
  // Existing originals are never overwritten by importing another version.
  if(existing)return {id:existing.id,title:existing.title,alreadyPresent:true};
  if(index.records.length>=5000)throw new Error('자료 5,000건 제한입니다. 다른 입력 폴더를 사용하세요.');
  const relative=path.join('가져온 글',label(draft.originalTitle)+'--'+id),target=path.join(root,relative),source=path.join(target,'source');
  const base=path.dirname(file),stem=path.basename(file,extension);
  const images=[...await localImages(path.join(base,stem+'_files')),...await localImages(path.join(base,'media'))];
  let total=0;const media=[];
  for(const segment of draft.segments.filter(s=>s.kind==='image')){
    const name=segment.mediaName;
    if(!name||path.basename(name)!==name||/[<>:"/\\|?*\x00-\x1f]/.test(name))throw new Error('본문 이미지 파일명을 확인하세요.');
    if(media.some(m=>m.name===name))continue;
    const found=images.filter(f=>path.basename(f).toLowerCase()===name.toLowerCase());
    if(found.length>1)throw new Error('같은 이름의 서로 다른 이미지가 있습니다: '+name);
    if(!found.length)continue; // Batch processing reports the missing original image.
    const data=await readBounded(found[0],8*1024*1024);total+=data.length;
    if(total>60*1024*1024||media.length>=30)throw new Error('본문 이미지 용량·개수 제한입니다.');
    media.push({name,data});
  }
  if(await fs.stat(target).then(()=>true).catch(error=>{if(error.code==='ENOENT')return false;throw error;}))throw new Error('같은 이름의 기존 폴더가 있습니다. 원본을 보존하고 확인하세요.');
  await fs.mkdir(path.join(source,'media'),{recursive:true});
  try{
    await fs.writeFile(path.join(source,sourceName),bytes);
    for(const item of media)await fs.writeFile(path.join(source,'media',item.name),item.data);
    const collectedAt=new Date().toISOString();
    await writeAtomic(path.join(target,'manifest.json'),JSON.stringify({schema:'threads-program-input-v1',id,title:draft.originalTitle,sourceUrl,platform:'저장 원문',collectedAt,publicationAllowed:false},null,2));
    await writeAtomic(path.join(source,'import-record.json'),JSON.stringify({schema:'threads-local-import-v1',inputName:path.basename(file),sha256:hash(bytes),collectedAt,missingImages:draft.segments.filter(s=>s.kind==='image'&&!media.some(m=>m.name===s.mediaName)).map(s=>s.mediaName),publicationAllowed:false},null,2));
    index.records.push({id,title:draft.originalTitle,sourceUrl,folder:relative});
    await writeAtomic(indexPath,JSON.stringify(index,null,2));
    return {id,title:draft.originalTitle,images:media.length};
  }catch(error){await fs.rm(target,{recursive:true,force:true});throw error;}
}
module.exports={importSavedSource};
