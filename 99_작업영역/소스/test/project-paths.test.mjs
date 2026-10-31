import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
test('typed project resolver maps only owned filesystem roots and leaves version/raw JSON unchanged',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'project-map-'));try{
  const {createPathResolver}=require('../desktop/project-paths.cjs'),dir=path.join(root,'local-private/project/자료');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'status.json'),'exact');
  const mappings=[{sourceRoot:'D:\\A_KJ\\AI\\Projects\\Threads',destinationRoot:'local-private/project',classification:'private'}],resolve=createPathResolver({projectRoot:root,pathMappings:mappings});
  assert.equal(resolve('D:\\A_KJ\\AI\\Projects\\Threads\\자료\\status.json'),path.join(dir,'status.json'));
  const original={outputSha256:'sha',sourceFingerprint:'old',path:'D:\\A_KJ\\AI\\Projects\\Threads\\자료\\status.json',url:'https://www.82cook.com/entiz/read.php?bn=15&num=1'},before=JSON.stringify(original);resolve(original.path);assert.equal(JSON.stringify(original),before);
  assert.throws(()=>resolve('D:\\other\\state.json'),/project_path_unmapped/);assert.throws(()=>resolve('https://example.invalid/path'),/project_path_not_filesystem/);
  assert.throws(()=>createPathResolver({projectRoot:root,pathMappings:[{...mappings[0],destinationRoot:'../outside'}]}),/project_path_escape/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('configured resolver caches only an unchanged manifest identity and invalidates replaced bytes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'project-map-cache-'));try{
  const {configuredResolver}=require('../desktop/project-paths.cjs'),file=path.join(root,'local-private/migration-manifest.json');await fs.mkdir(path.dirname(file),{recursive:true});
  const plan=destinationRoot=>({schema:'threads-unified-migration-v1',projectRoot:root,pathMappings:[{sourceRoot:'D:/original',destinationRoot}],largeUnusedRecords:{state:'preserved'}});await fs.writeFile(file,JSON.stringify(plan('local-private/first')));
  const first=configuredResolver(root);assert.strictEqual(configuredResolver(root),first);assert.equal(first('D:/original/file.txt'),path.join(root,'local-private/first/file.txt'));
  const before=await fs.stat(file),replacement=file+'.replacement';await fs.writeFile(replacement,JSON.stringify(plan('local-private/other')));await fs.utimes(replacement,before.atime,before.mtime);await fs.rename(replacement,file);const next=configuredResolver(root);assert.notStrictEqual(next,first);assert.equal(next('D:/original/file.txt'),path.join(root,'local-private/other/file.txt'));assert.strictEqual(configuredResolver(root),next);assert.equal(first('D:/original/file.txt'),path.join(root,'local-private/other/file.txt'));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('project path resolver blocks linked ancestors and exact mapping shadow escapes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'project-map-'));const outside=await fs.mkdtemp(path.join(os.tmpdir(),'outside-map-'));try{
  const {createPathResolver}=require('../desktop/project-paths.cjs');await fs.mkdir(path.join(root,'local-private'));await fs.symlink(outside,path.join(root,'local-private/link'),'junction');
  const resolve=createPathResolver({projectRoot:root,pathMappings:[{sourceRoot:'D:\\source',destinationRoot:'local-private/link',classification:'private'}]});assert.throws(()=>resolve('D:\\source\\file'),/project_path_symlink/);
 }finally{await fs.rm(root,{recursive:true,force:true});await fs.rm(outside,{recursive:true,force:true});}
});

test('actual producer/checkpoint consumers resolve copied paths without rewriting version evidence',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'project-consumer-')),previous=process.env.THREADS_PROJECT_ROOT;try{
  const old='D:\\legacy\\materials',oldRun='D:\\legacy\\run',material=path.join(root,'local-private/materials'),run=path.join(root,'local-private/run');await fs.mkdir(path.join(material,'06_자동 제작 결과'),{recursive:true});await fs.mkdir(path.join(run,'outputs/post'),{recursive:true});await fs.mkdir(path.join(run,'checkpoints/relocated'),{recursive:true});
  const row={id:'existing',sourceFingerprint:'same-source',outputSha256:'same-output',ruleVersion:'same-rule',reviewRound:'same-round',images:[{name:'rendered/slide-001.png',sha256:'a'.repeat(64)}],outputFolder:'post'};
  await fs.writeFile(path.join(material,'06_자동 제작 결과/status.json'),JSON.stringify({entries:[row]}));
  const {productionVersion,ProductionInput}=await import('../upload-studio/production-input.mjs'),{CheckpointProductionInput}=await import('../upload-studio/checkpoint-production-input.mjs');
  const checkpoint={state:'complete',id:row.id,changed:row,target:oldRun+'\\outputs\\post',versionLinks:{newOutputVersion:productionVersion(row)},files:[]},raw=JSON.stringify(checkpoint);await fs.writeFile(path.join(run,'checkpoints/relocated/post.json'),raw);
  await fs.writeFile(path.join(root,'local-private/migration-manifest.json'),JSON.stringify({schema:'threads-unified-migration-v1',projectRoot:root,pathMappings:[{sourceRoot:old,destinationRoot:'local-private/materials',classification:'private'},{sourceRoot:oldRun,destinationRoot:'local-private/run',classification:'private'}]}));process.env.THREADS_PROJECT_ROOT=root;
  const actual=(await new ProductionInput(old,{}).rows())[0];assert.deepEqual(actual,row);assert.equal(productionVersion(actual),productionVersion(row));
  const completed=(await new CheckpointProductionInput(oldRun,{}, {checkpointDirectory:'checkpoints/relocated'}).rows())[0];assert.equal(productionVersion(completed),productionVersion(row));assert.equal(await fs.readFile(path.join(run,'checkpoints/relocated/post.json'),'utf8'),raw);
 }finally{if(previous===undefined)delete process.env.THREADS_PROJECT_ROOT;else process.env.THREADS_PROJECT_ROOT=previous;await fs.rm(root,{recursive:true,force:true});}
});

test('reference store writes only mapped private copies and does not alter the original reference history',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'reference-map-')),old=path.join(root,'original'),project=path.join(root,'project'),prior=process.env.THREADS_PROJECT_ROOT;try{
  await fs.mkdir(old);await fs.writeFile(path.join(old,'history.txt'),'old history');await fs.mkdir(path.join(project,'local-private/references'),{recursive:true});await fs.writeFile(path.join(project,'local-private/migration-manifest.json'),JSON.stringify({schema:'threads-unified-migration-v1',projectRoot:project,pathMappings:[{sourceRoot:old,destinationRoot:'local-private/references',classification:'private'}]}));process.env.THREADS_PROJECT_ROOT=project;
  const {createReferenceStore}=require('../desktop/reference-store.cjs'),store=createReferenceStore(old);await store.save({projectId:'example',images:[],summary:{originalImages:[],approvedExample:false},events:[]});assert.equal(store.root,path.join(project,'local-private/references'));assert.deepEqual(await fs.readdir(old),['history.txt']);assert.equal(await fs.readFile(path.join(old,'history.txt'),'utf8'),'old history');
 }finally{if(prior===undefined)delete process.env.THREADS_PROJECT_ROOT;else process.env.THREADS_PROJECT_ROOT=prior;await fs.rm(root,{recursive:true,force:true});}
});
