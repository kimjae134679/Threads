import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const fixture = 'data/source-packages/theqoo-3826792703';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'threads-rendered-plan-'));
const planPath = path.join(directory, 'plan.json');
const run = (script, args) => spawnSync(process.execPath, ['scripts/' + script, ...args], { encoding: 'utf8' });
try {
  const built = run('create-source-carousel-plan.mjs', ['Exact title', fixture + '/carousel/cover.png', fixture + '/carousel', planPath, 'https://example.com/source']);
  assert.equal(built.status, 0, built.stderr);
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  assert.equal(plan.type, 'RENDERED_SOURCE_CAROUSEL_PLAN');
  assert.equal(plan.sourceUrl, 'https://example.com/source');
  assert.ok(plan.slides.every((slide) => !path.isAbsolute(slide.source)));
  let result = run('validate-rendered-source-carousel.mjs', [planPath, fixture + '/rendered']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).sourceUrl, plan.sourceUrl);
  fs.writeFileSync(planPath, JSON.stringify({ ...plan, sourceUrl: null }));
  result = run('validate-rendered-source-carousel.mjs', [planPath, fixture + '/rendered']);
  assert.notEqual(result.status, 0);
  fs.writeFileSync(planPath, JSON.stringify({ ...plan, type: 'SOURCE_BACKED_CAROUSEL_PLAN' }));
  result = run('validate-rendered-source-carousel.mjs', [planPath, fixture + '/rendered']);
  assert.notEqual(result.status, 0, 'Normalization and rendered-file plans must not share an ambiguous schema');
  console.log('Rendered carousel source provenance/schema/real PNG fidelity passed.');
} finally { fs.rmSync(directory, { recursive: true, force: true }); }
