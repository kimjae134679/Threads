import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = join(ROOT, 'data/runtime/source_pipeline/acquired');
import archive from '../desktop/public-source.cjs';
const {acquisitionId,exactLink,imageLinks,decodeHtml,safeUrl,fetchPublic,hash}=archive;
async function acquire(entry, opts) {
  const markdown=await readFile(join(ROOT,entry.candidate),'utf8'), url=exactLink(markdown);
  const name=acquisitionId(entry.candidate);
  const folder=join(OUT,name), statePath=join(folder,'acquisition.json');
  if (!url) {
    await mkdir(folder,{recursive:true});
    const result={state:'needs_exact_url',candidate:entry.candidate,publicationAllowed:false};
    await writeFile(statePath,JSON.stringify(result,null,2)+'\n');return result;
  }
  if (!opts.refresh) {
    try { const prior=JSON.parse(await readFile(statePath,'utf8')); if(prior.state==='saved_html') return {...prior,skipped:true}; }
    catch {}
  }
  await mkdir(folder,{recursive:true});
  try {
    const page=await fetchPublic(url,{maxBytes:5*1024*1024,mime:'html'});
    await writeFile(join(folder,'source.html'),page.bytes);
    const html=decodeHtml(page.bytes,page.contentType), mediaUrls=imageLinks(html,page.url);
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
        media.push({url:mediaUrl,file:'media/'+saved,contentType:r.contentType,sha256:hash(r.bytes),bytes:r.bytes.length});
      } catch(e) { media.push({url:mediaUrl,error:String(e.message||e)}); }
    }
    const result={candidate:entry.candidate,url:page.url,state:'saved_html',textStatus:'needs_verbatim_check',
      commentStatus:'needs_comment_check',mediaStatus:'candidates_downloaded_not_body_verified',
      htmlSha256:hash(page.bytes),htmlBytes:page.bytes.length,contentType:page.contentType,media,publicationAllowed:false};
    await writeFile(statePath,JSON.stringify(result,null,2)+'\n');
    return result;
  } catch(e) {
    const result={candidate:entry.candidate,url,state:'blocked',reason:String(e.message||e),publicationAllowed:false};
    await writeFile(statePath,JSON.stringify(result,null,2)+'\n');return result;
  }
}
async function main() {
  const args=process.argv.slice(2), all=args.includes('--all'), refresh=args.includes('--refresh');
  const candidate=args.includes('--candidate')?args[args.indexOf('--candidate')+1]:null;
  const n=Number(args[args.indexOf('--limit')+1]);
  const limit=all?Infinity:Number.isInteger(n)&&n>0?n:20;
  const queue=JSON.parse(await readFile(join(ROOT,'data/_system/source-work-queue.json'),'utf8'));
  const entries=candidate?queue.entries.filter(entry=>entry.candidate===candidate):queue.entries.slice(0,limit);
  if(candidate&&!entries.length)throw new Error('목록에 없는 후보입니다.');
  let done=0, saved=0;
  for(const entry of entries) {
    const result=await acquire(entry,{refresh});done++;if(result.state==='saved_html')saved++;
    console.log('['+done+'/'+entries.length+'] '+result.state+' '+entry.candidate);
    if (result.state!=='needs_exact_url' && !result.skipped) await delay(1200);
  }
  console.log(JSON.stringify({processed:done,savedHtml:saved,output:OUT}));
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) main().catch(e=>{console.error(e);process.exitCode=1});
export {acquisitionId,exactLink,imageLinks,decodeHtml,safeUrl,fetchPublic};