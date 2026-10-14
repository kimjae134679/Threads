import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {version}=require('../desktop/post-review-store.cjs');

test('installed production identity includes reviewRound without changing the other hash inputs',()=>{
  const row={id:'existing-id',sourceFingerprint:'source',outputSha256:'output',ruleVersion:'rule',images:[{sha256:'a'}],reviewRound:'round38'};
  assert.notEqual(version(row),version({...row,reviewRound:'another-round'}));
  assert.equal(version({...row,reviewRound:''}),version({...row,reviewRound:undefined}));
});

test('all52 installed ASAR code members and editor/PC-review dependencies have provenance',()=>{
  const file=new URL('../desktop/installed-source-provenance.json',import.meta.url);
  assert.ok(fs.existsSync(file),'complete installed source baseline is required');
  const origin=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(origin.asar.members.length,52);
  assert.equal(origin.asar.sha256,'e1f9671cb83f4dbdf6b52a65cef5776c10098fae034340733f1248fc21475fd1');
  for(const member of [...origin.asar.members,...origin.resources]){
    assert.match(member.sha256,/^[a-f0-9]{64}$/);
    assert.ok(fs.existsSync(new URL('../'+member.activePath,import.meta.url)),member.activePath);
  }
});

test('original110 source bytes are preserved in Git history and inert snapshots, not active package namespaces',()=>{
 const root=fileURLToPath(new URL('../',import.meta.url)),origin=JSON.parse(fs.readFileSync(path.join(root,'desktop/installed-source-provenance.json'),'utf8'));
 for(const member of [...origin.asar.members,...origin.resources]){
  const bytes=execFileSync('git',['show',origin.originGitCommit+':'+member.path],{cwd:root,maxBuffer:32*1024*1024});assert.equal(bytes.length,member.bytes,member.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),member.sha256,member.path);
  assert.deepEqual(fs.readFileSync(path.join(root,member.path)),bytes,member.path+' retained original');assert.notEqual(member.activePath,member.path);
 }
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'desktop/package.json'),'utf8'));assert.deepEqual(pkg.build.files,['*.cjs','!after-pack.cjs','image-requirements-schema.json','package.json']);for(const r of pkg.build.extraResources)assert.ok(['../app','../mobile/android-review','../upload-studio','../repo-candidates.mjs','.'].includes(r.from)||r.from==='..'&&r.to==='unified-runtime'&&!r.filter.some(p=>/^(?:local-private|data|desktop\/(?:production|pc-review))\//.test(p)));
});

test('active standard desktop entry preserves installed reviewRound version semantics',()=>{
  const active=require('../desktop/post-review-store.cjs');
  const row={sourceFingerprint:'same',outputSha256:'same',ruleVersion:'same',images:[],reviewRound:'current-round'};
  assert.notEqual(active.version(row),active.version({...row,reviewRound:'historical-round'}));
  const entry=fs.readFileSync(new URL('../desktop/main.cjs',import.meta.url),'utf8');
  assert.match(entry,/image-production-request/);
  const origin=JSON.parse(fs.readFileSync(new URL('../desktop/installed-source-provenance.json',import.meta.url),'utf8'));
  for(const member of [...origin.asar.members,...origin.resources])assert.ok(member.activePath&&fs.existsSync(new URL('../'+member.activePath,import.meta.url)));
});

test('packaged PC review includes the full local CommonJS dependency closure',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'desktop/package.json'),'utf8'));
  assert.equal(pkg.build.afterPack,'after-pack.cjs');const resource={filter:require('../desktop/after-pack.cjs').helpers};
  const included=name=>resource.filter.some(pattern=>pattern===name||pattern==='*.cjs'&&name.endsWith('.cjs'));
  const visited=new Set(),queue=['post-review-store.cjs','review-release.cjs','review-canonical-writer.cjs'];
  while(queue.length){const name=queue.pop();if(visited.has(name))continue;visited.add(name);
    assert.ok(included(name),'PC review package omits dependency '+name);
    const text=fs.readFileSync(path.join(root,'desktop',name),'utf8');
    for(const match of text.matchAll(/require\(['"](\.\/[^'"]+\.cjs)['"]\)/g))queue.push(path.basename(match[1]));
  }
  assert.ok(visited.has('production-title.cjs'));
  assert.ok(visited.has('project-paths.cjs'));
});
test('audited operational code and handoff history are byte-pinned inert public sources',()=>{
 const origin=JSON.parse(fs.readFileSync(new URL('../desktop/installed-source-provenance.json',import.meta.url),'utf8'));
 assert.equal(origin.legacyOperations?.length,25);
 for(const member of origin.legacyOperations){
  assert.ok(member.path.startsWith('legacy-source/operations/'));assert.equal(member.active,false);
  const bytes=fs.readFileSync(new URL('../'+member.path,import.meta.url));assert.equal(bytes.length,member.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),member.sha256);
 }
});
