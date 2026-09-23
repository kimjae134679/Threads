'use strict';

const { isIP } = require('node:net');

const WIDTH = 1280;
const MAX_HEIGHT = 48000;
const TILE_HEIGHT = 8000;
const MAX_BODY_MEDIA = 24;

function captureUrl(value) {
  if (typeof value !== 'string' || value.length > 4096) throw new Error('올바른 게시글 링크를 입력하세요.');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('https://로 시작하는 게시글 링크를 입력하세요.'); }
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443'
    || isIP(host) || !host.includes('.') || /\.(localhost|local|internal|test|invalid)$/.test(host)) {
    throw new Error('공개 HTTPS 웹페이지 주소를 사용하세요. 로컬 주소·IP 주소·인증정보가 포함된 링크는 열지 않습니다.');
  }
  if (['dcinside.com', 'teamblind.com'].some((domain) => host === domain || host.endsWith('.' + domain))) {
    throw new Error('이 사이트는 자동 캡처 대상에서 제외되어 있습니다. 직접 찍은 원문 이미지를 추가하세요.');
  }
  return url.href;
}

function cleanTitle(value) {
  let title = String(value || '').replace(/\s+/g, ' ').trim();
  const prefix = [
    /^(?:웹진\s*)?인벤\s*[:|·-]\s*/i,
    /^웹젠\s*인벤\s*[:|·-]\s*/i,
    /^(?:더쿠|theqoo|에펨코리아|fmkorea|개드립|보배드림|블라인드|blind)\s*[:|·-]\s*/i,
    /^\[(?:인벤|더쿠|theqoo|에펨코리아|fmkorea|개드립|보배드림|블라인드|blind)\]\s*/i,
  ];
  const suffix = [
    /\s*[-|·:]\s*(?:오픈\s*이슈\s*갤러리|오픈이슈갤러리)\s*$/i,
    /\s*[-|·:]\s*(?:인벤|더쿠|theqoo|에펨코리아|fmkorea|개드립|보배드림|블라인드|blind)\s*$/i,
    /\s*[-|·:]\s*(?:자유게시판|유머게시판|이슈게시판|커뮤니티)\s*$/i,
  ];
  for (const pattern of prefix) title = title.replace(pattern, '').trim();
  for (const pattern of suffix) title = title.replace(pattern, '').trim();
  return title.slice(0, 240);
}

function tiles(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || width > WIDTH || height < 1 || height > MAX_HEIGHT) {
    throw new Error('페이지가 너무 크거나 계속 늘어납니다. 필요한 구간을 직접 캡처해서 넣어주세요.');
  }
  const result = [];
  for (let y = 0; y < Math.ceil(height); y += TILE_HEIGHT) {
    result.push({ x: 0, y, width: Math.ceil(width), height: Math.min(TILE_HEIGHT, Math.ceil(height) - y), scale: 1 });
  }
  return result;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function extractEvidence(wc) {
  const evidence = await wc.executeJavaScript(`(() => {
    const visible = (el) => {
      if (!(el instanceof Element)) return false;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width >= 240 && r.height >= 40 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0;
    };
    const normalize = (text) => String(text || '')
      .replace(/\\u00a0/g, ' ')
      .replace(/[ \\t]+\\n/g, '\\n')
      .replace(/\\n[ \\t]+/g, '\\n')
      .replace(/\\n{3,}/g, '\\n\\n')
      .trim();
    const badContainer = /(comment|reply|repl|nav|menu|side|footer|header|recommend|related|ranking|advert|banner|login|write|toolbar)/i;
    const preferred = [
      '[itemprop="articleBody"]', '.articleContent', '.article-content', '.article_body', '.article-body',
      '.view_content', '.view-content', '.board_view .content', '.board-view .content', '.post-content',
      '.post_content', '.write_div', '.contentBody', '.content_body', '#powerbbsContent', 'article'
    ];
    const candidates = [];
    for (const selector of preferred) {
      document.querySelectorAll(selector).forEach((el) => {
        if (!visible(el)) return;
        const text = normalize(el.innerText);
        if (text.length < 40 || text.length > 50000) return;
        const marker = [el.id, el.className].join(' ');
        if (badContainer.test(marker) && selector !== 'article') return;
        const linkText = [...el.querySelectorAll('a')].reduce((n, a) => n + normalize(a.innerText).length, 0);
        const ratio = text.length ? linkText / text.length : 1;
        const images = [...el.querySelectorAll('img')].filter((img) => img.naturalWidth >= 160 && img.naturalHeight >= 90).length;
        const score = text.length - ratio * text.length * 0.7 + images * 1200 + (selector === '[itemprop="articleBody"]' ? 8000 : 0);
        candidates.push({ el, selector, score, textLength: text.length });
      });
    }
    if (!candidates.length) {
      document.querySelectorAll('main, #content, .content, .contents').forEach((el) => {
        if (!visible(el)) return;
        const text = normalize(el.innerText);
        if (text.length >= 120 && text.length <= 50000) candidates.push({ el, selector: 'fallback', score: text.length * 0.35, textLength: text.length });
      });
    }
    candidates.sort((a, b) => b.score - a.score);
    const chosen = candidates[0] || null;
    let bodyText = '';
    let bodyMediaCandidates = [];
    let selector = '';
    let confidence = 'none';
    if (chosen) {
      selector = chosen.selector;
      confidence = chosen.selector === 'fallback' ? 'low' : chosen.selector === 'article' ? 'medium' : 'high';
      const clone = chosen.el.cloneNode(true);
      clone.querySelectorAll('script,style,noscript,button,form,nav,aside,[class*="comment"],[id*="comment"],[class*="reply"],[id*="reply"],[class*="advert"],[id*="advert"],[class*="banner"],[id*="banner"],[class*="recommend"],[class*="related"]').forEach((n) => n.remove());
      bodyText = normalize(clone.innerText).slice(0, 30000);

      const paragraphNodes = [...chosen.el.querySelectorAll('p,li,blockquote,pre')].filter((el) => normalize(el.innerText).length > 0);
      const badImage = /(advert|banner|logo|avatar|profile|icon|emoji|emot|badge|button|tracking|pixel|doubleclick|googlead|adserver|sprite|thumb[_-]?icon)/i;
      bodyMediaCandidates = [...chosen.el.querySelectorAll('img')].map((img, index) => {
        const r = img.getBoundingClientRect();
        const marker = [img.src, img.alt, img.id, img.className, img.parentElement?.className || '', img.parentElement?.id || ''].join(' ');
        if (!img.src || badImage.test(marker) || r.width < 180 || r.height < 90 || img.naturalWidth < 180 || img.naturalHeight < 90) return null;
        if (img.closest('aside,nav,header,footer,[class*="advert"],[class*="banner"],[class*="profile"],[class*="avatar"]')) return null;
        let insertAfter = 0;
        for (const p of paragraphNodes) {
          const relation = p.compareDocumentPosition(img);
          if (relation & Node.DOCUMENT_POSITION_FOLLOWING) insertAfter += 1;
        }
        return {
          index,
          sourceUrl: img.currentSrc || img.src,
          alt: String(img.alt || '').slice(0, 300),
          x: Math.max(0, r.left + scrollX),
          y: Math.max(0, r.top + scrollY),
          width: r.width,
          height: r.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          insertAfter,
        };
      }).filter(Boolean).slice(0, 24);
    }

    const commentSelectors = [
      '.comment-list li', '.comment_list li', '.comments li', '.reply-list li', '.reply_list li',
      '[id*="comment"] li', '[class*="comment"] li', '[id*="reply"] li', '[class*="reply"] li'
    ];
    const commentNodes = [];
    const seen = new Set();
    for (const selector of commentSelectors) {
      for (const node of document.querySelectorAll(selector)) {
        if (!visible(node) || seen.has(node)) continue;
        seen.add(node);
        commentNodes.push(node);
      }
    }
    const comments = [];
    const commentSeen = new Set();
    for (const node of commentNodes) {
      const preferredText = node.querySelector('.comment-content,.comment_content,.comment-text,.comment_text,.reply-content,.reply_content,.reply-text,.reply_text,[class*="commentContent"],[class*="replyContent"]');
      const clone = (preferredText || node).cloneNode(true);
      clone.querySelectorAll('button,time,img,svg,input,textarea,a,[class*="nick"],[class*="name"],[class*="date"],[class*="time"],[class*="like"],[class*="vote"],[class*="profile"],[class*="avatar"],[class*="action"],[class*="button"],[class*="menu"]').forEach((n) => n.remove());
      const text = normalize(clone.innerText);
      if (text.length < 2 || text.length > 2000 || commentSeen.has(text)) continue;
      if (/^(댓글|답글|좋아요|추천|신고|등록|작성)$/i.test(text)) continue;
      commentSeen.add(text);
      comments.push(text);
      if (comments.length >= 300 || comments.join('\\n\\n').length >= 30000) break;
    }

    const heading = [...document.querySelectorAll('h1,[itemprop="headline"],.title,.subject')]
      .find((el) => visible(el) && normalize(el.innerText).length >= 2 && normalize(el.innerText).length <= 300);
    return {
      pageTitle: document.title,
      heading: heading ? normalize(heading.innerText) : '',
      bodyText,
      comments,
      bodyMediaCandidates,
      selector,
      confidence,
    };
  })()`);

  return {
    title: cleanTitle(evidence.heading || evidence.pageTitle),
    bodyText: String(evidence.bodyText || '').slice(0, 30000),
    comments: Array.isArray(evidence.comments) ? evidence.comments.slice(0, 300).map((s) => String(s).slice(0, 2000)) : [],
    bodyMediaCandidates: Array.isArray(evidence.bodyMediaCandidates) ? evidence.bodyMediaCandidates.slice(0, MAX_BODY_MEDIA) : [],
    selector: String(evidence.selector || ''),
    confidence: ['high', 'medium', 'low'].includes(evidence.confidence) ? evidence.confidence : 'none',
  };
}

async function capturePage(win, input, progress = () => {}) {
  const url = captureUrl(input);
  const wc = win.webContents;
  let timer;
  const task = async () => {
    progress({ percent: 5, message: '웹페이지를 여는 중' });
    await win.loadURL(url);
    captureUrl(wc.getURL());
    const blocked = await wc.executeJavaScript(`Boolean(document.querySelector('input[type="password"], iframe[src*="captcha"], #challenge-running')) || /^(just a moment|access denied|로그인|login|sign in)/i.test(document.title.trim())`);
    if (blocked) throw new Error('로그인 또는 접근 확인 화면입니다. 직접 캡처한 이미지를 추가하세요.');
    await wc.executeJavaScript('Promise.race([document.fonts.ready.then(() => true), new Promise(r => setTimeout(() => r(false), 3000))])');

    let y = 0, settled = 0, previousHeight = 0;
    while (settled < 3) {
      const size = await wc.executeJavaScript('({width: document.documentElement.scrollWidth, height: Math.max(document.body?.scrollHeight || 0, document.documentElement.scrollHeight)})');
      tiles(size.width, size.height);
      if (y >= size.height && size.height === previousHeight) settled++; else settled = 0;
      previousHeight = size.height;
      y = Math.min(y + 700, size.height);
      await wc.executeJavaScript(`window.scrollTo(0, ${y})`);
      progress({ percent: Math.min(58, 10 + Math.round(y / size.height * 48)), message: '아래쪽 이미지·본문·댓글을 불러오는 중' });
      await wait(200);
    }
    await wc.executeJavaScript('window.scrollTo(0, 0)');
    await wait(250);

    progress({ percent: 60, message: '본문 글·댓글·본문 이미지를 판별하는 중' });
    const extracted = await extractEvidence(wc);

    wc.debugger.attach('1.3');
    const metrics = await wc.debugger.sendCommand('Page.getLayoutMetrics');
    const size = metrics.cssContentSize || metrics.contentSize;
    const pieces = tiles(size.width, size.height);
    const assets = [];
    let encodedSize = 0;

    for (const [i, clip] of pieces.entries()) {
      const result = await wc.debugger.sendCommand('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true, clip });
      encodedSize += result.data.length;
      if (result.data.length > 25 * 1024 * 1024 * 4 / 3 || encodedSize > 72 * 1024 * 1024) {
        throw new Error('캡처 용량이 너무 큽니다. 구간별로 직접 캡처해서 넣어주세요.');
      }
      assets.push({ name: `원문 캡처 ${i + 1}.png`, width: clip.width, height: clip.height, dataUrl: 'data:image/png;base64,' + result.data });
      progress({ percent: 68 + Math.round((i + 1) / pieces.length * 18), message: `원문 캡처 이미지 생성 ${i + 1}/${pieces.length}` });
    }

    const bodyMedia = [];
    for (const [i, media] of extracted.bodyMediaCandidates.entries()) {
      const x = Math.max(0, Math.min(size.width - 1, Number(media.x) || 0));
      const yPos = Math.max(0, Math.min(size.height - 1, Number(media.y) || 0));
      const width = Math.min(size.width - x, Math.max(1, Number(media.width) || 1));
      const height = Math.min(size.height - yPos, Math.max(1, Number(media.height) || 1));
      if (width < 10 || height < 10 || width * height > 16000000) continue;
      const shot = await wc.debugger.sendCommand('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: true, fromSurface: true,
        clip: { x, y: yPos, width, height, scale: 1 },
      });
      bodyMedia.push({
        id: 'captured-media-' + (i + 1),
        name: `본문 이미지 ${i + 1}.png`,
        width: Math.round(width),
        height: Math.round(height),
        dataUrl: 'data:image/png;base64,' + shot.data,
        insertAfter: Math.max(0, Math.round(Number(media.insertAfter) || 0)),
        sourceUrl: String(media.sourceUrl || '').slice(0, 4096),
        alt: String(media.alt || '').slice(0, 300),
        acquisition: 'public-page-rendered-body-media',
      });
      progress({ percent: 86 + Math.round((i + 1) / Math.max(1, extracted.bodyMediaCandidates.length) * 9), message: `본문 이미지 확보 ${i + 1}/${extracted.bodyMediaCandidates.length}` });
    }

    const after = await wc.debugger.sendCommand('Page.getLayoutMetrics');
    const finalSize = after.cssContentSize || after.contentSize;
    if (finalSize.height !== size.height || finalSize.width !== size.width) {
      throw new Error('캡처 중 페이지 길이가 바뀌었습니다. 다시 시도하거나 직접 캡처해주세요.');
    }

    const pageTitle = cleanTitle(extracted.title || wc.getTitle());
    progress({ percent: 100, message: '원문 캡처와 글·댓글·본문 이미지 판별 완료' });
    return {
      title: pageTitle,
      url: captureUrl(wc.getURL()),
      assets,
      extracted: {
        title: pageTitle,
        bodyText: extracted.bodyText,
        commentsText: extracted.comments.join('\n\n').slice(0, 30000),
        commentCount: extracted.comments.length,
        bodyMedia,
        selector: extracted.selector,
        confidence: extracted.confidence,
        reviewRequired: true,
      },
    };
  };

  try {
    return await Promise.race([
      task(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('페이지 캡처 시간이 초과됐습니다. 접속 제한이나 무한 스크롤 페이지인지 확인하세요.'));
          if (!win.isDestroyed()) win.destroy();
        }, 60000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (!wc.isDestroyed() && wc.debugger.isAttached()) wc.debugger.detach();
    if (!win.isDestroyed()) win.destroy();
  }
}

module.exports = {
  captureUrl, cleanTitle, tiles, extractEvidence, capturePage, WIDTH, MAX_HEIGHT, MAX_BODY_MEDIA,
};
