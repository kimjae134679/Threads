'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { loadSavedMaterials } = require('./saved-materials.cjs');

const digest = data => createHash('sha256').update(data).digest('hex');
const safe = value => String(value || 'source').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
};
async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }

async function discoverCandidates(folder) {
  const root = path.resolve(folder);
  if (!(await fs.stat(root)).isDirectory()) throw new Error('후보 폴더를 선택하세요.');
  const indexPath = path.join(root, 'index.json');
  if (await exists(indexPath)) {
    const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    if (index.schema !== 'threads-program-input-index-v1' || !Array.isArray(index.records))
      throw new Error('후보 색인 index.json 형식이 올바르지 않습니다.');
    return index.records.map(record => {
      const target = path.resolve(root, String(record.folder || ''));
      if (!inside(root, target) || target === root) throw new Error('후보 색인에 허용되지 않은 경로가 있습니다.');
      return { folder:target, relativePath:path.relative(root, target), id:String(record.id || '') };
    });
  }
  const found = [], pending = [root];
  while (pending.length) {
    const current = pending.shift();
    const names = await fs.readdir(current, { withFileTypes:true });
    if (names.some(item => item.name === 'manifest.json' || item.name === 'SOURCE.md')) {
      found.push({ folder:current, relativePath:path.relative(root, current) || '.', id:'' });
      continue;
    }
    for (const item of names) if (item.isDirectory() && !['media','original','node_modules','이전 버전','이전 예시'].includes(item.name)) {
      pending.push(path.join(current, item.name));
      if (pending.length + found.length > 5000) throw new Error('폴더 안의 후보가 5,000건을 넘습니다. 범위를 나눠주세요.');
    }
  }
  return found;
}
function csv(rows) {
  const quote = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const fields = ['id','title','status','reason','sourceUrl','relativePath','previewZip','renderedPages','updatedAt'];
  return '\ufeff' + fields.join(',') + '\r\n' +
    rows.map(row => fields.map(field => quote(row[field])).join(',')).join('\r\n') + '\r\n';
}
async function saveReport(output, report) {
  await fs.mkdir(output, { recursive:true });
  await fs.writeFile(path.join(output, 'status.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  await fs.writeFile(path.join(output, 'status.csv'), csv(report.entries), 'utf8');
}
async function runFolderBatch({ folder, output, render, onProgress = () => {}, cancelled = () => false }) {
  const root = path.resolve(folder), destination = path.resolve(output);
  if (inside(root, destination)) throw new Error('결과 폴더는 입력 폴더 바깥에 두세요.');
  const candidates = await discoverCandidates(root);
  if (!candidates.length) throw new Error('선택한 폴더에 후보 manifest.json 또는 SOURCE.md가 없습니다.');
  await fs.mkdir(destination, { recursive:true });
  let previous = {};
  try {
    const old = JSON.parse(await fs.readFile(path.join(destination, 'status.json'), 'utf8'));
    previous = Object.fromEntries((old.entries || []).map(entry => [entry.id, entry]));
  } catch (_) { /* A first run has no status file. */ }
  const report = { schema:'threads-auto-batch-v1', inputFolder:root, lastRunAt:new Date().toISOString(),
    total:candidates.length, entries:[] };
  onProgress({ phase:'scan', done:0, total:candidates.length });
  for (const [index, candidate] of candidates.entries()) {
    if (cancelled()) break;
    const manifestPath = path.join(candidate.folder, 'manifest.json');
    const sourceName = await exists(manifestPath) ? 'manifest.json' : 'SOURCE.md';
    const sourcePath = path.join(candidate.folder, sourceName);
    const id = safe(candidate.id || digest(candidate.relativePath).slice(0, 16));
    const entry = { id, relativePath:candidate.relativePath, title:'', sourceUrl:'',
      status:'needs_source', reason:'원본 이미지가 없습니다.', previewZip:'', updatedAt:new Date().toISOString() };
    try {
      const sourceText = await fs.readFile(sourcePath, 'utf8');
      if (sourceName === 'manifest.json') {
        const manifest = JSON.parse(sourceText);
        entry.id = safe(candidate.id || manifest.id || id);
        entry.title = String(manifest.title || '');
        entry.sourceUrl = String(manifest.sourceUrl || '');
        if (manifest.schema !== 'threads-program-input-v1') throw new Error('지원하지 않는 후보 manifest.json');
      }
      const imageFolder = path.join(candidate.folder, sourceName === 'manifest.json' ? 'media' : 'original');
      const images = await fs.readdir(imageFolder).catch(() => []);
      if (images.some(name => /\.(png|jpe?g|webp)$/i.test(name))) {
        const loaded = await loadSavedMaterials(candidate.folder);
        entry.title = loaded.metadata.title;
        entry.sourceUrl = loaded.metadata.sourceUrl;
        const intakePath = path.join(candidate.folder, 'intake-manifest.json');
        const intakeText = sourceName === 'SOURCE.md' && await exists(intakePath) ?
          await fs.readFile(intakePath, 'utf8') : '';
        const fingerprint = digest(sourceText + intakeText +
          loaded.files.map(file => file.name + ':' + digest(Buffer.from(file.data, 'base64'))).join('|'));
        const old = previous[entry.id];
        const relativeZip = path.posix.join(entry.id, 'review-preview.zip');
        const finalZip = path.join(destination, entry.id, 'review-preview.zip');
        let intact=old?.sourceFingerprint === fingerprint && old.outputSha256 && await exists(finalZip) &&
          digest(await fs.readFile(finalZip)) === old.outputSha256 && Array.isArray(old.images) && old.images.length > 0;
        if(intact) for(const image of old.images) {
          const file=path.join(destination, entry.id, image.name);
          if(!/^rendered\/slide-[0-9]{3}[.]png$/.test(image.name) || !await exists(file) ||
            digest(await fs.readFile(file)) !== image.sha256) { intact=false;break; }
        }
        if (intact) {
          Object.assign(entry, { status:'already_done', reason:'원본과 결과 해시가 같아 건너뜀',
            previewZip:relativeZip, sourceFingerprint:fingerprint, outputSha256:old.outputSha256,
            images:old.images, renderedPages:old.images.length });
        } else {
          const result = await render({ sourceName, sourceText, intakeText, files:loaded.files,
            imageDirectory:loaded.metadata.imageDirectory, title:entry.title });
          if (!Buffer.isBuffer(result?.zip) || !result.zip.length || !Array.isArray(result.images) ||
            !result.images.length || result.images.length > 60) throw new Error('이미지 ZIP과 PNG를 만들지 못했습니다.');
          const imageRecords=[];
          await fs.mkdir(path.dirname(finalZip), { recursive:true });
          for(const image of result.images) {
            if(!/^rendered\/slide-[0-9]{3}[.]png$/.test(image.name) || !Buffer.isBuffer(image.data) ||
              !image.data.length) throw new Error('이미지 파일명 또는 데이터가 올바르지 않습니다.');
            const file=path.join(destination, entry.id, image.name);
            await fs.mkdir(path.dirname(file), { recursive:true });
            await fs.writeFile(file, image.data);
            imageRecords.push({name:image.name,sha256:digest(image.data)});
          }
          await fs.writeFile(finalZip, result.zip);
          Object.assign(entry, { status:'generated', reason:'검수 전 이미지 제작 완료',
            previewZip:relativeZip, sourceFingerprint:fingerprint, outputSha256:digest(result.zip),
            images:imageRecords, renderedPages:imageRecords.length });
          await saveReport(destination, { ...report, entries:[...report.entries, entry] });
        }
      }
    } catch (error) { entry.status='failed'; entry.reason=String(error.message).slice(0, 300); }
    report.entries.push(entry);
    onProgress({ phase:'processing', done:index+1, total:candidates.length,
      status:entry.status, title:entry.title, reason:entry.reason });
  }
  report.cancelled = report.entries.length < candidates.length;
  report.counts = Object.fromEntries(['generated','already_done','needs_source','failed'].map(status =>
    [status, report.entries.filter(entry => entry.status === status).length]));
  await saveReport(destination, report);
  return { output:destination, ...report };
}
module.exports = { discoverCandidates, runFolderBatch };
