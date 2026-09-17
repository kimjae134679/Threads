#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const candidatesDir = value('--candidates', 'data/candidates');
const out = value('--out', 'data/_system/acquisition-queue.md');
const limit = Number(value('--limit', '30'));
if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('--limit must be 1..100');

const files = (await readdir(candidatesDir)).filter(f => /^\d{6}_C[012]_A[01]_P[01]_.+\.md$/.test(f));
const rows = [];
for (const file of files) {
  const text = await readFile(path.join(candidatesDir, file), 'utf8');
  if (!/_A0_P0_/.test(file)) continue;
  if (!/publicationAllowed\s*[:=]\s*false/i.test(text)) continue;
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() || file.replace(/\.md$/, '');
  const url = text.match(/https?:\/\/[^\s)>]+/)?.[0] || null;
  const source = text.match(/(?:^|\n)(?:-\s*)?(?:출처|Source)\s*[:：]\s*(.+)$/im)?.[1]?.trim() || '미확인';
  const fullBody = /(?:full body|본문)\s*(?:read|확인)\s*[:：]?\s*(?:yes|true|확인|완료)/i.test(text);
  const comments = /(?:comments?|댓글)\s*(?:read|확인)\s*[:：]?\s*(?:yes|true|확인|완료)/i.test(text);
  const assetsPending = /ASSETS_PENDING/i.test(text);
  const c = file.match(/_(C[012])_/)[1];
  // Exact public URL candidates come first; full-body-read items are cheaper to capture safely.
  const score = (c === 'C1' ? 100 : c === 'C2' ? 90 : 0) + (url ? 20 : 0) + (fullBody ? 10 : 0) + (comments ? 2 : 0) + (assetsPending ? 1 : 0);
  rows.push({ file, title, url, source, fullBody, comments, score });
}
rows.sort((a,b) => b.score - a.score || a.file.localeCompare(b.file, 'ko'));
const selected = rows.slice(0, limit);
const lines = [
  '# Source Screenshot Acquisition Queue', '',
  '> Operational queue only. It does not grant rights, approve privacy, verify OCR/moderation, or permit publication.',
  '> Only `04_REVIEW_PUBLISH` may publish. All entries remain `publicationAllowed=false` until the existing human gates are satisfied.', '',
  `Generated from one-candidate-per-file records in \`${candidatesDir}\`. Queue size: **${selected.length}** / eligible **${rows.length}**.`, '',
  '## Capture order', ''
];
selected.forEach((r, i) => {
  lines.push(`### ${i + 1}. ${r.title}`);
  lines.push(`- Candidate: \`${r.file}\``);
  lines.push(`- Source: ${r.source}`);
  lines.push(`- Exact public URL: ${r.url || '미확인 — C0/manual acquisition only'}`);
  lines.push(`- Full body previously read: ${r.fullBody ? 'YES' : 'NO/UNCONFIRMED'}`);
  lines.push(`- Comments previously read: ${r.comments ? 'YES' : 'NO/UNCONFIRMED'}`);
  lines.push('- Required acquisition: ordered screenshots covering the FULL ORIGINAL POST BODY; preserve attached source media where relevant; crop UI chrome only after human review.');
  lines.push('- State after queueing: ASSETS_PENDING / A0 / P0 / publicationAllowed=false');
  lines.push('');
});
lines.push('## Fail-closed rules', '', '- Never fabricate missing screenshots or body cards.', '- Never infer capture/OCR/moderation/rights success from this queue.', '- C0/index-only leads require exact individual provenance before deterministic intake.', '- Privacy masking remains user-directed; no automatic masking.', '- After real bytes exist: deterministic intake → human completeness verification → UI-chrome crop review → reviewed-crop validation → 1080×1080 contain normalization → strict carousel validation.', '');
await writeFile(out, lines.join('\n'), 'utf8');
console.log(`Wrote ${selected.length} acquisition targets to ${out}`);
