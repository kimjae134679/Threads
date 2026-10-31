import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadSavedMaterials } = require('../desktop/saved-materials.cjs');
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'threads-saved-'));
try {
  await fs.mkdir(path.join(root, 'original'));
  await fs.mkdir(path.join(root, 'rendered'));
  await fs.writeFile(path.join(root, 'SOURCE.md'),
    '# Source\n- exact observed title: `실제 제목`\n- source URL: https://example.com/post\n');
  await fs.writeFile(path.join(root, 'original', '02.jpg'), Buffer.from('second'));
  await fs.writeFile(path.join(root, 'original', '01.jpg'), Buffer.from('first'));
  await fs.writeFile(path.join(root, 'original', '03.png'), Buffer.from('third'));
  await fs.writeFile(path.join(root, 'rendered', 'cover.png'), Buffer.from('generated'));
  const result = await loadSavedMaterials(root);
  assert.deepEqual(result.files.map(file => file.name), ['01.jpg', '02.jpg', '03.png']);
  assert.deepEqual(result.files.map(file => Buffer.from(file.data, 'base64').toString()),
    ['first', 'second', 'third']);
  assert.equal(result.metadata.title, '실제 제목');
  assert.equal(result.metadata.sourceUrl, 'https://example.com/post');
  assert.equal(result.metadata.count, 3);
  assert.equal(result.metadata.integrity, 'unverified-image-only');
  await fs.mkdir(path.join(root, 'empty'));
  await assert.rejects(loadSavedMaterials(path.join(root, 'empty')), /원문 이미지를 찾지 못했습니다/);

  const actual = await loadSavedMaterials(path.resolve('data/source-packages/theqoo-3826792703'));
  assert.equal(actual.files.length, 8);
  assert.equal(actual.files[0].name, '01.jpg');
  assert.equal(actual.metadata.title, '결혼 승낙 받자마자 탈모인거 밝힌 남편..');
  assert.equal(actual.metadata.integrity, 'sha256-verified');

  const candidate = path.join(root, 'candidate');
  const media = path.join(candidate, 'media');
  await fs.mkdir(media, { recursive:true });
  const sourceBytes = [Buffer.from('first'), Buffer.from('second')];
  await fs.writeFile(path.join(media, '02.jpg'), sourceBytes[1]);
  await fs.writeFile(path.join(media, '01.jpg'), sourceBytes[0]);
  const manifest = { schema:'threads-program-input-v1', title:'후보 제목',
    sourceUrl:'https://example.com/candidate',
    sourceReview:{ bodyVerified:false, publicationAllowed:false },
    media:sourceBytes.map((bytes, i) => ({ file:'media/0' + (i + 1) + '.jpg',
      sha256:createHash('sha256').update(bytes).digest('hex') })) };
  await fs.writeFile(path.join(candidate, 'manifest.json'), JSON.stringify(manifest));
  const imported = await loadSavedMaterials(candidate);
  assert.deepEqual(imported.files.map(file => file.name), ['01.jpg', '02.jpg']);
  assert.equal(imported.metadata.title, '후보 제목');
  assert.equal(imported.metadata.sourceUrl, 'https://example.com/candidate');
  assert.equal(imported.metadata.review.publicationAllowed, false);
  assert.equal(imported.metadata.integrity, 'sha256-verified');
  await fs.writeFile(path.join(media, '01.jpg'), Buffer.from('damaged'));
  await assert.rejects(loadSavedMaterials(candidate), /검증 기록과 다릅니다/);
  await fs.writeFile(path.join(media, '01.jpg'), sourceBytes[0]);
  await fs.writeFile(path.join(media, '03.jpg'), Buffer.from('extra'));
  await assert.rejects(loadSavedMaterials(candidate), /개수 또는 이름/);
  console.log('Saved Source Package and candidate media import, order and SHA-256: PASS');
} finally {
  await fs.rm(root, { recursive:true, force:true });
}
