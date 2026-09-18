#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function fail(message) { console.error(message); process.exit(1); }
const [planFile, renderedDir, outFile] = process.argv.slice(2);
if (!planFile || !renderedDir) fail('usage: node scripts/validate-rendered-source-carousel.mjs <carousel-plan.json> <rendered-dir> [out.json]');
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
if (plan.type !== 'SOURCE_BACKED_CAROUSEL_PLAN') fail('expected SOURCE_BACKED_CAROUSEL_PLAN');
if (plan.publicationAllowed !== false || plan.publishOwner !== '04_REVIEW_PUBLISH') fail('carousel must remain review/publish gated');
if (!Array.isArray(plan.slides) || plan.slides.length < 2) fail('carousel requires cover plus source-backed body');
if (plan.slides[0].kind !== 'COVER_ONLY') fail('slide 1 must be COVER_ONLY');
for (let i = 1; i < plan.slides.length; i++) {
  if (plan.slides[i].kind !== 'ORIGINAL_POST_SCREENSHOT') fail(`slide ${i + 1} must be ORIGINAL_POST_SCREENSHOT`);
}

const files = fs.readdirSync(renderedDir).filter(f => /^slide-\d+\.png$/i.test(f)).sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));
if (files.length !== plan.slides.length) fail(`rendered slide count ${files.length} != plan ${plan.slides.length}`);
const rendered = files.map((file, index) => {
  const expected = `slide-${String(index + 1).padStart(2,'0')}.png`;
  if (file !== expected) fail(`expected ${expected}, found ${file}`);
  const bytes = fs.readFileSync(path.join(renderedDir, file));
  if (bytes.length < 24 || bytes.toString('ascii',1,4) !== 'PNG') fail(`${file} is not PNG`);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width !== 1080 || height !== 1080) fail(`${file} must be 1080x1080, got ${width}x${height}`);
  return {slideNumber:index+1,file,width,height,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),kind:plan.slides[index].kind};
});
const result = {type:'RENDERED_SOURCE_CAROUSEL_VALIDATION',sourceUrl:plan.sourceUrl,validated:true,publicationAllowed:false,publishOwner:'04_REVIEW_PUBLISH',slideCount:rendered.length,slides:rendered,claims:{ocr:false,automaticPrivacyMasking:false,rightsCleared:false,published:false},note:'Structural/render validation only. It does not prove rights, moderation, OCR, delivery, publication, or human visual approval.'};
const text = `${JSON.stringify(result,null,2)}\n`;
if (outFile) fs.writeFileSync(outFile,text); else process.stdout.write(text);
