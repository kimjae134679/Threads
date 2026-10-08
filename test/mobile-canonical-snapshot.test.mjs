import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runSyntheticChecks} from './helpers/mobile-canonical-snapshot-harness.mjs';

test('real canonical writers serialize offline import, PC edits, activation and crash recovery',async t=>{
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'threads-mobile-canonical-'));
 t.after(()=>{const rel=path.relative(path.resolve(os.tmpdir()),path.resolve(base));assert.ok(rel&&!rel.startsWith("..")&&!path.isAbsolute(rel));return fs.rm(base,{recursive:true,force:true});});
 const result=await runSyntheticChecks(base,{deadRaces:2});
 assert.equal(result.parallelPcSaves,9);
 assert.equal(result.receiptDedupe,true);
 assert.equal(result.pcEditConflict,true);
 assert.equal(result.newOutputVersionBlank,true);
 assert.equal(result.activationWaited,true);
 assert.equal(result.archivePreserved,true);
 assert.equal(result.newRoundBlank,true);
 assert.equal(result.oldEventStale,true);
 assert.deepEqual(result.crashRecovery,['before_preserved','committed']);
 assert.equal(result.deadReclaimerRaces,2);
 assert.equal(result.disabledTransportCalls,0);
});
