'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const MIME = Object.freeze({ '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp' });

async function loadSavedMaterials(folder) {
  const root = path.resolve(folder);
  const original = path.join(root, 'original');
  let imageDir = root;
  try { if ((await fs.stat(original)).isDirectory()) imageDir = original; } catch (_) { /* Use selected folder. */ }
  const entries = await fs.readdir(imageDir, { withFileTypes:true });
  const names = entries.filter(entry => entry.isFile() && MIME[path.extname(entry.name).toLowerCase()])
    .map(entry => entry.name).sort((a,b) => a.localeCompare(b, 'ko', { numeric:true, sensitivity:'base' }));
  if (!names.length) throw new Error('선택한 폴더에서 PNG/JPG/WebP 원문 이미지를 찾지 못했습니다.');
  if (names.length > 30) throw new Error('한 번에 30장까지만 불러올 수 있습니다. 원본 이미지 폴더를 선택하세요.');
  let total = 0;
  const files = [];
  for (const name of names) {
    const fullPath = path.join(imageDir, name);
    const stat = await fs.stat(fullPath);
    if (stat.size > 25 * 1024 * 1024) throw new Error(`${name}: 이미지 한 장은 25MB 이하여야 합니다.`);
    total += stat.size;
    if (total > 60 * 1024 * 1024) throw new Error('원문 이미지 합계가 60MB를 넘습니다. 폴더를 나누어 불러오세요.');
    files.push({ name, type:MIME[path.extname(name).toLowerCase()], data:(await fs.readFile(fullPath)).toString('base64') });
  }
  let title = '', sourceUrl = '';
  try {
    const note = await fs.readFile(path.join(root, 'SOURCE.md'), 'utf8');
    title = /^- exact observed title: `([^`\r\n]*)`/m.exec(note)?.[1] || '';
    sourceUrl = /^- source URL: (https:\/\/\S+)/m.exec(note)?.[1] || '';
  } catch (_) { /* Folder may contain images only. */ }
  return { files, metadata:{ title, sourceUrl, imageDirectory:path.basename(imageDir), count:files.length } };
}
module.exports = { loadSavedMaterials };
