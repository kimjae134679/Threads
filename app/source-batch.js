(function () {
  'use strict';
  const C = window.ThreadsSourceBatchCore, Z = window.ThreadsSourceCutZip;
  const $ = id => document.getElementById(id);
  const encoder = new TextEncoder();
  let selected = [], output = null, stopped = false, running = false;
  const base = p => String(p).replaceAll('\\', '/').split('/').pop();
  const safe = s => String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 80) || 'untitled';
  const bytes = s => encoder.encode(String(s));
  const textFile = (name, value) => ({ name, data: bytes(value) });
  const jsonFile = (name, value) => textFile(name, JSON.stringify(value, null, 2) + '\n');
  const kind = p => C.classifyPath(p);
  const sourceInput = f => {
    const p = filePath(f);
    if (/(^|\/)(data\/(candidates|candidate_batches|candidate_bundles|jev_results|_raw_batches|_system|source-packages)|01_DISCOVERY\/data|03_PRODUCTION\/_TEMP_TEST_ONLY_DO_NOT_PUBLISH|test|docs)\//.test(p)) return false;
    if (/(^|\/)(manifest|comments|candidate|README|content)\.(txt|json|md)$/i.test(p)) return false;
    return /\.html?$/i.test(p) || /\.txt$/i.test(p) || /(?:source|article|post|verbatim)\.json$/i.test(f.name);
  };
  function row(file, type, state, pages, note) {
    const tr = document.createElement('tr');
    for (const value of [file, type, state, pages, note]) {
      const td = document.createElement('td'); td.textContent = String(value ?? ''); tr.append(td);
    }
    tr.children[2].className = state === 'converted' ? 'converted' : 'blocked';
    $('rows').append(tr);
  }
  const filePath = f => (f.webkitRelativePath || f.name).replaceAll('\\', '/');
  function nearby(files, source, filename) {
    const normalized = String(filename || '').split(/[?#]/)[0].replaceAll('\\', '/');
    const want = base(normalized).toLowerCase();
    const sourceDir = filePath(source).split('/').slice(0, -1).join('/');
    const matches = files.filter(f => base(filePath(f)).toLowerCase() === want &&
      /\.(png|jpe?g|webp|gif)$/i.test(f.name));
    return matches.find(f => filePath(f).startsWith(sourceDir + '/')) || matches.length === 1 && matches[0] || null;
  }
  function imageName(src) {
    try { return decodeURIComponent(new URL(src, 'https://example.invalid/').pathname.split('/').pop()); }
    catch { return base(src); }
  }
  function visibleText(node) {
    let s = '';
    function walk(n) {
      if (n.nodeType === 3) { s += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (['script','style','noscript','nav','aside','footer','button','form','svg','iframe'].includes(tag) ||
        n.matches?.('.comment, .comment-item, .comment-list, .comments, .reply, .reply-item, [data-comment-id], .advertisement, .ad, .share')) return;
      if (tag === 'br') { s += '\n'; return; }
      if (tag === 'img') {
        const w = Number(n.getAttribute('width')), h = Number(n.getAttribute('height'));
        if ((w && w <= 32) || (h && h <= 32)) return;
        const src = n.getAttribute('data-original') || n.getAttribute('data-src') || n.getAttribute('src') || n.getAttribute('srcset')?.split(',')[0].trim().split(/\s+/)[0] || '';
        if (src && !src.startsWith('data:image/svg')) s += '\n[IMAGE:' + imageName(src) + ']\n';
        return;
      }
      for (const child of n.childNodes) walk(child);
      if (['p','div','section','h1','h2','h3','li','blockquote'].includes(tag) && !s.endsWith('\n')) s += '\n';
    }
    walk(node);
    return s;
  }
  function htmlRecord(source) {
    const doc = new DOMParser().parseFromString(source, 'text/html');
    const titleNode = doc.querySelector('h1') || doc.querySelector('meta[property="og:title"]');
    const title = titleNode?.textContent?.trim() || titleNode?.getAttribute('content') || doc.title || '';
    const selectors = ['[itemprop="articleBody"]','#bo_v_con','.post-content','.article-content','.view_content','.xe_content','article','main'];
    const bodyNode = selectors.map(s => doc.querySelector(s)).find(n => n && visibleText(n).trim().length > 0);
    if (!bodyNode) throw new Error('본문 영역을 특정할 수 없습니다. 원문 TXT/JSON을 제공하세요.');
    const commentNodes = [...doc.querySelectorAll('[data-comment-id], .comment-item, .reply-item, li.comment, .comment-list > li')];
    const comments = commentNodes.filter(n => !n.parentElement?.closest('[data-comment-id], .comment-item, .reply-item, li.comment')).map((n,i) => {
      const text = (n.querySelector('.comment-content,.comment-text,.text,.content') || n).textContent?.trim() || '';
      const score = n.getAttribute('data-likes') || n.querySelector('.like-count,.vote-count,.likes')?.textContent || '';
      const found = String(score).replaceAll(',', '').match(/-?\d+/);
      return { text, likes: found ? Number(found[0]) : NaN,
        best: n.classList.contains('best') || n.classList.contains('popular'), sourceOrder: i };
    });
    return { title, body: visibleText(bodyNode), comments,
      commentCount: commentNodes.length, commentStatus: commentNodes.length ? 'observed' : 'unknown',
      exactText: false, sourceUrl: doc.querySelector('link[rel="canonical"]')?.href || null,
      extraction: 'saved_html_dom_requires_verbatim_comparison' };
  }
  function txtRecord(source) {
    const parsed = C.parseExactText(source);
    if (!parsed) throw new Error('[TITLE]과 [BODY]가 있는 원문 TXT가 필요합니다. 기존 요약 content.txt는 변환하지 않습니다.');
    const none = parsed.comments.trim() === 'NONE';
    const comments = none ? [] : parsed.comments.split(/\r?\n/).flatMap((line,i) => {
      const m = /^\[\+(\d+)\] (.*)$/.exec(line);
      return m ? [{ text: m[2], likes: Number(m[1]), sourceOrder: i }] : [];
    });
    return { title: parsed.title, body: parsed.body, comments,
      commentCount: none ? 0 : comments.length, commentStatus: none || comments.length ? 'observed' : 'unknown',
      exactText: true, sourceUrl: null, extraction: 'provided_verbatim_txt' };
  }
  function jsonRecord(source) {
    const obj = JSON.parse(source);
    if (obj.schema !== 'threads-verbatim-source-v1' || typeof obj.title !== 'string' || typeof obj.body !== 'string')
      throw new Error('원문 JSON은 schema=threads-verbatim-source-v1 및 title/body가 필요합니다.');
    return { title: obj.title, body: obj.body, comments: Array.isArray(obj.comments) ? obj.comments : [],
      commentCount: Array.isArray(obj.comments) ? obj.comments.length : 0,
      commentStatus: obj.commentsStatus === 'none' || Array.isArray(obj.comments) ? 'observed' : 'unknown',
      exactText: obj.verbatim === true, sourceUrl: obj.sourceUrl || null, extraction: 'provided_source_json' };
  }
  async function loadImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (image.naturalWidth * image.naturalHeight > 80000000) throw new Error('이미지가 너무 큽니다: ' + file.name);
      return image;
    } finally { URL.revokeObjectURL(url); }
  }
  function wrap(ctx, text, width) {
    const result = [];
    for (const paragraph of String(text).replace(/\r\n?/g, '\n').split('\n')) {
      if (!paragraph.length) { result.push(''); continue; }
      let current = '';
      for (const char of paragraph) {
        if (current && ctx.measureText(current + char).width > width) {
          result.push(current); current = char;
        } else current += char;
      }
      result.push(current);
    }
    return result;
  }
  async function render(record, mediaFiles) {
    const pages = [], W = 1080, H = 1350, pad = 56;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    function begin() { ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H); ctx.fillStyle = '#16181d'; ctx.font = '40px "Malgun Gothic",sans-serif'; ctx.textBaseline = 'top'; }
    function finish() { pages.push(canvas.toDataURL('image/png')); }
    begin(); ctx.fillStyle = '#111827'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 90px "Malgun Gothic",sans-serif';
    const heading = wrap(ctx, record.title, W - pad * 2);
    if (heading.length > 9) throw new Error('표지 제목이 너무 길어 검토가 필요합니다.');
    heading.forEach((line,i) => ctx.fillText(line,pad,280+i*108));
    finish(); begin();
    let y = pad, used = false;
    function next() { if (used) finish(); begin(); y = pad; used = false; }
    const imageByName = new Map();
    for (const file of mediaFiles) imageByName.set(file.name.toLowerCase(), await loadImage(file));
    for (const piece of C.splitBody(record.body)) {
      if (piece.type === 'text') {
        ctx.font = '40px "Malgun Gothic",sans-serif';
        for (const line of wrap(ctx, piece.value, W - pad * 2)) {
          if (y + 58 > H - pad) next();
          if (line) ctx.fillText(line, pad, y);
          y += 58; used = true;
        }
      } else {
        const image = imageByName.get(piece.value.toLowerCase());
        if (!image) throw new Error('원본 이미지 없음: ' + piece.value);
        const fitW = W - pad * 2, fitH = H - pad * 2;
        const scale = Math.min(fitW / image.naturalWidth, fitH / image.naturalHeight);
        const w = Math.round(image.naturalWidth * scale), h = Math.round(image.naturalHeight * scale);
        if (y + h > H - pad) next();
        ctx.drawImage(image, pad + (fitW - w) / 2, y, w, h); y += h + 28; used = true;
      }
    }
    if (used) finish();
    if (record.popularComments.length) {
      next();
      ctx.font = 'bold 54px "Malgun Gothic",sans-serif'; ctx.fillText('인기 댓글',pad,y); y += 98; used = true;
      ctx.font = '40px "Malgun Gothic",sans-serif';
      for (const c of record.popularComments) {
        for (const line of wrap(ctx, c.text, W - pad * 2)) {
          if (y + 58 > H - pad) next();
          ctx.fillText(line,pad,y); y += 58; used = true;
        }
        y += 34;
      }
      if (used) finish();
    }
    return pages.map((data,i) => ({ name: 'rendered/slide-' + String(i+1).padStart(3,'0') + '.png',
      data: Uint8Array.from(atob(data.split(',')[1]), c => c.charCodeAt(0)) }));
  }
  async function handle(file, all) {
    const raw = await file.text();
    const ext = file.name.toLowerCase().split('.').pop();
    const record = ext === 'json' ? jsonRecord(raw) : ext === 'txt' ? txtRecord(raw) : htmlRecord(raw);
    record.popularComments = C.rankPopular(record.comments);
    const imageRefs = C.splitBody(record.body).filter(p => p.type === 'image').map(p => p.value);
    const media = imageRefs.map(name => ({ name, file: nearby(all,file,name) }));
    record.missingMedia = media.filter(x => !x.file).map(x => x.name);
    record.renderedPages = 0;
    let pages = [];
    if (record.title && record.body && !record.missingMedia.length) {
      pages = await render(record, media.map(x => x.file)); record.renderedPages = pages.length;
    }
    const state = C.status(record);
    const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const id = [...new Uint8Array(hash)].slice(0,8).map(n => n.toString(16).padStart(2,'0')).join('');
    const title = safe(record.title).slice(0,35), label = title + '-' + id;
    const manifest = { schema: 'threads-source-batch-v1', input: filePath(file), sourceUrl: record.sourceUrl,
      title: record.title, extraction: record.extraction, bodyExact: record.exactText,
      comments: { observed: record.commentCount, status: record.commentStatus, selected: record.popularComments.length,
        ranking: 'best marker then visible positive likes; unranked comments excluded' },
      media: media.map(x => ({ name: x.name, available: !!x.file, originalName: x.file?.name || null })),
      missingMedia: record.missingMedia, renderedPages: pages.length, conversionStatus: state,
      publicationAllowed: false, originalFileSha256Prefix: id, sourceFileModifiedAt: new Date(file.lastModified).toISOString() };
    const entries = [textFile('raw/title.txt',record.title), textFile('raw/body.txt',record.body),
      textFile('raw/comments.txt',record.popularComments.map(c => (c.best && !Number.isFinite(c.likes) ? '[BEST] ' : '[+' + c.likes + '] ') + c.text).join('\n')),
      { name:'raw/' + safe(file.name), data:new Uint8Array(await file.arrayBuffer()) },
      ...await Promise.all(media.filter(x => x.file).map(async x => ({
        name: 'raw/media/' + safe(x.name), data:new Uint8Array(await x.file.arrayBuffer()) }))),
      ...pages, jsonFile('manifest.json',manifest)];
    const zip = Z.zip(entries);
    return { label, zip, manifest };
  }
  async function save(result) {
    if (!output) throw new Error('결과 폴더를 먼저 선택하세요.');
    let name = result.label + '.zip', existing = null;
    try { existing = await output.getFileHandle(name); }
    catch (error) { if (error.name !== 'NotFoundError') throw error; }
    if (existing) {
      const previous = await (await existing.getFile()).arrayBuffer();
      const next = await result.zip.arrayBuffer();
      const previousBytes = new Uint8Array(previous), nextBytes = new Uint8Array(next);
      if (previous.byteLength === next.byteLength &&
        previousBytes.every((value, i) => value === nextBytes[i])) {
        result.savedAs = name; return;
      }
      name = result.label + '-rev-' + Date.now() + '.zip';
    }
    const handle = await output.getFileHandle(name, { create:true });
    const writer = await handle.createWritable();
    try { await writer.write(result.zip); await writer.close(); result.savedAs = name; }
    catch (error) { await writer.abort().catch(() => {}); throw error; }
  }
  $('sources').addEventListener('change', e => {
    selected = [...e.target.files]; $('rows').replaceChildren();
    const counts = new Map();
    for (const f of selected) counts.set(kind(filePath(f)), 1 + (counts.get(kind(filePath(f))) || 0));
    const inputs = selected.filter(sourceInput);
    for (const f of selected) {
      const p = filePath(f), k = kind(p);
      if (k === 'legacy_candidate' && /\.md$/i.test(p) && !/\/README\.md$/i.test(p))
        row(p, '기존 후보', 'needs_source', 0, '원문·인기 댓글·본문 이미지 확인 대기');
      else if (k === 'canonical_or_legacy_bundle' && /\/manifest\.json$/i.test(p))
        row(p, '기존 정리본', 'needs_verbatim_check', 0, '기존 요약을 원문으로 간주하지 않음');
    }
    $('summary').textContent = '선택한 파일 ' + selected.length + '개 / 원문 입력 후보 ' + inputs.length +
      '개\n분류: ' + [...counts].map(([k,v]) => k + ' ' + v).join(', ');
    $('start').disabled = !inputs.length || !output;
    $('progress').max = Math.max(1,inputs.length); $('progress').value = 0;
  });
  $('output').addEventListener('click', async () => {
    try { output = await window.showDirectoryPicker({ mode:'readwrite' }); $('outputName').textContent = '결과 폴더: ' + output.name; $('start').disabled = !selected.some(sourceInput); }
    catch (e) { $('outputName').textContent = '폴더 선택 실패: ' + e.message; }
  });
  $('stop').addEventListener('click', () => { stopped = true; });
  $('start').addEventListener('click', async () => {
    if (running) return;
    running = true; stopped = false; $('start').disabled = true; $('stop').disabled = false;
    const inputs = selected.filter(sourceInput); let done=0, converted=0, blocked=0;
    for (const file of inputs) {
      if (stopped) break;
      try {
        const result = await handle(file,selected);
        await save(result);
        row(filePath(file), '원문', result.manifest.conversionStatus, result.manifest.renderedPages,
          result.manifest.missingMedia.length ? '이미지 없음: '+result.manifest.missingMedia.join(', ') : result.manifest.extraction + ' · ' + result.savedAs);
        result.manifest.conversionStatus === 'converted' ? converted++ : blocked++;
      } catch (error) { blocked++; row(filePath(file),'원문','failed',0,error.message); }
      done++; $('progress').value=done;
      $('summary').textContent = '처리 ' + done + '/' + inputs.length + ' · 변환 완료 ' + converted +
        ' · 확인·차단·실패 ' + blocked + (stopped ? ' · 중지 요청' : '');
      await new Promise(resolve => setTimeout(resolve,0));
    }
    $('stop').disabled=true; $('start').disabled=false; running=false;
  });
})();
