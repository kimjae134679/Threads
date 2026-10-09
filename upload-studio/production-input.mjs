import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {cleanDisplayTitle} from './title-normalization.mjs';
export const DEFAULT_MATERIAL_ROOT='D:\\A_KJ\\AI\\Projects\\Threads\\자료';
const fail=code=>{throw Object.assign(new Error(code),{code,status:400});};
const inside=(root,file)=>{const rel=path.relative(root,file);if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))fail('production_path_invalid');return file;};
// Exactly the version basis used by desktop/post-review-store.cjs. No review-store writes.
export function productionVersion(row){return createHash('sha256').update(JSON.stringify([row.sourceFingerprint,row.outputSha256,row.ruleVersion,row.images?.map(i=>i.sha256)])).digest('hex');}
export class ProductionInput {
 constructor(materialRoot,assets){this.materialRoot=path.resolve(materialRoot);this.output=path.join(this.materialRoot,'06_자동 제작 결과');this.assets=assets;}
 async safeRoot(){try{const material=await fs.realpath(this.materialRoot),output=await fs.realpath(this.output);inside(material,output);return output;}catch(e){if(e.code==='ENOENT')fail('production_unavailable');throw e;}}
 async safeFile(row,name){const root=await this.safeRoot();const base=inside(root,path.resolve(root,row.outputFolder));const candidate=inside(base,path.resolve(base,name));const [realBase,realFile]=await Promise.all([fs.realpath(base),fs.realpath(candidate)]);inside(root,realBase);inside(realBase,realFile);return realFile;}
 async json(file){const stat=await fs.stat(file);if(!stat.isFile()||stat.size>20000000)fail('production_manifest_invalid');try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e instanceof SyntaxError)fail('production_manifest_invalid');throw e;}}
 async rows(){const root=await this.safeRoot(),file=await fs.realpath(path.join(root,'status.json'));inside(root,file);const data=await this.json(file);if(!Array.isArray(data.entries)||data.entries.length>10000)fail('production_manifest_invalid');const rows=data.entries.filter(r=>r.outputFolder&&Array.isArray(r.images)&&r.images.length);const ids=new Set();for(const row of rows){if(typeof row.id!=='string'||!/^[-\w가-힣.: ]{1,200}$/.test(row.id)||ids.has(row.id)||row.images.length>200)fail('production_manifest_invalid');ids.add(row.id);}return rows;}
 async feedback(){try{const root=await fs.realpath(this.materialRoot),folder=await fs.realpath(path.join(root,'07_사용자 평가'));inside(root,folder);const file=await fs.realpath(path.join(folder,'평가 기록.json'));inside(folder,file);const data=await this.json(file);if(data.schemaVersion!==1||!Array.isArray(data.evaluations))fail('production_feedback_invalid');return data.evaluations;}catch(e){if(e.code==='ENOENT')return [];throw e;}}
 evaluation(rows,id,outputVersion){const project=e=>e?{output_version:e.outputVersion,score:e.score??null,note:typeof e.note==='string'?e.note:'',updated_at:typeof e.updatedAt==='string'?e.updatedAt:''}:null;const current=rows.find(e=>e.id===id&&e.outputVersion===outputVersion),previous=rows.filter(e=>e.id===id&&e.outputVersion!==outputVersion).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0];return {current:project(current),previous:project(previous)};}
 async plan(row){try{return await this.json(await this.safeFile(row,'production-plan.json'));}catch(e){if(e.code==='ENOENT')return {};throw e;}}
 async catalog(){try{const rows=await this.rows(),evaluations=await this.feedback();return {available:true,entries:rows.map(r=>({id:r.id,title:cleanDisplayTitle(r.title),original_title:typeof r.title==='string'?r.title:'',output_version:productionVersion(r),pages:r.images.length,feedback:this.evaluation(evaluations,r.id,productionVersion(r))})),readOnly:true};}catch(e){if(e.code==='production_unavailable'||e.code==='ENOENT')return {available:false,entries:[],code:'production_unavailable',readOnly:true};throw e;}}
 async bundle(selection){if(!Array.isArray(selection)||!selection.length||selection.length>20||new Set(selection.map(x=>x.id)).size!==selection.length)fail('production_selection_invalid');const rows=await this.rows(),evaluations=await this.feedback(),posts=[];
  for(const selected of selection){const row=rows.find(r=>r.id===selected.id);if(!row||productionVersion(row)!==selected.output_version)fail('production_version_changed');const plan=await this.plan(row),images=[];
   for(const item of row.images){if(typeof item.name!=='string'||!/^rendered\/slide-\d{3,}\.png$/.test(item.name.replaceAll('\\','/'))||!/^[a-f0-9]{64}$/.test(item.sha256||''))fail('production_image_invalid');const file=await this.safeFile(row,item.name),stat=await fs.stat(file);if(!stat.isFile()||stat.size>25*1024*1024)fail('production_image_invalid');const bytes=await fs.readFile(file);if(createHash('sha256').update(bytes).digest('hex')!==item.sha256)fail('production_image_changed');const asset=await this.assets.add({name:path.basename(item.name),mime:'image/png',base64:bytes.toString('base64')});images.push({asset_id:asset.asset_id,order:images.length+1,mime:asset.mime});}
   const explicitCaption=typeof plan.publishCaption==='string'?plan.publishCaption:typeof plan.caption==='string'?plan.caption:'';
   posts.push({post_id:row.id,output_version:selected.output_version,caption:explicitCaption,production_feedback:this.evaluation(evaluations,row.id,selected.output_version),tags:'',source:{url:typeof row.sourceUrl==='string'?row.sourceUrl:'',verified:false,label:typeof row.title==='string'?row.title:''},images});
  }
  // Recheck after copies; changed production cannot enter local post state.
  const latest=await this.rows();for(const selected of selection){const row=latest.find(r=>r.id===selected.id);if(!row||productionVersion(row)!==selected.output_version)fail('production_version_changed');}
  return {bundle_id:'read-only-current-production',posts};
 }
}
