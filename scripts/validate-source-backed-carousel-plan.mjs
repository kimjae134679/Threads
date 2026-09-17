#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) { console.error(message); process.exit(1); }
const [planFile] = process.argv.slice(2);
if (!planFile) fail('usage: node scripts/validate-source-backed-carousel-plan.mjs <carousel-plan.json>');
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));

if (plan.type !== 'SOURCE_BACKED_CAROUSEL_PLAN') fail('expected SOURCE_BACKED_CAROUSEL_PLAN');
if (plan.publicationAllowed !== false || plan.publishOwner !== '04_REVIEW_PUBLISH') fail('publish gate violation');
if (!Array.isArray(plan.slides) || plan.slides.length < 2) fail('cover plus at least one original screenshot required');
if (plan.slideCount !== plan.slides.length) fail('slideCount mismatch');

const cover = plan.slides[0];
if (cover.slideNumber !== 1 || cover.kind !== 'COVER_ONLY') fail('slide 1 must be COVER_ONLY');
if (cover.width !== 1080 || cover.height !== 1080) fail('cover must be 1080x1080');
if (!cover.imageAsset || !cover.text) fail('cover image/text required');
if (cover.titlePolicy !== 'ORIGINAL_TITLE_OR_EXACT_STRONG_PHRASE_ONLY') fail('cover title policy violation');

let expectedSourceSequence = 1;
let sourceUrl = null;
for (let i = 1; i < plan.slides.length; i += 1) {
  const slide = plan.slides[i];
  if (slide.slideNumber !== i + 1 || slide.kind !== 'ORIGINAL_POST_SCREENSHOT') fail(`slide ${i + 1} must be ordered original screenshot`);
  if (slide.sourceSequence !== expectedSourceSequence++) fail(`source sequence gap at slide ${i + 1}`);
  if (slide.mode !== 'CONTAIN_NO_STRETCH' || slide.bodyCropAllowed !== false) fail(`body integrity violation at slide ${i + 1}`);
  if (!slide.sha256 || !slide.captureUrl || !slide.provenance) fail(`provenance missing at slide ${i + 1}`);
  if (sourceUrl === null) sourceUrl = slide.captureUrl;
  if (slide.captureUrl !== sourceUrl) fail(`mixed source URL at slide ${i + 1}`);
}
if (plan.sourceUrl && sourceUrl && plan.sourceUrl !== sourceUrl) fail('plan/source screenshot URL mismatch');
if (plan.privacyMasking !== 'USER_DIRECTED_ONLY') fail('privacy masking must remain user-directed');
const forbidden = new Set(plan.forbiddenBodyCards || []);
for (const required of ['SUMMARY','PARAPHRASE','EXPLANATION','REACTION','CTA','REWRITTEN_STORY']) {
  if (!forbidden.has(required)) fail(`missing forbidden body-card type: ${required}`);
}
process.stdout.write(`OK ${plan.slides.length} slides; ${plan.slides.length - 1} source screenshots; publish gated\n`);
