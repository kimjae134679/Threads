import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { SourceWorkflow } from '../source-workflow.mjs';
import { acquisitionId } from '../scripts/acquire-existing-sources.mjs';

test('loads all candidates, confines source files, and retains conversion results across reload', async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'source-workflow-'));
  const candidates=['data/candidates/one.md','data/candidates/two.md'];
  const queuePath=path.join(root,'queue.json');
  try {
    await fs.writeFile(queuePath,JSON.stringify({entries:candidates.map(candidate=>({candidate}))}));
    await fs.mkdir(path.join(root,'data/candidates'),{recursive:true});
    await fs.writeFile(path.join(root,candidates[0]),'# 원래 글 제목\n\n- sourceUrl: https://example.com/article\n');
    await fs.writeFile(path.join(root,candidates[1]),'제목 없는 메모\n');
    const service=new SourceWorkflow(root,{queuePath});
    const folder=path.join(service.acquired,acquisitionId(candidates[0]));
    await fs.mkdir(path.join(folder,'media'),{recursive:true});
    await fs.writeFile(path.join(folder,'source.html'),'<h1>원문</h1>');
    await fs.writeFile(path.join(folder,'media','photo.jpg'),'photo');
    await fs.writeFile(path.join(folder,'media','raw-image'),'image');
    await fs.writeFile(path.join(folder,'acquisition.json'),JSON.stringify({state:'saved_html',
      contentType:'text/html; charset=utf-8',media:[{file:'media/photo.jpg'},
        {file:'media/raw-image',contentType:'image/png'}]}));
    const before=await service.status();
    assert.equal(before.counts.total,2);
    assert.equal(before.entries[0].title,'원래 글 제목');
    assert.equal(before.entries[1].title,'two');
    assert.equal(before.entries[0].acquisition,'saved_html');
    assert.deepEqual(before.entries[0].mediaFiles,['media/photo.jpg','media/raw-image']);
    assert.equal((await service.source(candidates[0],'source.html')).data.toString(),'<h1>원문</h1>');
    assert.equal((await service.source(candidates[0],'media/raw-image')).contentType,'image/png');
    await assert.rejects(service.source(candidates[0],'media/../../secret'),{status:404});
    await assert.rejects(service.source('../outside','source.html'),{status:404});
    await service.save(candidates[0],'needs_verbatim_check',2,Buffer.from('ZIP'),'원문 대조 필요');
    await service.save(candidates[1],'excluded_severe',0,null,'심한 소재');
    const after=await new SourceWorkflow(root,{queuePath}).status();
    assert.equal(after.entries[0].conversion,'needs_verbatim_check');
    assert.equal(after.entries[0].pages,2);
    assert.ok(after.entries[0].resultFile.endsWith('.zip'));
    assert.equal(after.entries[1].conversion,'excluded_severe');
    assert.equal(after.counts.excluded,1);
    assert.equal(after.counts.needsReview,1);
    await assert.rejects(service.save(candidates[1],'converted',1,null),{status:400});
    let selected;
    const withOpener=new SourceWorkflow(root,{queuePath,spawn:(command,args)=>{
      selected={command,args};const child=new EventEmitter();child.unref=()=>{};
      queueMicrotask(()=>child.emit('spawn'));return child;
    }});
    const opened=await withOpener.openItem(candidates[0]);
    assert.equal(opened.kind,'result');
    assert.equal(path.basename(opened.file),after.entries[0].resultFile);
    assert.ok(selected.args.join(' ').includes(process.platform==='win32'?
      after.entries[0].resultFile:path.dirname(opened.file)));
    assert.equal((await withOpener.openItem(candidates[1])).kind,'candidate');
    await assert.rejects(withOpener.openItem('../outside'),{status:404});
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});
