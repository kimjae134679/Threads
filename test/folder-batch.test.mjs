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
    return {zip:Buffer.from('preview zip fixture'),
      images:[{name:'rendered/slide-001.png',data:Buffer.from('png fixture')}]};
  };
  const first = await runFolderBatch({ folder:input, output, render });
  assert.equal(first.counts.generated, 1);
  assert.equal(first.counts.needs_source, 1);
  assert.equal(rendered, 1);
  const second = await runFolderBatch({ folder:input, output, render });
  assert.equal(second.counts.already_done, 1);
  assert.equal(second.counts.needs_source, 1);
  assert.equal(rendered, 1);
  await fs.rm(path.join(output, 'ready-id', 'rendered', 'slide-001.png'));
  const repaired = await runFolderBatch({ folder:input, output, render });
  assert.equal(repaired.counts.generated, 1);
  assert.equal(rendered, 2);
  const ledger = JSON.parse(await fs.readFile(path.join(output, 'status.json'), 'utf8'));
  assert.equal(ledger.entries.length, 2);
  assert.equal((await fs.readFile(path.join(output, 'status.csv'), 'utf8')).charCodeAt(0), 0xfeff);
  await fs.writeFile(path.join(input, 'ready', 'media', '01.jpg'), Buffer.from('damaged'));
  const changed = await runFolderBatch({ folder:input, output, render });
  assert.equal(changed.counts.failed, 1);
  assert.match(changed.entries.find(entry => entry.id === 'ready-id').reason, /검증 기록/);
  assert.equal(rendered, 2);
  console.log('Folder batch generation, skip, image repair, missing media and changed source: PASS');
} finally {
  await fs.rm(root, { recursive:true, force:true });
}
