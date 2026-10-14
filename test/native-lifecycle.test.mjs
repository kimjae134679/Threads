import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),native=require('../desktop/unified-studio.cjs');
test('native PID record is project/executable bound, CAS cleaned and never adopts another live owner',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'native-owner-'));try{
  const options={projectRoot:root,pid:process.pid,executable:process.execPath},claim=await native.claimStudioOwner(options),file=path.join(root,'local-private/operating-studio/server.pid');
  const record=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(record.pid,process.pid);assert.equal(record.projectRoot,root);assert.equal(record.executable,process.execPath);assert.equal(record.mode,'native-unified');
  await assert.rejects(native.claimStudioOwner({...options,pid:process.pid+1}),/owner_conflict/);
  await fs.writeFile(file,'123456789');await claim.release();assert.equal(await fs.readFile(file,'utf8'),'123456789');
  await fs.writeFile(file,String(process.pid));const second=await native.claimStudioOwner(options);await second.release();await assert.rejects(fs.stat(file),/ENOENT/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('native routes are bounded and use the existing renderer save barrier instead of reload',async()=>{
 assert.equal(native.nativeRoute(['--native-route','/?review=hold']),'/?review=hold');assert.equal(native.nativeRoute([]),'/');
 for(const route of ['https://example.invalid','/api/publish','//example.invalid','/?review=passed','/materials/?file=C:/private'])assert.throws(()=>native.nativeRoute(['--native-route',route]),/route_invalid/);
 let expression='';const window={isDestroyed:()=>false,webContents:{getURL:()=> 'http://127.0.0.1:4387/',executeJavaScript:async s=>{expression=s;return true;}}};
 await native.navigateStudio(window,'http://127.0.0.1:4387','/materials/');assert.match(expression,/ThreadsStudioNavigation/);assert.doesNotMatch(expression,/window\.location\s*=/);
 window.webContents.getURL=()=> 'https://foreign.invalid/';await assert.rejects(native.navigateStudio(window,'http://127.0.0.1:4387','/materials/'),/origin_invalid/);
});
test('existing PowerShell lifecycle validates exact native identity and keeps legacy integer Node ownership',{skip:process.platform!=='win32'},()=>{
 const module=path.resolve('upload-studio/Lifecycle.psm1').replaceAll("'","''"),command=`$ErrorActionPreference='Stop';Import-Module '${module}' -Force; $root='C:\\fixture';$exe='C:\\fixture\\desktop\\dist\\win-unpacked\\Threads Cut Editor.exe';$p=@{ProcessId=42;Name='Threads Cut Editor.exe';ExecutablePath=$exe;CommandLine='"'+$exe+'" --project-root "'+$root+'"'};$r=@{schema=1;pid=42;mode='native-unified';projectRoot=$root;executable=$exe};if (!(Test-StudioOwner $p $r $root $exe 'C:\\fixture\\upload-studio\\server.mjs')){throw 'valid_native_rejected'};$p.CommandLine=$p.CommandLine.Replace('"C:\\fixture"','"C:\\fixture-other"');if(Test-StudioOwner $p $r $root $exe 'C:\\fixture\\upload-studio\\server.mjs'){throw 'root_prefix_adopted'};$p=@{ProcessId=42;Name='node.exe';CommandLine='"C:\\node.exe" "C:\\fixture\\upload-studio\\server.mjs" --project-root "C:\\fixture"'};if(!(Test-StudioOwner $p 42 $root $exe 'C:\\fixture\\upload-studio\\server.mjs')){throw 'legacy_rejected'};if(Test-StudioOwner $p $r $root $exe 'C:\\fixture\\upload-studio\\server.mjs'){throw 'native_record_node_adopted'};'OWNERSHIP_PASS'`;
 assert.match(execFileSync('powershell.exe',['-NoProfile','-Command',command],{encoding:'utf8'}),/OWNERSHIP_PASS/);
});
test('package resource roots cannot traverse project private corpus',async()=>{
 const pkg=JSON.parse(await fs.readFile(new URL('../desktop/package.json',import.meta.url),'utf8'));
 assert.ok(pkg.build.extraResources.every(r=>r.from!=='..'));assert.ok(pkg.build.extraResources.some(r=>r.from==='../repo-candidates.mjs'&&r.to==='unified-runtime/repo-candidates.mjs'));
});
test('all owned controller entrypoints launch or navigate the same native process, with normal close only',async()=>{
 const control=await fs.readFile(new URL('../upload-studio/Control.ps1',import.meta.url),'utf8');assert.match(control,/Test-StudioOwner/);assert.match(control,/native-unified/);assert.match(control,/CloseMainWindow/);assert.match(control,/api\/health/);assert.match(control,/--native-route/);assert.match(control,/projectIdentity/);
 for(const name of ['OPEN_REVIEW.ps1','OPEN_VIEWER.ps1']){const code=await fs.readFile(new URL('../upload-studio/'+name,import.meta.url),'utf8');assert.match(code,/-Action open -Route/);assert.doesNotMatch(code,/Start-Process/);}
});
test('real controller script with owned mocked OS starts, opens and normally closes one native owner',{skip:process.platform!=='win32'},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'native-control-'));try{
  const control=path.resolve('upload-studio/Control.ps1').replaceAll("'","''"),module=path.resolve('upload-studio/Lifecycle.psm1'),scriptRoot=path.join(root,'upload-studio'),data=path.join(root,'local-private/operating-studio');await fs.mkdir(scriptRoot,{recursive:true});await fs.copyFile(control, path.join(scriptRoot,'Control.ps1'));await fs.copyFile(module,path.join(scriptRoot,'Lifecycle.psm1'));await fs.writeFile(path.join(scriptRoot,'server.mjs'),'// fixture only');await fs.mkdir(data,{recursive:true});await fs.mkdir(path.join(root,'local-private/project/자료'),{recursive:true});await fs.mkdir(path.join(root,'desktop/dist/win-unpacked'),{recursive:true});await fs.writeFile(path.join(root,'desktop/package.json'),'{"version":"fixture"}');await fs.writeFile(path.join(root,'desktop/dist/win-unpacked/Threads Cut Editor.exe'),'fixture, never executed');await fs.writeFile(path.join(root,'local-private/migration-manifest.json'),'{}');await fs.writeFile(path.join(data,'state.json'),'{}');
  const command=`$ErrorActionPreference='Stop';$global:root='${root.replaceAll("'","''")}';$global:owner=$null;$global:closed=0;$global:lastLine='';$exe=Join-Path $root 'desktop/dist/win-unpacked/Threads Cut Editor.exe';function New-CimInstance{return @{}};function Get-CimInstance{return $global:owner};function Get-NetTCPConnection{if($global:owner){return [pscustomobject]@{OwningProcess=42424242}}};function Invoke-RestMethod{$h=[Security.Cryptography.SHA256]::Create();$key=([BitConverter]::ToString($h.ComputeHash([Text.Encoding]::UTF8.GetBytes($root.ToLowerInvariant())))).Replace('-','').ToLowerInvariant();$h.Dispose();return @{mode='offline-only';startup_state_preserved=$true;pid=42424242;projectIdentity=$key;nativeHosted=$true;nativeUIReady=$true}};function Invoke-CimMethod{param($ClassName,$MethodName,$Arguments);$global:lastLine=$Arguments.CommandLine;if(!$global:owner){$global:owner=[pscustomobject]@{ProcessId=42424242;Name='Threads Cut Editor.exe';ExecutablePath=$exe;CommandLine=$Arguments.CommandLine};[IO.File]::WriteAllText((Join-Path $root 'local-private/operating-studio/server.pid'),(@{schema=1;pid=42424242;projectRoot=$root;executable=$exe;mode='native-unified'}|ConvertTo-Json -Compress))};return @{ReturnValue=0;ProcessId=42424242}};function Get-Process{$obj=New-Object PSObject;$obj|Add-Member ScriptMethod CloseMainWindow {$global:closed++;$global:owner=$null;return $true};return $obj};function Stop-Process{throw 'native_force_stop_forbidden'};$entry=Join-Path $root 'upload-studio/Control.ps1';$s=(& $entry -Action start -ProjectRoot $root|ConvertFrom-Json);if(!$s.healthy -or $s.mode -ne 'native-unified'){throw 'native_start_failed'};$null=& $entry -Action open -ProjectRoot $root -Route '/?review=hold';if($global:lastLine -notmatch '--native-route "[/][?]review=hold"'){throw 'native_route_missing'};$s=(& $entry -Action stop -ProjectRoot $root|ConvertFrom-Json);if($s.running -or $global:closed -ne 1){throw 'normal_stop_failed'};'NATIVE_CONTROL_PASS'`;
  assert.match(execFileSync('powershell.exe',['-NoProfile','-Command',command],{encoding:'utf8'}),/NATIVE_CONTROL_PASS/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('Electron reordered second-instance argv uses exact additionalData root and bounded route',async()=>{
 const args=[process.execPath,'--project-root',path.resolve('fixture'),'--native-route','/?review=hold'];
 const payload=native.studioInstanceData(args,{});assert.deepEqual(payload,{schema:1,mode:'native-unified',projectRoot:path.resolve('fixture'),route:'/?review=hold'});
 const reordered=[process.execPath,'--project-root','--native-route','--allow-file-access-from-files',path.resolve('fixture'),'/?review=hold'];assert.throws(()=>native.projectArgument(reordered,{}),/project_root_invalid/);
 let focus=0,route,dialogCalls=0;const studio={window:{},focus(){focus++;},navigate:async value=>{route=value;return true;}};
 const dialog={showMessageBox:async()=>{dialogCalls++;},showErrorBox:()=>{throw Error('blocking_dialog_forbidden');}};
 assert.equal(await native.dispatchStudioInstance(studio,path.resolve('fixture'),payload,dialog),true);assert.equal(route,'/?review=hold');assert.equal(focus,1);assert.equal(dialogCalls,0);
 for(const invalid of [undefined,{...payload,projectRoot:path.resolve('foreign-fixture')},{...payload,projectRoot:'relative'},{...payload,route:'https://foreign.invalid'},{...payload,schema:2},{...payload,mode:'foreign'}])assert.equal(await native.dispatchStudioInstance(studio,path.resolve('fixture'),invalid,dialog),false);
 assert.equal(focus,1);assert.equal(dialogCalls,6);
});
test('native second-instance rejection reports asynchronously without blocking owned health or replacing drafts',async()=>{
 const studio={window:{},focus:()=>{throw Error('foreign_focus');},navigate:()=>{throw Error('foreign_navigation');}},detail=[];
 const pending=native.dispatchStudioInstance(studio,path.resolve('fixture'),{}, {showMessageBox:(_win,message)=>{detail.push(message);return new Promise(()=>{});},showErrorBox:()=>{throw Error('blocking_dialog_forbidden');}});
 await new Promise(resolve=>setTimeout(resolve,5));assert.equal(detail.length,1);assert.equal(detail[0].message,'화면 이동 보류');assert.match(detail[0].detail,/instance/);void pending;
 const source=await fs.readFile(new URL('../desktop/main.cjs',import.meta.url),'utf8');assert.match(source,/requestSingleInstanceLock\(unifiedProject\?studioInstanceData/);assert.match(source,/second-instance',[\s\S]*additionalData/);
});