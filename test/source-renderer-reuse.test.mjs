import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const elements=new Map(),counts={decode:0,analyze:0,compile:0,released:0,reads:0};
class Element {
  constructor(){this.value='';this.checked=false;this.options=[];this.events={};}
  addEventListener(name,fn){this.events[name]=fn;}
  replaceChildren(...children){this.options=children;}
  add(option){this.options.push(option);}
}
const getElement=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
class TestFile extends Blob {
  constructor(data,name){super(data);this.name=name;}
  async arrayBuffer(){counts.reads++;return super.arrayBuffer();}
}
let imageSize=100,throwDraw=false,lastCompiledPlan=null;
class TestImage {
  constructor(){this.naturalWidth=imageSize;this.naturalHeight=imageSize;}
  set src(value){if(value==='')counts.released++;}
  async decode(){counts.decode++;}
}
const drawing={measureText:text=>({width:text.length*10}),fillRect(){},fillText(){},
  drawImage(){if(throwDraw)throw new Error('drawing failed');}};
const plans=new Map();
const source=new TextEncoder().encode('original source');
const image=new Uint8Array([1,2,3]);
const digest=async data=>Buffer.from(await webcrypto.subtle.digest('SHA-256',data)).toString('hex');
const sourceHash=await digest(source),imageHash=await digest(image);
const createFile=(name,reviewed=true)=>{
  const file=new TestFile([name],name+'.zip');
  plans.set(file,{schema:'test-source',input:{file:'source.txt',sha256:sourceHash},originalTitle:name,coverTitle:name,
    media:[{name:'photo.png',file:'photo.png',sha256:imageHash}],style:{fontId:'sans',titleWeight:900},reviewed,
    segments:[{id:'s0',kind:'image',selected:true,mediaName:'photo.png'}],comments:[],cover:{}});
  return file;
};
let presetData={};
const sandbox={TextEncoder,TextDecoder,Uint8Array,Uint8ClampedArray,Blob,File:TestFile,Image:TestImage,
  crypto:webcrypto,atob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
  Option:class {constructor(text,value){this.text=text;this.value=value;}},
  localStorage:{getItem:()=>JSON.stringify(presetData)},
  document:{getElementById:getElement,fonts:{load:async()=>[]},
    createElement:()=>({getContext:()=>drawing,toDataURL:()=> 'data:image/png;base64,AA=='})},
  window:{ThreadsSourceBatchCore:{severeScreen:()=>({excluded:false})},ThreadsSourceCuration:{schema:'test-source',
    validate:plan=>plan.reviewed?[]:['본문·이미지·댓글 확인 표시가 모두 필요합니다.']},
    ThreadsSourceCutZip:{zip:()=>new Blob(['zip'])},ThreadsSourceBundleZip:{read:async file=>new Map([
      ['bundle.json',new TextEncoder().encode(JSON.stringify(plans.get(file)))],['source.txt',source],['photo.png',image]])},
    ThreadsSourceCut:{assertFontText(){}},ThreadsViralModel:{comfortScan(){}},ThreadsImageAnalysis:{inspect(){counts.analyze++;return {}; }},
    ThreadsPagePlan:{VERSION:'test-rule',compile(plan){lastCompiledPlan=plan;counts.compile++;return {ruleVersion:'test-rule',pages:[
      {number:1,width:1080,height:1440,operations:[{kind:'image',name:'photo.png',x:0,y:0,width:100,height:100}]}]};}}}
};
const titleContext={};for(const name of ['source-page-plan.js','source-curation.js'])vm.runInNewContext(await fs.readFile(new URL('../app/'+name,import.meta.url),'utf8'),titleContext);
Object.assign(sandbox.window.ThreadsPagePlan,{FEED:titleContext.ThreadsPagePlan.FEED,feedAspect:titleContext.ThreadsPagePlan.feedAspect,prepareFeedLayout:titleContext.ThreadsPagePlan.prepareFeedLayout,compileForFeed:sandbox.window.ThreadsPagePlan.compile});
sandbox.window.ThreadsSourceCuration.normalizeTitles=titleContext.ThreadsSourceCuration.normalizeTitles;
vm.runInNewContext(await fs.readFile(new URL('../app/universal-production-model.js',import.meta.url),'utf8'),sandbox);
sandbox.window.ThreadsUniversalProductionModel=sandbox.ThreadsUniversalProductionModel;
vm.runInNewContext(await fs.readFile(new URL('../app/source-batch.js',import.meta.url),'utf8'),sandbox);
const api=sandbox.window.ThreadsSourceBatch;
const delta=async fn=>{const before={...counts};await fn();return Object.fromEntries(Object.keys(counts).map(key=>[key,counts[key]-before[key]]));};

const file=createFile('first');
const actual=await delta(async()=>{
  const layout=await api.planBundle(file);
  const output=await api.renderBundle(file,{productionPlan:layout});
  assert.equal(output.pages,1);assert.equal(output.plan.productionPlan,layout);
});
assert.equal(actual.decode,1,'planning and rendering share one decoded image');
assert.equal(actual.analyze,1);assert.equal(actual.compile,1);
assert.equal(actual.released,1,'rendered assets are released immediately');
assert.equal(actual.reads,2,'each operation hashes the bundle once');

const layout=await api.planBundle(file);
const uncached=await delta(()=>api.renderBundle(file,{productionPlan:JSON.parse(JSON.stringify(layout))}));
assert.equal(uncached.decode,1);assert.equal(uncached.analyze,0);assert.equal(uncached.compile,0);
assert.equal(uncached.released,2,'an unrelated plan releases the pending image and its own image');

const other=createFile('other');
const mismatchPlan=await api.planBundle(file);
const beforeMismatch=counts.decode;
const beforeMismatchRelease=counts.released;
await assert.rejects(()=>api.renderBundle(other,{productionPlan:mismatchPlan}),/ZIP/);
assert.equal(counts.decode,beforeMismatch,'bundle mismatch is rejected before image decoding');
assert.equal(counts.released-beforeMismatchRelease,1,'bundle mismatch releases pending assets');
const oldRule={...layout,ruleVersion:'outdated'};
await assert.rejects(()=>api.renderBundle(file,{productionPlan:oldRule}),/처리 규칙/);
assert.equal(counts.decode,beforeMismatch);

const firstPlan=await api.planBundle(file);
const evicted=await delta(()=>api.planBundle(other));
assert.equal(evicted.released,1,'the pending cache retains only one bundle');
const reload=await delta(()=>api.renderBundle(file,{productionPlan:firstPlan}));
assert.equal(reload.decode,1);assert.equal(reload.analyze,0);assert.equal(reload.compile,0);

imageSize=6000;
const tooLarge=await delta(async()=>{
  const big=createFile('big');const plan=await api.planBundle(big);
  await api.renderBundle(big,{productionPlan:plan});
});
assert.equal(tooLarge.decode,2,'assets above the pending pixel budget are not retained');
assert.equal(tooLarge.analyze,1);assert.equal(tooLarge.compile,1);assert.equal(tooLarge.released,2);
imageSize=100;

const failingPlan=await api.planBundle(file);throwDraw=true;
const failing=await delta(async()=>assert.rejects(()=>api.renderBundle(file,{productionPlan:failingPlan}),/drawing failed/));
assert.equal(failing.released,1,'failed rendering releases consumed assets');throwDraw=false;

// Planning a preview must never bypass the review checks on a later final render.
const unreviewed=createFile('unreviewed',false);
const reviewPlan=await api.planBundle(unreviewed,{preview:true});
const beforeReviewRelease=counts.released;
await assert.rejects(()=>api.renderBundle(unreviewed,{productionPlan:reviewPlan}),/확인 표시/);
assert.equal(counts.released-beforeReviewRelease,1,'failed review checks release pending assets');

for(const id of ['coverSize','coverTop','coverLeft'])assert.equal(getElement(id).disabled,true);
getElement('manualTitleLayout').checked=true;getElement('manualTitleLayout').events.change();
for(const id of ['coverSize','coverTop','coverLeft'])assert.equal(getElement(id).disabled,false);
presetData={automatic:{fontId:'sans',titleWeight:900,manualTitleLayout:false}};
getElement('batchPreset').value='automatic';getElement('applyBatchPreset').events.click();
for(const id of ['coverSize','coverTop','coverLeft'])assert.equal(getElement(id).disabled,true);
console.log('source renderer asset reuse, cache bounds, review gate, and manual controls passed');

const universalFile=createFile('universal');
const rawUniversal=plans.get(universalFile);
rawUniversal.editorial={templateId:'photo_cover',transcriptions:{}};
rawUniversal.style.manualTitleLayout=true;
rawUniversal.coverTitle='[네이트판] universal';
const originalUniversal=JSON.stringify(rawUniversal);
const universalLayout=await api.planBundle(universalFile,{preview:true,universalCover:true});
assert.equal(lastCompiledPlan.editorial.templateId,'mint_text','universal planning compiles a dedicated cover rather than the stored template');
assert.equal(lastCompiledPlan.style.manualTitleLayout,false);
assert.equal(lastCompiledPlan.coverTitle,'universal');
assert.equal(JSON.stringify(rawUniversal),originalUniversal,'universal planning preserves source ZIP plan');
const universalOutput=await api.renderBundle(universalFile,{preview:true,watermark:false,productionPlan:universalLayout});
assert.equal(universalOutput.plan.productionPlan,universalLayout);
assert.equal(JSON.stringify(rawUniversal),originalUniversal,'prepared render preserves original source plan');
console.log('universal planBundle and prepared render integration passed');
