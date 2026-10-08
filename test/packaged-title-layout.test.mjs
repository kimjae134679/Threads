import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),dir=await fs.mkdtemp(path.join(os.tmpdir(),'title-packaged-'));
try{
 const files=['square-cover.cjs','square-cover-canvas.cjs','universal-cover.cjs','universal-cover-canvas.cjs','title-layout.cjs'];
 const config=JSON.parse(await fs.readFile(new URL('../desktop/package.json',import.meta.url),'utf8'));
 for(const file of files){assert(config.build.files.includes(file));await fs.copyFile(new URL('../desktop/'+file,import.meta.url),path.join(dir,file));}
 const square=require(path.join(dir,'square-cover.cjs')).squareCoverHtml({title:'(네이트판) 실제 제목'}),universal=require(path.join(dir,'universal-cover.cjs')).coverHtml({title:'실제 제목 (네이트판)',aspectRatio:'square'});
 assert(square.includes('"title":"실제 제목"')&&universal.includes('"title":"실제 제목"'));
 assert(square.includes('"originalTitle":"(네이트판) 실제 제목"'));
 console.log('Flattened desktop package loads independent title policy without repo-relative app paths PASS');
}finally{await fs.rm(dir,{recursive:true,force:true});}
