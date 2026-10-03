'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {loadBatchInput}=require('./batch-input.cjs');
const {sourceAccess}=require('./source-access.cjs');
const {writeCatalog}=require('./batch-catalog.cjs');
const {writeAtomic}=require('./atomic-file.cjs');
const digest=data=>createHash('sha256').update(data).digest('hex');
const safe=value=>String(value||'source').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80);
const label=value=>String(value||'원문').normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,42).replace(/[. ]+$/,'')||'원문';
const RULE_VERSION='2026-10-04.3';
const statuses=['published','generated','already_done','needs_source','needs_access','needs_exact_url','needs_media','needs_selection','unavailable','excluded_severe','failed'];
const inside=(root,target)=>{const relative=path.relative(root,target);return relative===''||relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
async function exists(file) {try{await fs.access(file);return true;}catch{return false;}}
async function discoverCandidates(folder) {
  const root=path.resolve(folder);
  if(!(await fs.stat(root)).isDirectory())throw new Error('후보 폴더를 선택하세요.');
  const indexPath=path.join(root,'index.json');
  if(await exists(indexPath)) {
    const index=JSON.parse(await fs.readFile(indexPath,'utf8'));
    if(index.schema!=='threads-program-input-index-v1'||!Array.isArray(index.records)||index.records.length>5000)
      throw new Error('후보 색인 형식 또는 개수를 확인하세요.');
    return index.records.map(record=>{
      const target=path.resolve(root,String(record.folder||''));
      if(!inside(root,target)||target===root)throw new Error('후보 색인에 허용되지 않은 경로가 있습니다.');
      return {folder:target,relativePath:path.relative(root,target),id:String(record.id||''),title:record.title||'',sourceUrl:record.sourceUrl||''};
    });
  }
  const found=[],pending=[root];
  while(pending.length) {
    const current=pending.shift(),names=await fs.readdir(current,{withFileTypes:true});
    if(names.some(item=>item.isFile()&&(['manifest.json','SOURCE.md','source.json','source.txt'].includes(item.name)||/\.html?$/i.test(item.name)))) {
      found.push({folder:current,relativePath:path.relative(root,current)||'.',id:''});continue;
    }
    for(const item of names)if(item.isDirectory()&&!['media','original','node_modules','이전 버전','이전 예시'].includes(item.name)) {
      pending.push(path.join(current,item.name));
      if(pending.length+found.length>5000)throw new Error('후보가 5,000건을 넘습니다. 범위를 나눠주세요.');
    }
  }
  return found;
}
function counts(entries) {return Object.fromEntries(statuses.map(status=>[status,entries.filter(entry=>entry.status===status).length]));}
function csv(rows) {
  const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  const fields=['id','title','status','reason','nextAction','site','sourceUrl','relativePath','outputFolder','previewZip','renderedPages','ruleVersion','sourcePublishedAt','collectedAt','sourceCheckedAt','generatedAt','templateId','reviewStatus','publicationStatus','updatedAt'];
  return '\ufeff'+fields.join(',')+'\r\n'+rows.map(row=>fields.map(field=>quote(row[field])).join(',')).join('\r\n')+'\r\n';
}
async function saveReport(output,report) {
  await fs.mkdir(output,{recursive:true});
  report.counts=counts(report.entries);
  await writeAtomic(path.join(output,'status.json'),JSON.stringify(report,null,2)+'\n');
  await writeAtomic(path.join(output,'status.csv'),csv(report.entries));
  if(report.processed===report.total||report.processed%25===0)await writeCatalog(output,report);
}
async function readReport(output) {
  try{return JSON.parse(await fs.readFile(path.join(output,'status.json'),'utf8'));}
  catch(error){if(error.code==='ENOENT')return null;throw error;}
}
async function intactOutput(destination,entry,fingerprint) {
  if(entry?.sourceFingerprint!==fingerprint||!entry.outputFolder||!entry.outputSha256||!entry.sourceZipSha256||!entry.images?.length)return false;
  const folder=path.resolve(destination,entry.outputFolder);
  if(!inside(destination,folder)||folder===destination)return false;
  for(const [name,sha] of [['review-preview.zip',entry.outputSha256],['source-bundle.zip',entry.sourceZipSha256],
    ...entry.images.map(image=>[image.name,image.sha256])]) {
    if(name.includes('..')||!(/^(review-preview|source-bundle)[.]zip$|^rendered\/slide-[0-9]{3}[.]png$/).test(name))return false;
    const file=path.join(folder,name);
    if(!await exists(file)||digest(await fs.readFile(file))!==sha)return false;
  }
  return true;
}
async function processFolderBatch({folder,output,render,acquire,onProgress=()=>{},cancelled=()=>false}) {
  const root=path.resolve(folder),destination=path.resolve(output);
  if(inside(root,destination))throw new Error('결과 폴더는 입력 폴더 바깥에 두세요.');
  const candidates=await discoverCandidates(root);
  if(!candidates.length)throw new Error('후보 manifest.json, SOURCE.md 또는 source.html/source.json/source.txt가 없습니다.');
  const prior=await readReport(destination);
  const outputs={...(prior?.outputs||Object.fromEntries((prior?.entries||[]).filter(entry=>entry.outputSha256).map(entry=>[entry.id,entry])))};
  const report={schema:'threads-auto-batch-v1',inputFolder:root,lastRunAt:new Date().toISOString(),total:candidates.length,
    processed:0,entries:[],outputs};
  const ids=new Set();
  onProgress({phase:'scan',done:0,total:candidates.length});
  for(const [index,candidate] of candidates.entries()) {
    if(cancelled())break;
    const entry={id:safe(candidate.id||digest(candidate.folder).slice(0,16)),relativePath:candidate.relativePath,
      title:candidate.title||'',sourceUrl:candidate.sourceUrl||'',status:'needs_source',reason:'저장 원문이 없습니다.',updatedAt:new Date().toISOString()};
    try {
      const file=path.join(candidate.folder,'manifest.json');
      if(await exists(file)) {
        const manifest=JSON.parse(await fs.readFile(file,'utf8'));
        entry.id=safe(candidate.id||manifest.id||entry.id);entry.title=String(manifest.title||manifest.observedTitle||entry.title);
        entry.sourceUrl=String(manifest.sourceUrl||entry.sourceUrl);
      } else if(await exists(path.join(candidate.folder,'SOURCE.md'))) {
        const text=await fs.readFile(path.join(candidate.folder,'SOURCE.md'),'utf8');
        entry.title=/^- exact observed title: `([^`\r\n]*)`/m.exec(text)?.[1]||entry.title;
        entry.sourceUrl=/^- source URL: (https:\/\/\S+)/m.exec(text)?.[1]||entry.sourceUrl;
      }
      if(ids.has(entry.id))throw new Error('후보 ID 중복. 별도 원문을 같은 결과에 덮어쓸 수 없습니다.');
      ids.add(entry.id);
      const work=path.join(candidate.folder,'작업 정보');await fs.mkdir(work,{recursive:true});
      const lifecyclePath=path.join(work,'workflow-state.json');
      let lifecycle={schema:'threads-workflow-state-v1',reviewStatus:'needs_review',publicationStatus:'unknown'};
      try {const saved=JSON.parse(await fs.readFile(lifecyclePath,'utf8'));if(saved.schema===lifecycle.schema)lifecycle={...lifecycle,...saved};}catch(error){if(error.code!=='ENOENT')throw error;}
      Object.assign(entry,{ruleVersion:RULE_VERSION,reviewStatus:lifecycle.reviewStatus,publicationStatus:lifecycle.publicationStatus,
        generatedAt:lifecycle.generatedAt||null,sourceCheckedAt:lifecycle.sourceCheckedAt||null});
      const intakePlan={schema:'threads-capture-plan-v1',ruleVersion:RULE_VERSION,preparedAt:entry.updatedAt,title:entry.title,sourceUrl:entry.sourceUrl,
        titleRule:'원제 보존. 표지는 원제 앞부분 42자 이내에서 선택하고 근거 없는 문구는 만들지 않음.',
        layoutRule:'사진·글·원문 화면에 맞게 표지 선택. 안전 여백 72px, 본문 52px. 원문 문단과 빈 줄 경계로 분할.',
        bodyRule:'원문 문단·이미지 순서 보존. URL 문자열·완전 중복은 표시에서 제외하고 원문과 제외 근거를 보존.',
        commentsRule:'실제로 확인한 BEST 또는 반응수 댓글만 사용. 미확보 댓글은 추정하지 않음.',
        reviewStatus:lifecycle.reviewStatus,publicationStatus:lifecycle.publicationStatus,publicationAllowed:false};
      await fs.writeFile(path.join(work,'capture-plan.json'),JSON.stringify(intakePlan,null,2)+'\n','utf8');
      if(lifecycle.publicationStatus==='published'&&/^https:\/\//.test(lifecycle.publishedUrl||'')&&lifecycle.publishedAt) {
        entry.status='published';entry.reason='게시 URL·시각 기록이 있어 재제작 대상에서 제외';entry.nextAction='게시 기록을 확인하세요.';
        throw Object.assign(new Error(entry.reason),{published:true});
      }
      const access=sourceAccess(entry.sourceUrl);
      entry.site=access.site;entry.nextAction=access.nextAction;
      let job=await loadBatchInput(candidate.folder,entry);
      if(!job && acquire && access.automatic) {
        onProgress({phase:'acquiring',done:index,total:candidates.length,title:entry.title});
        const result=await acquire({folder:candidate.folder,sourceUrl:entry.sourceUrl,title:entry.title});
        if(result?.reason) {entry.status=result.status||'needs_source';entry.reason=result.reason;}
        if(cancelled())break;
        job=await loadBatchInput(candidate.folder,entry);
      }
      if(!job) {
        if(entry.reason==='저장 원문이 없습니다.')entry.status=access.automatic?'needs_source':access.mode;
        entry.reason=entry.reason==='저장 원문이 없습니다.'?access.nextAction:entry.reason;
      } else {
        entry.inputKind=job.inputKind;entry.sourceUrl=job.sourceUrl||entry.sourceUrl;entry.title=job.title||entry.title;
        Object.assign(entry,{sourceCheckedAt:job.sourceCheckedAt||null,sourcePublishedAt:job.sourcePublishedAt||null,collectedAt:job.collectedAt||null});
        let fingerprint=digest('folder-recipe-'+RULE_VERSION+'|'+JSON.stringify(job));
        const old=outputs[entry.id];
        let outputFolder=path.posix.join('현재 결과',label(entry.title)+'__'+entry.id);
        if(await intactOutput(destination,old,fingerprint)) {
          Object.assign(entry,{...old,status:'already_done',reason:'원문·원문 ZIP·결과 PNG 해시가 같아 건너뜀',updatedAt:entry.updatedAt});
        } else {
          let result;
          try {result=await render(job,{folder:candidate.folder,id:entry.id});}
          catch(error) {
            if(!acquire||!access.automatic||!/원문 이미지 파일 누락/.test(error.message))throw error;
            onProgress({phase:'acquiring',done:index,total:candidates.length,title:entry.title});
            await acquire({folder:candidate.folder,sourceUrl:entry.sourceUrl,title:entry.title});
            job=await loadBatchInput(candidate.folder,entry);if(!job)throw error;
            fingerprint=digest('folder-recipe-'+RULE_VERSION+'|'+JSON.stringify(job));
            result=await render(job,{folder:candidate.folder,id:entry.id});
          }
          if(!Buffer.isBuffer(result?.zip)||!Buffer.isBuffer(result.sourceZip)||!result.sourceZip.length||
            !Array.isArray(result.images)||!result.images.length||result.images.length>60)throw new Error('원문 ZIP·결과 ZIP·PNG 생성 실패');
          entry.title=result.title||entry.title;
          outputFolder=path.posix.join('현재 결과',label(entry.title)+'__'+entry.id);
          const target=path.join(destination,outputFolder);
          await fs.mkdir(path.join(target,'rendered'),{recursive:true});
          const imageRecords=[];
          for(const image of result.images) {
            if(!/^rendered\/slide-[0-9]{3}[.]png$/.test(image.name)||!Buffer.isBuffer(image.data)||!image.data.length)
              throw new Error('결과 이미지 데이터가 올바르지 않습니다.');
            await fs.writeFile(path.join(target,image.name),image.data);imageRecords.push({name:image.name,sha256:digest(image.data)});
          }
          for(const oldFile of await fs.readdir(path.join(target,'rendered')))
            if(/^slide-[0-9]{3}[.]png$/.test(oldFile)&&!imageRecords.some(image=>image.name==='rendered/'+oldFile))
              await fs.rm(path.join(target,'rendered',oldFile));
          await fs.writeFile(path.join(target,'review-preview.zip'),result.zip);
          await fs.writeFile(path.join(target,'source-bundle.zip'),result.sourceZip);
          if(result.productionPlan)await fs.writeFile(path.join(target,'production-plan.json'),JSON.stringify(result.productionPlan,null,2)+'\n','utf8');
          entry.generatedAt=new Date().toISOString();entry.plannedAt=result.productionPlan?.preparedAt||entry.generatedAt;
          entry.templateId=result.productionPlan?.templateId||null;
          entry.reviewStatus='needs_review';entry.publicationStatus=lifecycle.publicationStatus;
          Object.assign(entry,{title:result.title||entry.title,status:'generated',reason:'검수 전 이미지 제작 완료',outputFolder,
            previewZip:path.posix.join(outputFolder,'review-preview.zip'),sourceFingerprint:fingerprint,
            outputSha256:digest(result.zip),sourceZipSha256:digest(result.sourceZip),images:imageRecords,renderedPages:imageRecords.length});
        }
        entry.nextAction='앱 목록에서 결과 폴더를 열어 표지·본문·댓글을 확인하세요.';
        outputs[entry.id]={...entry};
        await fs.writeFile(lifecyclePath,JSON.stringify({...lifecycle,ruleVersion:RULE_VERSION,generatedAt:entry.generatedAt,
          plannedAt:entry.plannedAt,reviewStatus:entry.reviewStatus,publicationStatus:entry.publicationStatus,
          sourceCheckedAt:entry.sourceCheckedAt,sourcePublishedAt:entry.sourcePublishedAt,collectedAt:entry.collectedAt,
          outputFolder:entry.outputFolder,sourceFingerprint:entry.sourceFingerprint},null,2)+'\n','utf8');
      }
    } catch(error) {
      entry.reason=String(error.message).slice(0,400);
      entry.status=error.published?'published':/첫 장의 실제 원문 조각/.test(entry.reason)?'needs_selection':/심한 소재 제외/.test(entry.reason)?'excluded_severe':
        /원문 이미지 파일 누락|원문 영상·임베드/.test(entry.reason)?'needs_media':
        /본문을 특정|본문 조각|대문 글씨|제목|60장|폰트/.test(entry.reason)?'needs_selection':'failed';
      entry.nextAction=entry.status==='needs_media'?'누락된 원본 이미지 또는 영상·임베드의 전체 내용을 확인하세요.':'자료와 사유를 확인한 뒤 같은 작업을 다시 실행하세요.';
    }
    await fs.mkdir(path.join(candidate.folder,'작업 정보'),{recursive:true});
    await fs.writeFile(path.join(candidate.folder,'작업 정보','automation-status.json'),JSON.stringify({...entry,
      outputPath:entry.outputFolder?path.join(destination,entry.outputFolder):null,publicationAllowed:false},null,2)+'\n','utf8');
    await fs.writeFile(path.join(candidate.folder,'자료 안내.txt'),
      (entry.title||'제목 미확인')+'\n\n상태: '+entry.status+'\n사유: '+entry.reason+'\n다음 조치: '+(entry.nextAction||'')+
      '\n기준 버전: '+(entry.ruleVersion||RULE_VERSION)+'\n제작일: '+(entry.generatedAt||'없음')+'\n검수: '+(entry.reviewStatus||'미확인')+'\n게시: '+(entry.publicationStatus||'확인 기록 없음')+'\n결과: '+(entry.outputFolder?path.join(destination,entry.outputFolder):'없음')+'\n게시 승인: 없음\n','utf8');
    report.entries.push(entry);report.processed=index+1;
    if(entry.status==='generated'||(index+1)%25===0)await saveReport(destination,report);
    onProgress({phase:'processing',done:index+1,total:candidates.length,status:entry.status,title:entry.title,reason:entry.reason});
  }
  report.cancelled=report.processed<candidates.length;
  await saveReport(destination,report);
  return {output:destination,...report};
}
async function runFolderBatch(options) {
  const output=path.resolve(options.output);
  if(inside(path.resolve(options.folder),output))throw new Error('결과 폴더는 입력 폴더 바깥에 두세요.');
  await fs.mkdir(output,{recursive:true});
  const file=path.join(output,'batch.lock');
  let handle;
  for(let attempt=0;attempt<2;attempt++) {
    try {handle=await fs.open(file,'wx');break;}
    catch(error) {
      if(error.code!=='EEXIST')throw error;
      const owner=JSON.parse(await fs.readFile(file,'utf8'));
      let alive=true;try {process.kill(owner.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;}
      if(alive)throw new Error('다른 실행 창에서 자동 제작 중입니다. 진행 중인 창에서 중지하거나 완료를 기다리세요.');
      await fs.rm(file);
    }
  }
  if(!handle)throw new Error('자동 제작 잠금을 확보하지 못했습니다.');
  await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
  try {return await processFolderBatch(options);}
  finally {await handle.close();await fs.rm(file,{force:true});}
}
module.exports={discoverCandidates,runFolderBatch,readReport,inside};
