import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);let P={};try{P=require('../desktop/intake-pipeline.cjs');}catch{}
assert.equal(typeof P.runIntakePipeline,'function','one-shot pipeline must connect input, checkpoint and review registration');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'threads-intake-test-')),input=path.join(root,'input'),work=path.join(root,'work'),materialRoot=path.join(root,'review');
const source=(id,body,rights='user_owned')=>({schema:'threads-verbatim-source-v1',verbatim:true,title:'입력 '+id,body,comments:[],sourceUrl:'https://example.com/'+id,intake:{schema:'threads-offline-intake-v1',id,provenance:{kind:'user_provided',reference:'단위 테스트 fixture'},rights:{status:rights,evidence:'fixture'},safety:{status:'reviewable',reviewedBy:'fixture'},bodyStatus:'complete',commentsStatus:'none',media:[]}});
async function put(folder,data){await fs.mkdir(path.join(input,folder),{recursive:true});await fs.writeFile(path.join(input,folder,'source.json'),JSON.stringify(data));}
try{
 const a=source('a','원문 A'),b=source('b','원문 B');await put('a',a);await put('b',b);await put('duplicate',{...a,intake:{...a.intake,id:'duplicate'}});await put('research',source('research','권리 미확인','unknown'));await put('missing',source('missing',''));
 let calls=0;const render=async(job)=>{calls++;throw Error('본문 무결성 검증 실패');};
 const first=await P.runIntakePipeline({input,work,materialRoot,render,activate:false});
 assert.equal(calls,2);assert.equal(first.registered,false);assert.equal(first.counts.duplicate,1);assert.equal(first.counts.research,1);assert.equal(first.counts.held,3);assert.equal(first.posts,0);
 assert.equal(await fs.readFile(path.join(input,'a/source.json'),'utf8'),JSON.stringify(a));
 const checkpoint=JSON.parse(await fs.readFile(path.join(work,'checkpoint.json'),'utf8'));assert.equal(checkpoint.complete,true);assert(checkpoint.entries.every(e=>!e.outputFolder));
 await fs.writeFile(path.join(work,'intake.lock'),JSON.stringify({pid:process.pid}));await assert.rejects(P.runIntakePipeline({input,work,materialRoot,render}),/실행 중/);await fs.rm(path.join(work,'intake.lock'));
 await fs.mkdir(materialRoot,{recursive:true});await fs.writeFile(path.join(materialRoot,'intake.lock'),JSON.stringify({pid:process.pid}));await assert.rejects(P.runIntakePipeline({input,work,materialRoot,render}),/실행 중/);await fs.rm(path.join(materialRoot,'intake.lock'));
 await assert.rejects(P.runIntakePipeline({input,work,materialRoot,retryHeld:true,render:async()=>{throw Object.assign(Error('EIO disk error'),{code:'EIO'});}}),/EIO/);
 await fs.mkdir(path.join(materialRoot,'06_자동 제작 결과'),{recursive:true});await fs.mkdir(path.join(materialRoot,'07_사용자 평가'),{recursive:true});
 const prior={schema:'threads-auto-batch-v1',inputFolder:input,entries:[{id:'a',sourceUrl:a.sourceUrl,outputFolder:'existing-a',images:[{name:'rendered/slide-001.png'}]},{id:'old-b',outputFolder:'existing-b',images:[{name:'rendered/slide-001.png'}]}]};
 await fs.writeFile(path.join(materialRoot,'06_자동 제작 결과/status.json'),JSON.stringify(prior));const ratings='{"evaluations":[{"id":"a","score":8}]}';await fs.writeFile(path.join(materialRoot,'07_사용자 평가/평가 기록.json'),ratings);
 const merged=await P.runIntakePipeline({input,work,materialRoot,render,activate:true});assert.equal(merged.posts,2,'failed replacement retains existing active output');assert.equal(merged.registered,false,'no successful new output must not reset ratings');assert.equal(await fs.readFile(path.join(materialRoot,'07_사용자 평가/평가 기록.json'),'utf8'),ratings);
 await fs.rm(path.join(input,'b'),{recursive:true});await fs.rm(path.join(input,'research'),{recursive:true});await fs.rm(path.join(input,'missing'),{recursive:true});const same=await P.runIntakePipeline({input,work,materialRoot,render});assert.equal(same.counts.duplicate,1);assert.equal(same.counts.held,1,'same URL copies dedupe before remapped ID conflict');
 console.log('Intake dedupe, unknown-rights research, missing-source/render-error holds and concurrent lock: PASS');
}finally{await fs.rm(root,{recursive:true,force:true});}

import test from 'node:test';
test('existing duplicate triage cannot hijack an updated source identity', async () => {
 const fixture = await fs.mkdtemp(path.join(os.tmpdir(),'threads-intake-identity-'));
 const inbox=path.join(fixture,'input'),work=path.join(fixture,'work'),material=path.join(fixture,'review');
 try {
  await fs.mkdir(path.join(inbox,'a'),{recursive:true});
  await fs.mkdir(path.join(inbox,'missing'),{recursive:true});
  const changed=source('a','Updated complete body.');
  await fs.writeFile(path.join(inbox,'a/source.json'),JSON.stringify(changed));
  await fs.writeFile(path.join(inbox,'missing/source.json'),JSON.stringify(source('missing','')));
  const old={inputFolder:inbox,entries:[{id:'a',title:'Prior output',sourceUrl:changed.sourceUrl,outputFolder:'prior-a',images:[{name:'rendered/slide-001.png'}]}, {id:'duplicate-prior',sourceUrl:changed.sourceUrl+'?utm_source=copy',status:'duplicate',disposition:'duplicate',duplicateOf:'a',sourceContentHash:'old-content'}, {id:'missing',status:'needs_source',disposition:'held',reasonCode:'source_insufficient'}]};
  await fs.mkdir(path.join(material,'06_자동 제작 결과'),{recursive:true});
  const priorPng=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(priorPng);priorPng.writeUInt32BE(1080,16);priorPng.writeUInt32BE(1920,20);
  const priorZip=Buffer.from('prior result'),priorSource=Buffer.from('prior source'),sha=require('../desktop/intake-policy.cjs').sha256;
  Object.assign(old.entries[0],{status:'generated',ruleVersion:'prior',sourceZipSha256:sha(priorSource),outputSha256:sha(priorZip),images:[{name:'rendered/slide-001.png',sha256:sha(priorPng)}]});
  const priorFolder=path.join(material,'06_자동 제작 결과/prior-a');await fs.mkdir(path.join(priorFolder,'rendered'),{recursive:true});
  await fs.writeFile(path.join(priorFolder,'source-bundle.zip'),priorSource);await fs.writeFile(path.join(priorFolder,'review-preview.zip'),priorZip);await fs.writeFile(path.join(priorFolder,'rendered/slide-001.png'),priorPng);await fs.writeFile(path.join(priorFolder,'production-plan.json'),JSON.stringify({ruleVersion:'prior',pages:[{role:'cover'}]}));
  for(const entry of old.entries)entry.title ||= entry.id;
  await fs.writeFile(path.join(material,'06_자동 제작 결과/status.json'),JSON.stringify(old));
  const png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1080,16);png.writeUInt32BE(1920,20);
  const render=async job=>{const original=JSON.parse(job.sourceText),unit={id:'s0',kind:'text',text:original.body};return {title:original.title,intakeAudit:{rawBodyAndCommentsExact:true},zip:Buffer.from('result'),sourceZip:Buffer.from('source'),images:[{name:'rendered/slide-001.png',data:png},{name:'rendered/slide-002.png',data:png}],productionPlan:{coverTitle:original.title,ruleVersion:'identity-fixture',safeMargin:70,sourceUnits:[unit],selectedComments:[],pages:[{number:1,role:'cover',width:1080,height:1920,operations:[]},{number:2,role:'body',width:1080,height:1920,operations:[{kind:'text',role:'body',sourceId:'s0',text:original.body,x:70,y:70,size:52,lineHeight:78}]}]}};};
  const result=await P.runIntakePipeline({input:inbox,work,materialRoot:material,render});
  const checkpoint=JSON.parse(await fs.readFile(path.join(work,'checkpoint.json'),'utf8'));
  assert.equal(checkpoint.entries.find(e=>e.providedId==='a').id,'a','canonical output identity must win over later duplicate triage');
  const report=JSON.parse(await fs.readFile(path.join(result.reviewSource,'06_자동 제작 결과/status.json'),'utf8'));
  assert.equal(report.entries.filter(e=>e.id==='missing').length,1,'new held triage must replace prior held triage of same ID');
  assert.deepEqual(report.entries.filter(e=>e.outputFolder).map(e=>e.id),['a']);
  assert(!report.entries.find(e=>e.id==='duplicate-prior').outputFolder,'synthetic duplicate remains triage only');
  const store=require('../desktop/post-review-store.cjs').createPostReviewStore(result.reviewSource,{readOnly:true});
  const list=await store.list();assert.equal(list.entries.find(e=>e.id==='duplicate-prior').hasOutput,false);assert.equal(list.entries.find(e=>e.id==='missing').hasOutput,false);
  assert.equal((await store.random({})).id,'a','only the actual updated source output may enter random review');
 } finally {
  assert(path.resolve(fixture).startsWith(path.resolve(os.tmpdir())+path.sep));
  assert(path.basename(fixture).startsWith('threads-intake-identity-'));
  await fs.rm(fixture,{recursive:true,force:true});
 }
});
