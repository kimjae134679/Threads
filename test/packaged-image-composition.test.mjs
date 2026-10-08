import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';
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
