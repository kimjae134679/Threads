import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const load=()=>import('../scripts/unified-migration.mjs');
test('saved HTML remains a typed original document after canonical migration and import, never a verbatim summary',async()=>{
 const f=await fixture();try{
  const {createHash}=await import('node:crypto'),{createRequire}=await import('node:module'),require=createRequire(import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
  const {planMigration,refreshGeneratedMigration,applyMigration}=await load(),folder=path.join(f.source,'case'),raw=Buffer.from('\ufeff<html><title>[후기] 원제</title><body>원 HTML\r\n<img src="media/01.png"></body></html>'),image=Buffer.from('original image'),manifest={schema:'threads-program-input-v1',id:'existing-html',title:'[후기] 원제',sourceUrl:'https://example.invalid/Zz?bn=15',sourceReview:{verbatimBodyAvailable:false},publicationAllowed:false},acquisition={htmlSha256:hash(raw),contentType:'text/html; charset=utf-8',checkedAt:'old-clock',media:[{file:'media/01.png',sha256:hash(image)}]};
  await fs.mkdir(path.join(folder,'source/media'),{recursive:true});await fs.writeFile(path.join(f.source,'index.json'),JSON.stringify({schema:'threads-program-input-index-v1',records:[{id:manifest.id,folder:'case',title:manifest.title,sourceUrl:manifest.sourceUrl}]}));
  for(const [name,bytes]of Object.entries({'manifest.json':JSON.stringify(manifest),'content.txt':'[BODY_SEQUENCE]\n요약일 뿐','source/source.html':raw,'source/acquisition.json':JSON.stringify(acquisition),'source/media/01.png':image}))await fs.writeFile(path.join(folder,name),bytes);
  const {loadBatchInput}=require('../desktop/batch-input.cjs'),before=await loadBatchInput(folder,manifest),plan=await planMigration({projectRoot:f.projectRoot,scopes:[{id:'original',sourceRoot:f.source,destinationRoot:'local-private/inputs',classification:'private',transform:'copy'},{id:'canonical',sourceRoot:f.source,destinationRoot:'local-private/inputs',classification:'private',transform:'program-txt'}]});
  // Older plans did not record HTML as a generated dependency: recover only from immutable copy pins.
  plan.files.find(f=>f.type==='program-txt').inputFiles=plan.files.find(f=>f.type==='program-txt').inputFiles.filter(f=>!f.relative.startsWith('source/'));const copyPins=structuredClone(plan.files.filter(f=>f.type==='copy'));
  const next=await refreshGeneratedMigration(plan,{previousManifestSha256:'a'.repeat(64)});assert.deepEqual(next.files.filter(f=>f.type==='copy'),copyPins);await applyMigration(next);
  const dest=path.join(f.projectRoot,'local-private/inputs/case'),data=globalThis.ThreadsUnifiedMaterialTxt.parse(await fs.readFile(path.join(dest,'자료.txt'))),after=await loadBatchInput(dest,manifest);
  assert.equal(data.human.bodyKind,'preserved');assert.equal(data.records.source,null);assert.equal(data.records.sourceDocument.sha256,hash(raw));assert.deepEqual(data.records.manifest,manifest);
  for(const key of ['sourceName','sourceText','sourceData','sourceMime','inputKind','sourceUrl','sourceCheckedAt','files'])assert.deepEqual(after[key],before[key],key);
  const {renderingJob}=require('../desktop/image-requirements.cjs');assert.deepEqual(renderingJob(after),renderingJob(before),'canonical metadata must not alter original production fingerprint');
  const verified=await globalThis.ThreadsUnifiedMaterialTxt.documentBytes(data);assert.deepEqual(Buffer.from(verified),raw);
  const imported=path.join(f.root,'imported'),{importSavedSource}=require('../desktop/source-import.cjs');const row=await importSavedSource({file:path.join(dest,'자료.txt'),root:imported,parseHtml:async html=>{assert.equal(html,before.sourceText);return{originalTitle:manifest.title,sourceUrl:manifest.sourceUrl,segments:[{kind:'image',mediaName:'01.png'}]};}});const index=JSON.parse(await fs.readFile(path.join(imported,'index.json'))),job=await loadBatchInput(path.join(imported,index.records[0].folder),index.records[0]);assert.equal(row.id,manifest.id);assert.equal(job.sourceData,before.sourceData);assert.deepEqual(job.files,before.files);
  data.records.sourceDocument.data='Y2hhbmdlZA==';await fs.writeFile(path.join(dest,'자료.txt'),globalThis.ThreadsUnifiedMaterialTxt.serialize(data));await assert.rejects(loadBatchInput(dest,manifest),/unified_material_document/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
async function fixture(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'unified-migrate-'));const source=path.join(root,'original'),projectRoot=path.join(root,'project');await fs.mkdir(source);await fs.mkdir(projectRoot);return{root,source,projectRoot};}
test('read-only migration plan preserves originals, skips identical precopies and rejects changed source CAS',async()=>{
 const f=await fixture();try{const {planMigration,applyMigration,verifyMigration}=await load();
  await fs.writeFile(path.join(f.source,'state.json'),JSON.stringify({revision:168,posts:[{id:'old',final_review:{decision:'passed'}}],unknown:{provider:'paused'}}));
  await fs.writeFile(path.join(f.source,'본문.txt'),'원문  그대로\r\n끝');await fs.writeFile(path.join(f.source,'OFL.txt'),'원래 라이선스');await fs.writeFile(path.join(f.source,'server.pid'),'123');
  const config={projectRoot:f.projectRoot,scopes:[{id:'operating',sourceRoot:f.source,destinationRoot:'local-private/operating-studio',classification:'private',transform:'copy'}]};
  const before=await fs.readFile(path.join(f.source,'state.json')),plan=await planMigration(config);
  assert.equal(plan.files.length,3);assert.equal(plan.excluded.length,1);assert.equal((await fs.readdir(f.projectRoot)).length,0);
  await applyMigration(plan);assert.deepEqual(await fs.readFile(path.join(f.projectRoot,'local-private/operating-studio/state.json')),before);assert.deepEqual(await fs.readFile(path.join(f.source,'state.json')),before);
  assert.equal((await applyMigration(plan)).copied,0);assert.equal((await verifyMigration(plan)).verified,3);
  await fs.writeFile(path.join(f.source,'state.json'),'changed');await assert.rejects(applyMigration(plan),/migration_source_changed/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('manual body/caption/tag split is consolidated from existing copy pins without approval transfer',async()=>{
 const f=await fixture();try{const {planMigration,refreshGeneratedMigration,applyMigration}=await load(),{createHash}=await import('node:crypto'),hash=b=>createHash('sha256').update(b).digest('hex'),body='[ 표시 제목 ]\r\n\r\n원래 문안  ',tags='#원래 #태그',full=body+'\r\n\r\n'+tags,image=Buffer.from('original fixture image'),binding={postId:'existing-post',outputVersion:'existing-version',fingerprint:'existing-fingerprint',images:[{order:1,file:'01.png',sha256:hash(image)}]};
  for(const [name,data]of Object.entries({'본문.txt':body,'전체문안.txt':full,'해시태그.txt':tags,'승인본 확인.json':JSON.stringify(binding),'01.png':image}))await fs.writeFile(path.join(f.source,name),data);
  const plan=await planMigration({projectRoot:f.projectRoot,scopes:[{id:'project',sourceRoot:f.source,destinationRoot:'local-private/project/수동 업로드/모의자료',classification:'private',transform:'copy'}]}),before=structuredClone(plan.files),next=await refreshGeneratedMigration(plan,{previousManifestSha256:'a'.repeat(64)});assert.deepEqual(next.files.filter(f=>f.type==='copy'),before);assert.equal(next.counts.types['manual-txt'],1);await applyMigration(next);const data=globalThis.ThreadsUnifiedMaterialTxt.parse(await fs.readFile(path.join(f.projectRoot,'local-private/project/수동 업로드/모의자료/자료.txt')));assert.equal(data.human.title,'표시 제목');assert.equal(data.human.body,'');assert.equal(data.human.bodyKind,'unavailable');assert.equal(data.records.legacyFiles['본문.txt'].text,body);assert.equal(data.human.platformCaptions.instagram,full);assert.equal(data.human.platformCaptions.threads,undefined);assert.deepEqual(data.records.approvedBinding,binding);assert.equal(data.records.publicationAuthorized,false);assert.equal(data.records.legacyFiles['해시태그.txt'].text,tags);
  assert.equal(globalThis.ThreadsUnifiedMaterialTxt.existingId(data),binding.postId);assert.throws(()=>globalThis.ThreadsUnifiedMaterialTxt.verbatimSource(data),/not_verbatim/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('bounded verification completes every item and waits for active readers before reporting failure',async()=>{
 const {forEachBounded}=await load();let active=0,max=0,completed=[];
 await forEachBounded(Array.from({length:19},(_,i)=>i),async i=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));completed.push(i);active--;});assert.equal(completed.length,19);assert.ok(max>1&&max<=4);assert.equal(active,0);
 await assert.rejects(forEachBounded(Array.from({length:19},(_,i)=>i),async i=>{active++;try{await new Promise(r=>setTimeout(r,2));if(i===0)throw Error('exact_hash_mismatch');}finally{active--;}}),/exact_hash_mismatch/);assert.equal(active,0);
});
test('generated-only refresh retains every copy pin and rejects changed generated source or guard',async()=>{
 const f=await fixture();try{
  const {planMigration,refreshGeneratedMigration}=await load(),copy=path.join(f.root,'copy');await fs.mkdir(copy);await fs.writeFile(path.join(copy,'immutable.bin'),'copy original');const name='261010_C1_A0_P0_refresh.md';await fs.writeFile(path.join(f.source,name),'# 표시\n\n## 글 내용\n결말.');const guard=path.join(copy,'state.json');await fs.writeFile(guard,'{"revision":168}');
  const plan=await planMigration({projectRoot:f.projectRoot,guards:[{file:guard,revision:168}],scopes:[{id:'copy',sourceRoot:copy,destinationRoot:'local-private/copy',classification:'private',transform:'copy'},{id:'candidate',sourceRoot:f.source,destinationRoot:'data/candidates',classification:'public',transform:'candidate-md'}]}),before=structuredClone(plan);plan.files.find(f=>f.type==='candidate-md').targetSha256='0'.repeat(64);
  const refreshed=await refreshGeneratedMigration(plan,{previousManifestSha256:'a'.repeat(64)});assert.deepEqual(refreshed.files.filter(f=>f.type==='copy'),before.files.filter(f=>f.type==='copy'));assert.equal(refreshed.files.find(f=>f.type==='candidate-md').targetSha256,before.files.find(f=>f.type==='candidate-md').targetSha256);assert.deepEqual(refreshed.counts,before.counts);assert.deepEqual(refreshed.pathMappings,before.pathMappings);assert.equal(refreshed.generatedRefresh.previousManifestSha256,'a'.repeat(64));
  await fs.writeFile(path.join(f.source,name),'changed');await assert.rejects(refreshGeneratedMigration(plan,{previousManifestSha256:'a'.repeat(64)}),/migration_source_changed/);await fs.writeFile(guard,'{"revision":169}');await assert.rejects(refreshGeneratedMigration(plan,{previousManifestSha256:'a'.repeat(64)}),/migration_source_changed|migration_revision_mismatch/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('BOM parsing and display cleaning never replace raw candidate source title or Markdown',async()=>{
 const f=await fixture();try{const {planMigration,applyMigration}=await load(),name='추가수집261010_C1_A0_P0_BOM.md',md='\ufeff# [네이트판] [ 실제 제목 ]\r\n\r\n## 글 내용\r\n실제 결말.\r\n';await fs.writeFile(path.join(f.source,name),md);const plan=await planMigration({projectRoot:f.projectRoot,scopes:[{id:'candidate',sourceRoot:f.source,destinationRoot:'data/candidates',classification:'public',transform:'candidate-md'}]});await applyMigration(plan);const data=globalThis.ThreadsUnifiedMaterialTxt.parse(await fs.readFile(path.join(f.projectRoot,'data/candidates',name.replace(/\.md$/,'.txt'))));assert.equal(data.human.title,'실제 제목');assert.equal(data.records.candidate.originalTitle,'[네이트판] [ 실제 제목 ]');assert.equal(data.records.candidate.originalMarkdown,md);assert.equal(data.records.candidate.originalKey,name);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('canonical candidate conversion keeps raw Markdown, existing filename ID and caption tags together',async()=>{
 const f=await fixture();try{const {planMigration,applyMigration}=await load();
  const name='261010_C1_A0_P0_case.md',md='# 표시 제목\r\n\r\n## 글 내용\r\n확인된 사건 요약.\r\n\r\n## 정확한 링크\r\nhttps://www.82cook.com/entiz/read.php?bn=15&num=1\r\n\r\n## 게시 설명글 초안\r\n표시 제목\r\n\r\n첫 문단.\r\n\r\n둘째 문단.\r\n\r\n결말.\r\n\r\n#썰 #사연 #가족 #일상\r\n\r\n- 문안 길이: 00\r\n';
  await fs.writeFile(path.join(f.source,name),md);
  const plan=await planMigration({projectRoot:f.projectRoot,scopes:[{id:'candidates',sourceRoot:f.source,destinationRoot:'data/candidates/collection',classification:'public',transform:'candidate-md'}]});
  assert.equal(plan.counts.types['candidate-md'],1);await applyMigration(plan);
  await import('../app/unified-material-txt.js');const data=globalThis.ThreadsUnifiedMaterialTxt.parse(await fs.readFile(path.join(f.projectRoot,'data/candidates/collection',name.replace(/\.md$/,'.txt'))));
  assert.equal(data.visibility,'public');assert.equal(data.human.title,'표시 제목');assert.equal(data.human.bodyKind,'summary');assert.equal(data.records.candidate.originalMarkdown,md);assert.equal(data.records.candidate.originalKey,name);assert.match(data.human.platformCaptions.instagram,/#썰 #사연 #가족 #일상/);assert.equal(data.records.candidate.publicationAllowed,false);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('migration rejects destination conflict, escape, unapproved revision and symlinked roots',async()=>{
 const f=await fixture();try{const {planMigration,applyMigration}=await load();await fs.writeFile(path.join(f.source,'state.json'),'{}');
  const config={projectRoot:f.projectRoot,scopes:[{id:'copy',sourceRoot:f.source,destinationRoot:'local-private/copy',classification:'private',transform:'copy'}]};
  const plan=await planMigration(config);await fs.mkdir(path.join(f.projectRoot,'local-private/copy'),{recursive:true});await fs.writeFile(path.join(f.projectRoot,'local-private/copy/state.json'),'other');await assert.rejects(applyMigration(plan),/migration_destination_conflict/);
  await assert.rejects(planMigration({...config,scopes:[{...config.scopes[0],destinationRoot:'../escape'}]}),/migration_destination_escape/);
  await assert.rejects(planMigration({...config,guards:[{file:path.join(f.source,'state.json'),revision:168}]}),/migration_revision_mismatch/);
  await fs.symlink(f.source,path.join(f.root,'link'),'junction');await assert.rejects(planMigration({...config,scopes:[{...config.scopes[0],sourceRoot:path.join(f.root,'link')}]}),/migration_symlink/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});


test('1084-style split reference notes become one TXT without inventing verbatim or granting approvals',async()=>{
 const f=await fixture();try{const {planMigration,applyMigration}=await load();
  const folder=path.join(f.source,'blind','old-id');await fs.mkdir(path.join(folder,'참고 기록'),{recursive:true});
  const manifest={schema:'threads-program-input-v1',id:'source-existing',title:'[후기] 원제',sourceUrl:'https://example.invalid/Zz',sourceReview:{verbatimBodyAvailable:false},unknown:{round:'old',providerState:'paused'}};
  await fs.writeFile(path.join(f.source,'index.json'),JSON.stringify({schema:'threads-program-input-index-v1',records:[{id:manifest.id,folder:'blind/old-id'}]}));
  await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest));await fs.writeFile(path.join(folder,'참고 기록/content.txt'),'전문 아님\r\n원래 참고 기록');await fs.writeFile(path.join(folder,'참고 기록/comments.txt'),'검증 전 댓글');await fs.writeFile(path.join(folder,'자료 안내.txt'),'원래 안내');
  const plan=await planMigration({projectRoot:f.projectRoot,scopes:[{id:'runtime-canonical',sourceRoot:f.source,destinationRoot:'local-private/program-inputs',classification:'private',transform:'program-txt'}]});
  assert.equal(plan.counts.types['program-txt'],1);await applyMigration(plan);await import('../app/unified-material-txt.js');const data=globalThis.ThreadsUnifiedMaterialTxt.parse(await fs.readFile(path.join(f.projectRoot,'local-private/program-inputs/blind/old-id/자료.txt')));
  assert.equal(data.human.title,'원제');assert.equal(data.human.bodyKind,'preserved');assert.deepEqual(data.records.manifest,manifest);assert.equal(data.records.legacyFiles['참고 기록/comments.txt'].text,'검증 전 댓글');assert.throws(()=>globalThis.ThreadsUnifiedMaterialTxt.verbatimSource(data),/not_verbatim/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});

test('HTML canonical human body displays the actual selected story while raw document and notes stay unchanged',async()=>{
 const f=await fixture();try{
  const {planMigration,applyMigration}=await load(),folder=path.join(f.source,'case'),raw=Buffer.from('<html><meta property="og:title" content="원제"><nav>껍데기</nav><div class="articleContent"><p>실제 시작과 행동</p><img src="media/1.jpg"><p>실제 끝 결말</p><div class="comment">댓글 제외</div></div></html>'),manifest={schema:'threads-program-input-v1',id:'html-id',title:'원제',sourceUrl:'https://example.invalid/HTML',sourceReview:{verbatimBodyAvailable:false},publicationAllowed:false};
  await fs.mkdir(path.join(folder,'source'),{recursive:true});await fs.writeFile(path.join(f.source,'index.json'),JSON.stringify({schema:'threads-program-input-index-v1',records:[{id:manifest.id,folder:'case'}]}));await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest));await fs.writeFile(path.join(folder,'content.txt'),'[BODY_SEQUENCE]\n참고 노트');await fs.writeFile(path.join(folder,'source/source.html'),raw);
  const plan=await planMigration({projectRoot:f.projectRoot,scopes:[{id:'canonical',sourceRoot:f.source,destinationRoot:'local-private/input',classification:'private',transform:'program-txt'}]});await applyMigration(plan);const data=globalThis.ThreadsUnifiedMaterialTxt.parse(await fs.readFile(path.join(f.projectRoot,'local-private/input/case/자료.txt')));assert.match(data.human.body,/실제 시작과 행동/);assert.match(data.human.body,/실제 끝 결말/);assert.doesNotMatch(data.human.body,/참고 노트|껍데기|댓글 제외/);assert.equal(data.human.bodyKind,'preserved');assert.deepEqual(Buffer.from(data.records.sourceDocument.data,'base64'),raw);assert.equal(data.records.legacyFiles['content.txt'].text,'[BODY_SEQUENCE]\n참고 노트');assert.deepEqual(data.records.manifest,manifest);assert.equal(data.records.source,null);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('refresh copy source lookup is linear and preserves first exact normalized-path match, without case folding',async()=>{
 const {copySourceLookup}=await load(),first={type:'copy',sourceFile:path.resolve('fixture/./source.html'),sourceSha256:'first'},second={type:'copy',sourceFile:path.resolve('fixture/source.html'),sourceSha256:'second'},upper={type:'copy',sourceFile:path.resolve('fixture/SOURCE.html'),sourceSha256:'upper'};
 const rows=[{type:'candidate-md',sourceFile:first.sourceFile},first,second,upper,...Array.from({length:20000},(_,i)=>({type:'copy',sourceFile:path.resolve('fixture/'+i)}))],lookup=copySourceLookup(rows);assert.equal(lookup.get(path.resolve('fixture/source.html')),first);assert.equal(lookup.get(path.resolve('fixture/SOURCE.html')),upper);assert.equal(lookup.size,20002);assert.deepEqual(rows[1],first);
});
test('migration workers default to four and explicit 1..16 bounds never skip or duplicate work',async()=>{
 const {migrationWorkers,forEachBounded}=await load();assert.equal(migrationWorkers({}),4);
 for(const value of ['1','4','16'])assert.equal(migrationWorkers({THREADS_MIGRATION_WORKERS:value}),Number(value));
 for(const value of ['0','17','NaN','-1','1.5','','Infinity',' 16','01'])assert.throws(()=>migrationWorkers({THREADS_MIGRATION_WORKERS:value}),/migration_workers_invalid/);
 const previous=process.env.THREADS_MIGRATION_WORKERS;try{
  for(const limit of [4,16]){if(limit===4)delete process.env.THREADS_MIGRATION_WORKERS;else process.env.THREADS_MIGRATION_WORKERS='16';let active=0,peak=0;const seen=[];await forEachBounded(Array.from({length:32},(_,i)=>i),async(item,index)=>{active++;peak=Math.max(peak,active);assert.equal(item,index);await new Promise(r=>setTimeout(r,5));seen.push(item);active--;});assert.equal(peak,limit);assert.deepEqual(seen.sort((a,b)=>a-b),Array.from({length:32},(_,i)=>i));}
 }finally{if(previous===undefined)delete process.env.THREADS_MIGRATION_WORKERS;else process.env.THREADS_MIGRATION_WORKERS=previous;}
});
