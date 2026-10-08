import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const {createPostReviewStore,version}=createRequire(import.meta.url)('../desktop/post-review-store.cjs');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'threads-seen-history-'));
try {
 const out=path.join(root,'06_자동 제작 결과');await fs.mkdir(path.join(out,'current'),{recursive:true});
 const row={id:'same-post',title:'Fixture',outputFolder:'current',sourceFingerprint:'same-body',outputSha256:'cover-change',ruleVersion:'r',reviewRound:'new-round',images:[{name:'rendered/slide-001.png',sha256:'fixture'}]};
 await fs.writeFile(path.join(out,'status.json'),JSON.stringify({reviewRound:'new-round',entries:[row]}));
 await fs.writeFile(path.join(out,'current/production-plan.json'),JSON.stringify({pages:[{role:'cover'}]}));
 await fs.writeFile(path.join(root,'review-current.json'),JSON.stringify({reviewRound:'new-round'}));
 const history=path.join(root,'05_이전 작업/리뷰 과거/before-new-round/07_사용자 평가');await fs.mkdir(history,{recursive:true});
 const historical={schemaVersion:1,recordType:'user_review_workflow',entries:[{id:row.id,outputVersion:'old-version',seenAt:'2026-10-01T00:00:00.000Z',pagesSeen:[1,2],lastPage:2}]};
 const file=path.join(history,'검토 진행.json'),bytes=JSON.stringify(historical);await fs.writeFile(file,bytes);
 const store=createPostReviewStore(root,{readOnly:true}),entry=(await store.list()).entries[0];
 assert.equal(entry.seenAt,historical.entries[0].seenAt,'Same post stays seen across cover/review round changes');
 assert.equal(entry.progress,null,'Old page position is not a position in new output');assert.equal(entry.current,null,'Old ratings are not copied');assert.equal(await store.random({}),null);
 assert.equal(await fs.readFile(file,'utf8'),bytes,'Historical records remain byte-for-byte unchanged');
 console.log('Post-ID seen history, separate version position/rating, preserved originals PASS');
} finally {await fs.rm(root,{recursive:true,force:true});}
