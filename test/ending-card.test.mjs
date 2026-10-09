import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const renderer=require('../desktop/batch-render.cjs');
const {createZipTools}=require('../desktop/reflow-review-covers-run.cjs');
const {fingerprintFor}=require('../desktop/folder-batch.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function png(width,height){
 const chunk=(name,data)=>{const type=Buffer.from(name),b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);type.copy(b,4);data.copy(b,8);let crc=0xffffffff;for(const v of Buffer.concat([type,data])){crc^=v;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}b.writeUInt32BE((crc^0xffffffff)>>>0,b.length-4);return b;};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 const scan=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++)scan[y*(width*4+1)+1+x*4+3]=255;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);
}
async function fixture(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'threads-ending-card-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const data=png(1080,1440),file=path.join(dir,'approved.png');await fs.writeFile(file,data);
 const asset={file,sha256:hash(data),handle:'@aftertalk2026',approved:true};
 const productionPlan={sourceUnits:[],selectedComments:[],pages:[{number:1,role:'cover',width:1080,height:1440,operations:[]}]};
 const images=[{name:'rendered/slide-001.png',data}],zipTools=await createZipTools();
 const manifest={productionPlan,renderedPages:1};
 const zip=await zipTools.zip([...images,{name:'manifest.json',data:Buffer.from(JSON.stringify(manifest))},{name:'source-bundle.zip',data:Buffer.from('unchanged-original')}]);
 return {dir,asset,output:{productionPlan,images,zip},zipTools};
}

test('ending-card append fails closed before assets exist and keeps ordinary output unchanged', async()=>{
 assert.equal(typeof renderer.appendEndingCard,'function','Native production must expose a single validated ending-card append path');
 const output={productionPlan:{pages:[{number:1,width:1080,height:1440}]},images:[{name:'rendered/slide-001.png',data:Buffer.from('existing-image')}]};
 assert.equal(await renderer.appendEndingCard(output,null),output);
 await assert.rejects(()=>renderer.appendEndingCard(output,{enabled:true}),/ending.card.*asset|required|엔딩카드.*자산/i);
 assert.equal(output.images.length,1);
 assert.equal(output.productionPlan.pages.length,1);
});

test('approved portrait card is appended once with consistent PNG, plan and ZIP while original source stays exact',async t=>{
 const f=await fixture(t),config={enabled:true,asset:f.asset};
 const result=await renderer.appendEndingCard(f.output,config);
 assert.equal(f.output.images.length,1);assert.equal(f.output.productionPlan.pages.length,1);
 assert.equal(result.images.length,2);assert.equal(result.productionPlan.pages.length,2);
 assert.equal(result.images[0].data,f.output.images[0].data);
 assert.equal(result.images[1].name,'rendered/slide-002.png');assert.equal(hash(result.images[1].data),f.asset.sha256);
 assert.equal(result.productionPlan.pages[1].role,'ending-card');
 const entries=await f.zipTools.read(result.zip),manifest=JSON.parse(Buffer.from(entries.get('manifest.json')).toString());
 assert.equal(manifest.renderedPages,2);assert.equal(manifest.productionPlan.endingCard.sha256,f.asset.sha256);
 assert.equal(Buffer.from(entries.get('source-bundle.zip')).toString(),'unchanged-original');
 assert.equal(hash(Buffer.from(entries.get('rendered/slide-002.png'))),f.asset.sha256);
 assert.equal(await renderer.appendEndingCard(result,config),result);
 const model={exports:{}};vm.runInNewContext(await fs.readFile(new URL('../app/universal-production-model.js',import.meta.url),'utf8'),{module:model});
 assert.equal(model.exports.auditLayout(result.productionPlan).ok,true);
});

test('unapproved, wrong-handle, changed-hash and nonportrait assets hold without adding a card',async t=>{
 const f=await fixture(t);
 for(const asset of [{...f.asset,approved:false},{...f.asset,handle:'@other'},{...f.asset,sha256:'0'.repeat(64)}])await assert.rejects(()=>renderer.appendEndingCard(f.output,{enabled:true,asset}));
 const square=path.join(f.dir,'square.png'),data=png(1080,1080);await fs.writeFile(square,data);
 await assert.rejects(()=>renderer.appendEndingCard(f.output,{enabled:true,asset:{...f.asset,file:square,sha256:hash(data)}}),/1080.*1440|portrait|세로/);
 assert.equal(f.output.images.length,1);
 const result=await renderer.appendEndingCard(f.output,{enabled:true,asset:f.asset});
 await assert.rejects(()=>renderer.appendEndingCard({...result,images:result.images.slice(0,1)},{enabled:true,asset:f.asset}),/ending.card|엔딩카드/i);
});

test('ending-card asset hash participates in the existing production fingerprint',()=>{
 const job={files:[],sourceText:'same source',endingCard:{enabled:true,asset:{sha256:'a'.repeat(64)}}};
 assert.notEqual(fingerprintFor(job),fingerprintFor({...job,endingCard:{enabled:true,asset:{sha256:'b'.repeat(64)}}}));
});

test('shared native renderer consumes the optional card only after full body export',async t=>{
 const f=await fixture(t);let calls=0;
 const getWindow=async()=>({webContents:{executeJavaScript:async()=>++calls===1?{productionPlan:f.output.productionPlan,title:'fixture',sourcePlan:{}}:{pages:1,title:'fixture',zip:f.output.zip.toString('base64'),sourceZip:Buffer.from('original').toString('base64'),images:f.output.images.map(i=>({name:i.name,data:i.data.toString('base64')}))}}});
 const out=await renderer.renderBatchInput({files:[]},{getWindow,endingCard:{enabled:true,asset:f.asset}});
 assert.equal(calls,2);assert.equal(out.images.length,2);assert.equal(out.productionPlan.endingCard.handle,'@aftertalk2026');
 const entries=await f.zipTools.read(out.zip);assert.equal(entries.has('rendered/slide-002.png'),true);
 let touched=false;
 await assert.rejects(()=>renderer.renderBatchInput({files:[]},{getWindow:async()=>{touched=true;throw Error('must not render');},endingCard:{enabled:true}}),/asset required/i);
 assert.equal(touched,false);
 await assert.rejects(()=>renderer.renderBatchInput({files:[]},{getWindow,preserveBodyPlan:f.output.productionPlan,endingCard:{enabled:true,asset:f.asset}}),/full.body|cover.only/i);
});

test('native body reflow drops old ending metadata and reapplies exactly one selected card',async t=>{
 const f=await fixture(t),withCard=await renderer.appendEndingCard(f.output,{enabled:true,asset:f.asset});
 assert.equal(typeof renderer.mergeReflowedBody,'function');
 const merged=renderer.mergeReflowedBody(withCard,{plan:f.output.productionPlan,images:f.output.images});
 assert.equal(merged.productionPlan.endingCard,undefined);assert.equal(merged.images.length,1);
 assert.equal(await renderer.appendEndingCard(merged,null),merged);
 const reapplied=await renderer.appendEndingCard(merged,{enabled:true,asset:f.asset});
 assert.equal(reapplied.images.length,2);assert.equal(reapplied.productionPlan.pages.filter(p=>p.role==='ending-card').length,1);
 assert.equal(withCard.productionPlan.endingCard.sha256,f.asset.sha256);
});

test('header-only, truncated and CRC-corrupted PNG cards fail actual decoding validation',async t=>{
 const f=await fixture(t),good=await fs.readFile(f.asset.file),header=good.subarray(0,33),badCrc=Buffer.from(good);badCrc[badCrc.length-1]^=1;
 for(const [i,data]of [header,good.subarray(0,good.length-12),badCrc].entries()){
  const file=path.join(f.dir,'broken-'+i+'.png');await fs.writeFile(file,data);
  await assert.rejects(()=>renderer.appendEndingCard(f.output,{enabled:true,asset:{...f.asset,file,sha256:hash(data)}}),/PNG|decode|CRC|ending.card/i);
 }
 assert.equal(f.output.images.length,1);
});
