import fs from 'node:fs/promises';
import path from 'node:path';
import {createPostReviewStore} from '../../desktop/post-review-store.cjs';
import {withCanonicalWriter} from '../../desktop/review-canonical-writer.cjs';
import {activateReviewRelease} from '../../desktop/review-release.cjs';
import {transaction,waitFile} from './mobile-canonical-snapshot-harness.mjs';
const [mode,file]=process.argv.slice(2),c=JSON.parse(await fs.readFile(file,'utf8'));
try{
 if(c.startedFile)await fs.writeFile(c.startedFile,"started");
 let result;
 if(mode==='save'){
  const store=createPostReviewStore(c.root);for(const p of c.payloads)await store.save(p);result={saved:c.payloads.length};
 }else if(mode==='import'){
  const tx=transaction(c.root,c.snapshots,{failpoint:async stage=>{
   if(stage===c.holdStage){await fs.writeFile(c.entered,stage);await waitFile(c.release);}
   if(stage===c.crashStage)process.exit(77);
  }});result=await tx.importFeedback(c.request);
 }else if(mode==='activate')result=await activateReviewRelease(c.root,c.stage,c.expected);
 else if(mode==='race')result=await withCanonicalWriter(c.root,()=>fs.appendFile(path.join(c.root,'race-result'),'x'));
 else throw Error('Unknown worker mode');
 if(c.resultFile)await fs.writeFile(c.resultFile,JSON.stringify({ok:true,result}));
}catch(error){if(c.resultFile)await fs.writeFile(c.resultFile,JSON.stringify({ok:false,error:error.message}));else console.error(error);process.exitCode=1;}
