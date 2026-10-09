import test from 'node:test';
import assert from 'node:assert/strict';
import {removeOwnerFile} from '../store.mjs';
test('Windows sharing violations retry the exact observed owner filename',async()=>{
 let calls=0;const paths=[];
 await removeOwnerFile('owner.unique.json',async file=>{paths.push(file);if(++calls<3)throw Object.assign(new Error('sharing'),{code:'EPERM'});},async()=>{});
 assert.equal(calls,3);assert.deepEqual(paths,Array(3).fill('owner.unique.json'));
});
test('A concurrently removed owner ends recovery without touching another filename',async()=>{
 let calls=0;
 await removeOwnerFile('owner.old.json',async()=>{throw Object.assign(new Error('race'),{code:++calls===1?'EBUSY':'ENOENT'});},async()=>{});
 assert.equal(calls,2);
});
test('Permanent sharing failures are bounded and other errors fail closed immediately',async()=>{
 let calls=0;await assert.rejects(removeOwnerFile('owner.old.json',async()=>{calls++;throw Object.assign(new Error('blocked'),{code:'EPERM'});},async()=>{}),{code:'EPERM'});
 assert.equal(calls,12);calls=0;
 await assert.rejects(removeOwnerFile('owner.old.json',async()=>{calls++;throw Object.assign(new Error('denied'),{code:'EACCES'});},async()=>{}),{code:'EACCES'});assert.equal(calls,1);
});

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {StateStore} from '../store.mjs';
import {importBundle,editPost} from '../domain.mjs';
test('Concurrent stale-owner recovery preserves CAS on the actual filesystem',async()=>{
 for(let i=0;i<30;i++){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-lock-race-'));
  try{
   const a=new StateStore(root),b=new StateStore(root);
   await a.mutate(s=>importBundle(s,{bundle_id:'fixture',posts:[{post_id:'p',output_version:'v1'}]}));
   await fs.mkdir(path.join(root,'.state-lock'));
   await fs.writeFile(path.join(root,'.state-lock','owner.11111111-1111-4111-8111-111111111111.json'),JSON.stringify({pid:2147483647}));
   const results=await Promise.allSettled([a.mutate(s=>editPost(s,'p',{caption:'A'},1)),b.mutate(s=>editPost(s,'p',{caption:'B'},1))]);
   assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
   assert.match(results.find(x=>x.status==='rejected').reason.message,/revision_conflict/);
   assert.equal((await a.read()).posts[0].revision,2);
   await assert.rejects(fs.stat(path.join(root,'.state-lock')),{code:'ENOENT'});
  }finally{await fs.rm(root,{recursive:true,force:true});}
 }
});
