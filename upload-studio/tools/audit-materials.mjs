import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {MaterialCatalog} from '../material-catalog.mjs';
const args=process.argv.slice(2),arg=name=>args[args.indexOf(name)+1],root=arg('--root'),materialRoot=arg('--material-root'),report=arg('--report');
if(!root||!materialRoot||!report)throw Error('usage: --root <private-state-root> --material-root <material-root> --report <private-report.json>');
const files=[path.join(root,'state.json'),path.join(root,'final-review-decisions.json'),path.join(root,'current-layout-selection.json'),path.join(materialRoot,'06_자동 제작 결과','status.json'),path.join(materialRoot,'07_사용자 평가','평가 기록.json')];
async function hashes(){return Object.fromEntries(await Promise.all(files.map(async file=>{try{return [file,createHash('sha256').update(await fs.readFile(file)).digest('hex')];}catch(e){if(e.code==='ENOENT')return [file,null];throw e;}})));}
const before=await hashes(),catalog=new MaterialCatalog({root,materialRoot,readState:async()=>JSON.parse(await fs.readFile(path.join(root,'state.json'),'utf8'))});let last=0;
const result=await catalog.audit(p=>{if(Date.now()-last<5000)return;last=Date.now();console.log(JSON.stringify({progress:p}));});const after=await hashes();result.beforeHashes=before;result.afterHashes=after;result.preservedFiles=files.every(f=>before[f]===after[f]);await fs.mkdir(path.dirname(report),{recursive:true});await fs.writeFile(report,JSON.stringify(result,null,2));console.log(JSON.stringify({report,records:result.records,counts:result.counts,verifiedReferences:result.verifiedReferences,imageReferences:result.imageReferences,verifiedUniqueImages:result.verifiedUniqueImages,sourceFolders:result.sourceFolders,sourceFiles:result.sourceFiles,problemCount:result.problems.length,preservedFiles:result.preservedFiles,stableRevision:result.stableRevision}));
