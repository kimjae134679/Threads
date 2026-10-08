'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{createHash,randomUUID}=require('node:crypto');
const {canonicalUrl}=require('./intake-policy.cjs'),{loadImageRequirements}=require('./image-requirements.cjs'),{version}=require('./post-review-store.cjs'),{writeAtomic}=require('./atomic-file.cjs');
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>fs.readFile(p,'utf8').then(JSON.parse);
const {readReviewProgress}=require('./image-work-state.cjs');
async function workFingerprint(work,id,sourceFingerprint){
 const revision=[];for(const name of ['manifest.json','작업 정보/image-requirements.json','작업 정보/editorial-plan.json'])revision.push(await fs.readFile(path.join(work,'inputs',id,name)).then(hash).catch(e=>{if(e.code==='ENOENT')return null;throw e;}));
 return hash(JSON.stringify([sourceFingerprint,...revision]));
}
function interestSignals(title,body){
 const text=String(body||''),reasons=[],features={development:0,conflict:0,turn:0,visual:0,noticePenalty:0};
 if(/처음|그날|입사|시작|당시/.test(text))features.development++;
 if(/다음날|다음 날|이후|그 뒤|그러다|며칠|한 달|결국/.test(text))features.development++;
 if(/그런데|알고\s*보니|알고보니|나중에|알게\s*됐|반전|결국/.test(text))features.turn=3;
 if(/싸웠|싸우|갈등|거절|화[를가]|뒷담화|퇴사|헤어|부당|안\s+내|돌려/.test(text))features.conflict=3;
 if(/확인|내밀|보여|열었|찍었|찾았|발견|카드|사진|도시락|상자|문을|손으로/.test(text))features.visual=2;
 if(/유료화|유료\s*전환|구독\s*요금|서비스\s*안내/.test(title+' '+text)&&!features.conflict&&!features.turn)features.noticePenalty=-8;
 if(features.development)reasons.push('원문에 사건의 시작·후속 전개 표시');if(features.conflict)reasons.push('원문에 인물 간 갈등·선택 표시');if(features.turn)reasons.push('원문에 반전·결말 표시');if(features.visual)reasons.push('원문에 구체적 대상·행동 표시');if(features.noticePenalty)reasons.push('단순 유료화·서비스 안내 우선순위 낮춤');
 return {priority:Object.values(features).reduce((a,b)=>a+b,0),features,reasons,evidenceBasis:'local_source_units',analysis:'자동 문자열 신호에 따른 작업 순서 제안. 사용자 점수·사실 검증·흥행 예측이 아님.'};
}
function filterEligible(rows,progress){
 const seen=new Set(progress.filter(p=>p.seenAt).map(p=>p.id)),held=new Set(progress.filter(p=>p.disposition&&!['eligible','restored'].includes(p.disposition)).map(p=>p.id));
 const seenUrls=new Set(),seenContents=new Set();for(const row of rows.filter(r=>seen.has(r.id))){try{const url=canonicalUrl(row.sourceUrl);if(url)seenUrls.add(url);}catch{}if(row.sourceContentHash)seenContents.add(row.sourceContentHash);}
 const ids=new Set(),urls=new Set(),contents=new Set(),eligible=[],excluded=[];
 for(const row of rows){let reason=null,key;
  try{key=canonicalUrl(row.sourceUrl);if(!key)reason='invalid_source_url';}catch{reason='invalid_source_url';}
  if(seen.has(row.id)||seenUrls.has(key)||row.sourceContentHash&&seenContents.has(row.sourceContentHash))reason='already_seen';else if(held.has(row.id))reason='user_hold';else if(row.rightsHold)reason='rights_hold';else if(!row.hasSource)reason='source_missing';else if(ids.has(row.id)||urls.has(key)||row.sourceContentHash&&contents.has(row.sourceContentHash))reason='duplicate';
  if(reason){excluded.push({id:row.id,reason});continue;}ids.add(row.id);urls.add(key);if(row.sourceContentHash)contents.add(row.sourceContentHash);eligible.push({...row,canonicalSourceUrl:key});
 }return {eligible,excluded};
}
async function prepare(config){
 const material=path.resolve(config.materialRoot),work=path.resolve(config.workRoot),repository=path.resolve(config.repositoryRoot);
 if(!['materialRoot','workRoot','repositoryRoot'].every(k=>path.isAbsolute(config[k]||''))||work===material||work.startsWith(material+path.sep))throw Error('별도 작업 루트와 절대 경로 필요');
 await fs.mkdir(path.join(work,'scheduler'),{recursive:true});
 const files={report:path.join(material,'06_자동 제작 결과/status.json'),feedback:path.join(material,'07_사용자 평가/평가 기록.json'),progress:path.join(material,'07_사용자 평가/검토 진행.json')},evidence={};
 const values={};for(const [key,file] of Object.entries(files)){const bytes=await fs.readFile(file);values[key]=JSON.parse(bytes);evidence[key]={file,sha256:hash(bytes)};}
 values.progress=await readReviewProgress(files.progress);evidence.reviewHistory=values.progress.history;evidence.progress=values.progress.currentEvidence;
 const {report,feedback,progress}=values,rows=[];
 if(!Array.isArray(report.entries)||!path.isAbsolute(report.inputFolder||'')||!Array.isArray(feedback.evaluations))throw Error('제작 목록·평가 기록 형식 불일치: 큐 보류');
 for(const row of report.entries.filter(r=>r.outputFolder&&r.images?.length)){
  if(!/^[\w-]{1,80}$/.test(row.id||''))throw Error('잘못된 제작 글 ID: 큐 보류');
  const existingOutput=path.resolve(material,'06_자동 제작 결과',row.outputFolder),input=path.resolve(report.inputFolder,row.relativePath);let plan=null;
  try{plan=await read(path.join(existingOutput,'production-plan.json'));}catch(e){if(e.code!=='ENOENT')throw e;}
  const body=(plan?.sourceUnits||[]).filter(u=>u.kind==='text').map(u=>u.text||'').join('\n'),hasSource=!!plan&&await fs.stat(input).then(s=>s.isDirectory()).catch(()=>false)&&(!!body.trim()||(plan.sourceUnits||[]).some(u=>u.kind==='image'));
  const staged=path.join(work,'inputs',row.id),contractInput=await fs.stat(path.join(staged,'manifest.json')).then(s=>s.isFile()?staged:input).catch(e=>{if(e.code==='ENOENT')return input;throw e;});
  let handoff=null,contractError=null;try{handoff=await loadImageRequirements(contractInput,{postId:row.id,sourceUrl:row.sourceUrl});}catch(e){contractError=e.message;}
  const rating=(feedback.evaluations||[]).filter(e=>e.id===row.id).at(-1),outputVersion=version(row),currentRating=rating?.outputVersion===outputVersion;
  const imagePlanReady=!!handoff&&!handoff.excludeFromRediscovery&&!handoff.held.length&&(handoff.generationRequests.length>0||handoff.requiresCompositionSupport||handoff.selection.choice==='text');
  const revision=await workFingerprint(work,row.id,row.sourceFingerprint);
  rows.push({id:row.id,title:plan?.originalTitle||row.title,sourceUrl:row.sourceUrl,hasSource,sourceContentHash:handoff?.identity?.sourceContentHash||null,sourceFingerprint:row.sourceFingerprint,
   sourceInput:input,existingOutput,stagingInput:staged,workFingerprint:revision,resultsRoot:path.join(work,'results'),
   rightsHold:handoff?.held?.some(i=>i.status==='rights_hold')||false,interest:interestSignals(row.title,body),
   sourceEvidence:plan?{file:path.join(existingOutput,'production-plan.json'),sha256:hash(await fs.readFile(path.join(existingOutput,'production-plan.json'))),excerpts:(plan.sourceUnits||[]).filter(u=>u.kind==='text').slice(0,2).map(u=>({sourceId:u.id,text:u.text.slice(0,180)}))}:null,
   feedbackReference:rating?{id:rating.id,outputVersion:rating.outputVersion,score:rating.score,note:rating.note,currentOutputMatch:currentRating,advisoryOnly:true}:null,
   imagePlanReady,phase:imagePlanReady?'image_plan_ready':'plan_pending',generationReady:imagePlanReady&&!!handoff?.generationRequests.length,
   compositionReady:imagePlanReady&&!!handoff?.requiresCompositionSupport,contractError,publicationAllowed:false});
 }
 const filtered=filterEligible(rows,progress.entries||[]);filtered.eligible.sort((a,b)=>b.interest.priority-a.interest.priority||a.id.localeCompare(b.id));
 const required=['parent_work_complete','documents_integrated','supported_gpt_save_verified','cover_consumer_integrated'],missing=[];
 for(const name of required){const a=config.attestations?.find(a=>a.name===name);if(!a?.file||!a.sha256||await fs.readFile(a.file).then(b=>hash(b)===a.sha256).catch(()=>false)===false)missing.push(name);}
 for(const file of ['docs/COVER_COMPOSITION_2026-10-08.md','desktop/image-production-run.cjs','app/source-batch-image-composition.js'])if(!await fs.stat(path.join(repository,file)).then(s=>s.isFile()).catch(()=>false))missing.push(file);
 const queue={schema:'threads-cover-work-queue-v1',preparedAt:new Date().toISOString(),reviewRound:report.reviewRound,evidence,entries:filtered.eligible,excluded:filtered.excluded,
  feedbackUse:'실제 평가의 출력버전과 메모를 참조. 이전 점수를 새 버전으로 이식하지 않음.',publicationAllowed:false};
 const gate={schema:'threads-cover-ready-gate-v1',ready:missing.length===0,status:missing.length?'waiting_for_parent_integration':'ready_for_single_article_planning',missing,
  planningCount:queue.entries.length,generationReadyCount:queue.entries.filter(e=>e.generationReady).length,compositionReadyCount:queue.entries.filter(e=>e.compositionReady).length,
  generationAllowed:missing.length===0&&queue.entries.some(e=>e.generationReady),evidence,preparedAt:queue.preparedAt,publicationAllowed:false};
 await writeAtomic(path.join(work,'scheduler/eligible.json'),JSON.stringify(queue,null,2)+'\n');await writeAtomic(path.join(work,'scheduler/ready-gate.json'),JSON.stringify(gate,null,2)+'\n');return {queue,gate};
}
async function claim(config){
 const {queue,gate}=await prepare(config),work=path.resolve(config.workRoot);if(!gate.ready)return {state:'waiting_for_ready_gate',gate};
 const lockFile=path.join(work,'scheduler/image-work.lock');let lock;try{lock=await fs.open(lockFile,'wx');}catch(e){if(e.code==='EEXIST')return {state:'skipped_running',lockFile};throw e;}
 try{
  let row=null;for(const candidate of queue.entries){let checkpoint=null;try{checkpoint=await read(path.join(work,'scheduler',candidate.id+'.json'));}catch(e){if(e.code!=='ENOENT')throw e;}
   if(checkpoint&&['complete','held'].includes(checkpoint.state)&&checkpoint.workFingerprint===candidate.workFingerprint)continue;row=candidate;break;}
  if(!row){await lock.close();await fs.rm(lockFile);return {state:'exhausted',stopSchedule:true};}
  const lease={postId:row.id,claimToken:randomUUID(),startedAt:new Date().toISOString(),sourceFingerprint:row.sourceFingerprint,workFingerprint:row.workFingerprint,existingOutput:row.existingOutput,stagingInput:row.stagingInput,sourceUrl:row.sourceUrl,title:row.title,phase:row.phase};await lock.writeFile(JSON.stringify(lease));await lock.close();
  return {state:'claimed',lease,article:row,generationAllowed:row.generationReady,oneArticleOnly:true};
 }catch(e){await lock.close().catch(()=>{});await fs.rm(lockFile,{force:true});throw e;}
}
async function finish(config,result){
 const work=path.resolve(config.workRoot),file=path.join(work,'scheduler/image-work.lock'),lease=await read(file);
 if(result.claimToken!==lease.claimToken||result.postId!==lease.postId||!['complete','held'].includes(result.state))throw Error('단건 완료/실패 기록의 lease·글 ID·상태 불일치');
 if(result.state==='complete'){
  if(!path.isAbsolute(result.productionCheckpoint||''))throw Error('완료 체크포인트 절대 경로 필요');
  const done=await read(result.productionCheckpoint);if(done.postId!==lease.postId||done.state!=='complete'||done.representativeOnly||!done.bodyPngPreserved||done.existingOutput!==lease.existingOutput||done.input!==lease.stagingInput||!path.isAbsolute(done.target||'')||!Array.isArray(done.images)||done.images.length<1||done.images.length!==done.bodyImages+1||done.images[0].file!=='rendered/slide-001.png')throw Error('표지 완료 체크포인트 검증 실패');
  const results=path.join(work,'results');if(!done.target.startsWith(results+path.sep))throw Error('별도 결과 폴더 밖 완료 기록 보류');
  const job=await require('./batch-input.cjs').loadBatchInput(lease.stagingInput,{id:lease.postId,title:lease.title,sourceUrl:lease.sourceUrl,coverOnly:true});
  if(!job||require('./folder-batch.cjs').fingerprintFor(job)!==done.consumedInputFingerprint)throw Error('완료 기록의 소비 입력 fingerprint와 현재 staging 불일치');
  for(const item of [...done.images,{file:'source-bundle.zip',sha256:done.sourceZipSha256},{file:'production-plan.json',sha256:done.planSha256},{file:'review-preview.zip',sha256:done.outputSha256}]){
   if(!/^(?:rendered\/slide-\d{3}\.png|source-bundle\.zip|production-plan\.json|review-preview\.zip)$/.test(item.file)||hash(await fs.readFile(path.join(done.target,item.file)))!==item.sha256)throw Error('표지 결과 파일 hash mismatch');
  }
 }else if(!result.reason)throw Error('실패 보류 사유 필요');
 const checkpoint={...lease,...result,workFingerprint:await workFingerprint(work,lease.postId,lease.sourceFingerprint),completedAt:new Date().toISOString(),publicationAllowed:false};await writeAtomic(path.join(work,'scheduler',lease.postId+'.json'),JSON.stringify(checkpoint,null,2)+'\n');await fs.rm(file);return checkpoint;
}
module.exports={interestSignals,filterEligible,prepare,claim,finish};
