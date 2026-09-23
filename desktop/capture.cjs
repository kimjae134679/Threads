'use strict';
const { isIP } = require('node:net');
const WIDTH = 1280, MAX_HEIGHT = 48000, TILE_HEIGHT = 8000;
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
function tiles(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || width > WIDTH || height < 1 || height > MAX_HEIGHT) {
    throw new Error('페이지가 너무 크거나 계속 늘어납니다. 필요한 구간을 직접 캡처해서 넣어주세요.');
  }
  const result = [];
  for (let y = 0; y < Math.ceil(height); y += TILE_HEIGHT) result.push({ x: 0, y, width: Math.ceil(width), height: Math.min(TILE_HEIGHT, Math.ceil(height) - y), scale: 1 });
  return result;
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function capturePage(win, input, progress = () => {}) {
  const url = captureUrl(input), wc = win.webContents;
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
      progress({ percent: Math.min(65, 10 + Math.round(y / size.height * 55)), message: '아래쪽 이미지와 본문을 불러오는 중' });
      await wait(200);
    }
    await wc.executeJavaScript('window.scrollTo(0, 0)');
    await wait(250);
    wc.debugger.attach('1.3');
    const metrics = await wc.debugger.sendCommand('Page.getLayoutMetrics');
    const size = metrics.cssContentSize || metrics.contentSize;
    const pieces = tiles(size.width, size.height), assets = [];
    let encodedSize = 0;
    for (const [i, clip] of pieces.entries()) {
      const result = await wc.debugger.sendCommand('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true, clip });
      encodedSize += result.data.length;
      if (result.data.length > 25 * 1024 * 1024 * 4 / 3 || encodedSize > 72 * 1024 * 1024) throw new Error('캡처 용량이 너무 큽니다. 구간별로 직접 캡처해서 넣어주세요.');
      assets.push({ name: `원문 캡처 ${i + 1}.png`, width: clip.width, height: clip.height, dataUrl: 'data:image/png;base64,' + result.data });
      progress({ percent: 70 + Math.round((i + 1) / pieces.length * 25), message: `캡처 이미지 생성 ${i + 1}/${pieces.length}` });
    }
    const after = await wc.debugger.sendCommand('Page.getLayoutMetrics');
    const finalSize = after.cssContentSize || after.contentSize;
    if (finalSize.height !== size.height || finalSize.width !== size.width) throw new Error('캡처 중 페이지 길이가 바뀌었습니다. 다시 시도하거나 직접 캡처해주세요.');
    return { title: wc.getTitle().slice(0, 240), url: captureUrl(wc.getURL()), assets };
  };
  try {
    return await Promise.race([task(), new Promise((_, reject) => { timer = setTimeout(() => {
      reject(new Error('페이지 캡처 시간이 초과됐습니다. 접속 제한이나 무한 스크롤 페이지인지 확인하세요.'));
      if (!win.isDestroyed()) win.destroy();
    }, 60000); })]);
  } finally {
    clearTimeout(timer);
    if (!wc.isDestroyed() && wc.debugger.isAttached()) wc.debugger.detach();
    if (!win.isDestroyed()) win.destroy();
  }
}
module.exports = { captureUrl, tiles, capturePage, WIDTH, MAX_HEIGHT };
