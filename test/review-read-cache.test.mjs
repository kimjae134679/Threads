import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),canonical=require('../desktop/review-canonical-writer.cjs');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'threads-read-cache-'));
try{
 const file=path.join(root,'status.json');await fs.writeFile(file,'{"value":1}');
 let reads=0;const original=fs.open;fs.open=async(...args)=>{const handle=await original(...args);if(path.resolve(args[0])===file){const read=handle.read.bind(handle);handle.read=async(...a)=>{reads++;return read(...a);};}return handle;};
 try{
  const read=canonical.createCanonicalReader(root,{maxEntries:2,maxBytes:1024});
  assert.equal(await read(file,'utf8'),'{"value":1}');const firstReads=reads;assert.equal(await read(file,'utf8'),'{"value":1}');assert.equal(reads,firstReads,'Unchanged bytes must not be reread; file access is still checked');
  const before=await fs.stat(file);await fs.writeFile(file,'{"value":2}');await fs.utimes(file,before.atime,before.mtime);
  assert.equal(await read(file,'utf8'),'{"value":2}','Same length and restored mtime still invalidate through ctime');assert(reads>firstReads);
  const replacement=path.join(root,'replace.json');await fs.writeFile(replacement,'{"value":3}');await fs.rename(replacement,file);
  assert.equal(await read(file,'utf8'),'{"value":3}','Atomic replacement invalidates cached identity');
  await fs.link(file,path.join(root,'alias.json'));await assert.rejects(read(file,'utf8'),/linked|non-file/,'A cached file must still reject new hard links');await fs.unlink(path.join(root,'alias.json'));
  await fs.unlink(file);await assert.rejects(read(file,'utf8'),{code:'ENOENT'});
  await fs.writeFile(file,'{"value":4}');assert.equal(await read(file,'utf8'),'{"value":4}');
  const uncached=canonical.createCanonicalReader(root,{maxEntries:2,maxBytes:4});await uncached(file,'utf8');const count=reads;await uncached(file,'utf8');assert(reads>count,'An oversized cache entry must stay uncached');
  const bounded=canonical.createCanonicalReader(root,{maxEntries:10,maxBytes:100});await fs.writeFile(file,'x'.repeat(100));await bounded(file,'utf8');await fs.writeFile(file,'x'.repeat(10));await Promise.all([bounded(file,'utf8'),bounded(file,'utf8')]);
  const other=path.join(root,'other.json');await fs.writeFile(other,'y'.repeat(100));await bounded(other,'utf8');const concurrentReads=reads;await bounded(file,'utf8');assert(reads>concurrentReads,'Concurrent replacement must account against the currently cached entry and enforce the total byte cap');
 }finally{fs.open=original;}
 console.log('canonical read cache: unchanged bytes reused; replacement, same-size writes, hardlinks and missing files detected PASS');
}finally{await fs.rm(root,{recursive:true,force:true});}
