'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]),status=JSON.parse(fs.readFileSync(path.join(root,'status.json')));
const result={checkedAt:new Date().toISOString(),scope:'structure_and_source_coverage_only',visualReviewComplete:false,outputs:0,pages:0,issues:[],followUp:[]};
for(const row of status.entries.filter(r=>r.proofFolder))try{
 const plan=JSON.parse(fs.readFileSync(path.join(root,row.proofFolder,'production-plan.json'))),ops=plan.pages.flatMap(p=>p.operations);
 for(const unit of plan.sourceUnits){
  const omissions=plan.omitted.filter(o=>o.sourceId===unit.id);
  if(unit.kind==='text'&&!omissions.some(o=>['duplicate_text','isolated_filler_reaction'].includes(o.reason)))assert.equal(ops.filter(o=>o.sourceId===unit.id&&['body','note'].includes(o.role)).map(o=>o.text).join('').replace(/\s/g,''),unit.text.replace(/\s/g,''));
  if(unit.kind==='image'&&!omissions.some(o=>['duplicate_image','already_shown_in_cover'].includes(o.reason))){
   const slices=ops.filter(o=>o.sourceId===unit.id&&o.kind==='image');assert(slices.length,'image omitted');const d=plan.imageAnalysis[unit.mediaName.toLowerCase()],region=plan.imageRegions?.[unit.id]||omissions.find(o=>o.region)?.region||d.analysis?.bounds||{x:0,y:0,width:d.width,height:d.height};
   let end=region.y;for(const s of slices){assert(Math.abs(s.sourceY-end)<0.01,'image slice gap');end+=s.sourceHeight;}assert(Math.abs(end-region.y-region.height)<0.01,'image end incomplete');
  }
 }
 for(const page of plan.pages){assert(page.width===1080&&page.height<=1440);assert(fs.existsSync(path.join(root,row.proofFolder,'slide-'+String(page.number).padStart(3,'0')+'.svg')));for(const op of page.operations){assert(op.y>=0&&op.y+(op.kind==='text'?op.lineHeight:op.height)<=page.height+1,'vertical clipping');if(op.kind==='text')assert(!/https?:\/\//.test(op.text));}}
 result.outputs++;result.pages+=plan.pages.length;if(row.followUp.length)result.followUp.push({id:row.id,actions:row.followUp});
}catch(e){result.issues.push({id:row.id,error:e.message});}
fs.writeFileSync(path.join(root,'structure-audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,followUp:result.followUp.length}));if(result.issues.length)process.exitCode=1;
