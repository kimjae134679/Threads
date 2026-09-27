import { access, copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const queuePath = path.join(root, 'data/_system/source-work-queue.json');
const defaultOutput = path.join(root, 'data/runtime/program_inputs');
const hash = value => createHash('sha256').update(value).digest('hex');
const exists = async file => access(file).then(() => true, () => false);
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const relative = file => path.relative(root, file).replaceAll(path.sep, '/');
const section = (text, name) => {
  const match = new RegExp('^\\[' + name + '\\]\\r?\\n([\\s\\S]*?)(?=^\\[[A-Z_]+\\]\\s*$|\\s*$)', 'm').exec(text);
  return match?.[1]?.trim() || '';
};
function safeLabel(value, limit = 48) {
  return String(value || '').normalize('NFKC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, limit) || 'untitled';
}
function exactSourceUrl(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const field = /^\s*(?:[-*]\s*)?(?:publicUrl|public_url|public URL|public page|exactPublicUrl|exact public URL|sourceUrl|source_url|source URL|exactSourceUrl|exact source URL|exact public source|exact individual public source|exact individual public source verified|original URL|original URL observed in page|url|link|\uB9C1\uD06C|\uC815\uD655\uD55C \uC6D0\uBB38 \uB9C1\uD06C|\uC6D0\uBB38 \uB9C1\uD06C)\s*:\s*(https:\/\/\S+)/i;
  const heading = /^#{1,6}\s*(?:exact\s+(?:(?:public\s+)?source(?:\s+url)?|individual\s+(?:public\s+)?(?:source\s+)?(?:url|page))|\uC815\uD655\uD55C (?:\uB9C1\uD06C(?:\s*\/\s*\uACF5\uAC1C \uD398\uC774\uC9C0)?|\uC6D0\uBB38 \uB9C1\uD06C|\uAC1C\uBCC4 \uC6D0\uBB38(?: URL)?|\uAC1C\uBCC4 URL))\s*:?$/i;
  const bare = /^\s*(?:[-*]\s*)?<?(https:\/\/\S+?)>?\s*$/i;
  for (let i = 0; i < lines.length; i++) {
    const match = field.exec(lines[i]);
    if (match) return match[1].replace(/[),.;]+$/g, '');
    if (!heading.test(lines[i].trim())) continue;
    for (let j = i + 1; j < lines.length; j++) {
      if (!lines[j].trim()) continue;
      const link = bare.exec(lines[j]);
      return link ? link[1].replace(/[),.;]+$/g, '') : null;
    }
  }
  return null;
}
function titleFrom(markdown, sourcePath) {
  const lines = String(markdown).split(/\r?\n/);
  const field = lines.map(line => /^[-*]\s*(?:exactObservedTitle|observedTitle|topic_title|title|제목)\s*:\s*(.*)$/i.exec(line))
    .find(Boolean)?.[1]?.trim().replace(/^['"`]|['"`]$/g, '');
  if (field) return field;
  const heading = lines.find(line => /^#\s+/.test(line))?.replace(/^#+\s+/, '').trim();
  if (heading) return heading;
  return path.basename(sourcePath, path.extname(sourcePath))
    .replace(/^\d{6,10}[_-]?/, '').replace(/_C[012]_A[01]_P[01]_/, '').replace(/[_-]+/g, ' ');
}
function platformFor(url, markdown, sourcePath) {
  const host = url ? new URL(url).hostname.toLowerCase() : '';
  if (host.includes('blind')) return 'blind';
  if (host.includes('theqoo')) return 'theqoo';
  if (host.includes('inven')) return 'inven';
  if (host.includes('pann.nate')) return 'natepann';
  if (host.includes('dcinside')) return 'dcinside';
  if (host.includes('fmkorea')) return 'fmkorea';
  if (host.includes('instiz')) return 'instiz';
  if (host.includes('ruliweb')) return 'ruliweb';
  if (host.includes('ppomppu')) return 'ppomppu';
  if (host.includes('clien')) return 'clien';
  if (host) return safeLabel(host.replace(/^www\./, '').replace(/\.[^.]+$/, ''), 32).toLowerCase();
  const text = (String(markdown) + ' ' + sourcePath).toLowerCase();
  for (const name of ['blind', 'theqoo', 'inven', 'natepann', 'dcinside', 'fmkorea', 'instiz', 'ruliweb', 'ppomppu', 'clien'])
    if (text.includes(name)) return name;
  return 'source-unknown';
}
function boolField(markdown, key) {
  const match = new RegExp('^[-*]\\s*' + key + '\\s*:\\s*(true|false|yes|no)', 'im').exec(markdown);
  if (!match) return null;
  return /^(true|yes)$/i.test(match[1]);
}
function stageFields(markdown, sourcePath) {
  const value = /^[-*]\s*(?:stage|상태)\s*:\s*([^\r\n]+)/im.exec(markdown)?.[1]?.trim();
  if (value) return value;
  const match = /_C([012])_A([01])_P([01])_/i.exec(sourcePath);
  return match ? `C${match[1]} / A${match[2]} / P${match[3]}` : null;
}
function groupKey(url, sourcePath) {
  return url ? 'url:' + url : 'file:' + sourcePath;
}
function csvCell(value) {
  const text = String(value ?? '');
  return '"' + text.replaceAll('"', '""') + '"';
}
async function listLegacyBundles() {
  const roots = ['data/candidate_bundles', '01_DISCOVERY/data/candidate_bundles'];
  const results = [];
  for (const relRoot of roots) {
    const dir = path.join(root, relRoot);
    if (!(await exists(dir))) continue;
    for (const name of await readdir(dir, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const folder = path.join(dir, name.name);
      const manifestPath = path.join(folder, 'manifest.json');
      if (!(await exists(manifestPath))) continue;
      let parsed = await readJson(manifestPath);
      if (Array.isArray(parsed)) parsed = parsed[0] || {};
      results.push({
        id: parsed.id || name.name,
        sourceUrl: parsed.sourceUrl || parsed.source_url || null,
        folder,
        manifest: parsed,
        manifestPath,
        contentPath: path.join(folder, 'content.txt'),
        commentsPath: path.join(folder, 'comments.txt'),
        candidatePath: path.join(folder, 'candidate.md'),
      });
    }
  }
  return results;
}
async function legacyRecord(item) {
  const content = await exists(item.contentPath) ? await readFile(item.contentPath, 'utf8') : '';
  const comments = await exists(item.commentsPath) ? await readFile(item.commentsPath, 'utf8') : '';
  return {
    path: relative(item.folder),
    manifestPath: relative(item.manifestPath),
    manifestSha256: hash(await readFile(item.manifestPath)),
    id: item.id,
    bodyStatus: item.manifest.body?.status || item.manifest.bodyStatus || null,
    commentsStatus: item.manifest.comments?.status || item.manifest.commentsStatus || null,
    contentSha256: content ? hash(content) : null,
    commentsSha256: comments ? hash(comments) : null,
    contentHint: content,
    commentsHint: comments,
  };
}
async function collect() {
  const queue = await readJson(queuePath);
  if (!Array.isArray(queue.entries)) throw new Error('Existing source queue has no entries array.');
  const groups = new Map();
  for (const entry of queue.entries) {
    const sourcePath = entry.candidate;
    const sourceFile = path.join(root, sourcePath);
    if (!(await exists(sourceFile))) throw new Error('Candidate source is missing: ' + sourcePath);
    const markdown = await readFile(sourceFile, 'utf8');
    const url = exactSourceUrl(markdown);
    const key = groupKey(url, sourcePath);
    if (!groups.has(key)) groups.set(key, { key, url, candidates: [], jev: [], bundles: [] });
    const group = groups.get(key);
    group.candidates.push({
      path: sourcePath,
      markdown,
      sha256: hash(markdown),
      title: titleFrom(markdown, sourcePath),
      stage: stageFields(markdown, sourcePath),
      bodyRead: boolField(markdown, 'bodyRead'),
      commentsRead: boolField(markdown, 'commentsRead'),
      imagePresent: boolField(markdown, 'imageOrScreenshotPresent'),
      jevResult: entry.jevResult || null,
      sourceStatus: entry.sourceStatus || 'needs_verbatim_source',
      conversionStatus: entry.conversionStatus || 'not_converted',
    });
    if (entry.jevResult && await exists(path.join(root, entry.jevResult))) {
      const file = path.join(root, entry.jevResult);
      const value = await readJson(file);
      group.jev.push({ path: entry.jevResult, sha256: hash(await readFile(file)), value });
    }
  }
  const candidateGroupCount = groups.size;
  const bundles = await listLegacyBundles();
  const bundleUrls = new Set();
  for (const item of bundles) {
    const url = item.sourceUrl;
    if (!url) continue;
    const key = groupKey(url, '');
    if (!groups.has(key)) {
      const candidateMarkdown = await exists(item.candidatePath) ? await readFile(item.candidatePath, 'utf8') : '';
      const sourcePath = relative(item.candidatePath);
      const group = { key, url, candidates: [], jev: [], bundles: [] };
      group.candidates.push({
        path: sourcePath, markdown: candidateMarkdown || '# ' + item.id,
        sha256: hash(candidateMarkdown || item.id), title: titleFrom(candidateMarkdown, sourcePath),
        stage: null, bodyRead: null, commentsRead: null, imagePresent: null,
        jevResult: null, sourceStatus: 'legacy_bundle_only', conversionStatus: 'not_converted',
      });
      groups.set(key, group);
    }
    groups.get(key).bundles.push(await legacyRecord(item));
    bundleUrls.add(url);
  }
  const packageRoot = path.join(root, 'data/source-packages');
  if (await exists(packageRoot)) {
    for (const name of await readdir(packageRoot, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const folder = path.join(packageRoot, name.name);
      const manifestPath = path.join(folder, 'intake-manifest.json');
      if (!(await exists(manifestPath))) continue;
      const intake = await readJson(manifestPath);
      if (!intake.sourceUrl) continue;
      const key = groupKey(intake.sourceUrl, '');
      if (!groups.has(key)) {
        const sourcePath = relative(path.join(folder, 'SOURCE.md'));
        const markdown = await readFile(path.join(folder, 'SOURCE.md'), 'utf8').catch(() => '');
        groups.set(key, { key, url: intake.sourceUrl, candidates: [{
          path: sourcePath, markdown: markdown || '# ' + name.name, sha256: hash(markdown || name.name),
          title: titleFrom(markdown, sourcePath), stage: null, bodyRead: null, commentsRead: null,
          imagePresent: true, jevResult: null, sourceStatus: 'source_package_only', conversionStatus: 'not_converted',
        }], jev: [], bundles: [] });
      }
      groups.get(key).sourcePackage = { folder, intake, manifestPath: relative(manifestPath) };
    }
  }
  return { queue, groups: [...groups.values()], candidateGroupCount, legacyBundleCount: bundles.length, packageUrls: bundleUrls.size };
}
function renderContent(record) {
  const existingContent = record.bundles.map(bundle => bundle.contentHint).filter(Boolean);
  const existingComments = record.bundles.map(bundle => bundle.commentsHint).filter(Boolean);
  const hints = existingContent.map((text, index) =>
    `[기존 요약 ${index + 1} — 원문 인용 아님, 원문 대조 필요]\n${text.trim()}`).join('\n\n');
  const commentHints = existingComments.map((text, index) =>
    `[기존 댓글 메모 ${index + 1} — 원문 인용/인기 근거 재확인 필요]\n${text.trim()}`).join('\n\n');
  const title = record.title || '';
  return [
    '[TITLE]', title,
    '',
    '[BODY_SEQUENCE]',
    '원문 본문 전문을 확보·대조하기 전입니다. 기존 요약이나 평가를 본문으로 사용하지 마세요.',
    hints ? '\n[EXISTING_SUMMARY_NOT_VERBATIM]\n' + hints : '',
    '',
    '[CUT_PLAN]',
    '원문 대조 후 작성',
    '',
    '[COMMENTS_TO_USE]',
    commentHints || '원문 댓글 미확인. 확인 전에는 없음/인기 댓글로 단정하지 않습니다.',
    '',
    '[PROGRAM_ASSEMBLY_ORDER]',
    '원문 제목 → 원문 본문/이미지/댓글을 실제 위치와 대조한 뒤 결정',
    '',
    '[SOURCE_STATUS]',
    'verbatimBody=false',
    'commentsVerified=false',
    'publicationAllowed=false',
    '',
  ].join('\n');
}
function renderComments(record) {
  const hints = record.bundles.map((bundle, index) => bundle.commentsHint
    ? `[기존 댓글 기록 ${index + 1} — 원문 대조 전]\n${bundle.commentsHint.trim()}`
    : '').filter(Boolean);
  return [
    '상태: 원문 댓글 확인 전',
    '이 파일은 실제 댓글을 확인한 뒤 원문 그대로 기록하는 자리입니다.',
    '기존 후보의 요약은 댓글 원문이 아니므로 프로그램에 넣지 않습니다.',
    ...hints,
    '',
  ].join('\n\n');
}
function renderCandidate(record) {
  const aliases = record.candidates.map(item => `- ${item.path}`).join('\n');
  const blocks = record.candidates.map((item, index) =>
    `## 기존 후보 기록 ${index + 1}: ${item.path}\n\nSHA-256: ${item.sha256}\n\n${item.markdown.trim()}`).join('\n\n---\n\n');
  const jev = record.jev.map(item => `- ${item.path} (${item.value.model || 'model unrecorded'})`).join('\n');
  return [
    '# ' + record.title,
    '',
    '- candidate_id: ' + record.id,
    '- source_url: ' + (record.url || 'URL 미확인'),
    '- platform: ' + record.platform,
    '- duplicate_candidate_records: ' + record.candidates.length,
    '- original_candidate_paths:',
    aliases,
    '- Jev evaluation files:',
    jev || '  - 연결된 Jev 결과 없음',
    '- current_status: ' + record.status,
    '- publicationAllowed: false',
    '',
    '## 기존 후보 기록 원문',
    '',
    blocks,
    '',
  ].join('\n');
}
function renderManifest(record) {
  return JSON.stringify({
    schema: 'threads-program-input-v1',
    id: record.id,
    title: record.title,
    platform: record.platform,
    sourceUrl: record.url,
    generatedAt: new Date().toISOString(),
    status: record.status,
    stages: [...new Set(record.candidates.map(item => item.stage).filter(Boolean))],
    sourceReview: {
      verbatimBodyAvailable: false,
      bodyVerified: false,
      commentsVerified: false,
      mediaPositionVerified: false,
      rightsReviewed: false,
      privacyReviewed: false,
      publicationAllowed: false,
    },
    candidateRecords: record.candidates.map(item => ({
      path: item.path, sha256: item.sha256, title: item.title, stage: item.stage,
      bodyRead: item.bodyRead, commentsRead: item.commentsRead, imagePresent: item.imagePresent,
      sourceStatus: item.sourceStatus, conversionStatus: item.conversionStatus,
    })),
    jevAssessments: record.jev.map(item => ({
      path: item.path, sha256: item.sha256, schemaVersion: item.value.schema_version,
      model: item.value.model, answers: item.value.answers, usage: item.value.usage_total,
    })),
    priorBundles: record.bundles.map(({ contentHint, commentsHint, ...item }) => item),
    sourcePackage: record.sourcePackage ? {
      intakeManifest: record.sourcePackage.manifestPath,
      observedAt: record.sourcePackage.intake.observedAt,
      fullBodyCaptureStatus: record.sourcePackage.intake.fullBodyCaptureStatus,
    } : null,
    media: record.media,
    blockers: record.blockers,
  }, null, 2) + '\n';
}
async function addExistingMedia(record, folder) {
  if (!record.sourcePackage) return [];
  const packageFolder = record.sourcePackage.folder;
  const originalFolder = path.join(packageFolder, 'original');
  const result = [];
  for (const asset of record.sourcePackage.intake.assets || []) {
    const source = path.join(originalFolder, asset.name);
    const data = await readFile(source);
    const actualHash = hash(data);
    if (actualHash !== asset.sha256 || data.length !== asset.byteLength)
      throw new Error('Source media hash mismatch: ' + relative(source));
    const filename = String(asset.sourceSequence).padStart(2, '0') + '-' + safeLabel(path.basename(asset.name), 60);
    const destFolder = path.join(folder, 'media');
    await mkdir(destFolder, { recursive: true });
    await writeFile(path.join(destFolder, filename), data, { flag: 'wx' });
    result.push({
      sequence: asset.sourceSequence, file: 'media/' + filename, bytes: data.length,
      sha256: actualHash, role: 'source-linked-original-image',
      bodyPositionVerified: false, ocrVerified: false, rightsReviewed: false,
    });
  }
  return result;
}
async function generate({ output = defaultOutput, overwrite = false } = {}) {
  if (await exists(output)) {
    if (!overwrite) throw new Error('Output already exists. Use --write --overwrite only after reviewing it: ' + output);
    await rm(output, { recursive: true, force: true });
  }
  const { queue, groups, candidateGroupCount, legacyBundleCount } = await collect();
  const records = [];
  for (const group of groups) {
    group.candidates.sort((a, b) =>
      Number(Boolean(b.bodyRead)) - Number(Boolean(a.bodyRead)) ||
      Number(Boolean(b.commentsRead)) - Number(Boolean(a.commentsRead)) ||
      a.path.localeCompare(b.path));
    const primary = group.candidates[0];
    const id = 'source-' + hash(group.key).slice(0, 14);
    const platform = platformFor(group.url, primary.markdown, primary.path);
    const title = primary.title || id;
    const blockers = [
      '원문 본문 전문이 없거나 줄바꿈까지 대조되지 않음',
      '댓글의 실제 문구와 인기 근거가 대조되지 않음',
      '권리·개인정보·게시 검수가 끝나지 않음',
    ];
    if (group.candidates.some(item => item.imagePresent === true) && !group.sourcePackage)
      blockers.push('후보에 이미지 존재 표시가 있으나 실제 파일이 묶이지 않음');
    const record = {
      ...group, id, platform, title,
      status: group.url ? 'needs_verbatim_review' : 'needs_exact_public_url',
      blockers, media: [],
    };
    const folderName = safeLabel(title, 48) + '--' + id;
    record.relativeFolder = path.posix.join(platform, folderName);
    records.push(record);
  }
  records.sort((a, b) => a.platform.localeCompare(b.platform) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  await mkdir(output, { recursive: true });
  for (const record of records) {
    const folder = path.join(output, ...record.relativeFolder.split('/'));
    await mkdir(folder, { recursive: true });
    record.media = await addExistingMedia(record, folder);
    await writeFile(path.join(folder, 'candidate.md'), renderCandidate(record), 'utf8');
    await writeFile(path.join(folder, 'content.txt'), renderContent(record), 'utf8');
    await writeFile(path.join(folder, 'comments.txt'), renderComments(record), 'utf8');
    await writeFile(path.join(folder, 'manifest.json'), renderManifest(record), 'utf8');
  }
  const publicRecords = records.map(record => ({
    id: record.id, platform: record.platform, title: record.title, sourceUrl: record.url,
    status: record.status, candidateRecordCount: record.candidates.length, jevCount: record.jev.length,
    priorBundleCount: record.bundles.length, mediaCount: record.media.length,
    folder: record.relativeFolder, publicationAllowed: false,
  }));
  const index = {
    schema: 'threads-program-input-index-v1',
    generatedAt: new Date().toISOString(),
    sourceQueue: relative(queuePath),
    sourceQueueBaseCommit: queue.baseCommit || null,
    sourceCandidateRecords: queue.entries.length,
    normalizedRecords: records.length,
    duplicateCandidateRecordsCollapsed: queue.entries.length - candidateGroupCount,
    linkedJevResults: records.reduce((sum, record) => sum + record.jev.length, 0),
    existingLegacyBundles: legacyBundleCount,
    sourcePackages: records.filter(record => record.sourcePackage).length,
    existingOriginalMediaFiles: records.reduce((sum, record) => sum + record.media.length, 0),
    generatedFolders: records.length,
    publicationAllowed: false,
    records: publicRecords,
  };
  await writeFile(path.join(output, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
  const header = ['id', 'platform', 'title', 'sourceUrl', 'status', 'candidateRecords', 'jevResults',
    'priorBundles', 'mediaFiles', 'folder', 'publicationAllowed'];
  const rows = [header, ...records.map(record => [
    record.id, record.platform, record.title, record.url || '', record.status,
    record.candidates.length, record.jev.length, record.bundles.length, record.media.length,
    record.relativeFolder, false,
  ])];
  await writeFile(path.join(output, 'index.csv'), '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n', 'utf8');
  await writeFile(path.join(output, 'README.md'), [
    '# 프로그램 입력 자료',
    '',
    '이 폴더는 기존 후보와 평가·원문 묶음을 프로그램용 후보 폴더로 정리한 로컬 자료입니다.',
    '원본 데이터는 저장소의 data/candidates, data/jev_results, data/candidate_bundles에 보존되어 있습니다.',
    '',
    '## 파일',
    '',
    '- index.csv: 엑셀에서 후보·플랫폼·원문 링크·확인 상태를 검색합니다.',
    '- index.json: 전체 후보 색인입니다.',
    '- 플랫폼별 폴더: 게시물 한 건당 candidate.md, content.txt, comments.txt, manifest.json을 둡니다.',
    '- media/: 실제 원문 연결을 확인한 기존 원본 이미지가 있는 경우에만 둡니다.',
    '',
    '## 프로그램에서 처리',
    '',
    '1. 앱의 기존 후보 목록에서 한 건을 선택합니다.',
    '2. 정확한 공개 원문이 있으면 한 건씩 원문을 수집합니다.',
    '3. 제목·본문·이미지 위치·댓글을 원문과 대조하고 선별 ZIP을 만듭니다.',
    '4. 이 폴더의 content.txt는 BODY_SEQUENCE 요약용 기록이며, 원문 입력 TXT가 아닙니다. 앱의 원문 가져오기에 넣지 마세요.',
    '',
    '현재 자료에서 대조 전 본문이나 댓글은 미확인으로 표시했습니다. 이전 Jev 점수와 후보 요약은 원문이 아니며 프로그램이 그대로 게시 이미지를 만들면 안 됩니다.',
    '이미지 자동수집은 하지 않았습니다. 기존 기록에 실제 연결된 TheQoo 원본 이미지 8장만 SHA-256을 확인해 media/에 복사했습니다.',
    '권리·개인정보 검수와 실제 게시 승인은 별도 단계이며 publicationAllowed는 false입니다.',
    '',
  ].join('\n'), 'utf8');
  return index;
}
async function check(output = defaultOutput) {
  const index = await readJson(path.join(output, 'index.json'));
  let checked = 0, mediaChecked = 0;
  for (const item of index.records) {
    const folder = path.join(output, ...item.folder.split('/'));
    const files = ['candidate.md', 'content.txt', 'comments.txt', 'manifest.json'];
    for (const name of files) if (!(await exists(path.join(folder, name))) || (await readFile(path.join(folder, name))).length === 0)
      throw new Error('Missing or empty bundle file: ' + item.folder + '/' + name);
    const manifest = await readJson(path.join(folder, 'manifest.json'));
    if (manifest.schema !== 'threads-program-input-v1' || manifest.id !== item.id)
      throw new Error('Invalid manifest: ' + item.folder);
    if (manifest.sourceReview.publicationAllowed !== false)
      throw new Error('Publication state must remain false: ' + item.folder);
    for (const asset of manifest.media || []) {
      const data = await readFile(path.join(folder, asset.file));
      if (hash(data) !== asset.sha256 || data.length !== asset.bytes)
        throw new Error('Media hash mismatch: ' + item.folder + '/' + asset.file);
      mediaChecked++;
    }
    checked++;
  }
  return { checked, mediaChecked, indexRecords: index.records.length, publicationAllowed: index.publicationAllowed };
}
async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--check')) {
    console.log(JSON.stringify(await check()));
    return;
  }
  if (args.has('--write')) {
    const index = await generate({ overwrite: args.has('--overwrite') });
    console.log(JSON.stringify({
      output: relative(defaultOutput), sourceCandidateRecords: index.sourceCandidateRecords,
      normalizedRecords: index.normalizedRecords, linkedJevResults: index.linkedJevResults,
      existingLegacyBundles: index.existingLegacyBundles, sourcePackages: index.sourcePackages,
      existingOriginalMediaFiles: index.existingOriginalMediaFiles,
    }));
    return;
  }
  const queue = await readJson(queuePath);
  console.log(JSON.stringify({
    mode: 'dry-run', candidateRecords: queue.entries.length,
    linkedJevResults: queue.totals?.withMatchingJev ?? null,
    existingBundleFolders: queue.totals?.bundleFolderRecords ?? null,
    target: relative(defaultOutput),
    note: 'Run with --write to create local program-input folders. The output stays under ignored data/runtime.',
  }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
export { check, collect, exactSourceUrl, generate, platformFor, titleFrom };
