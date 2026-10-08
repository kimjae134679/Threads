import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const stamp = '2026-10-08T12:00:00Z';
function fixture() {
  const quote = '담당자와 신입사원이 카드 사용 용도를 확인했다.';
  const r = { schema: 'threads-image-requirements-v1', postId: 'TEST_ONLY', sourceUrl: 'https://example.com/source',
    identity:{sourceId:'TEST_ONLY',canonicalSourceUrl:'https://example.com/source',sourceContentHash:null,sourceFingerprint:null,
      seenBefore:{status:'unknown',checkedAt:null,reference:null,sha256:null,matchedOutputVersions:[]}},
    selection:{priority:['source_image','external_image','ai_illustration','text'],choice:'ai_illustration',reason:'TEST_ONLY missing original',originalDecision:'missing',externalDecision:'missing',fallback:'text'},
    status: 'generation_needed', read: {status:'body_read',readAt:stamp,reference:'body.txt',sha256:hash(quote),excerpts:[{id:'s1',locator:'paragraph 1',text:quote}]},
    shortage:{insufficient:true,reason:'TEST_ONLY illustration needed; original absent',originals:[]},
    clearance:{status:'cleared_for_illustration',evidence:'TEST_ONLY owned source',reviewedBy:'TEST_ONLY reviewer'},
    productionLink:{postId:'TEST_ONLY',productionVersion:'TEST_ONLY-v1'},items:[{id:'cover',status:'generation_needed',holdReasons:[],
    placement:{position:'cover',afterSourceId:null,order:0,purpose:'context_illustration'},
    scene:{setting:'일반 사무실',action:'카드 사용 용도를 확인하는 대화',peopleCount:2,evidenceIds:['s1'],reviewedBy:'TEST_ONLY reviewer',visualDesign:{style:'illustration',framing:'close',palette:['navy','cobalt'],expression:'restrained'}},
    mustNotInvent:['새 사건','새 숫자','댓글','반응','실제 인물 외모'],
    composition:{aspectRatio:'4:5',crop:'contain',subjectRegion:'center_lower',safeArea:{top:0.25,right:0.05,bottom:0.1,left:0.05}},
    prompt:null,asset:null}]};
  return r;
}
const api = () => require('../desktop/image-requirements.cjs');
function withPrompt() { const r=fixture();r.items[0].prompt=api().compilePrompt(r.items[0]);return r; }
test('legacy input without the optional image contract stays unchanged', async () => {
  const { validateImageRequirements } = require('../desktop/image-requirements.cjs');
  assert.deepEqual(validateImageRequirements(undefined), []);
});
test('unread source cannot ship a final prompt even when falsely marked cleared', () => {
  const r=withPrompt();r.read.status='metadata_only';r.read.readAt=null;r.read.reference=null;r.read.sha256=null;r.read.excerpts=[];
  assert.ok(api().validateImageRequirements(r).some(e=>e.includes('body_read')));
});
test('unknown commercial rights are a valid hold but never a generation job', async () => {
  const r=withPrompt();r.status=r.items[0].status='rights_hold';r.clearance={status:'unknown',evidence:null,reviewedBy:null};r.items[0].holdReasons=['source permission unconfirmed'];
  assert.deepEqual(api().validateImageRequirements(r),[]);
  const handoff=await api().buildImageHandoff(r);
  assert.equal(handoff.generationRequests.length,0);assert.equal(handoff.held.length,1);
  r.status=r.items[0].status='generation_needed';assert.ok(api().validateImageRequirements(r).length);
});
test('not-needed item never creates a prompt or forced job', async () => {
  const r=fixture();r.status='not_needed';r.shortage.insufficient=false;r.items=[];r.selection.choice='text';
  const h=await api().buildImageHandoff(r);assert.equal(h.generationRequests.length,0);assert.equal(h.compositionAssets.length,0);
  r.items=[fixture().items[0]];assert.ok(api().validateImageRequirements(r).length);
});
test('cover preference cannot bypass a usable original or external image', () => {
  const r=withPrompt();r.selection.originalDecision='usable';assert.ok(api().validateImageRequirements(r).length);
  r.selection.originalDecision='missing';r.selection.externalDecision='usable';assert.ok(api().validateImageRequirements(r).length);
});
test('usable original/external choice needs a selected file and actual commercial-rights proof', async t => {
  const r=fixture();r.status='not_needed';r.items=[];r.shortage.insufficient=false;r.selection.originalDecision='usable';r.selection.choice='source_image';
  assert.ok(api().validateImageRequirements(r).some(e=>e.includes('selectedAsset')));
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'threads-images-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  await fs.writeFile(path.join(dir,'body.txt'),r.read.excerpts[0].text);
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aIZkAAAAASUVORK5CYII=','base64');await fs.writeFile(path.join(dir,'photo.png'),bytes);
  r.selection.selectedAsset={kind:'source_image',file:'photo.png',sha256:hash(bytes),sourceUrl:r.sourceUrl,relevance:'TEST_ONLY owned photo',rightsStatus:'user_owned',rightsEvidence:'TEST_ONLY owned photo'};
  assert.deepEqual(api().validateImageRequirements(r),[]);
  const handoff=await api().buildImageHandoff(r,{root:dir});assert.equal(handoff.selectedCoverAsset.sha256,hash(bytes));assert.equal(handoff.requiresCompositionSupport,true);
  await fs.writeFile(path.join(dir,'photo.png'),'changed');await assert.rejects(api().buildImageHandoff(r,{root:dir}),/selectedAsset: file hash/);
  r.selection.selectedAsset.rightsEvidence='';assert.ok(api().validateImageRequirements(r).length);
});
test('seen source suppresses rediscovery across production versions using real progress evidence', async t => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'threads-images-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const r=withPrompt();await fs.writeFile(path.join(dir,'body.txt'),r.read.excerpts[0].text);
  const progress=JSON.stringify({entries:[{id:r.postId,outputVersion:'older-version',seenAt:stamp}]});await fs.writeFile(path.join(dir,'progress.json'),progress);
  r.identity.seenBefore={status:'seen',checkedAt:stamp,reference:'progress.json',sha256:hash(progress),matchedOutputVersions:['older-version']};
  const h=await api().buildImageHandoff(r,{root:dir});assert.equal(h.generationRequests.length,0);assert.equal(h.excludeFromRediscovery,true);
  r.identity.seenBefore.status='unseen';await assert.rejects(api().buildImageHandoff(r,{root:dir}),/seen/);
});
test('source-grounded job verifies bytes and keeps title/internal provenance requirements', async t => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'threads-images-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const r=withPrompt();await fs.writeFile(path.join(dir,'body.txt'),r.read.excerpts[0].text);
  const h=await api().buildImageHandoff(r,{root:dir});assert.equal(h.generationRequests.length,1);
  assert.equal(h.generationRequests[0].provenance.displayText,false);assert.equal(h.generationRequests[0].titleBy,'program');
  assert.ok(!h.generationRequests[0].prompt.text.includes('표시는 프로그램이'));
  assert.equal(h.generationRequests[0].tool.model,null);
  await fs.writeFile(path.join(dir,'body.txt'),'changed');await assert.rejects(api().buildImageHandoff(r,{root:dir}),/hash/);
});
test('tampered prompt, missing grounding, duplicate placement and invented model are rejected', () => {
  const r=withPrompt();r.items[0].prompt.text+=' invented crowd reactions';assert.ok(api().validateImageRequirements(r).length);
  const s=withPrompt();s.items[0].scene.evidenceIds=['missing'];assert.ok(api().validateImageRequirements(s).length);
  const d=withPrompt();d.items.push(structuredClone(d.items[0]));assert.ok(api().validateImageRequirements(d).length);
});
test('ready asset needs real file/hash/prompt binding and preserves internal AI record without pixel label', async t => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'threads-images-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const r=withPrompt(),i=r.items[0];await fs.writeFile(path.join(dir,'body.txt'),r.read.excerpts[0].text);
  // Actual tiny PNG, TEST_ONLY; no generator is called.
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aIZkAAAAASUVORK5CYII=','base64');
  await fs.writeFile(path.join(dir,'test.png'),bytes);r.status=i.status='ready';
  i.asset={file:'test.png',sha256:hash(bytes),promptSha256:hash(i.prompt.text),promptVersion:i.prompt.version,postId:r.postId,productionVersion:r.productionLink.productionVersion,
    generatedAt:stamp,tool:{name:'TEST_ONLY fixture',model:null,modelEvidence:null},rights:{status:'user_owned',evidence:'TEST_ONLY fixture'},reviewedBy:'TEST_ONLY reviewer'};
  const h=await api().buildImageHandoff(r,{root:dir});assert.deepEqual(h.compositionAssets[0].overlays,[]);assert.equal(h.compositionAssets[0].provenance.persistInManifest,true);assert.equal(h.requiresCompositionSupport,true);
  i.asset.tool.model='guessed-model';assert.ok(api().validateImageRequirements(r).length);i.asset.tool.model=null;
  i.asset.file='../outside.png';assert.ok(api().validateImageRequirements(r).length);
});
test('reviewed existing receipt keeps unknown generation fields and seen-source QA cannot dispatch generation',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'threads-receipt-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const r=withPrompt(),i=r.items[0],bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aIZkAAAAASUVORK5CYII=','base64');
 await fs.writeFile(path.join(dir,'body.txt'),r.read.excerpts[0].text);await fs.writeFile(path.join(dir,'raw.png'),bytes);await fs.writeFile(path.join(dir,'receipt.json'),'{}');
 const receipt={schema:'threads-generation-receipt-v1',sourcePostId:r.postId,productionVersion:null,applicationStatus:'not_applied',disposition:'review_required',recordedAt:stamp,generatedAt:null,tool:{name:'TEST_ONLY existing generator',model:null,modelEvidence:null},recordFile:{reference:'receipt.json',sha256:hash('{}')},originalFile:{reference:'raw.png',sha256:hash(bytes),textFree:true},prompt:{version:null,text:'exact previous prompt',sha256:hash('exact previous prompt')}};
 r.generationReceipts=[receipt];r.status=i.status='ready';i.asset={file:'raw.png',sha256:hash(bytes),receiptOriginalSha256:hash(bytes),promptSha256:receipt.prompt.sha256,promptVersion:null,postId:r.postId,productionVersion:r.productionLink.productionVersion,generatedAt:null,tool:receipt.tool,rights:{status:'user_owned',evidence:'TEST_ONLY owned pixels'},reviewedBy:'TEST_ONLY explicit adoption review'};
 const progress=JSON.stringify({entries:[{id:r.postId,outputVersion:'old',seenAt:stamp}]});await fs.writeFile(path.join(dir,'progress.json'),progress);r.identity.seenBefore={status:'seen',checkedAt:stamp,reference:'progress.json',sha256:hash(progress),matchedOutputVersions:['old']};
 assert.deepEqual(api().validateImageRequirements(r),[]);
 assert.equal((await api().buildImageHandoff(r,{root:dir})).compositionAssets.length,0);
 const qa=await api().buildImageHandoff(r,{root:dir,representativeOnly:true});assert.equal(qa.compositionAssets.length,1);assert.equal(qa.excludeFromRediscovery,true);assert.equal(qa.compositionAssets[0].asset.generatedAt,null);
 i.asset.promptSha256=hash(i.prompt.text);assert(api().validateImageRequirements(r).some(e=>e.includes('receipt')));i.asset.promptSha256=receipt.prompt.sha256;
 i.asset=null;r.status=i.status='generation_needed';assert.equal((await api().buildImageHandoff(r,{root:dir,representativeOnly:true})).generationRequests.length,0);
});
test('legacy loader preserves base source and rejects pending imagery before cache lookup', async t => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'threads-images-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const r=withPrompt();await fs.writeFile(path.join(dir,'body.txt'),r.read.excerpts[0].text);
  await fs.writeFile(path.join(dir,'source.json'),JSON.stringify({schema:'threads-verbatim-source-v1',verbatim:true,title:'TEST_ONLY',body:r.read.excerpts[0].text,sourceUrl:r.sourceUrl}));
  const legacy={schema:'threads-program-input-v1',id:r.postId,sourceUrl:r.sourceUrl,sourceReview:{publicationAllowed:false},media:[]};
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(legacy));
  const {loadBatchInput}=require('../desktop/batch-input.cjs');const before=await loadBatchInput(dir,{id:r.postId,sourceUrl:r.sourceUrl});
  assert.equal(before.coverRecipeVersion,undefined);
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({...legacy,imageRequirements:r}));
  await assert.rejects(loadBatchInput(dir,{id:r.postId,sourceUrl:r.sourceUrl}),/image generation consumer/);
  r.status=r.items[0].status='rights_hold';r.items[0].holdReasons=['TEST_ONLY permission pending'];r.clearance={status:'unknown',evidence:null,reviewedBy:null};
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({...legacy,imageRequirements:r}));const after=await loadBatchInput(dir,{id:r.postId,sourceUrl:r.sourceUrl});
  assert.equal(after.sourceText,before.sourceText);assert.deepEqual(after.files,before.files);assert.equal(after.imageHandoff.generationRequests.length,0);assert.equal(after.imageHandoff.held.length,1);
  await assert.rejects(loadBatchInput(dir,{id:'different',sourceUrl:r.sourceUrl}),/postId/);
});
test('passive image metadata and embedded contract do not change legacy production fingerprint', () => {
  const {fingerprintFor}=require('../desktop/folder-batch.cjs');assert.equal(typeof fingerprintFor,'function');
  for(const text of ['{"schema":"threads-program-input-v1","id":"TEST_ONLY"}\r\n','{\n  "schema": "threads-program-input-v1",\n  "id": "TEST_ONLY"\n}\n']){
    const base={sourceName:'manifest.json',sourceText:text,files:[]};
    const expected=hash('folder-recipe-2026-10-07.5|'+JSON.stringify(base));assert.equal(fingerprintFor(base),expected);
    const extra={...base,imageHandoff:{held:[],identity:{seenBefore:{checkedAt:stamp}}}};assert.equal(fingerprintFor(extra),expected);
    extra.sourceText=text.replace(/(\s*)}(\s*)$/,',"imageRequirements":{"schema":"metadata","nested":{"quoted":"comma, brace}"}}$1}$2');
    assert.equal(fingerprintFor(extra),expected);
  }
});
test('unconsumed generation requests are stopped before opening the renderer', async () => {
  const {renderBatchInput}=require('../desktop/batch-render.cjs');let opened=0;
  await assert.rejects(renderBatchInput({imageHandoff:{generationRequests:[{itemId:'pending'}]}},{getWindow:async()=>{opened++;return {};}}),/image generation consumer/);
  assert.equal(opened,0);
});
test('three actual input examples validate and cannot dispatch held/unnecessary/repeated images', async () => {
  for(const [name,state] of [['new-employee','rights_hold'],['reply-word','not_needed'],['company-feelings','source_hold']]){
    const root=path.resolve('docs/examples/image-requirements',name);
    const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
    assert.equal(manifest.imageRequirements.status,state);assert.equal(manifest.sourceReview.publicationAllowed,false);
    // External task-10 files are checked by the local CLI, not required by portable repo tests.
    assert.deepEqual(api().validateImageRequirements(manifest.imageRequirements),[]);
    const receipts=manifest.imageRequirements.generationReceipts||[];
    const h=await api().buildImageHandoff({...manifest.imageRequirements,generationReceipts:[]},{root,identity:{postId:manifest.id,sourceUrl:manifest.sourceUrl}});
    assert.equal(h.generationRequests.length,0);assert.equal(h.compositionAssets.length,0);
    if(name==='new-employee'){assert.equal(h.excludeFromRediscovery,true);assert.equal(receipts.length,2);assert.equal(receipts[0].tool.model,null);assert.equal(receipts[0].applicationStatus,'not_applied');}
    if(name==='company-feelings')assert.equal(manifest.imageRequirements.items.length,0);
  }
});
test('external generation receipt preserves unknown prompt/model versions and is never promoted to ready', async t => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'threads-images-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const r=fixture();r.status='not_needed';r.items=[];r.shortage.insufficient=false;r.selection.choice='text';
  await fs.writeFile(path.join(dir,'body.txt'),r.read.excerpts[0].text);await fs.writeFile(path.join(dir,'receipt.json'),'{}');await fs.writeFile(path.join(dir,'original.png'),'TEST_ONLY bytes');
  r.generationReceipts=[{schema:'threads-generation-receipt-v1',sourcePostId:r.postId,productionVersion:null,applicationStatus:'not_applied',disposition:'review_required',recordedAt:stamp,generatedAt:null,
    tool:{name:'TEST_ONLY existing generator',model:null,modelEvidence:null},recordFile:{reference:'receipt.json',sha256:hash('{}')},originalFile:{reference:'original.png',sha256:hash('TEST_ONLY bytes'),textFree:true},prompt:{version:null,text:'exact prior prompt',sha256:hash('exact prior prompt')}}];
  const h=await api().buildImageHandoff(r,{root:dir});assert.equal(h.generationReceipts.length,1);assert.equal(h.compositionAssets.length,0);assert.equal(h.generationRequests.length,0);
  r.generationReceipts[0].tool.model='guessed';assert.ok(api().validateImageRequirements(r).length);r.generationReceipts[0].tool.model=null;
  await fs.writeFile(path.join(dir,'original.png'),'changed');await assert.rejects(api().buildImageHandoff(r,{root:dir}),/generationReceipt: file hash/);
});
