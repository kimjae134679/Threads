import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';
import {createStudioServer} from '../server.mjs';import {StateStore} from '../store.mjs';import {importBundle} from '../domain.mjs';
let ReadOnlyViewer;try{({ReadOnlyViewer}=await import('../read-only-viewer.mjs'));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const sha=b=>createHash('sha256').update(b).digest('hex');
async function fixture(fn){
 assert.equal(typeof ReadOnlyViewer,'function','read-only mapped viewer is available');
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'studio-viewer-'));
 try{
  const output=path.join(base,'delivered','outputs','post'),root=path.join(base,'delivered');
  await fs.mkdir(path.join(output,'rendered'),{recursive:true});
  const html='<!doctype html><html><body><h1>Existing full viewer</h1><p>9장 · 검수 전 결과</p><main><img src="rendered/slide-009.png"></main><script>document.body.dataset.readOnly="true"</script></body></html>';
  const image=Buffer.from('fixture bytes');
  await fs.writeFile(path.join(output,'이미지 전체 보기.html'),html);await fs.writeFile(path.join(output,'rendered','slide-001.png'),image);
  const map={rows:[{id:'source-one',output,newOutputVersion:'version-one',images:[{name:'rendered/slide-001.png',file:path.join(output,'rendered','slide-001.png'),sha256:sha(image)}]}]};
  const inventory={files:[{newPath:path.join(output,'이미지 전체 보기.html'),bytes:Buffer.byteLength(html),sha256:sha(html)},
   {newPath:path.join(output,'rendered','slide-001.png'),bytes:image.length,sha256:sha(image)}]};
  const mapBytes=JSON.stringify(map),inventoryBytes=JSON.stringify(inventory);
  await fs.writeFile(path.join(root,'delivery-mapping.json'),mapBytes);await fs.writeFile(path.join(root,'file-inventory.json'),inventoryBytes);
  const navigation={schema:1,delivery_root:root,mapping_sha256:sha(mapBytes),inventory_sha256:sha(inventoryBytes)};
  const manifest=path.join(base,'project.control.json');await fs.writeFile(manifest,JSON.stringify({navigation}));
  const state={posts:[{post_id:'source-one',output_version:'version-one',source:{display_title:'Current title'},images:[{asset_id:sha(image)}]}]};
  const reader=new ReadOnlyViewer(manifest,async()=>state);
  await fn({reader,state,manifest,navigation,output,html,base});
 }finally{await fs.rm(base,{recursive:true,force:true});}
}
test('mapped viewer opens existing HTML and returns to the matching current review without writing files',()=>fixture(async({reader,html,output})=>{
 const index=await reader.read('/viewer/');assert.match(index.bytes.toString(),/source-one/);
 const opened=await reader.read('/viewer/source-one/');assert.match(opened.bytes.toString(),/Existing full viewer/);
 assert.match(opened.bytes.toString(),/\?post=source-one/);assert.match(opened.csp,/connect-src 'none'/);
 assert.match(opened.bytes.toString(),/1장 · 검수 전 결과/);assert.match(opened.bytes.toString(),/src="rendered\/slide-001.png"/);assert.doesNotMatch(opened.bytes.toString(),/slide-009/);
 assert.equal(await fs.readFile(path.join(output,'이미지 전체 보기.html'),'utf8'),html);
 const image=await reader.read('/viewer/source-one/rendered/slide-001.png');assert.equal(image.bytes.toString(),'fixture bytes');
}));
test('HTTP navigation uses the actual configured material root and serves the pinned viewer without changing state',()=>fixture(async({state,base,html,output})=>{
 const data=path.join(base,'data');await new StateStore(data).mutate(s=>importBundle(s,{bundle_id:'viewer-fixture',posts:[{post_id:'source-one',output_version:'version-one',production_caption_status:'authored',caption:'fixture',images:[{asset_id:state.posts[0].images[0].asset_id,order:1,mime:'image/png'}]}]}));
 let app;try{
  app=await createStudioServer({root:data,port:0,seedTags:false,materialRoot:path.join(base,'missing')});
  const before=await fs.readFile(path.join(data,'state.json'));
  const n=await(await fetch(app.url+'/api/navigation')).json();assert.equal(n.available,true);assert.equal(n.posts[0].post_id,'source-one');
  const response=await fetch(app.url+'/viewer/source-one/');assert.equal(response.status,200);assert.match(response.headers.get('content-security-policy'),/connect-src 'none'/);assert.match(await response.text(),/\?post=source-one/);
  assert.equal(await(await fetch(app.url+'/viewer/source-one/rendered/slide-001.png')).text(),'fixture bytes');
  assert.equal((await fetch(app.url+'/viewer/source-one/production-plan.json')).status,404);
  assert.deepEqual(await fs.readFile(path.join(data,'state.json')),before);assert.equal(await fs.readFile(path.join(output,'이미지 전체 보기.html'),'utf8'),html);
 }finally{await app?.close();}
}));
test('viewer refuses stale versions instead of silently opening a previous approved result',()=>fixture(async({reader,state})=>{
 state.posts[0].output_version='newer-version';await assert.rejects(reader.read('/viewer/source-one/'),/viewer_version_changed/);
}));
test('viewer refuses changed image composition even when producer output version is unchanged',()=>fixture(async({reader,state})=>{
 state.posts[0].images=[];await assert.rejects(reader.read('/viewer/source-one/'),/viewer_version_changed/);
 assert.deepEqual((await reader.status()).posts,[]);
}));
test('viewer refuses changed mapping, altered image bytes, and arbitrary filesystem paths',()=>fixture(async({reader,manifest,navigation,output})=>{
 await assert.rejects(reader.read('/viewer/source-one/%2e%2e/state.json'),/viewer_file_not_allowed/);
 await assert.rejects(reader.read('/viewer/source-one/production-plan.json'),/viewer_file_not_allowed/);
 await fs.writeFile(path.join(output,'rendered','slide-001.png'),'changed');
 await assert.rejects(reader.read('/viewer/source-one/rendered/slide-001.png'),/viewer_file_changed/);
 await fs.writeFile(manifest,JSON.stringify({navigation:{...navigation,mapping_sha256:'a'.repeat(64)}}));
 await assert.rejects(reader.read('/viewer/'),/viewer_mapping_changed/);
}));
