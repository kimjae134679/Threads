// Numeric quality feedback uses the installed store contract. It never changes
// uploader final verdicts, approvals, jobs, or the original legacy review files.
import fs from 'node:fs/promises';import path from 'node:path';
import {createPostReviewStore,version} from '../desktop/post-review-store.cjs';
import {configuredResolver} from '../desktop/project-paths.cjs';
const fail=(code,status=409)=>{throw Object.assign(Error(code),{code,status});};
const contained=(root,file)=>{const r=path.relative(root,file);if(!r||r==='..'||r.startsWith('..'+path.sep)||path.isAbsolute(r))fail('quality_path_invalid');return file;};
async function json(root,file){contained(root,file);for(let p=file;;p=path.dirname(p)){const stat=await fs.lstat(p);if(stat.isSymbolicLink())fail('quality_path_invalid');if(p===root)break;}const stat=await fs.stat(file);if(!stat.isFile()||stat.size>20*1024*1024)fail('quality_file_invalid');return JSON.parse((await fs.readFile(file,'utf8')).replace(/^\ufeff/,''));}
export class QualityService{
 constructor({viewer,readState,materialRoot}){this.viewer=viewer;this.readState=readState;this.resolver=configuredResolver();this.materialRoot=path.resolve(this.resolver?this.resolver(materialRoot):materialRoot);}
 async binding(id,expectedVersion){
  const state=await this.readState(),post=state.posts.find(p=>p.post_id===id);if(!post)return null;if(post.output_version!==expectedVersion)fail('quality_version_changed');
  const bank=await this.viewer.load(),mapped=bank.rows.get(id);if(!mapped||mapped.newOutputVersion!==expectedVersion||mapped.images.length!==post.images.length||mapped.images.some((im,i)=>im.sha256!==post.images[i].asset_id)||!mapped.checkpoint)return null;
  const file=this.resolver?this.resolver(mapped.checkpoint):mapped.checkpoint,checkpoint=await json(bank.root,file),row=checkpoint.changed;
  if(checkpoint.state!=='complete'||checkpoint.id!==id||row?.id!==id||version(row)!==expectedVersion||checkpoint.versionLinks?.newOutputVersion!==expectedVersion||JSON.stringify(row.images?.map(i=>i.sha256))!==JSON.stringify(post.images.map(i=>i.asset_id)))fail('quality_checkpoint_changed');
  const output=contained(bank.root,path.resolve(mapped.output)),outputRoot=path.join(bank.root,'outputs'),relative=path.relative(outputRoot,output);contained(outputRoot,output);
  const currentRow={...row,outputFolder:relative};
  const store=createPostReviewStore(bank.root,{outputDirectory:'outputs',reportProvider:async()=>{
   const latest=await this.readState(),current=latest.posts.find(p=>p.post_id===id);if(current?.output_version!==expectedVersion||JSON.stringify(current.images.map(i=>i.asset_id))!==JSON.stringify(post.images.map(i=>i.asset_id)))fail('quality_version_changed');
   return[currentRow];
  },roundProvider:async()=>({reviewRound:row.reviewRound||null})});
  return{store,post,row:currentRow,root:bank.root,sourceZipPreserved:checkpoint.sourceZipPreserved===true};
 }
 async historical(id){
  const root=this.materialRoot,file=path.join(root,'07_사용자 평가/평가 기록.json');try{const data=await json(root,file);if(data.schemaVersion!==1||data.recordType!=='user_post_quality_feedback'||!Array.isArray(data.evaluations))fail('quality_legacy_invalid');return data.evaluations.filter(e=>e.id===id).map(e=>({...e,historical:true}));}catch(e){if(e.code==='ENOENT')return[];throw e;}
 }
 async historicalProgress(id){
  const root=this.materialRoot,file=path.join(root,'07_사용자 평가/검토 진행.json');try{const data=await json(root,file);if(data.schemaVersion!==1||data.recordType!=='user_review_workflow'||!Array.isArray(data.entries))fail('quality_legacy_invalid');return data.entries.filter(e=>e.id===id).map(e=>({...e,historical:true}));}catch(e){if(e.code==='ENOENT')return[];throw e;}
 }
 async get(id,outputVersion){
  const history=await this.historical(id),historicalProgress=await this.historicalProgress(id),binding=await this.binding(id,outputVersion);if(!binding)return{connected:false,reason:'quality_current_bank_unmapped',historical:history,historicalProgress,publicationAuthorized:false};
  const entry=(await binding.store.list()).entries[0];return{connected:true,postId:id,outputVersion,reviewRound:binding.row.reviewRound||null,imageEligible:entry.imageEligible,current:entry.current||null,progress:entry.progress||null,historical:history.filter(e=>e.outputVersion!==outputVersion||e.reviewRound!==binding.row.reviewRound),historicalProgress:historicalProgress.filter(e=>e.outputVersion!==outputVersion||e.reviewRound!==binding.row.reviewRound),publicationAuthorized:false};
 }
 async save(payload){
  const b=await this.binding(payload.post_id,payload.output_version);if(!b)fail('quality_current_bank_unmapped');
  return b.store.withCanonicalWriter(async()=>{
   const state=await this.readState(),post=state.posts.find(p=>p.post_id===payload.post_id);if(post?.revision!==payload.expected_revision||post.output_version!==payload.output_version)fail('quality_version_changed');
   const current=(await b.store.list()).entries[0]?.current;if((current?.updatedAt||null)!==(payload.expected_updated_at||null))fail('quality_feedback_changed');
   return b.store.save({id:payload.post_id,outputVersion:payload.output_version,score:payload.score,note:payload.note});
  });
 }
 async visit(payload){const b=await this.binding(payload.post_id,payload.output_version);if(!b)fail('quality_current_bank_unmapped');return b.store.visit({id:payload.post_id,outputVersion:payload.output_version,page:payload.page});}
}
