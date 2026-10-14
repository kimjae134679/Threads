// A local activated selection prevents automatic producer refresh from resurrecting archived layouts.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
const fail=code=>{throw Object.assign(new Error(code),{code,status:409});};
export class CurrentProduction{
 constructor(input,root,store,assets){this.input=input;this.root=path.resolve(root);this.file=path.join(this.root,'current-layout-selection.json');this.store=store;this.assets=assets;}
 async selection(){
  let raw;try{const real=await fs.realpath(this.file);if(path.dirname(real)!==await fs.realpath(this.root))fail('current_layout_path_invalid');const stat=await fs.stat(real);if(!stat.isFile()||stat.size>2000000)fail('current_layout_invalid');raw=await fs.readFile(real,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}
  let data;try{data=JSON.parse(raw);}catch{fail('current_layout_invalid');}
  if(data.schema!==1||data.kind!=='current-layout-selection'||!Array.isArray(data.entries)||!data.entries.length||data.entries.length>1000||new Set(data.entries.map(p=>p.post_id)).size!==data.entries.length||data.entries.some(p=>typeof p.post_id!=='string'||typeof p.output_version!=='string'))fail('current_layout_invalid');
  const state=await this.store.read(),posts=data.dynamic===true?state.posts.filter(p=>p.current_layout?.activated===true):data.entries.map(e=>state.posts.find(p=>p.post_id===e.post_id&&p.output_version===e.output_version));if(!posts.length||posts.some(p=>!p||data.dynamic===true&&(p.current_layout.output_version||data.entries.find(e=>e.post_id===p.post_id)?.output_version)!==p.output_version))fail('current_layout_version_changed');
  return {data,posts};
 }
 async selected(selection,current){
  if(!Array.isArray(selection)||selection.length>1000||new Set(selection.map(p=>p.id)).size!==selection.length)fail('production_selection_invalid');
  const posts=selection.map(e=>current.posts.find(p=>p.post_id===e.id&&p.output_version===e.output_version));if(posts.some(p=>!p))fail('production_version_changed');return posts;
 }
 async catalog(){const current=await this.selection();if(!current)return this.input.catalog();return {available:true,readOnly:true,currentLayout:true,entries:current.posts.map(p=>({id:p.post_id,output_version:p.output_version,pages:p.images.length,title:p.source?.display_title||p.source?.label||'',cover_title:p.source?.cover_title||'',original_title:p.source?.original_title||'',caption_input_title:p.source?.caption_input_title||'',caption_status:p.production_caption_status,feedback:p.production_feedback||{current:null,previous:null}}))};}
 async metadata(selection){const current=await this.selection();if(!current)return this.input.metadata(selection);await this.selected(selection,current);return {bundle_id:'activated-current-layout-metadata',posts:[]};}
 async bundle(selection){const current=await this.selection();if(!current)return this.input.bundle(selection);const posts=await this.selected(selection,current);for(const p of posts)for(const image of p.images){const {asset,bytes}=await this.assets.read(image.asset_id);if(asset.mime!==image.mime||createHash('sha256').update(bytes).digest('hex')!==image.asset_id)fail('production_image_changed');}return {bundle_id:'activated-current-layout',posts:structuredClone(posts)};}
}
