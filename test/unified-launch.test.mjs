import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {studioLaunchConfig} from '../upload-studio/server.mjs';
test('single-project launch derives only contained private runtime paths and requires migration map',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'unified-launch-'));try{
  assert.throws(()=>studioLaunchConfig(['--project-root',root]),/project_path_manifest|ENOENT/);
  await fs.mkdir(path.join(root,'local-private'),{recursive:true});await fs.writeFile(path.join(root,'local-private/migration-manifest.json'),JSON.stringify({schema:'threads-unified-migration-v1',projectRoot:root,pathMappings:[]}));
  assert.throws(()=>studioLaunchConfig(['--project-root',root]),/unified_runtime_missing/);
  await fs.mkdir(path.join(root,'local-private/operating-studio'),{recursive:true});await fs.writeFile(path.join(root,'local-private/operating-studio/state.json'),'{}');await fs.mkdir(path.join(root,'local-private/project/자료'),{recursive:true});await fs.writeFile(path.join(root,'local-private/project/project.control.json'),'{}');
  const config=studioLaunchConfig(['--project-root',root,'--port','4388']);assert.equal(config.projectRoot,root);assert.equal(config.root,path.join(root,'local-private/operating-studio'));assert.equal(config.materialRoot,path.join(root,'local-private/project/자료'));assert.equal(config.projectManifest,path.join(root,'local-private/project/project.control.json'));assert.equal(config.preserveStartupState,true);assert.equal(config.port,4388);
  assert.throws(()=>studioLaunchConfig(['--project-root',root,'--material-root','outside']),/unified_launch_override/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('owned launcher entries share a project-relative controller and never power off the computer',async()=>{
 const base=new URL('../upload-studio/',import.meta.url);
 for(const name of ['START.ps1','STOP.ps1','OPEN_REVIEW.ps1','OPEN_VIEWER.ps1']){
  const code=await fs.readFile(new URL(name,base),'utf8');assert.match(code,/Control\.ps1/);assert.doesNotMatch(code,/D:\\A_KJ|shutdown|Stop-Computer|Restart-Computer/i);
 }
 const control=await fs.readFile(new URL('Control.ps1',base),'utf8');assert.match(control,/--project-root/);assert.match(control,/startup_state_preserved/);assert.match(control,/operating-studio/);assert.doesNotMatch(control,/shutdown|Stop-Computer|Restart-Computer/i);
});
