'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const MIME = Object.freeze({ '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp' });

async function loadSavedMaterials(folder) {
  const root = path.resolve(folder);
  let imageDir = root;
  for (const name of ['original', 'media']) {
    try {
      const candidate = path.join(root, name);
      if ((await fs.stat(candidate)).isDirectory()) { imageDir = candidate; break; }
    } catch (_) { /* Try the next known source folder. */ }
  }
  const entries = await fs.readdir(imageDir, { withFileTypes:true });
  const names = entries.filter(entry => entry.isFile() && MIME[path.extname(entry.name).toLowerCase()])
    .map(entry => entry.name).sort((a,b) => a.localeCompare(b, 'ko', { numeric:true, sensitivity:'base' }));
  if (!names.length) throw new Error('선택한 폴더에서 PNG/JPG/WebP 원문 이미지를 찾지 못했습니다.');
  if (names.length > 30) throw new Error('한 번에 30장까지만 불러올 수 있습니다. 원본 이미지 폴더를 선택하세요.');
  if (new Set(names.map(name => name.toLowerCase())).size !== names.length)
    throw new Error('원문 이미지 파일명이 중복됩니다.');
  let title = '', sourceUrl = '', review = null, expected = null, sourceKind = 'source-images';
  try {
    const note = await fs.readFile(path.join(root, 'SOURCE.md'), 'utf8');
    title = /^- exact observed title: `([^`\r\n]*)`/m.exec(note)?.[1] || '';
    sourceUrl = /^- source URL: (https:\/\/\S+)/m.exec(note)?.[1] || '';
    sourceKind = 'source-package';
    try {
      const intake = JSON.parse(await fs.readFile(path.join(root, 'intake-manifest.json'), 'utf8'));
      if (intake.type !== 'SCREENSHOT_INTAKE_MANIFEST' || !Array.isArray(intake.assets))
        throw new Error('원본 이미지 검증 목록을 읽을 수 없습니다.');
      expected = intake.assets.map(asset => ({ name:asset.name, sha256:asset.sha256 }));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
    if (manifest.schema !== 'threads-program-input-v1')
      throw new Error('지원하지 않는 후보 manifest.json입니다.');
    if (!Array.isArray(manifest.media) || !manifest.media.length)
      throw new Error('후보 manifest.json에 검증 가능한 원본 이미지 목록이 없습니다.');
    title ||= String(manifest.title || '');
    sourceUrl ||= String(manifest.sourceUrl || '');
    review = manifest.sourceReview || null;
    sourceKind = 'candidate';
    expected = manifest.media.map(asset => ({ name:path.basename(String(asset.file || '').replaceAll('\\', '/')),
      sha256:asset.sha256 }));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (expected && (expected.length !== names.length ||
    new Set(expected.map(asset => asset.name.toLowerCase())).size !== names.length))
    throw new Error('원본 이미지 목록과 저장 파일의 개수 또는 이름이 다릅니다.');
  const ordered = expected ? expected.map(asset => {
    const name = names.find(item => item.toLowerCase() === asset.name.toLowerCase());
    if (!name || !/^[a-f0-9]{64}$/i.test(String(asset.sha256 || '')))
      throw new Error('원본 이미지 검증 정보가 없거나 파일이 누락되었습니다: ' + asset.name);
    return { name, sha256:asset.sha256.toLowerCase() };
  }) : names.map(name => ({ name }));
  let total = 0;
  const files = [];
  for (const item of ordered) {
    const fullPath = path.join(imageDir, item.name);
    const stat = await fs.stat(fullPath);
    if (stat.size > 25 * 1024 * 1024) throw new Error(`${item.name}: 이미지 한 장은 25MB 이하여야 합니다.`);
    total += stat.size;
    if (total > 60 * 1024 * 1024) throw new Error('원문 이미지 합계가 60MB를 넘습니다. 폴더를 나누어 불러오세요.');
    const data = await fs.readFile(fullPath);
    if (item.sha256 && createHash('sha256').update(data).digest('hex') !== item.sha256)
      throw new Error('원본 이미지가 검증 기록과 다릅니다: ' + item.name);
    files.push({ name:item.name, type:MIME[path.extname(item.name).toLowerCase()], data:data.toString('base64') });
  }
  return { files, metadata:{ title, sourceUrl, imageDirectory:path.basename(imageDir), count:files.length,
    review, sourceKind, integrity:expected ? 'sha256-verified' : 'unverified-image-only' } };
}
module.exports = { loadSavedMaterials };
