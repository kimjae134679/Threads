#!/usr/bin/env node
'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const {buildImageHandoff}=require('../desktop/image-requirements.cjs');
async function main(){
  const [mode,file,...extra]=process.argv.slice(2);
  if(!['validate','prepare'].includes(mode)||!file||extra.length)throw Error('Usage: node scripts/image-requirements-cli.cjs validate|prepare manifest.json|image-requirements.json');
  const absolute=path.resolve(file),stat=await fs.lstat(absolute);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>256*1024)throw Error('Input file type/size');
  const input=JSON.parse((await fs.readFile(absolute,'utf8')).replace(/^\ufeff/,''));
  const manifest=input.schema==='threads-program-input-v1';
  if(!manifest&&input.schema!=='threads-image-requirements-v1')throw Error('Unsupported input schema');
  const root=path.basename(path.dirname(absolute))==='작업 정보'?path.dirname(path.dirname(absolute)):path.dirname(absolute);
  const handoff=await buildImageHandoff(manifest?input.imageRequirements:input,{root,identity:manifest?{postId:input.id,sourceUrl:input.sourceUrl}:{}});
  const result=mode==='prepare'?handoff:{valid:true,schema:input.schema,postId:handoff?.postId||input.id||null,status:input.imageRequirements?.status||input.status,
    generationRequests:handoff?.generationRequests.length||0,compositionAssets:handoff?.compositionAssets.length||0,held:handoff?.held||[],publicationAllowed:false};
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
main().catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
