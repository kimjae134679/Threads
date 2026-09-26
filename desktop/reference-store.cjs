'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
function createReferenceStore(root) {
  let queue = Promise.resolve();
  const save = async (payload) => {
    if (!payload || !/^[a-zA-Z0-9_-]{1,100}$/.test(payload.projectId || '') || !Array.isArray(payload.images) || payload.images.length > 30
      || JSON.stringify(payload.summary || {}).length > 12000000 || !Array.isArray(payload.events) || payload.events.length > 10000) throw new Error('편집 기록 형식이 올바르지 않습니다.');
    const folder = path.join(root, payload.projectId); await fs.mkdir(folder, { recursive: true });
    let originals = {};
    try { originals = JSON.parse(await fs.readFile(path.join(folder,'originals.json'),'utf8')); } catch(error) { if(error.code !== 'ENOENT') throw error; }
    let bytes = 0;
    for (const image of payload.images) {
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(image.uid || '')) throw new Error('원본 식별자가 올바르지 않습니다.');
      const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(image.dataUrl || '');
      if (!match || match[2].length > 36 * 1024 * 1024) throw new Error('기록할 원본 이미지가 너무 크거나 형식이 다릅니다.');
      bytes += match[2].length; if (bytes > 80 * 1024 * 1024) throw new Error('원본 기록 용량이 너무 큽니다.');
      const data = Buffer.from(match[2],'base64'), sha = createHash('sha256').update(data).digest('hex');
      const name = sha + '.' + (match[1] === 'jpeg' ? 'jpg' : match[1]);
      await fs.writeFile(path.join(folder,name),data,{flag:'wx'}).catch(error => { if(error.code !== 'EEXIST') throw error; });
      originals[image.uid] = { file:name, sha256:sha };
    }
    for (const image of payload.summary?.originalImages || []) if (!originals[image.uid]) throw new Error('원본 이미지가 기록되지 않아 편집 이력을 저장하지 못했습니다.');
    let seen = new Set();
    try { seen = new Set((await fs.readFile(path.join(folder,'edits.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line).id)); } catch(error) { if(error.code !== 'ENOENT') throw error; }
    const entries = payload.events.filter(event => event && typeof event.id === 'string' && !seen.has(event.id));
    const lines = entries.map(event => JSON.stringify(event)).join('\n');
    if (lines.length > 12000000) throw new Error('한 번에 기록할 편집 이력이 너무 큽니다.');
    if (lines) await fs.appendFile(path.join(folder,'edits.jsonl'), lines + '\n');
    for (const [file, value] of [['originals.json',originals],['reference.json',payload.summary]]) {
      const temp = path.join(folder,file+'.tmp'); await fs.writeFile(temp,JSON.stringify(value,null,2)); await fs.rename(temp,path.join(folder,file));
    }
    return { folder, eventCount: seen.size + entries.length };
  };
  return { root, save(payload) { const job=queue.then(()=>save(payload));queue=job.catch(()=>{});return job; } };
}
module.exports = { createReferenceStore };
