'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {loadSavedMaterials}=require('./saved-materials.cjs');
const {decodeHtml}=require('./public-source.cjs');
const hash=data=>createHash('sha256').update(data).digest('hex');
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif'};
async function exists(file) { try {return (await fs.lstat(file)).isFile();} catch {return false;} }
async function bounded(file,max) {
  const stat=await fs.lstat(file);
  if(!stat.isFile() || stat.isSymbolicLink() || stat.size>max) throw new Error('원문 파일 형식 또는 용량을 확인하세요.');
  return fs.readFile(file);
}
async function loadBatchInput(folder,metadata={}) {
  const root=path.resolve(folder);
  let editorial=null;
  const editorialPath=path.join(root,'작업 정보','editorial-plan.json');
  if(await exists(editorialPath)){
    editorial=JSON.parse((await bounded(editorialPath,256*1024)).toString('utf8'));
    if(editorial.schema!=='threads-editorial-plan-v1')throw new Error('제작 전 편집 계획 형식을 확인하세요.');
  }
  for(const directory of [root,path.join(root,'source')]) {
    const names=await fs.readdir(directory).catch(()=>[]);
    const html=names.filter(name=>/\.html?$/i.test(name));
    if(html.length>1)throw new Error('한 후보 폴더의 원문 HTML은 한 개만 두세요.');
    for(const name of ['source.json','source.txt',...html]) {
      const file=path.join(directory,name);
      if(!await exists(file))continue;
      const raw=await bounded(file,5*1024*1024);
      let acquisition=null;
      try {acquisition=JSON.parse(await fs.readFile(path.join(directory,'acquisition.json'),'utf8'));} catch(error) {if(error.code!=='ENOENT')throw error;}
      if(acquisition?.htmlSha256 && /\.html?$/i.test(name) && hash(raw)!==acquisition.htmlSha256)
        throw new Error('저장 원문 HTML이 검증 기록과 다릅니다.');
      const sourceText=/\.html?$/i.test(name)?decodeHtml(raw,acquisition?.contentType):raw.toString('utf8').replace(/^\ufeff/,'');
      if(name==='source.json') {
        const value=JSON.parse(sourceText);
        if(value.schema!=='threads-verbatim-source-v1'||value.verbatim!==true ||
          !value.title?.trim() || typeof value.body!=='string' || !value.body.trim())
          throw new Error('source.json은 원문 그대로의 제목·본문과 verbatim=true가 필요합니다.');
      } else if(name==='source.txt' && (!/^\[TITLE\]\r?\n/m.test(sourceText)||!/^\[BODY\]\r?\n/m.test(sourceText)))
        throw new Error('source.txt에 [TITLE]·[BODY] 원문 구역이 필요합니다.');
      const files=[];
      const imageDirs=[path.join(directory,'media'),path.join(directory,path.basename(name,path.extname(name))+'_files')];
      let total=0;
      for(const mediaDir of imageDirs) for(const item of (await fs.readdir(mediaDir,{withFileTypes:true}).catch(()=>[]))
        .filter(item=>item.isFile()&&mime[path.extname(item.name).toLowerCase()])) {
        if(files.length>=30)throw new Error('원본 이미지는 30장 이하여야 합니다.');
        const data=await bounded(path.join(mediaDir,item.name),25*1024*1024);
        total+=data.length;if(total>60*1024*1024)throw new Error('원본 이미지 합계가 60MB를 넘습니다.');
        const expected=acquisition?.media?.find(asset=>asset.file==='media/'+item.name);
        if(expected && hash(data)!==expected.sha256)throw new Error('원본 이미지가 검증 기록과 다릅니다: '+item.name);
        if(files.some(file=>file.name.toLowerCase()===item.name.toLowerCase()))throw new Error('첨부 이미지 파일명이 중복됩니다: '+item.name);
        files.push({name:item.name,type:mime[path.extname(item.name).toLowerCase()],data:data.toString('base64')});
      }
      const dates={sourceCheckedAt:acquisition?.checkedAt||null,collectedAt:acquisition?.collectedAt||acquisition?.checkedAt||null,
        sourcePublishedAt:acquisition?.sourcePublishedAt||null};
      return {sourceName:name,sourceText,files,imageDirectory:'media',intakeText:'',editorial,...dates,
        title:metadata.title||'',sourceUrl:metadata.sourceUrl||acquisition?.url||'',inputKind:/\.html?$/i.test(name)?'html':'exact'};
    }
  }
  const images=await loadSavedMaterials(root).catch(error=>{
    if(/원문 이미지를 찾지 못/.test(error.message))return null;
    throw error;
  });
  if(!images)return null;
  const sourceName=await exists(path.join(root,'manifest.json'))?'manifest.json':'SOURCE.md';
  const sourceText=await fs.readFile(path.join(root,sourceName),'utf8');
  const intake=path.join(root,'intake-manifest.json');
  return {sourceName,sourceText,files:images.files,imageDirectory:images.metadata.imageDirectory,
    intakeText:await exists(intake)?await fs.readFile(intake,'utf8'):'',
    title:images.metadata.title,sourceUrl:images.metadata.sourceUrl,inputKind:'saved-media',editorial,
    sourceCheckedAt:metadata.sourceCheckedAt||null,sourcePublishedAt:metadata.sourcePublishedAt||null,collectedAt:metadata.collectedAt||null};
}
module.exports={loadBatchInput};
