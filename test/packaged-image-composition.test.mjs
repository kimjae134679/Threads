import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';
import vm from 'node:vm';import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
test('flattened desktop package resolves image contract without repository docs and ships exact schema',async t=>{
 const root=new URL('../',import.meta.url),pkg=JSON.parse(await fs.readFile(new URL('desktop/package.json',root),'utf8'));
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'packaged-image-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 for(const file of ['image-requirements.cjs','image-requirements-schema.json','image-composition.cjs']){assert(pkg.build.files.includes(file));await fs.copyFile(new URL('desktop/'+file,root),path.join(dir,file));}
 assert.deepEqual(JSON.parse(await fs.readFile(new URL('docs/schemas/image-requirements-v1.schema.json',root),'utf8')),JSON.parse(await fs.readFile(path.join(dir,'image-requirements-schema.json'),'utf8')));
 const contract=require(path.join(dir,'image-requirements.cjs')),consumer=require(path.join(dir,'image-composition.cjs'));
 assert.equal(await contract.loadImageRequirements(dir),null);assert.equal(await consumer.prepareImageComposition(null),null);
 assert(pkg.build.extraResources[0].filter.includes('source-batch*.js'));
});

test('desktop protocol permits every local batch renderer script',async()=>{
 const main=await fs.readFile(new URL('../desktop/main.cjs',import.meta.url),'utf8');
 const declaration=main.match(/const allowed = new Set\(\[[\s\S]*?\]\);/)[0];
 const additions=[...main.matchAll(/allowed\.add\('[^']+'\);/g)].map(m=>m[0]).join('\n');
 const allowed=vm.runInNewContext(declaration+'\n'+additions+'\nallowed');
 const html=await fs.readFile(new URL('../app/source-batch.html',import.meta.url),'utf8');
 for(const match of html.matchAll(/<script\s+src="\.\/([^"]+)"/g))assert(allowed.has(match[1]),'protocol blocks renderer dependency: '+match[1]);
});

test('flattened package loads batch model and ZIP tools from resources/editor',async t=>{
 const root=new URL('../',import.meta.url),pkg=JSON.parse(await fs.readFile(new URL('desktop/package.json',root),'utf8'));
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'packaged-cover-paths-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const app=path.join(dir,'resources','app'),editor=path.join(dir,'resources','editor');
 await fs.mkdir(path.join(app,'node_modules','electron'),{recursive:true});await fs.mkdir(editor,{recursive:true});
 for(const name of pkg.build.files.filter(n=>n.endsWith('.cjs')))await fs.copyFile(new URL('desktop/'+name,root),path.join(app,name));
 for(const name of ['universal-production-model.js','source-cut-zip.js','source-bundle-zip.js','source-page-plan.js'])await fs.copyFile(new URL('app/'+name,root),path.join(editor,name));
 await fs.writeFile(path.join(app,'node_modules','electron','index.js'),'module.exports={app:{isPackaged:true}};');
 const script=`Object.defineProperty(process.versions,'electron',{value:'test'});process.resourcesPath=${JSON.stringify(path.join(dir,'resources'))};const assert=require('node:assert/strict');const batch=require(${JSON.stringify(path.join(app,'batch-render.cjs'))});assert.equal(typeof batch.renderBatchInput,'function');(async()=>{const tools=await require(${JSON.stringify(path.join(app,'reflow-review-covers-run.cjs'))}).createZipTools();const entries=await tools.read(await tools.zip([{name:'proof.txt',data:Buffer.from('cover')}])) ;assert.equal(Buffer.from(entries.get('proof.txt')).toString(),'cover');console.log('PACKAGED_PATHS_PASS');})().catch(e=>{console.error(e);process.exitCode=1;});`;
 assert.match(execFileSync(process.execPath,['-e',script],{encoding:'utf8'}),/PACKAGED_PATHS_PASS/);
});

test('packaged single-cover request starts the producer without review or editor startup',async()=>{
 const main=await fs.readFile(new URL('../desktop/main.cjs',import.meta.url),'utf8'),calls=[];
 vm.runInNewContext(main,{process:{argv:['Threads Cut Editor.exe','--image-production-request=C:\\request.json']},require:name=>{calls.push(name);if(name!=='./image-production-run.cjs')throw Error('unexpected interactive startup: '+name);return {};}});
 assert.deepEqual(calls,['./image-production-run.cjs']);
 const pkg=JSON.parse(await fs.readFile(new URL('../desktop/package.json',import.meta.url),'utf8'));
 for(const file of ['image-production-run.cjs','image-work-state.cjs','editor-assets.cjs'])assert(pkg.build.files.includes(file),'missing producer dependency: '+file);
});
