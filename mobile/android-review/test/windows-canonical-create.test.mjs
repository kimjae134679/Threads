import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {spawn} from 'node:child_process';import {once} from 'node:events';import {withCanonicalWriter} from '../../../desktop/review-canonical-writer.cjs';
const fixture=async t=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'windows-create-lock-'));t.after(()=>{const rel=path.relative(path.resolve(os.tmpdir()),path.resolve(root));assert.ok(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel));return fs.rm(root,{recursive:true,force:true});});return root;};
test('transient exclusive-create denial retries only exclusive creation before doing work',async t=>{
 const root=await fixture(t),file=path.join(root,'review-canonical-writer.lock'),original=fs.open;let denials=0,work=0;
 fs.open=async(p,flags,...args)=>{if(p===file&&flags==='wx'&&denials++<2)throw Object.assign(Error('Synthetic Windows delete-pending open'),{code:'EPERM'});return original(p,flags,...args);};
 try{assert.equal(await withCanonicalWriter(root,()=>{work++;return 3;}),3);assert.equal(work,1);assert.ok(denials>=3);}finally{fs.open=original;}
});
test('persistent exclusive-create denial is bounded and never runs work or removes another identity',async t=>{
 const root=await fixture(t),file=path.join(root,'review-canonical-writer.lock'),owner=JSON.stringify({pid:process.pid,host:os.hostname(),nonce:'preserved-live-owner'});await fs.writeFile(file,owner);const original=fs.open,originalUnlink=fs.unlink;let work=0,unlinks=0;const start=Date.now();
 fs.open=async(p,flags,...args)=>{if(p===file&&flags==='wx')throw Object.assign(Error('Synthetic persistent access denial'),{code:'EACCES'});return original(p,flags,...args);};fs.unlink=async(...args)=>{unlinks++;return originalUnlink(...args);};
 try{await assert.rejects(withCanonicalWriter(root,()=>work++),{code:'EACCES'});assert.equal(work,0);assert.equal(unlinks,0);assert.equal(await fs.readFile(file,'utf8'),owner);assert.ok(Date.now()-start>=900&&Date.now()-start<5000);}finally{fs.open=original;fs.unlink=originalUnlink;}
});
test('delete-pending reclaimer creation retries while retaining exact dead-owner checks',async t=>{
 const root=await fixture(t),file=path.join(root,'review-canonical-writer.lock'),guard=file+'.reclaim',child=spawn(process.execPath,['-e',''],{windowsHide:true,stdio:'ignore'});await once(child,'exit');await fs.writeFile(file,JSON.stringify({pid:child.pid,host:os.hostname(),nonce:'known-dead-owner'}));const original=fs.open;let denials=0;
 fs.open=async(p,flags,...args)=>{if(p===guard&&flags==='wx'&&denials++<2)throw Object.assign(Error('Synthetic busy reclaimer create'),{code:'EBUSY'});return original(p,flags,...args);};
 try{assert.equal(await withCanonicalWriter(root,()=>7),7);assert.ok(denials>=3);}finally{fs.open=original;}
});
