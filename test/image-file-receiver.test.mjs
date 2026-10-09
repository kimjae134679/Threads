import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {receiveImage,inspectPng,verifyComposition}=require('../desktop/image-file-receiver.cjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
function crc(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let j=0;j<8;j++)n=n&1?(n>>>1)^0xedb88320:n>>>1;}return(n^0xffffffff)>>>0;}
function chunk(name,data){const type=Buffer.from(name),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);type.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([type,data])),out.length-4);return out;}
function png(width=2,height=2,pixel=0){const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;const pixels=Buffer.alloc(height*(width*4+1),pixel);for(let row=0;row<height;row++)pixels[row*(width*4+1)]=0;return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);}
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'threads-receive-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const bytes=png(),file=path.join(dir,'incoming.png');await fs.writeFile(file,bytes);return{dir,bytes,file,request:{schema:'threads-image-file-receive-v1',postId:'source-test',requestId:'generation-1',storageRoot:path.join(dir,'received'),source:{path:file,sha256:sha(bytes),sizeBytes:bytes.length,width:2,height:2,transport:{kind:'supported_local_file',reference:'fixture-existing-file'}},generation:{promptSha256:sha('fixture prompt'),tool:{name:'fixture-only',model:null,modelEvidence:null},generatedAt:null}}};}
test('supported file is saved byte for byte and receipt stays pending review',async t=>{
 const f=await fixture(t),r=await receiveImage(f.request);
 assert.equal(r.state,'received');assert.equal(r.compositionAllowed,false);assert.equal(r.publicationAllowed,false);
 assert.deepEqual(await fs.readFile(r.originalFile),f.bytes);assert.deepEqual(await fs.readFile(f.file),f.bytes);
 const receipt=JSON.parse(await fs.readFile(r.receiptFile,'utf8'));
 assert.equal(receipt.source.sha256,f.request.source.sha256);assert.equal(receipt.generation.tool.model,null);
 assert.equal(receipt.reviewStatus,'pending_asset_and_layout_review');
 assert.equal((await fs.readdir(path.join(f.request.storageRoot,'.receiver-locks'))).length,0);
});
test('unchanged request is idempotent while conflicting request ID preserves original receipt',async t=>{
 const f=await fixture(t),first=await receiveImage(f.request),before=await fs.readFile(first.receiptFile);
 const next=await receiveImage(f.request);assert.equal(next.state,'already_received');assert.deepEqual(await fs.readFile(first.receiptFile),before);
 const changed=structuredClone(f.request);changed.generation.promptSha256=sha('another prompt');
 const conflict=await receiveImage(changed);assert.equal(conflict.state,'held');assert.match(conflict.reason,/request_conflict/);
 assert.deepEqual(await fs.readFile(first.receiptFile),before);
});
test('missing path, data URL transport and path traversal never create a generated asset',async t=>{
 const f=await fixture(t);
 for(const change of [
  r=>r.source.path='data:image/png;base64,not-accepted',
  r=>r.source.contentBase64='not-accepted',
  r=>r.source.transport.kind='data_url',
  r=>r.postId='../escape',
  r=>r.requestId='../escape'
 ]){const r=structuredClone(f.request);change(r);await assert.rejects(receiveImage(r),/path|field|transport|identity/);}
 const absent=structuredClone(f.request);absent.source.path=path.join(f.dir,'not-arrived.png');
 const result=await receiveImage(absent);assert.equal(result.state,'held');assert.match(result.reason,/source_unavailable/);
 assert.equal(result.regenerationRequested,false);
});
test('size, digest, actual dimensions, invalid PNG and CRC corruption hold without altering source',async t=>{
 const f=await fixture(t);
 for(const [field,value] of [['sizeBytes',f.bytes.length+1],['sha256','a'.repeat(64)],['width',3]]){
  const request=structuredClone(f.request);request.requestId='mismatch-'+field;request.source[field]=value;
  const r=await receiveImage(request);assert.equal(r.state,'held');assert.match(r.reason,/size|hash|dimension/);
 }
 const broken=Buffer.from(f.bytes);broken[45]^=1;await fs.writeFile(f.file,broken);
 const r=structuredClone(f.request);r.source.sha256=sha(broken);r.requestId='broken';
 assert.equal((await receiveImage(r)).state,'held');assert.deepEqual(await fs.readFile(f.file),broken);
 assert.throws(()=>inspectPng(Buffer.from('not a png')),/PNG/);
});
test('oversized original is rejected before it is copied',async t=>{
 const f=await fixture(t);await fs.truncate(f.file,12*1024*1024+1);f.request.source.sizeBytes=12*1024*1024+1;
 await assert.rejects(receiveImage(f.request),/size/);
});
test('source and destination links are rejected',async t=>{
 const f=await fixture(t),linked=path.join(f.dir,'linked');
 await fs.symlink(path.dirname(f.file),linked,process.platform==='win32'?'junction':'dir');
 const request=structuredClone(f.request);request.source.path=path.join(linked,'incoming.png');
 assert.equal((await receiveImage(request)).state,'held');
 request.source.path=f.file;request.storageRoot=path.join(linked,'destination');
 await assert.rejects(receiveImage(request),/link/);
});
test('copy finished before receipt failure resumes without overwriting the original',async t=>{
 const f=await fixture(t),r=await receiveImage(f.request,{afterSave:async()=>{throw Error('injected receipt failure');}});
 assert.equal(r.state,'held');const original=path.join(f.request.storageRoot,f.request.postId,f.request.requestId,'original.png');
 assert.deepEqual(await fs.readFile(original),f.bytes);
 await fs.rm(f.file);
 const resumed=await receiveImage(f.request);assert.equal(resumed.state,'received');assert.deepEqual(await fs.readFile(resumed.originalFile),f.bytes);
});
test('concurrent receiver skips and stale lock is never automatically stolen',async t=>{
 const f=await fixture(t);let release,entered;const ready=new Promise(r=>entered=r),paused=new Promise(r=>release=r);
 const first=receiveImage(f.request,{afterSave:async()=>{entered();await paused;}});await ready;
 const second=await receiveImage(f.request);assert.equal(second.state,'skipped_running');release();assert.equal((await first).state,'received');
 const lock=path.join(f.request.storageRoot,'.receiver-locks',f.request.postId+'--'+f.request.requestId+'.lock');
 await fs.writeFile(lock,JSON.stringify({pid:999999,requestId:f.request.requestId}));
 assert.equal((await receiveImage(f.request)).state,'skipped_running');assert.equal(await fs.readFile(lock,'utf8'),JSON.stringify({pid:999999,requestId:f.request.requestId}));
});
test('tampered stored original holds instead of accepting receipt or replacing evidence',async t=>{
 const f=await fixture(t),r=await receiveImage(f.request);await fs.writeFile(r.originalFile,'damaged');
 const held=await receiveImage(f.request);assert.equal(held.state,'held');assert.match(held.reason,/stored_original/);
 assert.equal(await fs.readFile(r.originalFile,'utf8'),'damaged');
});
test('a composition callback is never reached without validated ready contract binding',async t=>{
 const f=await fixture(t);f.request.compose={requestFile:path.join(f.dir,'production.json'),executable:path.join(f.dir,'composer.exe'),executableSha256:sha('fixture-exe')};
 await fs.writeFile(f.request.compose.executable,'fixture-exe');
 await fs.writeFile(f.request.compose.requestFile,JSON.stringify({schema:'threads-image-production-request-v1',postId:'unrelated',input:f.dir,work:path.join(f.dir,'work')}));
 let invoked=0;const r=await receiveImage(f.request,{launch:async()=>{invoked++;return 0;}});
 assert.equal(r.state,'held');assert.match(r.reason,/postId/);assert.equal(invoked,0);
});
test('receipt metadata tampering is detected even when its cached fingerprint is retained',async t=>{
 const f=await fixture(t),r=await receiveImage(f.request),receipt=JSON.parse(await fs.readFile(r.receiptFile,'utf8'));
 receipt.generation.tool.name='fabricated-tool';await fs.writeFile(r.receiptFile,JSON.stringify(receipt));
 const next=await receiveImage(f.request);assert.equal(next.state,'held');assert.match(next.reason,/receipt/);
 assert.equal(JSON.parse(await fs.readFile(r.receiptFile,'utf8')).generation.tool.name,'fabricated-tool');
});
test('device names and network paths are rejected before a receiver folder is made',async t=>{
 const f=await fixture(t);
 for(const id of ['CON','NUL','COM1','LPT9']){const r=structuredClone(f.request);r.requestId=id;await assert.rejects(receiveImage(r),/identity/);}
 const r=structuredClone(f.request);r.source.path=String.raw`\\\\server\\share\\image.png`;await assert.rejects(receiveImage(r),/path/);
});
test('restart after receipt saved but checkpoint interrupted repairs only the checkpoint',async t=>{
 const f=await fixture(t),r=await receiveImage(f.request),receiptBefore=await fs.readFile(r.receiptFile);
 const checkpoint=JSON.parse(await fs.readFile(r.checkpoint,'utf8'));checkpoint.state='receiving';await fs.writeFile(r.checkpoint,JSON.stringify(checkpoint));
 await fs.rm(f.file);const resumed=await receiveImage(f.request);assert.equal(resumed.state,'already_received');
 assert.deepEqual(await fs.readFile(r.receiptFile),receiptBefore);
 assert.equal(JSON.parse(await fs.readFile(r.checkpoint,'utf8')).state,'received');
});
async function compositionFixture(t){
 const f=await fixture(t),title='Full original title',fingerprint='a'.repeat(64);
 const production={postId:f.request.postId,title,input:path.join(f.dir,'input'),existingOutput:path.join(f.dir,'previous'),work:path.join(f.dir,'work'),output:path.join(f.dir,'outputs'),representativeOnly:true};
 const target=path.join(production.output,production.postId,fingerprint),checkpoint=path.join(f.dir,'production-checkpoint.json'),cover=png(1080,1080),body=png(1080,2);
 await fs.mkdir(path.join(target,'rendered'),{recursive:true});await fs.mkdir(path.join(production.existingOutput,'rendered'),{recursive:true});
 const sourceZip=Buffer.from('source zip fixture'),preview=Buffer.from('preview fixture');
 await fs.writeFile(path.join(target,'source-bundle.zip'),sourceZip);await fs.writeFile(path.join(production.existingOutput,'source-bundle.zip'),sourceZip);await fs.writeFile(path.join(target,'review-preview.zip'),preview);
 await fs.writeFile(path.join(target,'rendered','slide-001.png'),cover);await fs.writeFile(path.join(target,'rendered','slide-002.png'),body);await fs.writeFile(path.join(production.existingOutput,'rendered','slide-002.png'),body);
 const pages=[{number:1,role:'cover',width:1080,height:1080,operations:[{kind:'text',role:'title',text:title}],geometry:{title,lines:[title]}},{number:2,role:'body',width:1080,height:2,operations:[{kind:'text',role:'body',text:'body fixture'}]}];
 const originalPlan={originalTitle:title,pages},plan={...originalPlan,bodyPreservation:{mode:'copy_existing_png',sourceOutput:production.existingOutput,sourceBundleSha256:sha(sourceZip),images:[{name:'rendered/slide-002.png',sha256:sha(body)}]}};
 await fs.writeFile(path.join(production.existingOutput,'production-plan.json'),JSON.stringify(originalPlan));
 const executable=path.join(f.dir,'fixture-executable.exe'),cp={state:'complete',postId:f.request.postId,input:production.input,existingOutput:production.existingOutput,consumedInputFingerprint:'b'.repeat(64),fingerprint,target,representativeOnly:true,bodyPngPreserved:true,bodyImages:1,reviewRegistered:false,publicationAllowed:false,outputSha256:sha(preview),sourceZipSha256:sha(sourceZip),images:[{file:'rendered/slide-001.png',sha256:sha(cover),width:1080,height:1080},{file:'rendered/slide-002.png',sha256:sha(body),width:1080,height:2}],runtime:{version:'0.3.26',packaged:true,executable}};
 const request={...f.request,compose:{executable}},prepared={production,checkpoint,consumedInputFingerprint:cp.consumedInputFingerprint};
 const save=async()=>{const bytes=Buffer.from(JSON.stringify(plan));cp.planSha256=sha(bytes);await fs.writeFile(path.join(target,'production-plan.json'),bytes);await fs.writeFile(checkpoint,JSON.stringify(cp));};
 await save();return{request,prepared,cp,plan,target,save};
}
test('complete verification accepts a coherent preserved-body and full-title fixture',async t=>{
 const f=await compositionFixture(t),result=await verifyComposition(f.request,f.prepared);assert.equal(result.bodyImages,1);
});
test('complete verification rejects declared body pages without actual body PNGs',async t=>{
 const f=await compositionFixture(t);f.cp.images=f.cp.images.slice(0,1);await fs.rm(path.join(f.target,'rendered','slide-002.png'));await f.save();
 await assert.rejects(verifyComposition(f.request,f.prepared),/page|slide|body/);
});
test('complete verification rejects shortened title operations despite unchanged originalTitle',async t=>{
 const f=await compositionFixture(t);f.plan.pages[0].operations[0].text='Short';await f.save();
 await assert.rejects(verifyComposition(f.request,f.prepared),/composition rendered title lines mismatch/);
});
test('complete verification compares body bytes to previous output instead of trusting new metadata',async t=>{
 const f=await compositionFixture(t),changed=png(1080,2,7);await fs.writeFile(path.join(f.target,'rendered','slide-002.png'),changed);
 f.cp.images[1].sha256=sha(changed);f.plan.bodyPreservation.images[0].sha256=sha(changed);await f.save();
 await assert.rejects(verifyComposition(f.request,f.prepared),/body/);
});
