import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
const require=createRequire(import.meta.url),{getMaterialRoot,MATERIAL_ROOT}=require('../desktop/material-paths.cjs');
const old=process.env.THREADS_TEST_MATERIAL_ROOT;
try{
 delete process.env.THREADS_TEST_MATERIAL_ROOT;
 assert.equal(getMaterialRoot({isPackaged:true}),MATERIAL_ROOT);
 assert(!MATERIAL_ROOT.includes('Desktop'));
 process.env.THREADS_TEST_MATERIAL_ROOT=path.resolve('fixture-root');
 assert.equal(getMaterialRoot({isPackaged:false}),path.resolve('fixture-root'));
 assert.equal(getMaterialRoot({isPackaged:true}),MATERIAL_ROOT);
 process.env.THREADS_TEST_MATERIAL_ROOT='relative';assert.throws(()=>getMaterialRoot({isPackaged:false}));
}finally{if(old===undefined)delete process.env.THREADS_TEST_MATERIAL_ROOT;else process.env.THREADS_TEST_MATERIAL_ROOT=old;}
const {assess}=require('../desktop/production-triage.cjs');
const row={id:'a',outputFolder:'ready',templateId:'photo_cover',images:[{},{},{}]};
const plan={sourceUnits:[{kind:'text',text:'원문 내용'}],titleEvidenceStatus:'matched_source',warnings:[]};
assert.equal(assess(row,plan).category,'priority');assert.equal(assess({...row,outputFolder:null},plan).category,'hold');
assert.equal(assess({...row,images:Array(11).fill({})},plan).category,'long');
assert.equal(assess(row,{...plan,sourceUnits:[{kind:'text',text:'4대보험 공제와 세금이 이상해서 질문합니다.'}]}).category,'sensitive');
assert.equal(assess({...row,templateId:'mint_text'},plan).category,'improve');
assert.equal(assess(row,plan).reviewed,false);
console.log('Non-desktop materials, packaged override protection, explicit triage without fabricated approval PASS');

const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'threads-material-root-'));
const materialFolder=path.join(fixture,'materials');fs.mkdirSync(materialFolder);
const config=path.join(fixture,'Threads-Cut-Editor.materials.json');
const packaged={isPackaged:true,getPath:()=>path.join(fixture,'Threads-Cut-Editor.exe')};
fs.writeFileSync(config,JSON.stringify({materialRoot:materialFolder}));
assert.equal(getMaterialRoot(packaged),materialFolder,'Packaged preview reads only its adjacent explicit material-root config');
fs.writeFileSync(config,JSON.stringify({materialRoot:'relative'}));
assert.throws(()=>getMaterialRoot(packaged),/경로/);
fs.unlinkSync(config);assert.equal(getMaterialRoot(packaged),MATERIAL_ROOT);
fs.rmdirSync(materialFolder);fs.rmdirSync(fixture);
