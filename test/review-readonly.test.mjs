import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const {createPostReviewStore}=createRequire(import.meta.url)('../desktop/post-review-store.cjs');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'threads-readonly-'));
try{
 const output=path.join(root,'06_자동 제작 결과'),folder=path.join(root,'07_사용자 평가');
 await fs.mkdir(output,{recursive:true});await fs.mkdir(folder,{recursive:true});
 await fs.writeFile(path.join(output,'status.json'),JSON.stringify({entries:[]}));
 const file=path.join(folder,'평가 기록.json'),legacy=path.join(root,'legacy.json'),workflow=path.join(folder,'검토 진행.json');
 const empty=JSON.stringify({schemaVersion:1,evaluations:[]});
 await fs.writeFile(file,empty);await fs.writeFile(legacy,JSON.stringify({schemaVersion:1,evaluations:[{id:'old',outputVersion:'v',score:10,note:'archive',updatedAt:'2026-10-07T00:00:00Z'}]}));
 const store=createPostReviewStore(root,{legacyFeedbackFile:legacy,readOnly:true});
 await store.list();
 assert.equal(await fs.readFile(file,'utf8'),empty,'readonly list must not migrate legacy data');
 assert.deepEqual(await fs.readdir(folder),['평가 기록.json'],'readonly creates no backups or workflow');
 await assert.rejects(store.save({id:'x',score:1,note:''}),/읽기 전용/);
 await assert.rejects(store.visit({id:'x',page:1}),/읽기 전용/);
 await assert.rejects(store.decide({id:'x'}),/읽기 전용/);
 await fs.unlink(file);await store.list();await assert.rejects(fs.stat(file),{code:'ENOENT'});await assert.rejects(fs.stat(workflow),{code:'ENOENT'});
 console.log('Read-only review store: no migration or mutation with/without active round PASS');
}finally{await fs.rm(root,{recursive:true,force:true});}
