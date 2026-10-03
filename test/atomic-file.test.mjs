import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const {writeAtomic}=createRequire(import.meta.url)('../desktop/atomic-file.cjs');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'threads-atomic-'));
try {
  const file=path.join(root,'status.json');
  await fs.writeFile(file,'old');
  let renames=0;
  const sleeps=[];
  await writeAtomic(file,'new',{pause:async ms=>sleeps.push(ms),io:{...fs,rename:async(from,to)=>{
    renames++;
    if(renames<3) {
      assert.equal(await fs.readFile(file,'utf8'),'old');
      throw Object.assign(new Error('temporary Windows file lock'),{code:'EPERM'});
    }
    await fs.rename(from,to);
  }}});
  assert.equal(renames,3);
  assert.deepEqual(sleeps,[50,100]);
  assert.equal(await fs.readFile(file,'utf8'),'new');
  await assert.rejects(writeAtomic(file,'blocked',{attempts:2,pause:async()=>{},io:{...fs,
    rename:async()=>{throw Object.assign(new Error('persistent access denial'),{code:'EACCES'});}
  }}),{code:'EACCES'});
  assert.equal(await fs.readFile(file,'utf8'),'new');
  const temps=[];
  await Promise.all(['one','two'].map((value,index)=>writeAtomic(path.join(root,'parallel-'+index),value,{
    io:{...fs,writeFile:async(temp,...args)=>{temps.push(temp);return fs.writeFile(temp,...args);}}
  })));
  assert.equal(new Set(temps).size,2);
  assert.deepEqual((await fs.readdir(root)).filter(name=>name.endsWith('.tmp')),[]);
  console.log('Atomic ledger replacement retries transient locks, preserves prior data on denial and uses unique temporary files: PASS');
} finally {await fs.rm(root,{recursive:true,force:true});}
