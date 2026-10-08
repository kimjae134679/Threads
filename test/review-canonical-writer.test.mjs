import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {test} from 'node:test';
import crypto from 'node:crypto';
const require=createRequire(import.meta.url);
const modulePath=path.resolve('desktop/review-canonical-writer.cjs');
const api=()=>require(modulePath);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'threads-canonical-writer-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
function child(root,code){return spawn(process.execPath,['-e',`const fs=require('node:fs/promises'); const {withCanonicalWriter}=require(${JSON.stringify(modulePath)}); const root=${JSON.stringify(root)}; ${code}`],{stdio:['ignore','pipe','pipe']});}
async function done(p){let stderr='';p.stderr.on('data',b=>stderr+=b);const [code]=await once(p,'exit');assert.equal(code,0,stderr);}

test('per-root barrier awaits work exactly once, reenters, and releases after failure',async t=>{
 const root=await fixture(t),{withCanonicalWriter,bindCanonicalWriter,isCanonicalWriterHeld}=api();let calls=0;
 assert.equal(isCanonicalWriterHeld(root),false);
 assert.equal(await bindCanonicalWriter(root)(async()=>{calls++;assert.equal(isCanonicalWriterHeld(root),true);return withCanonicalWriter(root,async()=>{await pause(10);return 42;});}),42);
 assert.equal(calls,1);assert.equal(isCanonicalWriterHeld(root),false);
 await assert.rejects(withCanonicalWriter(root,async()=>{throw Error('synthetic failure');}),/synthetic/);
 assert.equal(await withCanonicalWriter(root,async()=>7),7);
});
test('separate processes serialize complete read-modify-write and lock survives moving 07',async t=>{
 const root=await fixture(t);api();await fs.writeFile(path.join(root,'count'),'0');
 const jobs=Array.from({length:4},()=>child(root,`(async()=>{for(let i=0;i<8;i++)await withCanonicalWriter(root,async()=>{const n=Number(await fs.readFile(root+'/count'));await new Promise(r=>setTimeout(r,3));await fs.writeFile(root+'/count',String(n+1));});})().catch(e=>{console.error(e);process.exitCode=1;});`));
 await Promise.all(jobs.map(done));assert.equal(await fs.readFile(path.join(root,'count'),'utf8'),'32');
 await api().withCanonicalWriter(root,async()=>{const before=await fs.readFile(path.join(root,'review-canonical-writer.lock'));await fs.mkdir(path.join(root,'07_synthetic'));await fs.rename(path.join(root,'07_synthetic'),path.join(root,'archived-07'));assert.deepEqual(await fs.readFile(path.join(root,'review-canonical-writer.lock')),before);});
});
test('process interruption permits serialized known-dead owner reclamation',async t=>{
 const root=await fixture(t);api();const owner=child(root,`withCanonicalWriter(root,async()=>{console.log('HELD');await new Promise(()=>{});});setInterval(()=>{},1000);`);
 await once(owner.stdout,'data');const exited=once(owner,'exit');owner.kill();await exited;
 const contenders=Array.from({length:4},()=>child(root,`withCanonicalWriter(root,async()=>{await fs.appendFile(root+'/reclaimed','x');}).catch(e=>{console.error(e);process.exitCode=1;});`));
 await Promise.all(contenders.map(done));assert.equal(await fs.readFile(path.join(root,'reclaimed'),'utf8'),'xxxx');
});
test('interruption during reclamation recovers the known-dead reclamation guard safely',async t=>{
 const root=await fixture(t);api();const departed=spawn(process.execPath,['-e',''],{stdio:'ignore'});await once(departed,'exit');
 const dead=JSON.stringify({pid:departed.pid,host:os.hostname(),nonce:'synthetic-dead-reclaimer'});
 await fs.writeFile(path.join(root,'review-canonical-writer.lock'),dead);await fs.writeFile(path.join(root,'review-canonical-writer.lock.reclaim'),dead);
 const jobs=Array.from({length:3},()=>child(root,`withCanonicalWriter(root,async()=>{await fs.appendFile(root+'/recovery','x');}).catch(e=>{console.error(e);process.exitCode=1;});`));
 await Promise.all(jobs.map(done));assert.equal(await fs.readFile(path.join(root,'recovery'),'utf8'),'xxx');
});
test('transient Windows busy guard reads retry and still reclaim only the dead owner',async t=>{
 const root=await fixture(t),departed=spawn(process.execPath,['-e',''],{stdio:'ignore'});await once(departed,'exit');const lock=path.join(root,'review-canonical-writer.lock'),guard=lock+'.reclaim',dead=JSON.stringify({pid:departed.pid,host:os.hostname(),nonce:'synthetic-dead'});await fs.writeFile(lock,dead);await fs.writeFile(guard,dead);
 const originalRead=fs.readFile;let failures=0,calls=0;
 fs.readFile=async(file,...args)=>{if(file===guard){calls++;if(failures++<2)throw Object.assign(Error('synthetic delete-pending guard'),{code:'EPERM'});}return originalRead(file,...args);};
 try{assert.equal(await api().withCanonicalWriter(root,async()=>73),73);assert.ok(calls>=3);}finally{fs.readFile=originalRead;}
 await assert.rejects(fs.stat(lock),{code:'ENOENT'});
});
test('transient Windows busy ownership reads retry during release',async t=>{
 const root=await fixture(t),lock=path.join(root,'review-canonical-writer.lock'),originalRead=fs.readFile;let failures=0,workCalls=0;
 fs.readFile=async(file,...args)=>{if(file===lock&&failures++<2)throw Object.assign(Error('synthetic busy release read'),{code:'EPERM'});return originalRead(file,...args);};
 try{await api().withCanonicalWriter(root,async()=>{workCalls++;});assert.equal(workCalls,1);assert.ok(failures>=3);}finally{fs.readFile=originalRead;}
 await assert.rejects(fs.stat(lock),{code:'ENOENT'});
});
test('persistent busy lock reads are bounded and never authorize work or remove the lock',async t=>{
 const root=await fixture(t),departed=spawn(process.execPath,['-e',''],{stdio:'ignore'});await once(departed,'exit');const lock=path.join(root,'review-canonical-writer.lock'),before=JSON.stringify({pid:departed.pid,host:os.hostname(),nonce:'synthetic-denied'});await fs.writeFile(lock,before);
 const originalRead=fs.readFile;let attempts=0,workCalls=0;fs.readFile=async(file,...args)=>{if(file===lock){attempts++;throw Object.assign(Error('synthetic persistent denial'),{code:'EPERM'});}return originalRead(file,...args);};const started=Date.now();
 try{await assert.rejects(api().withCanonicalWriter(root,async()=>{workCalls++;}),{code:'EPERM'});assert.equal(workCalls,0);assert.ok(attempts>1);assert.ok(Date.now()-started<2500);}finally{fs.readFile=originalRead;}
 assert.equal(await fs.readFile(lock,'utf8'),before);
});
test('busy-read retries recheck ownership and preserve a replacement owner on release',async t=>{
 const root=await fixture(t),lock=path.join(root,'review-canonical-writer.lock'),replacement=JSON.stringify({pid:process.pid,host:os.hostname(),nonce:'synthetic-replacement'}),originalRead=fs.readFile;let injected=false;
 fs.readFile=async(file,...args)=>{if(file===lock&&!injected){injected=true;await fs.writeFile(lock,replacement);throw Object.assign(Error('synthetic busy replaced lock'),{code:'EPERM'});}return originalRead(file,...args);};
 try{await assert.rejects(api().withCanonicalWriter(root,async()=>{}),/ownership changed/);}finally{fs.readFile=originalRead;}
 assert.equal(await fs.readFile(lock,'utf8'),replacement);
});
test('malformed owners and uncertain reclamation fail closed without touching lock',async t=>{
 const root=await fixture(t),lock=path.join(root,'review-canonical-writer.lock');await fs.writeFile(lock,JSON.stringify({pid:0}));const before=await fs.readFile(lock);
 await assert.rejects(api().withCanonicalWriter(root,async()=>assert.fail('must not execute')),/owner|lock|canonical/i);assert.deepEqual(await fs.readFile(lock),before);
});

const {createPostReviewStore,version}=require('../desktop/post-review-store.cjs');
const {migrateFeedback}=require('../desktop/feedback-migration.cjs');
const {prepareReviewRelease,activateReviewRelease}=require('../desktop/review-release.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function json(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value));}
async function reviewFixture(t,count=20){
 const root=await fixture(t),out=path.join(root,'06_자동 제작 결과'),png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1080,16);
 const rows=Array.from({length:count},(_,i)=>({id:'fixture-'+i,title:'Synthetic '+i,status:'generated',outputFolder:'posts/'+i,sourceFingerprint:'source',outputSha256:'v1',ruleVersion:'synthetic',images:[1,2].map(n=>({name:`rendered/slide-00${n}.png`,sha256:hash(png)}))}));
 for(const row of rows){const dir=path.join(out,row.outputFolder);await json(path.join(dir,'production-plan.json'),{ruleVersion:row.ruleVersion,pages:[{role:'cover'},{role:'body'}]});await fs.mkdir(path.join(dir,'rendered'));for(const image of row.images)await fs.writeFile(path.join(dir,image.name),png);}
 await json(path.join(out,'status.json'),{processed:count,entries:rows});const store=createPostReviewStore(root),metadata={receipts:[{operationId:'synthetic-receipt'}],revisions:{fixture:2},decisionRecords:[{decision:'publish_approved'}]};
 await json(store.file,{schemaVersion:1,recordType:'user_post_quality_feedback',evaluations:[],mobileImport:metadata});return {root,rows,store,metadata};
}
test('multiple real PC stores preserve all scores, visits, decisions and mobile provenance',async t=>{
 const {root,rows,store,metadata}=await reviewFixture(t),stores=[store,createPostReviewStore(root),createPostReviewStore(root)];
 await Promise.all(rows.map((row,i)=>stores[i%3].save({id:row.id,outputVersion:version(row),score:8,note:'synthetic'})));
 await Promise.all([1,2].map((page,i)=>stores[i].visit({id:rows[0].id,outputVersion:version(rows[0]),page})));
 await Promise.all([0,1].map(i=>stores[i].decide({id:rows[1].id,outputVersion:version(rows[1]),disposition:'held',reasonCode:'production_error',note:'synthetic '+i})));
 const data=JSON.parse(await fs.readFile(store.file));assert.equal(data.evaluations.length,rows.length);assert.deepEqual(data.mobileImport,metadata);
 const listing=await store.list();assert.deepEqual(listing.entries[0].progress.pagesSeen,[1,2]);assert.equal(listing.entries[1].progress.decisions.length,2);
});
test('owned snapshot and queued owned saves never await a PC writer waiting for their shared lock',async t=>{
 const {root,rows,store}=await reviewFixture(t,3);let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const holder=store.withCanonicalWriter(async()=>{entered();await gate;const listing=await store.list();assert.equal(listing.entries.length,3);await store.image(rows[0].id,1,version(rows[0]));await Promise.all([1,2].map(i=>createPostReviewStore(root).save({id:rows[i].id,outputVersion:version(rows[i]),score:i,note:'owned synthetic'})));});
 await ready;const pending=store.save({id:rows[0].id,outputVersion:version(rows[0]),score:5,note:'queued synthetic'});release();await Promise.race([Promise.all([holder,pending]),pause(3000).then(()=>{throw Error('owned read/write deadlock');})]);
 assert.equal(JSON.parse(await fs.readFile(store.file)).evaluations.length,3);
});
test('direct legacy migration waits for root barrier and preserves provenance',async t=>{
 const {root,rows,store,metadata}=await reviewFixture(t,1),legacy=path.join(root,'legacy.json');await json(legacy,{schemaVersion:1,evaluations:[{id:rows[0].id,outputVersion:version(rows[0]),updatedAt:'2026-10-08T00:00:00Z',score:3,note:'synthetic legacy'}]});
 let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r),held=api().withCanonicalWriter(root,async()=>{entered();await gate;});await ready;
 const migrating=migrateFeedback(store.file,legacy);await pause(40);assert.equal(JSON.parse(await fs.readFile(store.file)).evaluations.length,0);release();await Promise.all([held,migrating]);assert.deepEqual(JSON.parse(await fs.readFile(store.file)).mobileImport,metadata);
});
test('activation CAS waits for mobile writer and archives its complete transaction folder',async t=>{
 const {root,store}=await reviewFixture(t,1),stage=path.join(await fixture(t),'stage');await prepareReviewRelease(root,stage,{reviewRound:'synthetic-next',expectedPosts:1});
 const status=path.join(root,'06_자동 제작 결과','status.json'),before=await fs.readFile(store.file),expected={expectedStatusSha256:hash(await fs.readFile(status)),expectedFeedbackSha256:hash(before),expectedWorkflowSha256:null,expectedPointerSha256:null};
 let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r),held=api().withCanonicalWriter(root,async()=>{entered();await gate;const data=JSON.parse(before);data.syntheticMobileWrite=true;await fs.writeFile(store.file,JSON.stringify(data));await json(path.join(store.file+'.mobile-import','synthetic.before.bin'),{synthetic:true});await json(path.join(store.file+'.mobile-import','synthetic.journal.json'),{synthetic:true});});await ready;
 const activating=activateReviewRelease(root,stage,expected);let settled=false;activating.then(()=>settled=true,()=>settled=true);await pause(30);assert.equal(settled,false);release();await held;await assert.rejects(activating);const changed=await fs.readFile(store.file);
 const applied=await activateReviewRelease(root,stage,{...expected,expectedFeedbackSha256:hash(changed)});assert.deepEqual(await fs.readFile(path.join(applied.archive,'07_사용자 평가','평가 기록.json')),changed);assert.deepEqual(JSON.parse(await fs.readFile(path.join(applied.archive,'07_사용자 평가','평가 기록.json.mobile-import','synthetic.journal.json'))),{synthetic:true});assert.equal((await store.list()).reviewRound,'synthetic-next');
});
test('owned reads wait for earlier owned writes while bypassing unrelated external waiters',async t=>{
 const {root,rows,store}=await reviewFixture(t,1),originalRename=fs.rename;let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 fs.rename=async(from,to)=>{if(to===store.file){entered();await gate;}return originalRename(from,to);};
 try{await store.withCanonicalWriter(async()=>{
  const saving=store.save({id:rows[0].id,outputVersion:version(rows[0]),score:9,note:'ordered synthetic'});await ready;
  const reading=store.list();let settled=false;reading.then(()=>settled=true,()=>settled=true);
  await pause(30);try{assert.equal(settled,false);}finally{release();await saving;}
  assert.equal((await reading).entries[0].current.score,9);
 });}finally{fs.rename=originalRename;release();}
});
test('independent PC processes share the actual store hook and retain every evaluation',async t=>{
 const {root,rows,store,metadata}=await reviewFixture(t,12),storeModule=path.resolve('desktop/post-review-store.cjs');
 const jobs=[0,1,2].map(index=>child(root,`(async()=>{const {createPostReviewStore}=require(${JSON.stringify(storeModule)});const store=createPostReviewStore(root);const rows=(await store.list()).entries;for(let i=${index};i<rows.length;i+=3)await store.save({id:rows[i].id,outputVersion:rows[i].outputVersion,score:7,note:'crossprocess synthetic'});})().catch(e=>{console.error(e);process.exitCode=1;});`));
 await Promise.all(jobs.map(done));const data=JSON.parse(await fs.readFile(store.file));assert.equal(data.evaluations.length,rows.length);assert.deepEqual(data.mobileImport,metadata);
});
test('read-only store rejects linked canonical feedback and images before exposing bytes',async t=>{
 const {root,rows,store}=await reviewFixture(t,1),outside=await fixture(t),leak=path.join(outside,'linked-feedback.json');
 await fs.rename(store.file,leak);await fs.link(leak,store.file);const reader=createPostReviewStore(root,{readOnly:true});
 await assert.rejects(reader.list(),/link|canonical|bound/i);
 await fs.unlink(store.file);await fs.copyFile(leak,store.file);
 const image=path.join(root,'06_자동 제작 결과',rows[0].outputFolder,rows[0].images[0].name),outsideImage=path.join(outside,'linked-image.png');await fs.rename(image,outsideImage);await fs.link(outsideImage,image);
 await assert.rejects(reader.image(rows[0].id,1,version(rows[0])),/link|canonical|bound/i);
});
test('read-only store rejects symlinked canonical feedback',async t=>{
 const {root,store}=await reviewFixture(t,1),outside=await fixture(t),leak=path.join(outside,'symlink-feedback.json');await fs.rename(store.file,leak);
 try{await fs.symlink(leak,store.file);}catch(e){if(e.code==='EPERM'){t.skip('Host does not permit symbolic links');return;}throw e;}
 await assert.rejects(createPostReviewStore(root,{readOnly:true}).list(),/link|canonical|bound/i);
});
test('legacy migration rejects linked canonical input and preserves external bytes',async t=>{
 const {root,store}=await reviewFixture(t,1),outside=await fixture(t),external=path.join(outside,'synthetic-feedback.json');await fs.rename(store.file,external);await fs.link(external,store.file);const before=await fs.readFile(external);
 await assert.rejects(migrateFeedback(store.file,null,root),/link|canonical/i);assert.deepEqual(await fs.readFile(external),before);
});
test('direct migration inside an owned barrier waits behind an earlier owned save',async t=>{
 const {root,rows,store}=await reviewFixture(t,2),legacy=path.join(root,'legacy.json');await json(legacy,{schemaVersion:1,evaluations:[{id:rows[1].id,outputVersion:version(rows[1]),updatedAt:'2026-10-08T00:00:00Z',score:3,note:'synthetic legacy'}]});
 const originalRename=fs.rename;let entered,release,first=true;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 fs.rename=async(from,to)=>{if(to===store.file&&first){first=false;entered();await gate;}return originalRename(from,to);};
 try{await store.withCanonicalWriter(async()=>{const saving=store.save({id:rows[0].id,outputVersion:version(rows[0]),score:7,note:'synthetic PC'});await ready;const migrating=migrateFeedback(store.file,legacy,root);let settled=false;migrating.then(()=>settled=true,()=>settled=true);await pause(30);try{assert.equal(settled,false);}finally{release();await saving;await migrating;}assert.equal(JSON.parse(await fs.readFile(store.file)).evaluations.length,2);});}finally{fs.rename=originalRename;release();}
});
test('activation inside an owned barrier checks CAS after earlier owned saves finish',async t=>{
 const {root,rows,store}=await reviewFixture(t,1),stage=path.join(await fixture(t),'stage');await prepareReviewRelease(root,stage,{reviewRound:'synthetic-owned-next',expectedPosts:1});
 const expected={expectedStatusSha256:hash(await fs.readFile(path.join(root,'06_자동 제작 결과','status.json'))),expectedFeedbackSha256:hash(await fs.readFile(store.file)),expectedWorkflowSha256:null,expectedPointerSha256:null},originalRename=fs.rename;let entered,release,first=true;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 fs.rename=async(from,to)=>{if(to===store.file&&first){first=false;entered();await gate;}return originalRename(from,to);};
 try{await store.withCanonicalWriter(async()=>{const saving=store.save({id:rows[0].id,outputVersion:version(rows[0]),score:7,note:'synthetic PC'});await ready;const activating=activateReviewRelease(root,stage,expected);let settled=false;activating.then(()=>settled=true,()=>settled=true);await pause(30);try{assert.equal(settled,false);}finally{release();await Promise.allSettled([saving,activating]);}await assert.rejects(activating);assert.equal((await store.list()).entries[0].current.score,7);});}finally{fs.rename=originalRename;release();}
});
