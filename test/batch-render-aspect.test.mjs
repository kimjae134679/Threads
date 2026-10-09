import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{renderBatchInput}=require('../desktop/batch-render.cjs');
const header=(width,height)=>{const b=Buffer.alloc(33);Buffer.from('89504e470d0a1a0a','hex').copy(b);b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(width,16);b.writeUInt32BE(height,20);return b.toString('base64');};
async function render({sizes=[[1080,1440]],planSizes=sizes,names=null,coverOnly=false}={}){
  const plan={pages:planSizes.map(([width,height],i)=>({number:i+1,width,height,operations:[]}))};let calls=0;
  const getWindow=async()=>({webContents:{executeJavaScript:async()=>++calls===1?{productionPlan:plan,title:'제목',sourcePlan:{}}:
    {pages:sizes.length,title:'제목',zip:'AA==',sourceZip:'AA==',images:sizes.map(([w,h],i)=>({name:names?.[i]||'rendered/slide-'+String(i+1).padStart(3,'0')+'.png',data:header(w,h)}))}}});
  return renderBatchInput({files:[]},{getWindow,preserveBodyPlan:coverOnly?plan:null});
}
test('desktop preflight checks actual PNG sizes before returning output',async()=>{
  await assert.rejects(()=>render({sizes:[[1080,552]]}),/비율/);
  await assert.rejects(()=>render({sizes:[[1080,1441]]}),/비율/);
  await assert.rejects(()=>render({sizes:[[1080,565]]}),/비율/);
  await assert.rejects(()=>render({sizes:[[1080,566]]}),/동일 세로/);
  await assert.rejects(()=>render({sizes:[[1080,1080]]}),/동일 세로/);
  const good=await render({sizes:[[1080,1440],[1080,1440],[1080,1440]]});assert.equal(good.images.length,3);
});
test('PNG dimensions and page order must match the rendered plan',async()=>{
  await assert.rejects(()=>render({sizes:[[1080,566]],planSizes:[[1080,1080]]}),/크기/);
  await assert.rejects(()=>render({sizes:[[1080,1440],[1080,1440]],names:['rendered/slide-002.png','rendered/slide-001.png']}),/순서/);
});
test('cover-only preflight does not modify or validate unexported historical bodies',async()=>{
  const output=await render({sizes:[[1080,1440]],planSizes:[[1080,1440],[1080,240]],coverOnly:true});
  assert.equal(output.productionPlan.pages[1].height,240);assert.equal(output.images.length,1);
});
