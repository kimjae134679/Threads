'use strict';
const fs=require('node:fs/promises'),native=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {editorRoot}=require('./editor-assets.cjs');
const {sha256,pngSize,assertCoverGeometry}=require('./universal-reproduction.cjs'),{coverHtml}=require('./universal-cover.cjs');
const {squareCoverHtml}=require('./square-cover.cjs');
const repo=path.resolve(__dirname,'..'),json=p=>fs.readFile(p,'utf8').then(JSON.parse),write=async(p,v)=>{await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,JSON.stringify(v,null,2)+'\n');};
function inside(root,relative){if(typeof relative!=='string'||path.isAbsolute(relative))throw Error('원본 상대 경로 오류');const p=path.resolve(root,relative),r=path.relative(root,p);if(!r||r==='..'||r.startsWith('..'+path.sep)||path.isAbsolute(r))throw Error('원본 범위 오류');return p;}
function compactGeometry(g,title,size,requested,variant){
 const box=b=>b&&['x','y','width','height'].every(k=>Number.isFinite(b[k]))&&b.width>0&&b.height>0;
 if(!g||g.title!==title||!Array.isArray(g.lines)||g.lines.some(s=>typeof s!=='string')||g.lines.join('').replace(/\s/gu,'')!==title.replace(/\s/gu,'')||size.width!==1080||g.width!==1080||g.height!==size.height||!['square','4:5'].includes(g.aspectRatio)||requested!=='auto'&&g.aspectRatio!==requested||size.height!==(g.aspectRatio==='square'?1080:1350)||!Number.isFinite(g.size)||g.size<64||!box(g.box)||!Array.isArray(g.glyphBoxes)||!g.glyphBoxes.length||g.glyphBoxes.some(b=>!box(b)||b.x<72||b.x+b.width>1008||b.y<72||b.y+b.height>g.height-72))throw Error('새 표지 제목/규격 안전 영역 오류');
 if((variant==='photo'||g.imageBox)&&(!box(g.imageBox)||g.imageBox.fit!=='contain'||g.imageBox.x<0||g.imageBox.y<0||g.imageBox.x+g.imageBox.width>g.width||g.imageBox.y+g.imageBox.height>g.height))throw Error('사진 전체 보존이 필요합니다.');
}
function assetPngSize(bytes){
 if(bytes.length<24||bytes.length>50*1024*1024||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('AI PNG 자산 형식 오류');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);if(width<1||height<1||width>16384||height>16384)throw Error('AI PNG 자산 크기 오류');return {width,height};
}
async function coverAssetData(plan,source,report,row,zipTools){
 const asset=plan.coverAsset;if(!asset||typeof asset.name!=='string'||path.basename(asset.name)!==asset.name)throw Error('관련 사진 자산을 확인하세요: '+row.id);
 let data;
 if(asset.kind==='original_source'){const archive=await zipTools.read(await fs.readFile(path.join(source,'source-bundle.zip'))),wanted=asset.name.toLowerCase(),matches=[...archive].filter(([name])=>{const base=path.posix.basename(name.replaceAll('\\','/')).toLowerCase();return base===wanted||base.endsWith('-'+wanted);});if(matches.length!==1)throw Error('원문 사진 자산을 하나로 확인할 수 없습니다: '+row.id);data=Buffer.from(matches[0][1]);}
 else{const raw=inside(report.inputFolder,row.relativePath),file=inside(raw,path.join('작업 정보','cover-media',asset.name));await noLinks(file);data=await fs.readFile(file);}
 if(sha256(data)!==asset.sha256)throw Error('사진 자산 해시 불일치: '+row.id);
 const mime={'.png':'image/png','.webp':'image/webp','.gif':'image/gif','.jpg':'image/jpeg','.jpeg':'image/jpeg'}[path.extname(asset.name).toLowerCase()];if(!mime)throw Error('사진 형식 확인이 필요합니다.');
 return 'data:'+mime+';base64,'+data.toString('base64');
}
function overlaps(a,b){const rel=path.relative(path.resolve(a),path.resolve(b));return !rel||rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);}
async function hashFile(file){const hash=require('node:crypto').createHash('sha256');for await(const b of native.createReadStream(file))hash.update(b);return hash.digest('hex');}
async function files(root){const list=[];async function visit(dir,rel=''){for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.isSymbolicLink())throw Error('연결 원본 파일 금지');const name=path.join(rel,e.name);if(e.isDirectory())await visit(path.join(dir,e.name),name);else if(e.isFile())list.push(name);}}await visit(root);return list.sort();}
async function noLinks(file){let p=path.resolve(file);while(path.dirname(p)!==p){try{if((await fs.lstat(p)).isSymbolicLink())throw Error('연결 경로에 출력 금지');}catch(e){if(e.code!=='ENOENT')throw e;}p=path.dirname(p);}}
async function optionalHash(file){try{return await hashFile(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function createZipTools(root){const assets=root?path.join(root,'app'):editorRoot(),context=vm.createContext({window:{},Blob,File,TextEncoder,TextDecoder,Uint8Array,DataView});vm.runInContext(await fs.readFile(path.join(assets,'source-cut-zip.js'),'utf8'),context);context.ThreadsSourceCutZip=context.window.ThreadsSourceCutZip;vm.runInContext(await fs.readFile(path.join(assets,'source-bundle-zip.js'),'utf8'),context);return {zip:async items=>Buffer.from(await context.window.ThreadsSourceCutZip.zip(items).arrayBuffer()),read:async buffer=>context.ThreadsSourceBundleZip.read(new File([buffer],'preview.zip'))};}
async function freezeReflowInputs(config,{onProgress=()=>{}}={}){
 const sourceRoot=path.resolve(config.sourceRoot),sourceOutput=path.join(sourceRoot,'06_자동 제작 결과'),destination=path.resolve(config.destination);
 await noLinks(sourceRoot);await noLinks(destination);
 if(overlaps(sourceRoot,destination)||overlaps(destination,sourceRoot))throw Error('원본 자료 경로에 출력 금지');
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(config.reviewRound))throw Error('새 회차 필요');
 const statusFile=path.join(sourceOutput,'status.json'),statusBytes=await fs.readFile(statusFile),report=JSON.parse(statusBytes),rows=report.entries.filter(r=>r.outputFolder&&r.images?.length),frozen=[];
 if(new Set(rows.map(r=>r.id)).size!==rows.length||rows.some(r=>!['universal_paper','universal_photo'].includes(r.templateId)))throw Error('현재 paper/photo 목록 오류');
 const counts={entries:report.entries.length,posts:rows.length,pages:rows.reduce((n,r)=>n+r.images.length,0),paper:rows.filter(r=>r.templateId==='universal_paper').length,photo:rows.filter(r=>r.templateId==='universal_photo').length,body:rows.reduce((n,r)=>n+r.images.length-1,0)};
 for(const [key,value]of Object.entries(config.expected||{}))if(counts[key]!==value)throw Error('원본 개수 변경: '+key);
 const state={sourceRoot,sourceOutput,destination,reviewRound:config.reviewRound,report,counts,sourceStatusSha256:sha256(statusBytes),feedbackSha256:await optionalHash(path.join(sourceRoot,'07_사용자 평가/평가 기록.json')),workflowSha256:await optionalHash(path.join(sourceRoot,'07_사용자 평가/검토 진행.json')),pointerSha256:await optionalHash(path.join(sourceRoot,'review-current.json')),rows:[],frozenFiles:frozen,recipe:[]};
 const frozenPaths=new Set();const add=async file=>{if(!frozenPaths.has(file)){frozenPaths.add(file);frozen.push({file,sha256:await hashFile(file)});if(frozen.length%250===0)onProgress({phase:'freeze-raw',files:frozen.length});}};
 await add(statusFile);for(const name of ['07_사용자 평가','01_후보 기록']){const folder=path.join(sourceRoot,name);try{for(const name of await files(folder))await add(path.join(folder,name));}catch(e){if(e.code!=='ENOENT')throw e;}}
 for(const name of ['review-current.json','review-delivery-in-progress.json'])if(await optionalHash(path.join(sourceRoot,name))!==null)await add(path.join(sourceRoot,name));
 for(const root of config.rawSourceRoots||[report.inputFolder])if(root){for(const name of await files(root))await add(path.join(root,name));}
 for(const relative of ['desktop/universal-cover.cjs','desktop/universal-cover-canvas.cjs','desktop/typography-cover-canvas.cjs','desktop/square-cover.cjs','desktop/square-cover-canvas.cjs','desktop/universal-reproduction.cjs','desktop/reflow-review-covers-run.cjs','desktop/review-canonical-writer.cjs','app/source-page-plan.js','app/source-cover-typography.js','app/source-cut-zip.js','app/source-bundle-zip.js','app/fonts/CarouselSansKR-Black.woff','app/fonts/OFL.txt','app/fonts/CutGothic-ExtraBold.woff','app/fonts/OFL-NanumGothic.txt'])state.recipe.push({file:path.join(repo,relative),sha256:await hashFile(path.join(repo,relative))});
 state.coverAssets=structuredClone(config.coverAssets||[]);
 if(!Array.isArray(state.coverAssets)||new Set(state.coverAssets.map(a=>a.sourceId)).size!==state.coverAssets.length)throw Error('AI 표지 자산 목록을 확인하세요.');
 for(const asset of state.coverAssets){
  if(!rows.some(r=>r.id===asset.sourceId)||!path.isAbsolute(asset.file||'')||!asset.generatedForThisTask||asset.actualScene!==false||asset.publicationAllowed!==false||typeof asset.prompt!=='string'||!asset.prompt.trim()||!asset.evidence||!asset.sourceUrl||!asset.rightsStatus||!asset.sha256)throw Error('AI 표지 자산 근거를 확인하세요.');
  await noLinks(asset.file);const data=await fs.readFile(asset.file);if(sha256(data)!==asset.sha256)throw Error('AI 표지 자산 해시 오류');const size=assetPngSize(data);if(size.width!==asset.width||size.height!==asset.height)throw Error('AI 표지 자산 크기 오류');state.recipe.push({file:asset.file,sha256:asset.sha256});
 }
 for(let n=0;n<rows.length;n++){const row=rows[n],folder=inside(sourceOutput,row.outputFolder),list=[];for(const name of await files(folder)){const record={name,sha256:await hashFile(path.join(folder,name))};list.push(record);frozen.push({file:path.join(folder,name),sha256:record.sha256});}
  const byName=new Map(list.map(r=>[r.name.replaceAll('\\','/'),r.sha256])),plan=await json(path.join(folder,'production-plan.json'));if(plan.pages.length!==row.images.length||plan.ruleVersion!==row.ruleVersion||config.expectedRuleVersion&&plan.ruleVersion!==config.expectedRuleVersion)throw Error('본문 계획 변경: '+row.id);
  if(byName.get('source-bundle.zip')!==row.sourceZipSha256||byName.get('review-preview.zip')!==row.outputSha256)throw Error('원본 ZIP 해시 오류: '+row.id);
  for(const image of row.images){if(byName.get(image.name.replaceAll('\\','/'))!==image.sha256)throw Error('원본 PNG 해시 오류: '+row.id);pngSize(await fs.readFile(inside(folder,image.name)));}
  state.rows.push({id:row.id,outputFolder:row.outputFolder,files:list,planSha256:byName.get('production-plan.json')});onProgress({phase:'freeze',done:n+1,total:rows.length,id:row.id});
 }
 return state;
}
function userFeedbackFile(state,file){return ['평가 기록.json','검토 진행.json'].some(name=>path.resolve(file)===path.resolve(state.sourceRoot,'07_사용자 평가',name));}
async function validFeedbackAdvance(state,file){
 const {readCanonicalFile}=require('./review-canonical-writer.cjs'),bytes=await readCanonicalFile(state.sourceRoot,file),data=JSON.parse(bytes),ratings=path.basename(file)==='평가 기록.json';
 if(data.schemaVersion!==1||data.recordType!==(ratings?'user_post_quality_feedback':'user_review_workflow')||data.reviewRound!==state.report.reviewRound||!Array.isArray(data[ratings?'evaluations':'entries']))throw Error('사용자 평가 스키마/회차 변경: '+file);
 return sha256(bytes);
}
async function verifyFrozen(state,{onProgress=()=>{},allowUserFeedbackAdvance=false}={}){const advanced=[];for(let n=0;n<state.frozenFiles.length;n++){const f=state.frozenFiles[n],current=await optionalHash(f.file);if(current!==f.sha256){if(allowUserFeedbackAdvance&&userFeedbackFile(state,f.file))advanced.push({file:f.file,before:f.sha256,after:await validFeedbackAdvance(state,f.file)});else throw Error('원본 파일 변경: '+f.file);}if(n%250===0)onProgress({phase:'verify-source',done:n,total:state.frozenFiles.length});}for(const f of state.recipe)if(await optionalHash(f.file)!==f.sha256)throw Error('표지 renderer 변경: '+f.file);return advanced;}
async function verifyHead(state,{allowUserFeedbackAdvance=false}={}){const feedback=path.join(state.sourceRoot,'07_사용자 평가'),status=path.join(state.sourceOutput,'status.json');for(const f of state.frozenFiles)if(f.file===status||path.dirname(f.file)===state.sourceRoot||overlaps(feedback,f.file)){if(await optionalHash(f.file)!==f.sha256){if(allowUserFeedbackAdvance&&userFeedbackFile(state,f.file))await validFeedbackAdvance(state,f.file);else throw Error('원본 검토 상태 변경: '+f.file);}}for(const f of state.recipe)if(await optionalHash(f.file)!==f.sha256)throw Error('표지 renderer 변경: '+f.file);}
async function runCoverReflow(config,{renderCover,zipTools,onProgress=()=>{}}={}){
 if(typeof renderCover!=='function')throw Error('Offline cover renderer required');const state=config.frozen||await freezeReflowInputs(config,{onProgress});
 if(path.resolve(config.sourceRoot)!==state.sourceRoot||path.resolve(config.destination)!==state.destination||config.reviewRound!==state.reviewRound)throw Error('고정 설정 경로 불일치');
 if(JSON.stringify(config.coverAssets||[])!==JSON.stringify(state.coverAssets))throw Error('AI 표지 자산 설정 변경');
 await noLinks(state.destination);await verifyHead(state,config);await fs.mkdir(state.destination,{recursive:true});await fs.writeFile(path.join(state.destination,'cover-refresh-start.json'),JSON.stringify({startedAt:new Date().toISOString(),reviewRound:config.reviewRound,pid:process.pid})+'\n',{flag:'wx'});
 const compact=config.aspectRatio&&config.aspectRatio!=='legacy',typography=config.renderer==='title-typography';if(compact&&!['auto','square','4:5'].includes(config.aspectRatio))throw Error('표지 비율 설정 오류');
 const policyModule={exports:{}};vm.runInNewContext(await fs.readFile(path.join(editorRoot(),'source-page-plan.js'),'utf8'),{module:policyModule});
 const pending=new Set(config.pendingImageIds||[]);if([...pending].some(id=>!state.rows.some(r=>r.id===id)))throw Error('AI 보류 글이 현재 제작 목록에 없음');
 const output=path.join(state.destination,'06_자동 제작 결과'),report=structuredClone(state.report);delete report.reproductionContract;report.intakeContract='verified-intake-v1';report.reviewRound=state.reviewRound;report.deliveryStatus='reflowing';report.wholeCollectionRegenerated=false;const results=[];let paper=0,photo=0,body=0;
 const save=()=>write(path.join(output,'status.json'),report);
 try{
  if(config.qaRoot)await write(path.join(config.qaRoot,'reflow-before-proof.json'),state);await save();zipTools??=await createZipTools();
  for(let n=0;n<state.rows.length;n++){
   const frozen=state.rows[n],row=report.entries.find(r=>r.id===frozen.id),source=inside(state.sourceOutput,row.outputFolder),target=inside(output,row.outputFolder);await fs.mkdir(path.dirname(target),{recursive:true});await fs.cp(source,target,{recursive:true,errorOnExist:true,force:false});
   for(const f of frozen.files)if(await hashFile(inside(target,f.name))!==f.sha256)throw Error('복사 해시 오류: '+row.id+'/'+f.name);
   const oldPlan=await json(path.join(source,'production-plan.json')),isPaper=row.templateId==='universal_paper';
   if(pending.has(row.id)){
    row.status='already_done';row.preservedCurrent=true;row.disposition='held';row.reason='AI 원본 이미지 전달 대기 · 기존 제작물 보존';row.coverRefresh={state:'held',reason:'ai_original_pending'};
   }else if(isPaper||compact){
    const aiAsset=state.coverAssets.find(a=>a.sourceId===row.id),squareComplete=config.renderer==='square-complete'&&!oldPlan.coverAsset;
    const aiBytes=aiAsset?await fs.readFile(aiAsset.file):null;if(aiAsset&&(sha256(aiBytes)!==aiAsset.sha256||(oldPlan.sourceUrl||row.sourceUrl)&&(oldPlan.sourceUrl||row.sourceUrl)!==aiAsset.sourceUrl))throw Error('AI 자산 바이트/원문 연결 변경');
    if(config.renderer==='square-complete'&&config.aspectRatio!=='square')throw Error('완성 표지는 정사각 기본입니다.');
    if(aiAsset&&!squareComplete&&!typography)throw Error('AI 자산은 정사각 완성 표지에만 적용합니다.');
    const variant=compact&&(oldPlan.coverAsset||aiAsset)?'photo':'paper',imageUrl=aiAsset?'data:image/png;base64,'+aiBytes.toString('base64'):variant==='photo'?await coverAssetData(oldPlan,source,report,row,zipTools):null;
    const credit=aiAsset?(typography?'':'AI 연출 이미지'):variant==='photo'?(oldPlan.coverAsset.attribution?[oldPlan.coverAsset.attribution,oldPlan.coverAsset.license].filter(Boolean).join(' · '):'원문 첨부 사진 · 검수용'):'';
    const font=squareComplete||typography?'CutGothic-ExtraBold.woff':'CarouselSansKR-Black.woff';
    if(squareComplete||typography)for(const name of [font,'OFL-NanumGothic.txt']){const original=path.join(repo,'app/fonts',name),copy=path.join(target,'fonts',name),current=await optionalHash(copy),wanted=await hashFile(original);if(current!==null&&current!==wanted)throw Error('기존 폰트 자산은 변경하지 않습니다.');if(current===null)await fs.copyFile(original,copy);}
    const titleInfo=policyModule.exports.titleInfo(oldPlan.originalTitle||row.title),title=typography?titleInfo.displayTitle:oldPlan.coverTitle;
    const priorEmphasis=aiAsset?.emphasis||(typography?'':oldPlan.universalCover?.emphasis)||'',emphasis=typography&&(!title.includes(priorEmphasis)||priorEmphasis.length>24)?'':priorEmphasis;
    const titleStyle=oldPlan.universalCover?.titleStyle||oldPlan.coverTitleStyle||null;
    const coverInput={id:row.id,title,variant,context:compact?'':oldPlan.universalCover?.context||'',emphasis,titleStyle,fontUrl:'fonts/'+font,aspectRatio:config.aspectRatio==='auto'?(title.replace(/\s/gu,'').length>70?'4:5':'square'):(config.aspectRatio||'legacy'),imageUrl,credit,imageKind:aiAsset?'ai-staging':'source',typography},html=squareComplete?squareCoverHtml(coverInput):coverHtml(coverInput);await fs.writeFile(path.join(target,'cover.html'),html);
    const rendered=await renderCover({row,plan:oldPlan,html,file:path.join(target,'cover.html')}),cover=Buffer.from(rendered.data),size=pngSize(cover);
    if(compact)compactGeometry(rendered.geometry,title,size,config.aspectRatio,rendered.geometry.photoFallback?'paper':variant);
    else{assertCoverGeometry(rendered.geometry);if(size.height!==1920||rendered.geometry.box.y>400||rendered.geometry.title!==oldPlan.coverTitle)throw Error('표지 밀도/제목 geometry 오류: '+row.id);}
    if(aiAsset&&!typography&&!rendered.geometry.photoFallback&&rendered.geometry.aiLabel!=='AI 연출 이미지')throw Error('AI 연출 표기가 필요합니다.');
    if(sha256(cover)===row.images[0].sha256)throw Error('표지 재배치가 반영되지 않음: '+row.id);
    await fs.writeFile(inside(target,row.images[0].name),cover);const plan=structuredClone(oldPlan);plan.pages[0]={...plan.pages[0],width:size.width,height:size.height,geometry:rendered.geometry,contentBottom:rendered.geometry.box.y+rendered.geometry.box.height};plan.universalCover={...plan.universalCover,variant,temporary:compact?false:oldPlan.universalCover?.temporary,credit,geometry:rendered.geometry,html:'cover.html',aspectRatio:rendered.geometry.aspectRatio||'legacy'};
    plan.universalCover.renderer=typography?'title-typography':squareComplete?'square-complete':'universal';if(rendered.geometry.photoFallback)plan.universalCover.variant='paper';
    if(typography){plan.coverTitle=title;plan.titleSourceLabels=titleInfo.sourceLabels;plan.universalCover.title=title;plan.universalCover.typography=rendered.geometry.typography;if(titleStyle){plan.coverTitleStyle=titleStyle;plan.universalCover.titleStyle=titleStyle;}plan.coverRefresh={state:'complete',version:'2026-10-09.3',originalTitlePreserved:true};
     const g=rendered.geometry;plan.pages[0].operations=g.lines.map((text,index)=>({kind:'text',role:'title',sourceId:'title',text,x:g.box.x,y:g.box.y+index*g.box.height/g.lines.length,size:g.size,weight:900,runs:g.renderedRuns.filter(r=>r.line===index)}));
     if(g.imageBox)plan.pages[0].operations.unshift({kind:'image',role:'illustration',name:aiAsset?'cover-assets/'+path.basename(aiAsset.file):oldPlan.coverAsset.name,...g.imageBox});
     row.title=oldPlan.originalTitle||row.title;
    }
    if(aiAsset){const name='cover-assets/'+path.basename(aiAsset.file);await fs.mkdir(path.join(target,'cover-assets'),{recursive:true});await fs.writeFile(inside(target,name),aiBytes);plan.universalCover.aiAsset={...aiAsset,file:name};plan.universalCover.aiAssetUsed=!rendered.geometry.photoFallback;}
    if(JSON.stringify(plan.pages.slice(1))!==JSON.stringify(oldPlan.pages.slice(1)))throw Error('본문 계획 변경');await write(path.join(target,'production-plan.json'),plan);
    const archive=await zipTools.read(await fs.readFile(path.join(source,'review-preview.zip'))),manifest=JSON.parse(Buffer.from(archive.get('manifest.json')).toString('utf8'));manifest.productionPlan=plan;archive.set('manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));archive.set(row.images[0].name.replaceAll('\\','/'),cover);archive.set('cover.html',Buffer.from(html));
    if(squareComplete||typography)for(const name of [font,'OFL-NanumGothic.txt'])archive.set('fonts/'+name,await fs.readFile(path.join(target,'fonts',name)));
    if(aiAsset)archive.set(plan.universalCover.aiAsset.file,aiBytes);
    const preview=await zipTools.zip([...archive].map(([name,data])=>({name,data})));await fs.writeFile(path.join(target,'review-preview.zip'),preview);
    row.images[0]={...row.images[0],sha256:sha256(cover),...size};row.outputSha256=sha256(preview);row.sourceFingerprint=sha256(Buffer.from([row.sourceZipSha256,row.ruleVersion,row.images[0].sha256].join(':')));row.status='generated';row.intakeAuditPassed=true;row.reason=(typography?'제목 전체·색·핵심 구절·미세한 크기 위계 개선':compact?'정사각형/4:5 표지 개선':'paper 표지 상단 밀도 수정')+' · 기존 본문/댓글/원문 ZIP 보존';if(typography)row.coverRefresh=plan.coverRefresh;paper++;
   }else{row.status='already_done';row.preservedCurrent=true;photo++;}
   row.reviewRound=state.reviewRound;row.reviewStatus='needs_review';row.publicationAllowed=false;body+=row.images.length-1;
   const allowed=new Set(!pending.has(row.id)&&(isPaper||compact)?['cover.html','production-plan.json','review-preview.zip',row.images[0].name.replaceAll('\\','/')]:[]);
   for(const f of frozen.files)if(!allowed.has(f.name.replaceAll('\\','/'))&&await hashFile(inside(target,f.name))!==f.sha256)throw Error('보존 파일 변경: '+row.id+'/'+f.name);
   if(await hashFile(path.join(target,'source-bundle.zip'))!==row.sourceZipSha256)throw Error('원문 ZIP 변경');results.push({id:row.id,variant:compact?(oldPlan.coverAsset?'photo':'paper'):isPaper?'paper':'photo',pages:row.images.length,oldCoverSha256:state.report.entries.find(r=>r.id===row.id).images[0].sha256,newCoverSha256:row.images[0].sha256,bodyImagesReused:row.images.length-1,geometry:isPaper||compact?(await json(path.join(target,'production-plan.json'))).pages[0].geometry:oldPlan.pages[0].geometry});
   await save();onProgress({phase:'reflow',done:n+1,total:state.rows.length,paper,photo,body,id:row.id});
  }
  const advancedUserFeedback=await verifyFrozen(state,{onProgress,allowUserFeedbackAdvance:config.allowUserFeedbackAdvance===true});
  for(const asset of state.coverAssets){const row=report.entries.find(r=>r.id===asset.sourceId),target=inside(output,row.outputFolder),plan=await json(path.join(target,'production-plan.json')),name=plan.universalCover.aiAsset.file,archive=await zipTools.read(await fs.readFile(path.join(target,'review-preview.zip')));if(await hashFile(inside(target,name))!==asset.sha256||!archive.has(name)||sha256(Buffer.from(archive.get(name)))!==asset.sha256)throw Error('완성 AI 자산/ZIP 해시 오류');}
  for(const frozen of state.rows){const row=report.entries.find(r=>r.id===frozen.id),target=inside(output,row.outputFolder);for(const image of row.images)if(await hashFile(inside(target,image.name))!==image.sha256)throw Error('최종 PNG 해시 오류');if(await hashFile(path.join(target,'source-bundle.zip'))!==row.sourceZipSha256||await hashFile(path.join(target,'review-preview.zip'))!==row.outputSha256)throw Error('최종 ZIP 해시 오류');}
  report.entries.forEach(r=>{r.reviewRound=state.reviewRound;r.publicationAllowed=false;});report.processed=report.entries.length;report.outputs=report.entries.filter(r=>r.outputFolder&&r.images?.length);report.counts=report.entries.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});report.deliveryStatus='complete';report.lastRunAt=new Date().toISOString();await save();
  const proof={reviewRound:state.reviewRound,totalOutputPosts:state.rows.length,coversReflowed:paper,aiPendingIds:[...pending],aiPending:pending.size,failed:0,bodyImagesReused:body,photoCoversReused:photo,oldPngAndZipHashesUnchanged:true,sourceStatusSha256:state.sourceStatusSha256,feedbackSha256:state.feedbackSha256,workflowSha256:state.workflowSha256,pointerSha256:state.pointerSha256,advancedUserFeedback,frozenFileCount:state.frozenFiles.length,recipe:state.recipe,results};
  await write(path.join(state.destination,'cover-refresh-proof.json'),proof);if(config.qaRoot)await write(path.join(config.qaRoot,'reflow-after-proof.json'),proof);
  await write(path.join(state.destination,'intake-complete.json'),{reviewRound:state.reviewRound,completed:true,registeredIds:report.outputs.map(r=>r.id),sourceBytesUnchanged:true,posts:report.outputs.length,pages:report.outputs.reduce((n,r)=>n+r.images.length,0)});return proof;
 }catch(error){report.deliveryStatus='fatal';report.wholeCollectionRegenerated=false;await save().catch(()=>{});await write(path.join(state.destination,'intake-fatal.json'),{reviewRound:state.reviewRound,error:error.message,completed:results.length,at:new Date().toISOString()}).catch(()=>{});throw error;}
}
async function electronCLI(){const {app,BrowserWindow,session}=require('electron');let config;app.disableHardwareAcceleration();app.commandLine.appendSwitch('force-device-scale-factor','1');app.on('window-all-closed',()=>{});try{config=await json(path.resolve(process.argv[2]||''));app.setPath('userData',path.join(config.qaRoot||config.destination,'reflow-renderer-profile'));await app.whenReady();session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>cb({cancel:true}));const win=new BrowserWindow({show:false,width:1080,height:1920,useContentSize:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('file:'))e.preventDefault();});const result=await runCoverReflow(config,{renderCover:async({file})=>{await win.loadFile(file);const cover=await win.webContents.executeJavaScript('window.coverPNG()');return {data:Buffer.from(cover.data.split(',')[1],'base64'),geometry:cover.geometry};},onProgress:v=>console.log(JSON.stringify(v))});console.log(JSON.stringify({complete:true,...result,results:undefined}));win.destroy();app.exit(0);}catch(e){console.error(e.stack);app.exit(1);}}
module.exports={createZipTools,freezeReflowInputs,runCoverReflow,verifyFrozen,coverAssetData};
if(require.main===module||process.versions.electron&&path.resolve(process.argv[1]||'')===__filename)electronCLI();
