import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),desktop=path.join(root,'desktop'),require=createRequire(new URL('../desktop/package.json',import.meta.url));
test('pack helper resources cannot implicitly exclude active desktop CJS from ASAR',async()=>{
 const pkg=JSON.parse(await fs.readFile(path.join(desktop,'package.json'),'utf8'));assert.ok(pkg.build.extraResources.every(row=>row.from!=='.'),'same-directory extraResources exclude root appFiles');assert.equal(pkg.build.afterPack,'after-pack.cjs');assert.ok(pkg.build.files.includes('!after-pack.cjs'));
});
test('afterPack verifies real ASAR active relative-require closure and exact dual helper resources',async()=>{
 const hook=require('./after-pack.cjs'),asar=require('@electron/asar');await fs.mkdir(path.join(desktop,'dist'),{recursive:true});const out=await fs.mkdtemp(path.join(desktop,'dist/after-pack-fixture-')),input=path.join(out,'input'),resources=path.join(out,'app/resources');
 try{
  await fs.mkdir(input);await fs.mkdir(resources,{recursive:true});for(const name of await fs.readdir(desktop)){if(name.endsWith('.cjs')&&name!=='after-pack.cjs'||['package.json','image-requirements-schema.json'].includes(name))await fs.copyFile(path.join(desktop,name),path.join(input,name));}
  await fs.unlink(path.join(input,'project-paths.cjs'));const archive=path.join(resources,'app.asar');await asar.createPackage(input,archive);
  const ctx={appOutDir:path.dirname(resources),electronPlatformName:'win32',packager:{projectDir:desktop}};
  await assert.rejects(hook(ctx),/native_pack_missing/);await assert.rejects(fs.stat(path.join(resources,'unified-runtime/desktop/project-paths.cjs')),/ENOENT/);
  await fs.copyFile(path.join(desktop,'project-paths.cjs'),path.join(input,'project-paths.cjs'));await asar.createPackage(input,archive);asar.uncacheAll();await hook(ctx);
  for(const name of hook.helpers){const source=await fs.readFile(path.join(desktop,name));assert.deepEqual(asar.extractFile(archive,name),source);for(const folder of ['pc-review/desktop','unified-runtime/desktop'])assert.deepEqual(await fs.readFile(path.join(resources,folder,name)),source);}
  assert.equal(hook.helpers.length,9);assert.ok(!asar.listPackage(archive).some(name=>/production\/|production-editor\/|local-private|after-pack\.cjs/.test(name.replaceAll('\\','/'))));
  await fs.writeFile(path.join(input,'project-paths.cjs'),'// stale code');await asar.createPackage(input,archive);asar.uncacheAll();await assert.rejects(hook(ctx),/native_pack_source_mismatch/);
  await assert.rejects(hook({...ctx,appOutDir:path.dirname(desktop)}),/native_pack_path_escape/);
 }finally{asar.uncacheAll();const relative=path.relative(path.join(desktop,'dist'),out);assert.ok(relative.startsWith('after-pack-fixture-')&&!relative.includes(path.sep));await fs.rm(out,{recursive:true,force:true});}
});
