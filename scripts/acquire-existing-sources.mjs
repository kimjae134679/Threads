import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = join(ROOT, 'data/runtime/source_pipeline/acquired');
const blocked = new BlockList();
for (const [network, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],
  ['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],
  ['224.0.0.0',4],['240.0.0.0',4]]) blocked.addSubnet(network,prefix,'ipv4');
for (const [network,prefix] of [['::',96],['fc00::',7],['fe80::',10],['ff00::',8],
  ['2001:db8::',32],['2002::',16],['64:ff9b::',96]]) blocked.addSubnet(network,prefix,'ipv6');
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
const hash = value => createHash('sha256').update(value).digest('hex');
const clean = value => String(value).replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100);
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
async function fetchPublic(input, {maxBytes, mime, fetchImpl=fetch} = {}) {
  let target = input;
  for (let hop=0;hop<4;hop++) {
    await safeUrl(target);
    const controller = new AbortController(), timer=setTimeout(()=>controller.abort(),25000);
    let response;
    try { response = await fetchImpl(target,{redirect:'manual',signal:controller.signal,headers:{accept:mime==='html'?'text/html,*/*;q=0.1':'image/*', 'user-agent':'ThreadsSourceArchive/0.1'}}); }
    catch(e) { clearTimeout(timer); throw e; }
    if ([301,302,303,307,308].includes(response.status)) {
      target = new URL(response.headers.get('location'),target).href;
      await response.body?.cancel(); clearTimeout(timer); continue;
    }
    if (!response.ok) { clearTimeout(timer); throw new Error('HTTP '+response.status); }
    const ct=(response.headers.get('content-type')||'').toLowerCase();
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
function imageLinks(html,baseUrl) {
  const result = [], tags=String(html).match(/<img\b[^>]*>/gi)||[];
  for (const tag of tags) {
    if (/\b(?:width|height)\s*=\s*["']?(?:[1-9]|[12][0-9]|3[012])["'\s>]/i.test(tag)) continue;
    const attr = key => new RegExp("(?:^|\\s)" + key + "\\s*=\\s*(?:\"([^\"]+)\"|'([^']+)'|([^\\s>]+))", "i").exec(tag);
    const m=attr('data-original')||attr('data-src')||attr('src');
    if (!m) continue;
    try {
      const url=new URL((m[1]||m[2]||m[3]).replaceAll('&amp;','&'),baseUrl);
      if(url.protocol==='https:' && !result.includes(url.href)) result.push(url.href);
    } catch {}
  }
  return result.slice(0,40);
}
async function acquire(entry, opts) {
  const markdown=await readFile(join(ROOT,entry.candidate),'utf8'), url=exactLink(markdown);
  if (!url) return {state:'needs_exact_url',candidate:entry.candidate};
  const name=clean(basename(entry.candidate,'.md'))+'-'+hash(entry.candidate).slice(0,8);
  const folder=join(OUT,name), statePath=join(folder,'acquisition.json');
  if (!opts.refresh) {
    try { const prior=JSON.parse(await readFile(statePath,'utf8')); if(prior.state==='saved_html') return {...prior,skipped:true}; }
    catch {}
  }
  await mkdir(folder,{recursive:true});
  try {
    const page=await fetchPublic(url,{maxBytes:5*1024*1024,mime:'html'});
    await writeFile(join(folder,'source.html'),page.bytes);
    const html=page.bytes.toString('utf8'), mediaUrls=imageLinks(html,page.url);
    const media=[];
    await mkdir(join(folder,'media'),{recursive:true});
    for (const [i,mediaUrl] of mediaUrls.entries()) {
      try {
        const r=await fetchPublic(mediaUrl,{maxBytes:8*1024*1024,mime:'image'});
        const ext=/jpeg/.test(r.contentType)?'.jpg':/webp/.test(r.contentType)?'.webp':/gif/.test(r.contentType)?'.gif':'.png';
        const rawName=decodeURIComponent(new URL(mediaUrl).pathname.split('/').pop()||'');
        const filename=rawName.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,150)||('image-'+String(i+1).padStart(3,'0')+ext);
        const saved=filename;
        if (media.some(x=>x.file === 'media/'+saved)) { media.push({url:mediaUrl,error:'파일명 중복 — 직접 원본 이미지를 확인하세요'}); continue; }
        await writeFile(join(folder,'media',saved),r.bytes);
        media.push({url:mediaUrl,file:'media/'+saved,sha256:hash(r.bytes),bytes:r.bytes.length});
      } catch(e) { media.push({url:mediaUrl,error:String(e.message||e)}); }
    }
    const result={candidate:entry.candidate,url:page.url,state:'saved_html',textStatus:'needs_verbatim_check',
      commentStatus:'needs_comment_check',mediaStatus:'candidates_downloaded_not_body_verified',
      htmlSha256:hash(page.bytes),htmlBytes:page.bytes.length,media,publicationAllowed:false};
    await writeFile(statePath,JSON.stringify(result,null,2)+'\n');
    return result;
  } catch(e) {
    const result={candidate:entry.candidate,url,state:'blocked',reason:String(e.message||e),publicationAllowed:false};
    await writeFile(statePath,JSON.stringify(result,null,2)+'\n');return result;
  }
}
async function main() {
  const args=process.argv.slice(2), all=args.includes('--all'), refresh=args.includes('--refresh');
  const n=Number(args[args.indexOf('--limit')+1]);
  const limit=all?Infinity:Number.isInteger(n)&&n>0?n:20;
  const queue=JSON.parse(await readFile(join(ROOT,'data/_system/source-work-queue.json'),'utf8'));
  const entries=queue.entries.slice(0,limit);let done=0, saved=0;
  for(const entry of entries) {
    const result=await acquire(entry,{refresh});done++;if(result.state==='saved_html')saved++;
    console.log('['+done+'/'+entries.length+'] '+result.state+' '+entry.candidate);
    await delay(1200);
  }
  console.log(JSON.stringify({processed:done,savedHtml:saved,output:OUT}));
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) main().catch(e=>{console.error(e);process.exitCode=1});
export {exactLink,imageLinks,safeUrl,fetchPublic};
