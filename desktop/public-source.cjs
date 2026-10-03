'use strict';
const {createHash}=require('node:crypto');
const {lookup}=require('node:dns/promises');
const {BlockList,isIP}=require('node:net');
const {basename}=require('node:path');
const {sourceAccess}=require('./source-access.cjs');
const blocked = new BlockList();
for (const [network, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],
  ['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],
  ['224.0.0.0',4],['240.0.0.0',4]]) blocked.addSubnet(network,prefix,'ipv4');
for (const [network,prefix] of [['::',96],['fc00::',7],['fe80::',10],['ff00::',8],
  ['2001:db8::',32],['2002::',16],['64:ff9b::',96]]) blocked.addSubnet(network,prefix,'ipv6');
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
const hash = value => createHash('sha256').update(value).digest('hex');
const clean = value => String(value).replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100);
const acquisitionId = candidate => clean(basename(candidate,'.md'))+'-'+hash(candidate).slice(0,8);
function exactLink(candidateMarkdown) {
  const lines = String(candidateMarkdown).split(/\r?\n/);
  const hit = lines.map(line => /^-\s*(?:정확한 원문 링크|원문 링크|sourceUrl)\s*:\s*(https:\/\/\S+)/i.exec(line))
    .find(Boolean);
  return hit ? hit[1].replace(/[)>]+$/,'') : null;
}
async function safeUrl(input) {
  const u = new URL(input);
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443'))
    throw new Error('공개 HTTPS 주소만 사용합니다.');
  const host = u.hostname.toLowerCase().replace(/\.$/,'');
  if (isIP(host) || !host.includes('.') || /\.(localhost|local|internal|test|invalid)$/.test(host))
    throw new Error('로컬·IP 주소는 수집하지 않습니다.');
  const addresses = await lookup(host,{all:true});
  if (!addresses.length || addresses.some(({address,family}) => blocked.check(address,family === 4?'ipv4':'ipv6')))
    throw new Error('공개 IP가 아닌 주소는 수집하지 않습니다.');
  return u;
}
async function fetchPublic(input, {maxBytes, mime, fetchImpl=fetch, signal} = {}) {
  let target = input, retries = 0;
  for (let hop=0;hop<4;hop++) {
    const access=sourceAccess(target);
    if(access.blockAutomatic) throw new Error(access.nextAction);
    await safeUrl(target);
    const controller = new AbortController(), timer=setTimeout(()=>controller.abort(),25000);
    let response;
    try { response = await fetchImpl(target,{redirect:'manual',signal:signal?AbortSignal.any([controller.signal,signal]):controller.signal,headers:{accept:mime==='html'?'text/html,*/*;q=0.1':'image/*', 'accept-language':'ko-KR,ko;q=0.9,en;q=0.6', 'user-agent':'ThreadsSourceArchive/0.1'}}); }
    catch(e) { clearTimeout(timer); throw e; }
    if ([301,302,303,307,308].includes(response.status)) {
      target = new URL(response.headers.get('location'),target).href; retries = 0;
      await response.body?.cancel(); clearTimeout(timer); continue;
    }
    if ([429,502,503,504].includes(response.status) && retries < 2) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await response.body?.cancel(); clearTimeout(timer);
      await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 5000) : 700 * 2 ** retries);
      retries++; hop--; continue;
    }
    if (!response.ok) { clearTimeout(timer); throw new Error('HTTP '+response.status); }
    const ct=(response.headers.get('content-type')||'').toLowerCase().replace(/^image\/jpg(?=;|$)/,'image/jpeg');
    if (mime==='html' && !/text\/html/.test(ct) || mime==='image' && !/^image\/(png|jpeg|webp|gif)/.test(ct)) {
      clearTimeout(timer); throw new Error('지원하지 않는 Content-Type: '+ct);
    }
    if (Number(response.headers.get('content-length')||0)>maxBytes) {
      await response.body?.cancel();clearTimeout(timer);throw new Error('용량 제한 초과');
    }
    let size=0;const chunks=[];try {
      for await (const chunk of response.body) {
        size+=chunk.length;if(size>maxBytes) throw new Error('용량 제한 초과');
        chunks.push(chunk);
      }
    } finally { clearTimeout(timer); if(size>maxBytes) await response.body?.cancel().catch(()=>{}); }
    return {bytes:Buffer.concat(chunks),url:target,contentType:ct};
  }
  throw new Error('리다이렉트 횟수 초과');
}
function decodeHtml(bytes, contentType = '') {
  const prefix = bytes.subarray(0, 4096).toString('latin1');
  const label = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1] ||
    /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(prefix)?.[1] || 'utf-8';
  try { return new TextDecoder(label).decode(bytes); }
  catch { return new TextDecoder('utf-8').decode(bytes); }
}
function imageLinks(html,baseUrl) {
  const result = [], tags=String(html).match(/<img\b[^>]*>/gi)||[];
  for (const tag of tags) {
    if (/\b(?:width|height)\s*=\s*["']?(?:[1-9]|[12][0-9]|3[012])["'\s>]/i.test(tag)) continue;
    const attr = key => new RegExp("(?:^|\\s)" + key + "\\s*=\\s*(?:\"([^\"]+)\"|'([^']+)'|([^\\s>]+))", "i").exec(tag);
    const ordinary=attr('src');
    const m=attr('data-original')||attr('data-src')||attr('data-lazy-src')||
      (ordinary && !/^data:/i.test(ordinary[1]||ordinary[2]||ordinary[3]) ? ordinary : null)||attr('srcset');
    if (!m) continue;
    try {
      const url=new URL((m[1]||m[2]||m[3]).split(',')[0].trim().split(/\s+/)[0].replaceAll('&amp;','&'),baseUrl);
      if(url.protocol==='https:' && !result.includes(url.href)) result.push(url.href);
    } catch {}
  }
  return result.slice(0,40);
}

module.exports={acquisitionId,exactLink,imageLinks,decodeHtml,safeUrl,fetchPublic,hash};
