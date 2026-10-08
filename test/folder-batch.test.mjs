import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runFolderBatch } = require('../desktop/folder-batch.cjs');
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'threads-folder-batch-'));
try {
  const input = path.join(root, 'input'), output = path.join(root, 'output');
  await fs.mkdir(path.join(input, 'ready', 'media'), { recursive:true });
  await fs.mkdir(path.join(input, 'pending'), { recursive:true });
  const image = Buffer.from('saved original bytes');
  const sha = createHash('sha256').update(image).digest('hex');
  await fs.writeFile(path.join(input, 'ready', 'media', '01.jpg'), image);
  await fs.writeFile(path.join(input, 'ready', 'manifest.json'), JSON.stringify({
    schema:'threads-program-input-v1', id:'ready-id', title:'원문 제목', sourceUrl:'https://example.com',
    media:[{ file:'media/01.jpg', sha256:sha }],
  }));
  await fs.writeFile(path.join(input, 'pending', 'manifest.json'), JSON.stringify({
    schema:'threads-program-input-v1', id:'pending-id', title:'이미지 없는 후보', media:[],
  }));
  let rendered = 0;
  const render = async ({ files, title }) => {
    rendered++;
    assert.equal(files.length, 1);
    assert.equal(title, '원문 제목');
    return {zip:Buffer.from('preview zip fixture'),sourceZip:Buffer.from('source zip fixture'),
      images:[{name:'rendered/slide-001.png',data:Buffer.from('png fixture')}],productionPlan:{ruleVersion:'fixture-intake-layout',pages:[],warnings:[],omitted:[]},intakeAudit:{rawBodyAndCommentsExact:true}};
  };
  const first = await runFolderBatch({ folder:input, output, render });
  assert.equal(first.counts.generated, 1);
  assert.equal(first.entries.find(e=>e.outputFolder).ruleVersion,'fixture-intake-layout');
  assert.equal(first.counts.needs_exact_url, 1);
  assert.equal(rendered, 1);
  const second = await runFolderBatch({ folder:input, output, render });
  assert.equal(second.counts.already_done, 1);
  assert.equal(second.counts.needs_exact_url, 1);
  assert.equal(rendered, 1);
  await fs.rm(path.join(output, first.entries.find(entry=>entry.id==='ready-id').outputFolder, 'rendered', 'slide-001.png'));
  const repaired = await runFolderBatch({ folder:input, output, render });
  assert.equal(repaired.counts.generated, 1);
  assert.equal(rendered, 2);
  const ledger = JSON.parse(await fs.readFile(path.join(output, 'status.json'), 'utf8'));
  assert.equal(ledger.entries.length, 2);
  assert.equal((await fs.readFile(path.join(output, 'status.csv'), 'utf8')).charCodeAt(0), 0xfeff);
  let stop=false;
  const interrupted=await runFolderBatch({folder:input,output,render,cancelled:()=>stop,
    onProgress:value=>{if(value.done===1)stop=true;}});
  assert.equal(interrupted.cancelled,true);
  const resumed=await runFolderBatch({folder:input,output,render});
  assert.equal(resumed.counts.already_done,1);
  assert.equal(rendered,2);
  const work=path.join(input,'ready','작업 정보');await fs.mkdir(work,{recursive:true});
  const revisionFile=path.join(work,'feedback-revision-plan.json');
  await fs.writeFile(revisionFile,JSON.stringify({schema:'threads-feedback-revision-v1',editorial:{templateId:'screenshot',exclusions:{s0:'사용자가 지적한 미방'}}}));
  const {loadBatchInput}=require('../desktop/batch-input.cjs');
  assert.equal((await loadBatchInput(path.join(input,'ready'))).editorial.exclusions.s0,'사용자가 지적한 미방');
  await fs.writeFile(revisionFile,JSON.stringify({schema:'wrong',editorial:{}}));await assert.rejects(loadBatchInput(path.join(input,'ready')),/평가 반영/);
  await fs.rm(revisionFile);
  await fs.writeFile(path.join(input, 'ready', 'media', '01.jpg'), Buffer.from('damaged'));
  const changed = await runFolderBatch({ folder:input, output, render });
  assert.equal(changed.counts.failed, 1);
  assert.match(changed.entries.find(entry => entry.id === 'ready-id').reason, /검증 기록/);
  assert.equal(rendered, 2);
  console.log('Folder batch generation, skip, image repair, missing media and changed source: PASS');
} finally {
  await fs.rm(root, { recursive:true, force:true });
}
import test from 'node:test';

test('batch-owned output I/O failure is fatal after a successful renderer', async () => {
 const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'threads-batch-fatal-'));
 const candidate = path.join(fixture, 'input', 'one'), destination = path.join(fixture, 'output');
 try {
  await fs.mkdir(candidate, {recursive:true});
  await fs.writeFile(path.join(candidate, 'source.json'), JSON.stringify({schema:'threads-verbatim-source-v1',verbatim:true,title:'Fixture',body:'Complete original body.',comments:[]}));
  const originalWrite = fs.writeFile;
  for (const code of ['EIO','ENOSPC','EACCES']) {
   let injected = false;
   fs.writeFile = async function(file, ...args) {
    if (String(file).startsWith(destination + path.sep) && /slide-001[.]png$/.test(String(file))) {
     injected = true; throw Object.assign(Error('Fixture output write failure: ' + code), {code});
    }
    return originalWrite.call(this, file, ...args);
   };
   try {
    await assert.rejects(runFolderBatch({folder:path.join(fixture,'input'),output:destination,render:async()=>({title:'Fixture',zip:Buffer.from('result'),sourceZip:Buffer.from('source'),images:[{name:'rendered/slide-001.png',data:Buffer.from('pixels')} ]})}), error => error.code === code);
    assert.equal(injected, true);
   } finally { fs.writeFile = originalWrite; }
   await assert.rejects(fs.stat(path.join(destination,'batch.lock')), {code:'ENOENT'});
  }
 } finally {
  assert(path.resolve(fixture).startsWith(path.resolve(os.tmpdir()) + path.sep));
  assert(path.basename(fixture).startsWith('threads-batch-fatal-'));
  await fs.rm(fixture, {recursive:true,force:true});
 }
});
