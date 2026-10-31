import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{importSavedSource}=require('../desktop/source-import.cjs');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'threads-import-'));
try{
  const input=path.join(root,'inputs'),saved=path.join(root,'saved');await fs.mkdir(saved);
  await fs.mkdir(path.join(saved,'media'));await fs.writeFile(path.join(saved,'media','a.jpg'),'actual image bytes');
  const source={schema:'threads-verbatim-source-v1',verbatim:true,title:'원문 제목',sourceUrl:'https://example.com/post/1',body:'띄어  쓰기\n\n[IMAGE:a.jpg]\n끝 문장'};
  await fs.mkdir(path.join(input,'existing'),{recursive:true});await fs.writeFile(path.join(input,'existing','manifest.json'),JSON.stringify({id:'existing-id',title:'기존 글'}));
  const file=path.join(saved,'source.json');await fs.writeFile(file,JSON.stringify(source));
  const row=await importSavedSource({file,root:input});assert.equal(row.images,1);
  const index=JSON.parse(await fs.readFile(path.join(input,'index.json'))),folder=path.join(input,index.records.find(r=>r.id===row.id).folder);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(folder,'source','source.json'))),source);
  assert.equal(await fs.readFile(path.join(folder,'source','media','a.jpg'),'utf8'),'actual image bytes');
  source.body='덮어쓰면 안 됨';await fs.writeFile(file,JSON.stringify(source));
  assert.equal((await importSavedSource({file,root:input})).alreadyPresent,true);
  assert.equal(JSON.parse(await fs.readFile(path.join(folder,'source','source.json'))).body,'띄어  쓰기\n\n[IMAGE:a.jpg]\n끝 문장');
  source.sourceUrl='https://example.com/post/2';source.body='[IMAGE:../outside.jpg]\n본문';await fs.writeFile(file,JSON.stringify(source));
  await assert.rejects(importSavedSource({file,root:input}),/파일명/);
  assert.equal(JSON.parse(await fs.readFile(path.join(input,'index.json'))).records.length,2);
}finally{await fs.rm(root,{recursive:true,force:true});}
console.log('Saved source import: original whitespace, media, duplicate protection and rejected path PASS');
