import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';import vm from 'node:vm';import fsSync from 'node:fs';
const require=createRequire(import.meta.url),{coverHtml}=require('../desktop/universal-cover.cjs'),policy=(()=>{const module={exports:{}};vm.runInNewContext(fsSync.readFileSync(new URL('../app/source-page-plan.js',import.meta.url),'utf8'),{module});return module.exports;})(),{createPostReviewStore,version}=require('../desktop/post-review-store.cjs');
const input=html=>JSON.parse(html.match(/window\.coverInput=(.*?);window\.coverResourcesReady/s)[1]);
test('source and category prefixes are removed without altering normal 판 or caption brackets',()=>{
 for(const [original,clean] of [['(블라인드) 혼테크는 이렇게 하는거임','혼테크는 이렇게 하는거임'],['[네이트판] 사돈어른 조문 며칠을 가있어야 하나요?','사돈어른 조문 며칠을 가있어야 하나요?'],['[판][추가 후기] + [후기] 결혼 안하고 외국간 친구','결혼 안하고 외국간 친구'],['(장문) 야간 편돌이 담배 도둑맞은 썰','야간 편돌이 담배 도둑맞은 썰'],['[초스압] 4개월 다니고 퇴사한 썰','4개월 다니고 퇴사한 썰'],['판을 뒤집은 친구 이야기','판을 뒤집은 친구 이야기'],['[ 깨끗한 제목 ]','[ 깨끗한 제목 ]'],['[네이트판] 판을 깨고 (블라인드 채용) 지원했다','판을 깨고 (블라인드 채용) 지원했다']]){
  const info=policy.titleInfo(original);assert.equal(info.originalTitle,original);assert.equal(info.displayTitle,clean);
 }
});
test('common cover input separates immutable source title and recomputes decorated emphasis',()=>{
 const original='[네이트판] 취집한 친구 너무 얄밉네요...',data=input(coverHtml({id:'fixture',title:original,typography:true,aspectRatio:'square',titleStyle:{emphasis:'네이트판',sizeEmphasis:'네이트판',sizeScale:1.03,accent:'#f2e34c'}}));
 assert.equal(data.originalTitle,original);assert.equal(data.title,'취집한 친구 너무 얄밉네요...');assert(data.title.includes(data.titleStyle.emphasis));assert(!data.titleStyle.emphasis.includes('네이트판'));assert.equal(data.captionInputTitle,data.title);assert.equal(data.titleStyle.sizeScale,1.03);
});
test('review list shows the clean title while identity version and original title stay exact',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'threads-title-prefix-'));try{
  const folder=path.join(root,'06_자동 제작 결과/현재 결과/fixture');await fs.mkdir(folder,{recursive:true});const row={id:'fixture',title:'[판] 새언니가 자꾸 웁니다',outputFolder:'현재 결과/fixture',images:[{name:'rendered/slide-001.png',sha256:'a'.repeat(64)}],sourceFingerprint:'source',outputSha256:'output',ruleVersion:'rule'};
  await fs.writeFile(path.join(root,'06_자동 제작 결과/status.json'),JSON.stringify({entries:[row]}));await fs.writeFile(path.join(folder,'production-plan.json'),JSON.stringify({originalTitle:row.title,coverTitle:row.title}));const item=(await createPostReviewStore(root,{readOnly:true,requireUserImages:false}).list()).entries[0];assert.equal(item.title,'새언니가 자꾸 웁니다');assert.equal(item.coverTitle,item.title);assert.equal(item.originalTitle,row.title);assert.equal(item.id,row.id);assert.equal(item.outputVersion,version(row));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('packaged common renderer includes the production title dependency',()=>{
 const pkg=JSON.parse(fsSync.readFileSync(new URL('../desktop/package.json',import.meta.url),'utf8'));assert(pkg.build.files.includes('production-title.cjs'));
});

test('prepared exact and stored-media inputs establish display title before planning and preserve source facts',()=>{
 const sandbox={};vm.runInNewContext(fsSync.readFileSync(new URL('../app/source-page-plan.js',import.meta.url),'utf8'),sandbox);vm.runInNewContext(fsSync.readFileSync(new URL('../app/source-curation.js',import.meta.url),'utf8'),sandbox);const C=sandbox.ThreadsSourceCuration,title='[판] 판을 바꾼 친구 (후기)',url='https://example.com/original',body='본문  \n\n[IMAGE:a.png]\n끝';
 const plan=C.exactDraft({title,sourceUrl:url,body,comments:[]});assert.equal(plan.originalTitle,title);assert.equal(plan.displayTitle,'판을 바꾼 친구 (후기)');assert.equal(plan.coverTitle,plan.displayTitle);assert.equal(plan.captionInputTitle,plan.displayTitle);assert.equal(plan.sourceUrl,url);assert.equal(plan.segments.map(s=>s.kind==='text'?s.text:'[IMAGE:'+s.mediaName+']\n').join(''),body);C.suggest(plan,['a.png']);assert.equal(plan.coverTitle,plan.displayTitle);
 const media=C.savedMediaDraft({title,sourceUrl:url,mediaNames:['a.png']});assert.equal(media.originalTitle,title);assert.equal(media.displayTitle,plan.displayTitle);assert.equal(media.sourceUrl,url);
});
test('batch input parses source title before caching while raw bytes and URL stay exact',async()=>{
 const {loadBatchInput}=require('../desktop/batch-input.cjs'),root=await fs.mkdtemp(path.join(os.tmpdir(),'threads-title-input-'));try{const source={schema:'threads-verbatim-source-v1',verbatim:true,title:'(블라인드) 판을 바꿔 (후기)',body:'원문 본문  \n\n다음 문단',sourceUrl:'https://example.com/raw'};const raw=JSON.stringify(source);await fs.writeFile(path.join(root,'source.json'),raw);const job=await loadBatchInput(root,{id:'fixture',title:'다른 요약 제목'});assert.equal(job.originalTitle,source.title);assert.equal(job.title,source.title);assert.equal(job.displayTitle,'판을 바꿔 (후기)');assert.equal(job.captionInputTitle,job.displayTitle);assert.equal(job.sourceText,raw);assert.equal(job.sourceUrl,source.sourceUrl);}finally{await fs.rm(root,{recursive:true,force:true});}
});

test('stale prepared title input holds instead of silently exposing another display title',()=>{const {validatePreparedTitle}=require('../desktop/production-title.cjs'),originalTitle='[판] 판을 바꾼 친구',sourceUrl='https://example.com/raw',record={schema:'threads-title-input-v1',originalTitle,displayTitle:'판을 바꾼 친구',captionInputTitle:'판을 바꾼 친구',sourceUrl};assert.equal(validatePreparedTitle(record,originalTitle,sourceUrl),record);assert.throws(()=>validatePreparedTitle({...record,displayTitle:originalTitle},originalTitle,sourceUrl),/보류/);assert.throws(()=>validatePreparedTitle(record,originalTitle,'https://example.com/other'),/보류/);});
