import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{runCoverReflow,createZipTools}=require('../desktop/reflow-review-covers-run.cjs'),{sha256}=require('../desktop/universal-reproduction.cjs');
const base=await fs.mkdtemp(path.join(os.tmpdir(),'title-label-reflow-')),source=path.join(base,'source'),out=path.join(source,'06_자동 제작 결과'),folder=path.join(out,'current/post'),raw=path.join(base,'raw'),destination=path.join(base,'target'),title='돈많은 시부모한테는 기어야 하나요? (네이트판)';
const write=async(p,value)=>{await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,JSON.stringify(value));};
const png=height=>{const b=Buffer.alloc(32);Buffer.from('89504e470d0a1a0a','hex').copy(b);b.writeUInt32BE(1080,16);b.writeUInt32BE(height,20);return b;};
try{
 await write(path.join(raw,'input.json'),{originalTitle:title});
 const plan={originalTitle:title,coverTitle:'시부모 이야기',ruleVersion:'2026-10-08.2',pages:[{role:'cover',geometry:{}},{role:'body',operations:[{kind:'text',text:'Actual body'}]}],sourceUnits:[{text:'Actual body'}],universalCover:{variant:'paper',emphasis:'시부모 이야기'}};
 await write(path.join(folder,'production-plan.json'),plan);await fs.writeFile(path.join(folder,'cover.html'),'OLD');await fs.writeFile(path.join(folder,'source-bundle.zip'),'IMMUTABLE SOURCE');
 await fs.mkdir(path.join(folder,'fonts'),{recursive:true});
 const images=[{name:'rendered/slide-001.png',data:png(1080)},{name:'rendered/slide-002.png',data:png(500)}];
 for(const i of images){await fs.mkdir(path.dirname(path.join(folder,i.name)),{recursive:true});await fs.writeFile(path.join(folder,i.name),i.data);}
 const zip=await createZipTools(path.resolve('.')),preview=await zip.zip([...images,{name:'manifest.json',data:Buffer.from(JSON.stringify({originalTitle:title,productionPlan:plan}))},{name:'cover.html',data:Buffer.from('OLD')}]);await fs.writeFile(path.join(folder,'review-preview.zip'),preview);
 await write(path.join(out,'status.json'),{reviewRound:'old',inputFolder:raw,entries:[{id:'post',title,outputFolder:'current/post',templateId:'universal_paper',ruleVersion:plan.ruleVersion,images:images.map(i=>({name:i.name,sha256:sha256(i.data)})),outputSha256:sha256(preview),sourceZipSha256:sha256(Buffer.from('IMMUTABLE SOURCE'))}]});
 const changed=png(1080);changed[24]=9;
 const result=await runCoverReflow({sourceRoot:source,destination,reviewRound:'sample-only',aspectRatio:'square',renderer:'square-complete'},{zipTools:zip,renderCover:async({html})=>{const input=JSON.parse(html.match(/window\.coverInput=(.*?);window\.coverResourcesReady/s)[1]);assert.equal(input.originalTitle,title);assert.equal(input.emphasis,'');return {data:changed,geometry:{title:input.title,lines:[input.title],size:80,width:1080,height:1080,aspectRatio:'square',box:{x:76,y:400,width:928,height:88},glyphBoxes:[{x:76,y:400,width:800,height:80}],imageBox:null}};}});
 assert.equal(result.coversReflowed,1);
 const newPlan=JSON.parse(await fs.readFile(path.join(destination,'06_자동 제작 결과/current/post/production-plan.json'),'utf8'));
 assert.equal(newPlan.originalTitle,title);assert.equal(newPlan.coverTitle,'돈많은 시부모한테는 기어야 하나요?');assert.deepEqual(newPlan.pages.slice(1),plan.pages.slice(1));assert.deepEqual(newPlan.titleSourceLabels,['(네이트판)']);
 console.log('Reflow accepts separated display site labels; original title and body remain unchanged PASS');
}finally{await fs.rm(base,{recursive:true,force:true});}
