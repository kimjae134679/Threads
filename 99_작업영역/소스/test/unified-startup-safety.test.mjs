import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createState} from '../upload-studio/domain.mjs';import {createStudioServer} from '../upload-studio/server.mjs';
test('unified offline startup preserves historical jobs and verdict state without recovery or automatic scheduling',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'unified-start-'));let app;try{
  const state=createState();state.revision=168;state.jobs=[{id:'historical-running',state:'running'}];state.dry_runs=[{id:'old-dryrun'}];state.publications=[{id:'historical-receipt'}];state.provider_state={paused:true};const raw=JSON.stringify(state,null,2)+'\r\n';await fs.writeFile(path.join(root,'state.json'),raw);
  app=await createStudioServer({root,port:0,materialRoot:path.join(root,'missing'),seedTags:false,preserveStartupState:true});assert.equal(await fs.readFile(path.join(root,'state.json'),'utf8'),raw);
  const response=await fetch(app.url+'/api/state'),read=await response.json();assert.equal(read.mode,'offline-only');assert.equal(read.state.revision,168);assert.deepEqual(read.state.jobs,state.jobs);
  for(const route of ['/api/publish','/api/schedule'])assert.equal((await fetch(app.url+route,{method:'POST',headers:{'x-studio-local':'1','content-type':'application/json'},body:'{}'})).status,405);
 }finally{await app?.close();await fs.rm(root,{recursive:true,force:true});}
});
