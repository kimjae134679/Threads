'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(process.argv[2]||'');
if(!process.argv[2])throw new Error('Specify the actual output directory.');
const report=JSON.parse(fs.readFileSync(path.join(root,'status.json'),'utf8'));
const normalize=text=>String(text).replace(/\s/g,'');
const result={checkedAt:new Date().toISOString(),total:report.total,counts:report.counts,outputs:0,pages:0,templates:{},warnings:[],issues:[]};
for(const row of report.entries.filter(row=>row.outputFolder)){
 try{
  const folder=path.resolve(root,row.outputFolder);assert(folder.startsWith(root+path.sep));
  const plan=JSON.parse(fs.readFileSync(path.join(folder,'production-plan.json'),'utf8'));
  assert.equal(plan.ruleVersion,'2026-10-04.3');assert.equal(plan.publicationAllowed,false);
  assert.equal(plan.pages.length,row.images.length);
  const ops=plan.pages.flatMap(p=>p.operations),omitted=new Map(plan.omitted.map(o=>[o.sourceId,o]));
  for(const unit of plan.sourceUnits){
   if(unit.kind==='text'&&!['duplicate_text'].includes(omitted.get(unit.id)?.reason)){
    assert.equal(normalize(ops.filter(o=>o.sourceId===unit.id&&o.role==='body').map(o=>o.text).join('')),normalize(unit.text),'Original text must be complete: '+unit.id);
   }else if(unit.kind==='image'&&!['duplicate_image'].includes(omitted.get(unit.id)?.reason)){
    const slices=ops.filter(o=>o.kind==='image'&&o.sourceId===unit.id);assert(slices.length,'Original image must be present: '+unit.id);
    if(slices[0].sourceHeight){
     const name=unit.mediaName.toLowerCase(),region=omitted.get(unit.id)?.region||plan.imageAnalysis[name].analysis.bounds;
     let end=region.y;for(const slice of slices){assert(Math.abs(slice.sourceY-end)<0.01);end+=slice.sourceHeight;}
     assert(Math.abs(end-region.y-region.height)<0.01,'Image ending must be complete: '+unit.id);
    }
   }
  }
  for(const p of plan.pages){
   assert(p.width===1080&&p.height>=240&&p.height<=1440);
   assert(p.operations.length);
   for(const op of p.operations){assert(op.y>=0&&op.y+(op.kind==='text'?op.lineHeight:op.height)<=p.height+1);if(op.kind==='text')assert(!/https?:\/\//.test(op.text));}
  }
  for(const image of row.images){
   const file=path.resolve(folder,image.name);assert(file.startsWith(folder+path.sep));
   const data=fs.readFileSync(file);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),image.sha256);
   assert.equal(data.readUInt32BE(16),1080);
  }
  result.outputs++;result.pages+=plan.pages.length;result.templates[plan.templateId]=(result.templates[plan.templateId]||0)+1;
  if(plan.warnings.length)result.warnings.push({id:row.id,warnings:plan.warnings});
 }catch(error){result.issues.push({id:row.id,error:error.message});}
}
fs.writeFileSync(process.argv[3]||path.join(root,'quality-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,warnings:result.warnings.length},null,2));
if(result.issues.length)process.exitCode=1;
