#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) { console.error(message); process.exit(1); }
const [normalizationFile, coverFile, outFile] = process.argv.slice(2);
if (!normalizationFile || !coverFile) fail('usage: node scripts/build-source-backed-carousel-plan.mjs <normalization-plan.json> <cover.json> [out.json]');

const normalization = JSON.parse(fs.readFileSync(normalizationFile, 'utf8'));
const cover = JSON.parse(fs.readFileSync(coverFile, 'utf8'));
if (normalization.type !== 'SCREENSHOT_NORMALIZATION_PLAN') fail('expected SCREENSHOT_NORMALIZATION_PLAN');
if (!Array.isArray(normalization.slides) || normalization.slides.length === 0) fail('normalization plan must contain source screenshots');
if (normalization.fullBodyCaptureStatus !== 'VERIFIED_COMPLETE') fail('carousel body requires VERIFIED_COMPLETE source screenshots');
if (normalization.publicationAllowed !== false || normalization.publishOwner !== '04_REVIEW_PUBLISH') fail('normalization plan must remain review/publish gated');
if (!cover.originalTitle || typeof cover.originalTitle !== 'string') fail('cover requires originalTitle');
if (!cover.imageAsset || typeof cover.imageAsset !== 'string') fail('cover requires imageAsset');
if (cover.hookText && cover.hookText !== cover.originalTitle && cover.hookText !== cover.exactStrongPhrase) fail('cover hook must be originalTitle or an explicitly recorded exactStrongPhrase');

const seenHashes = new Set();
const body = normalization.slides.map((slide, index) => {
  if (slide.sourceSequence !== index + 1) fail(`body screenshot order mismatch at ${index + 1}`);
  if (slide.mode !== 'CONTAIN_NO_STRETCH' || slide.bodyCropAllowed !== false) fail(`body screenshot ${index + 1} violates no-stretch/full-body policy`);
  if (!slide.sha256 || !/^[a-f0-9]{64}$/i.test(slide.sha256) || !slide.captureUrl || !slide.provenance) fail(`body screenshot ${index + 1} lacks provenance evidence`);
  const hash = slide.sha256.toLowerCase();
  if (seenHashes.has(hash)) fail(`duplicate source screenshot hash at ${index + 1}`);
  seenHashes.add(hash);
  if (slide.captureUrl !== normalization.sourceUrl) fail(`body screenshot ${index + 1} captureUrl/sourceUrl mismatch`);
  if (!slide.target || slide.target.width !== 1080 || slide.target.height !== 1080) fail(`body screenshot ${index + 1} must target 1080x1080`);
  for (const key of ['sourceWidth','sourceHeight','scaledWidth','scaledHeight','padLeft','padRight','padTop','padBottom']) {
    if (!Number.isInteger(slide[key]) || slide[key] < (key.startsWith('pad') ? 0 : 1)) fail(`body screenshot ${index + 1} invalid ${key}`);
  }
  if (slide.scaledWidth + slide.padLeft + slide.padRight !== 1080 || slide.scaledHeight + slide.padTop + slide.padBottom !== 1080) fail(`body screenshot ${index + 1} normalization does not close to 1080x1080`);
  if (Math.abs(slide.padLeft - slide.padRight) > 1 || Math.abs(slide.padTop - slide.padBottom) > 1) fail(`body screenshot ${index + 1} is not centered contain geometry`);
  if (slide.privacyMasking !== 'USER_DIRECTED_ONLY') fail(`body screenshot ${index + 1} privacy masking must remain user-directed`);
  return { slideNumber: index + 2, kind: 'ORIGINAL_POST_SCREENSHOT', ...slide };
});

const plan = {
  type: 'SOURCE_BACKED_CAROUSEL_PLAN',
  sourceUrl: normalization.sourceUrl,
  publicationAllowed: false,
  publishOwner: '04_REVIEW_PUBLISH',
  slideCount: body.length + 1,
  slides: [
    {
      slideNumber: 1,
      kind: 'COVER_ONLY',
      width: 1080,
      height: 1080,
      imageAsset: cover.imageAsset,
      text: cover.hookText || cover.originalTitle,
      titlePolicy: 'ORIGINAL_TITLE_OR_EXACT_STRONG_PHRASE_ONLY'
    },
    ...body
  ],
  forbiddenBodyCards: ['SUMMARY','PARAPHRASE','EXPLANATION','REACTION','CTA','REWRITTEN_STORY'],
  bodyPolicy: 'SLIDE_2_PLUS_ORIGINAL_POST_SCREENSHOTS_ONLY_FULL_BODY_IN_SOURCE_ORDER',
  privacyMasking: 'USER_DIRECTED_ONLY',
  note: 'This is a production plan, not proof that rendered assets, rights clearance, moderation, delivery or publication succeeded.'
};
const text = `${JSON.stringify(plan, null, 2)}\n`;
if (outFile) fs.writeFileSync(outFile, text); else process.stdout.write(text);
