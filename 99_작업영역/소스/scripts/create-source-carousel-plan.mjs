#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function fail(message) { console.error(message); process.exit(1); }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function pngSize(file) {
  const b=fs.readFileSync(file);
  if (b.length<24 || b.toString('ascii',1,4)!=='PNG') fail(`${file} is not PNG`);
  return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),bytes:b.length};
}

const [title, coverFile, bodyDir, outFile, sourceUrl] = process.argv.slice(2);
if (!title || !coverFile || !bodyDir || !outFile || !sourceUrl) fail('usage: node scripts/create-source-carousel-plan.mjs <exact-original-title> <cover.png> <body-dir> <plan.json> <source-url>');
let parsedSource;
try { parsedSource = new URL(sourceUrl); } catch { fail('valid source URL required'); }
if (!['http:', 'https:'].includes(parsedSource.protocol) || parsedSource.username || parsedSource.password) fail('public source URL required');
const portableSource = (file) => path.relative(path.dirname(path.resolve(outFile)), path.resolve(file)).split(path.sep).join('/');
const cover=pngSize(coverFile);
if (cover.width!==1080 || cover.height!==1080) fail('cover must be 1080x1080');
const bodies=fs.readdirSync(bodyDir).filter(f=>/^body-\d+\.png$/i.test(f)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
if (!bodies.length) fail('no body-NN.png files');
const slides=[{slideNumber:1,kind:'COVER_ONLY',titleText:title,source:portableSource(coverFile),sha256:sha256(coverFile),...cover}];
for (let i=0;i<bodies.length;i++) {
  const expected=`body-${String(i).padStart(2,'0')}.png`;
  if (bodies[i]!==expected) fail(`expected ${expected}, found ${bodies[i]}`);
  const file=path.join(bodyDir,bodies[i]), info=pngSize(file);
  if (info.width!==1080 || info.height!==1080) fail(`${file} must be 1080x1080`);
  slides.push({slideNumber:i+2,kind:'ORIGINAL_POST_SCREENSHOT',source:portableSource(file),sha256:sha256(file),...info});
}
const plan={type:'RENDERED_SOURCE_CAROUSEL_PLAN',sourceUrl,slideCount:slides.length,exactOriginalTitle:title,publicationAllowed:false,publishOwner:'04_REVIEW_PUBLISH',bodyPolicy:'FULL_ORIGINAL_POST_SCREENSHOTS_IN_ORDER',slides,claims:{ocr:false,automaticPrivacyMasking:false,rightsCleared:false,published:false,humanVisualApproval:false},note:'Plan only. Slide 1 is cover; every later slide must remain an original-post screenshot derivative in source order. No summary/rewrite/interstitial/CTA body cards.'};
fs.mkdirSync(path.dirname(outFile),{recursive:true});
fs.writeFileSync(outFile,`${JSON.stringify(plan,null,2)}\n`);
console.log(`wrote ${outFile} (${slides.length} slides)`);
