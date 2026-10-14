import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
test('syntax inventory includes latest nested desktop/mobile/uploader code but excludes private data and dependencies',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'syntax-scope-'));try{
  const names=['server.mjs','app/source-batch.js','desktop/pc/dependency.cjs','mobile/android-review/app/review.js','upload-studio/public/studio.js','legacy-source/operations/helper.mjs','local-private/programs/private.js','desktop/node_modules/dependency.js','desktop/dist/generated.js','desktop/production/original.cjs','desktop/production-editor/original.js','desktop/pc-review/desktop/original.cjs'];
  for(const name of names){await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true});await fs.writeFile(path.join(root,name),'');}
  const api=await import('../scripts/check-syntax.mjs');assert.equal(typeof api.collectJavaScriptFiles,'function');const found=api.collectJavaScriptFiles(root).map(p=>p.replaceAll('\\','/')).sort();assert.deepEqual(found,names.slice(0,6).sort());
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
