import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';import '../app/unified-material-txt.js';import '../app/source-page-plan.js';const require=createRequire(import.meta.url),C=globalThis.ThreadsUnifiedMaterialTxt;
test('latest intake reader accepts one TXT and keeps exact source bytes plus raw ID in prepared version',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'unified-intake-'));try{
  const api=require('../desktop/intake-pipeline.cjs');assert.equal(typeof api.readIntakeSource,'function');assert.equal(typeof api.preparedMaterial,'function');
  const source={schema:'threads-verbatim-source-v1',verbatim:true,title:'[후기] 원제',body:'원문  그대로\r\n끝',sourceUrl:'https://example.invalid/Zz',comments:[],intake:{id:'source-existing',media:[]}},raw=Buffer.from(JSON.stringify(source,null,2)+'\r\n'),fingerprint='a'.repeat(64);
  const text=api.preparedMaterial({id:source.intake.id,versionId:source.intake.id+'-'+fingerprint.slice(0,16),fingerprint,record:source,raw});await fs.writeFile(path.join(root,'자료.txt'),text);const read=await api.readIntakeSource(root,{id:source.intake.id+'-'+fingerprint.slice(0,16)});
  assert.deepEqual(read.record,source);assert.deepEqual(read.raw,raw);assert.equal(C.parse(text).records.source.intake.id,source.intake.id);assert.equal(C.parse(text).human.title,'원제');
  await fs.writeFile(path.join(root,'source.json'),raw);await fs.writeFile(path.join(root,'자료.txt'),text.slice(0,-20));await assert.rejects(api.readIntakeSource(root),/unified_material_invalid/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('completion audit loads actual title policy and still refuses missing verbatim body',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'unified-intake-audit-'));try{
  const {createHash}=await import('node:crypto'),hash=b=>createHash('sha256').update(b).digest('hex'),out=path.join(root,'fixture'),image=Buffer.from('fixture-only image bytes'),zip=Buffer.from('fixture-only ZIP bytes');
  await fs.mkdir(path.join(out,'rendered'),{recursive:true});await fs.writeFile(path.join(out,'source-bundle.zip'),zip);await fs.writeFile(path.join(out,'review-preview.zip'),zip);await fs.writeFile(path.join(out,'rendered/slide-001.png'),image);
  const row={id:'fixture',outputFolder:'fixture',sourceZipSha256:hash(zip),outputSha256:hash(zip),ruleVersion:'fixture',images:[{name:'rendered/slide-001.png',sha256:hash(image)}]};
  await fs.writeFile(path.join(out,'production-plan.json'),JSON.stringify({ruleVersion:'fixture',pages:[{number:1,width:1080,height:1350,operations:[]}],sourceUnits:[],comments:[]}));
  const source={title:'[후기] 원문 제목',body:'보존해야 할 실제 본문',comments:[]};
  await assert.rejects(require('../desktop/intake-pipeline.cjs').validateOutput(root,row,source),/원문 전체 body 누락/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
