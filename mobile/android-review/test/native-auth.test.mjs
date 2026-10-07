import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
test('native device flow tested with JVM endpoint/vault/clock mocks only',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=fs.mkdtempSync(path.join(os.tmpdir(),'threads-native-auth-'));
 try{let r=spawnSync('javac',['-encoding','UTF-8','--release','8','-d',out,path.join(root,'java/kr/threads/review/DeviceFlowController.java'),path.join(root,'test/NativeAuthTest.java')],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);r=spawnSync('java',['-cp',out,'kr.threads.review.NativeAuthTest'],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/Native auth mock PASS/);}
 finally{fs.rmSync(out,{recursive:true,force:true});}
});
