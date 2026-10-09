import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import '../app/source-page-plan.js';
import '../app/source-batch-image-composition.js';
const require=createRequire(import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const measure=(text,size)=>Array.from(text).length*size*.7;
const asset={itemId:'cover',name:'composition-cover.png',sha256:'a'.repeat(64),placement:{position:'cover',afterSourceId:null,order:0},composition:{aspectRatio:'1:1',crop:'cover',subjectRegion:'center',safeArea:{top:0,right:0,bottom:.32,left:0}},provenance:{kind:'ai_generated',displayText:false,persistInManifest:true,actualScene:false}};
const plan=()=>({originalTitle:'엄청난 신입사원이 두달만에 짤린 썰 후기',segments:[{id:'s1',kind:'text',text:'원문 그대로 보존'}],imageComposition:{schema:'threads-image-composition-v1',assets:[structuredClone(asset)],generationReceipts:[],publicationAllowed:false}});
const layout=()=>({pages:[{number:1,role:'cover',operations:[]},{number:2,role:'body',width:1080,height:400,operations:[{kind:'text',role:'body',sourceId:'s1',text:'원문 그대로 보존',x:72,y:72,size:52,lineHeight:78}]}],sourceUnits:[{id:'s1',kind:'text',text:'원문 그대로 보존'}],omitted:[],warnings:[]});
test('ordinary legacy image covers stay unchanged without explicit complete-cover opt-in',()=>{
 const p=plan(),l=layout();delete p.imageComposition;p.coverAsset={kind:'original'};l.pages[0].operations=[{kind:'image',name:'legacy.png'}];const before=structuredClone(l);
 globalThis.ThreadsImageComposition.applyComposition(l,p,{},measure,globalThis.ThreadsPagePlan);assert.deepEqual(l,before);
});
test('ready cover composes exact Korean title below protected action, keeping body unchanged',()=>{
 const api=globalThis.ThreadsImageComposition,p=plan(),l=layout(),body=structuredClone(l.pages[1]);
 api.applyComposition(l,p,{'composition-cover.png':{width:1024,height:1024}},measure,globalThis.ThreadsPagePlan);
 assert.deepEqual(l.pages[1],body);assert.equal(l.pages[0].width,1080);assert.equal(l.pages[0].height,1440);
 const titles=l.pages[0].operations.filter(o=>o.role==='title');
 assert.equal(titles.map(o=>o.text).join(' ').replace(/\s/g,''),p.originalTitle.replace(/\s/g,''));
 assert(titles.every(o=>o.x>=132&&o.y>=720&&o.y+o.lineHeight<=1308));
 assert(l.pages[0].operations.every(o=>!String(o.text||'').includes('AI 연출')));
 assert.equal(l.imageComposition.assets[0].sha256,'a'.repeat(64));
});
test('contain preserves every image pixel and cover crop obeys per-article subject anchor',()=>{
 const {imageOperation}=globalThis.ThreadsImageComposition;
 const image=imageOperation(asset,{width:2000,height:1000},{x:0,y:0,width:1080,height:1080});
 assert(Math.abs(image.sourceX-500)<.001);assert(Math.abs(image.sourceWidth-1000)<.001);
 const right=imageOperation({...asset,composition:{...asset.composition,subjectRegion:'right'}},{width:2000,height:1000},{x:0,y:0,width:1080,height:1080});assert(Math.abs(right.sourceX-1000)<.001);
 const contain=imageOperation({...asset,composition:{...asset.composition,crop:'contain'}},{width:2000,height:1000},{x:0,y:0,width:1080,height:1080});assert.equal(contain.width,1080);assert.equal(contain.height,540);assert.equal(contain.sourceWidth,2000);
});
test('source label fragment 판} is removed only at title edges while original title is preserved',()=>{
 const original='판} 사수 없이 프로젝트 3개';const info=globalThis.ThreadsPagePlan.titleInfo(original);
 assert.equal(info.displayTitle,'사수 없이 프로젝트 3개');assert.equal(info.originalTitle,original);assert.equal(globalThis.ThreadsPagePlan.titleInfo('게임판} 속 이야기').displayTitle,'게임판} 속 이야기');
});
test('one source-title phrase can be accented over a lower gradient without invented copy',()=>{
 const p=plan(),l=layout();p.imageComposition.titleStyle={emphasis:'두달만에',accent:'#ffe34d'};
 globalThis.ThreadsImageComposition.applyComposition(l,p,{'composition-cover.png':{width:1024,height:1024}},measure,globalThis.ThreadsPagePlan);
 assert(l.pages[0].operations.some(o=>o.kind==='gradient'));
 assert.deepEqual(l.pages[0].operations.flatMap(o=>o.highlights||[]),['두달만에']);
 p.imageComposition.titleStyle.emphasis='없는 이야기';assert.throws(()=>globalThis.ThreadsImageComposition.applyComposition(layout(),p,{'composition-cover.png':{width:1024,height:1024}},measure,globalThis.ThreadsPagePlan),/강조/);
});
test('body image placement is explicitly held under the approved cover-only scope',()=>{
 const api=globalThis.ThreadsImageComposition,p=plan(),l=layout();
 p.imageComposition.assets=[{...asset,itemId:'body',placement:{position:'body',afterSourceId:'e1',order:1},anchorText:'원문 그대로 보존'}];
 const before=structuredClone(l);assert.throws(()=>api.applyComposition(l,p,{'composition-cover.png':{width:1024,height:1024}},measure,globalThis.ThreadsPagePlan),/cover only/);assert.deepEqual(l,before);
});
test('title without a safe image region uses a separate band and oversized title holds',()=>{
 const api=globalThis.ThreadsImageComposition,p=plan(),l=layout();p.imageComposition.assets[0].composition.safeArea.bottom=0;
 api.applyComposition(l,p,{'composition-cover.png':{width:1024,height:1024}},measure,globalThis.ThreadsPagePlan);
 const image=l.pages[0].operations.find(o=>o.kind==='image'),title=l.pages[0].operations.find(o=>o.role==='title');assert(image.y+image.height<=title.y);
 p.originalTitle='가'.repeat(400);assert.throws(()=>api.applyComposition(layout(),p,{'composition-cover.png':{width:1024,height:1024}},measure,globalThis.ThreadsPagePlan),/제목|보류/);
});
test('an image-unnecessary article receives a complete portrait text cover with full title',()=>{
 const p=plan(),l=layout();delete p.imageComposition;p.completeCover=true;p.coverTitleStyle={emphasis:'두달만에',accent:'#ffe34d'};
 globalThis.ThreadsImageComposition.applyComposition(l,p,{},measure,globalThis.ThreadsPagePlan);
 assert.equal(l.pages[0].height,1440);assert.equal(l.pages[0].width,1080);
 assert.equal(l.pages[0].operations.filter(o=>o.role==='title').map(o=>o.text).join(' ').replace(/\s/g,''),p.originalTitle.replace(/\s/g,''));assert(!l.pages[0].operations.some(o=>o.kind==='image'));
 assert.deepEqual(l.pages[0].operations.flatMap(o=>o.highlights||[]),['두달만에']);
});
test('consumer rechecks hashes, rejects pending generation, and fingerprints only consumed composition',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'composition-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aIZkAAAAASUVORK5CYII=','base64'),file=path.join(dir,'raw.png');await fs.writeFile(file,bytes);
 const handoff={schema:'threads-image-handoff-v1',postId:'fixture',generationRequests:[],compositionAssets:[{...asset,file,asset:{sha256:hash(bytes),tool:{name:'test',model:null},rights:{status:'user_owned',evidence:'fixture'}},provenance:asset.provenance}],generationReceipts:[],held:[]};
 const {prepareImageComposition}=require('../desktop/image-composition.cjs');
 const consumed=await prepareImageComposition(handoff);assert.equal(hash(Buffer.from(consumed.assets[0].data,'base64')),hash(bytes));
 const {fingerprintFor}=require('../desktop/folder-batch.cjs'),job={sourceName:'source.txt',sourceText:'body',files:[],imageComposition:consumed,imageHandoff:handoff};
 assert.notEqual(fingerprintFor(job),fingerprintFor({...job,imageComposition:undefined}));
 assert.equal(fingerprintFor(job),fingerprintFor({...job,imageHandoff:{...handoff,identity:{checkedAt:'later'}}}));
 const changed=structuredClone(job);changed.imageComposition.assets[0].composition.safeArea.bottom=.4;assert.notEqual(fingerprintFor(job),fingerprintFor(changed));
 await fs.writeFile(file,'changed');await assert.rejects(prepareImageComposition(handoff),/hash/);
 await assert.rejects(prepareImageComposition({...handoff,generationRequests:[{}]}),/pending|generation/);
});
