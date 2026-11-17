// Private writing proposals. Reading never changes a post; only explicit apply returns a domain edit.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {isDeepStrictEqual} from 'node:util';
import '../app/unified-material-txt.js';const Codec=globalThis.ThreadsUnifiedMaterialTxt;import {editPost,finalCaption,rejectSecrets} from './domain.mjs';
import {createPathResolver} from '../desktop/project-paths.cjs';import {writeAtomic} from '../desktop/atomic-file.cjs';
const LIMIT=16*1024*1024,sha=b=>createHash('sha256').update(b).digest('hex'),clone=x=>structuredClone(x),fail=(code='writing_draft_changed',status=409)=>{throw Object.assign(Error(code),{code,status});},same=(a,b)=>isDeepStrictEqual(a,b);
const allowed=new Set(['caption','platform_captions','tags','common_tags','topic_tags','threads_topic_tag']);
export function writingPatch(value){if(!value||typeof value!=='object'||Array.isArray(value)||!Object.keys(value).length||Object.keys(value).some(k=>!allowed.has(k)))fail('writing_draft_patch_invalid',400);rejectSecrets(value);return clone(value);}
function preview(post,patch){return editPost({posts:[clone(post)],jobs:[],revision:0},post.post_id,writingPatch(patch),post.revision).posts[0];}
// Catalog sources[] describe observed copies (including a rotating backup), not
// the canonical source. Keep them untouched in TXT. At read/apply only the
// current state location participates; original post and canonical ZIP/bytes do.
function basis(value,currentOnly=false){const v=clone(value);delete v.records.caption;delete v.records.exportedAt;delete v.human.platformCaptions;delete v.humanPrefixLength;
 if(currentOnly){const material=v.records.material,sources=material?.sources,known=new Set(['current','archived_post','edit_history','state_archive','archived_edit_history']);if(!Array.isArray(sources)||sources.some(row=>!row||!known.has(row.kind)||typeof row.file!=='string'||path.isAbsolute(row.file)||path.win32.isAbsolute(row.file)||row.file.replaceAll('\\','/').split('/').some(part=>part==='..')))fail();
  const current=sources.filter(row=>row.kind==='current');if(current.length!==1||current[0].file!=='state.json'||Object.keys(current[0]).some(k=>!['kind','file','revision'].includes(k)))fail();delete material.revision;material.sources=current.map(({revision,...location})=>location);
 }return v;
}
function idCheck(id){if(typeof id!=='string'||(!id||id.length>200||['__proto__','constructor','prototype'].includes(id)||!/^[-\w가-힣.: ]+$/.test(id)))fail('writing_draft_id_invalid',400);}
export class WritingDrafts{
 constructor({root,catalog,readState,readOnly=false}){this.root=path.resolve(root);this.catalog=catalog;this.readState=readState;this.readOnly=readOnly;this.resolve=createPathResolver({projectRoot:this.root,pathMappings:[]});}
 async current(postId,state){idCheck(postId);state=state||await this.readState();const post=state.posts.find(p=>p.post_id===postId);if(!post)fail('writing_draft_missing',404);const selection=await this.catalog.toolSelection(postId,post.output_version),file=await this.catalog.unifiedText(selection.key,'instagram',{expectedScope:'current'}),value=Codec.parse(file.bytes);
  if(!value||value.visibility!=='private'||!same(value.records.post,post)||value.records.material?.scope!=='current'||value.records.material.postId!==postId||value.records.material.outputVersion!==post.output_version||value.records.material.key!==selection.key||value.records.material.fingerprint!==selection.fingerprint||!value.records.material.sourceBinding?.connected||!/^[a-f0-9]{64}$/.test(value.records.sourceBundle?.sha256||'')||value.records.publicationAuthorized!==false)fail();
  const key=sha(JSON.stringify([postId,post.output_version,selection.key,selection.fingerprint]));const folder=this.resolve(path.join(this.root,'writing-drafts',sha(postId),key));return{post,value,selection,folder};
 }
 async readFile(file,max){file=this.resolve(file);const before=await fs.lstat(file);if(!before.isFile()||before.isSymbolicLink()||before.size>max)fail();const bytes=await fs.readFile(this.resolve(file));const after=await fs.lstat(this.resolve(file));if(bytes.length!==before.size||after.size!==before.size||after.ino!==before.ino||after.mtimeMs!==before.mtimeMs)fail();return bytes;}
 async latest(folder){try{const bytes=await this.readFile(path.join(folder,'latest'),64),v=bytes.toString('utf8');if(!/^[a-f0-9]{64}$/.test(v))fail();return v;}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async fileFor(postId,digest){if(!/^[a-f0-9]{64}$/.test(digest||''))fail('writing_draft_sha_invalid',400);return this.resolve(path.join((await this.current(postId)).folder,digest+'.txt'));}
 async validate(current,digest){if(!/^[a-f0-9]{64}$/.test(digest||''))fail('writing_draft_sha_invalid',400);const bytes=await this.readFile(path.join(current.folder,digest+'.txt'),LIMIT);if(sha(bytes)!==digest)fail();const value=Codec.parse(bytes);if(!value||!same(basis(value,true),basis(current.value,true))||value.records.publicationAuthorized!==false)fail();const patch=writingPatch(value.records.caption),next=preview(current.post,patch),caps=Object.fromEntries(['instagram','threads'].map(k=>[k,finalCaption(next,k)]));if(!same(value.human.platformCaptions,caps))fail();return{sha256:digest,postId:current.post.post_id,outputVersion:current.post.output_version,expectedRevision:current.post.revision,key:current.selection.key,fingerprint:current.selection.fingerprint,patch,platformCaptions:caps,publicationAuthorized:false};}
 async save({postId,patch,expectedPost,expectedMaterial,expectedLatest=null}){
  if(this.readOnly)fail('read_only_inspection',405);patch=writingPatch(patch);if(expectedLatest!==null&&!/^[a-f0-9]{64}$/.test(expectedLatest||''))fail('writing_draft_sha_invalid',400);
  const current=await this.current(postId);if(!same(current.post,expectedPost)||!same(current.value.records.material,expectedMaterial))fail();const next=preview(current.post,patch),value=clone(current.value);value.records.caption=patch;value.records.publicationAuthorized=false;value.human.platformCaptions=Object.fromEntries(['instagram','threads'].map(k=>[k,finalCaption(next,k)]));const bytes=Buffer.from(Codec.serialize(value,{visibility:'private'}));if(bytes.length>LIMIT)fail('writing_draft_size_limit',413);const digest=sha(bytes),folder=current.folder;
  await fs.mkdir(this.resolve(folder),{recursive:true,mode:0o700});this.resolve(folder);const lock=this.resolve(path.join(folder,'.write-lock'));try{await fs.mkdir(lock);}catch(e){if(e.code==='EEXIST')fail('writing_draft_busy');throw e;}
  try{if(await this.latest(folder)!==expectedLatest)fail('writing_draft_conflict');const fresh=await this.current(postId);if(!same(basis(fresh.value),basis(current.value)))fail();const file=this.resolve(path.join(folder,digest+'.txt'));try{const handle=await fs.open(file,'wx',0o600);try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}}catch(e){if(e.code!=='EEXIST'||!(await this.readFile(file,LIMIT)).equals(bytes))throw e;}
   await this.validate(fresh,digest);await writeAtomic(this.resolve(path.join(folder,'latest')),digest);return{sha256:digest,postId,outputVersion:current.post.output_version,publicationAuthorized:false};
  }finally{await fs.rmdir(this.resolve(lock));}
 }
 async load(postId){
  idCheck(postId);const state=await this.readState();if(!state.posts.some(post=>post.post_id===postId))fail('writing_draft_missing',404);
  // No proposal parent means no source work. Existing parents still take the
  // full current export / canonical source validation path, even when stale.
  const parent=this.resolve(path.join(this.root,'writing-drafts',sha(postId)));try{const st=await fs.lstat(parent);if(!st.isDirectory()||st.isSymbolicLink())fail();}catch(e){if(e.code==='ENOENT')return null;throw e;}
  const current=await this.current(postId,state),digest=await this.latest(current.folder);return digest?this.validate(current,digest):null;
 }
 async apply(postId,digest,expectedRevision,state){if(this.readOnly)fail('read_only_inspection',405);const current=await this.current(postId,state);if(current.post.revision!==expectedRevision||await this.latest(current.folder)!==digest)fail();const draft=await this.validate(current,digest);return editPost(state,postId,draft.patch,expectedRevision);}
}
