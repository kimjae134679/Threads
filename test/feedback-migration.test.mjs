import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const {mergeFeedback,migrateFeedback}=createRequire(import.meta.url)('../desktop/feedback-migration.cjs');
const row=(v,score,date)=>({id:'same',outputVersion:v,score,note:'원래 평가',updatedAt:date});
const old={schemaVersion:1,evaluations:[row('old',1,'2026-10-06T10:00:00Z')]};
const current={schemaVersion:1,evaluations:[row('old',9,'2026-10-06T11:00:00Z'),row('new',null,'2026-10-06T12:00:00Z')]};
const merged=mergeFeedback(current,old);assert.equal(merged.evaluations.length,2);assert.equal(merged.evaluations[0].score,9);assert.equal(merged.evaluations[1].score,null);
const root=await fs.mkdtemp(path.join(os.tmpdir(),'threads-feedback-'));
try{
 const source=path.join(root,'old.json'),target=path.join(root,'new','ratings.json');await fs.writeFile(source,JSON.stringify(old));
 assert.equal((await migrateFeedback(target,source)).evaluations[0].score,1);const before=await fs.readFile(target,'utf8');
 await migrateFeedback(target,source);assert.equal(await fs.readFile(target,'utf8'),before);assert.equal(await fs.readFile(source,'utf8'),JSON.stringify(old));
 await fs.writeFile(target,'broken');await assert.rejects(migrateFeedback(target,source));assert.equal(await fs.readFile(target,'utf8'),'broken');
}finally{await fs.rm(root,{recursive:true,force:true});}
console.log('Feedback migration preserves versions, newest score, source and invalid records PASS');
