import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAssetLoader} from '../app/asset-loader.js';
import {png} from './github-fixture.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const image=bytes=>({sha256:hash(bytes),url:'/v1/review/assets/'+hash(bytes)+'.png'});
const pause=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){const deadline=Date.now()+5000;while(!predicate()){if(Date.now()>=deadline)throw Error('Timed out waiting for queued asset transfer');await new Promise(resolve=>setTimeout(resolve,2));}}
function fixture(options={}) {
 const cache=new Map(),calls=[],gates=[];let provider={downloadAsset:async img=>{calls.push(img.sha256);if(options.delay)await new Promise(resolve=>gates.push(resolve));return new Blob([png],{type:'image/png'});}};
 const loader=createAssetLoader({read:async h=>cache.get(h),write:async(h,b)=>cache.set(h,b),getProvider:()=>provider,concurrency:2});
 return {loader,cache,calls,gates,setProvider:p=>provider=p};
}

test('exact hash cache works while disabled and downloads coalesce durably',async()=>{
 const f=fixture({delay:true}),img=image(png),a=f.loader.load(img),b=f.loader.load(img);await pause();assert.equal(f.calls.length,1);f.gates.shift()();assert.equal(await a,await b);assert.equal(f.cache.size,1);f.setProvider(null);assert.ok(await f.loader.load(img));assert.equal(f.calls.length,1);
});
test('corrupt cached PNG is never displayed and verified replacement is persisted',async()=>{
 const f=fixture(),img=image(png);f.cache.set(img.sha256,new Blob(['wrong']));assert.ok(await f.loader.load(img));assert.equal(f.calls.length,1);assert.equal(hash(Buffer.from(await f.cache.get(img.sha256).arrayBuffer())),img.sha256);
});
test('incorrect download hash and signature cannot enter durable cache',async()=>{
 const f=fixture(),bad=image(Buffer.from('bad'));await assert.rejects(f.loader.load(bad),/hash|PNG/i);assert.equal(f.cache.size,0);
 f.setProvider({downloadAsset:async()=>new Blob(['bad'])});await assert.rejects(f.loader.load(bad),/PNG/i);assert.equal(f.cache.size,0);
});
test('at most two active transfers and a retired queued page never downloads',async()=>{
 const f=fixture({delay:true}),imgs=[0,1,2,3].map(n=>({...image(png),sha256:String(n).repeat(64)}));
 const controller=new AbortController();const outcomes=[f.loader.load(imgs[0]),f.loader.load(imgs[1]),f.loader.load(imgs[2],{signal:controller.signal}),f.loader.load(imgs[3])].map(p=>p.catch(e=>e));
 await until(()=>f.calls.length===2);assert.equal(f.calls.length,2);controller.abort();f.gates.splice(0).forEach(release=>release());
 // SHA-256 verification uses the worker pool. Await actual outcomes rather than
 // assuming one event-loop tick is enough under parallel-suite contention.
 const first=await Promise.all(outcomes.slice(0,2));for(const error of first)assert.match(error.message,/hash mismatch/);
 await until(()=>f.calls.length===3);assert.equal(f.calls.length,3);assert.ok(!f.calls.includes(imgs[2].sha256));f.gates.splice(0).forEach(release=>release());assert.equal((await outcomes[2]).name,'AbortError');await Promise.all(outcomes);
});
test('retiring one duplicate consumer keeps another alive',async()=>{
 const f=fixture({delay:true}),controller=new AbortController(),img=image(png);const retired=f.loader.load(img,{signal:controller.signal}).catch(e=>e),active=f.loader.load(img);await pause();controller.abort();f.gates.shift()();assert.equal((await retired).name,'AbortError');assert.ok(await active);assert.equal(f.calls.length,1);
});
test('connection binding change during transfer rejects the result without caching',async()=>{
 const f=fixture({delay:true}),p=f.loader.load(image(png));await pause();f.setProvider(null);f.gates.shift()();await assert.rejects(p,/connection|provider/i);assert.equal(f.cache.size,0);
});
test('disabled connection reports unavailable and never touches review state',async()=>{
 const f=fixture();f.setProvider(null);await assert.rejects(f.loader.load(image(png)),/connection|offline/i);assert.equal(f.calls.length,0);assert.equal(f.cache.size,0);
});
