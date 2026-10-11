import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=(code,status=409)=>{throw Object.assign(Error(code),{code,status});};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const csp="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";
const matches=(row,p)=>row?.newOutputVersion===p.output_version&&row.images.length===p.images.length&&row.images.every((im,i)=>im.sha256===p.images[i].asset_id);
function inside(root,file){const rel=path.relative(root,file);if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))fail('viewer_path_invalid');return file;}
async function regular(file,max=300*1024*1024){
 for(let cur=path.resolve(file);;cur=path.dirname(cur)){
  const stat=await fs.lstat(cur);if(stat.isSymbolicLink())fail('viewer_path_invalid');
  if(path.dirname(cur)===cur)break;
 }
 const s=await fs.stat(file);if(!s.isFile()||s.size>max)fail('viewer_file_invalid');return fs.readFile(file);
}
export class ReadOnlyViewer{
 constructor(manifest,readState){this.manifest=manifest;this.readState=readState;}
 async load(){
  let navigation;try{navigation=JSON.parse((await regular(this.manifest,2*1024*1024)).toString('utf8')).navigation;}
  catch(e){if(e.code==='ENOENT')fail('viewer_unavailable',503);throw e;}
  if(navigation?.schema!==1||typeof navigation.delivery_root!=='string'||!path.isAbsolute(navigation.delivery_root)
   ||!['mapping_sha256','inventory_sha256'].every(k=>/^[a-f0-9]{64}$/.test(navigation[k]||'')))fail('viewer_unavailable',503);
  const root=path.resolve(navigation.delivery_root);if(await fs.realpath(root)!==root)fail('viewer_path_invalid');
  const mapFile=path.join(root,'delivery-mapping.json'),inventoryFile=path.join(root,'file-inventory.json');
  const [ms,is]=await Promise.all([fs.stat(mapFile),fs.stat(inventoryFile)]);
  const key=JSON.stringify([root,navigation.mapping_sha256,navigation.inventory_sha256,ms.mtimeMs,ms.size,is.mtimeMs,is.size]);
  if(this.cache?.key===key)return this.cache;
  const [mb,ib]=await Promise.all([regular(mapFile,16*1024*1024),regular(inventoryFile,32*1024*1024)]);
  if(sha(mb)!==navigation.mapping_sha256||sha(ib)!==navigation.inventory_sha256)fail('viewer_mapping_changed');
  const mapping=JSON.parse(mb),inventory=JSON.parse(ib);
  if(!Array.isArray(mapping.rows)||mapping.rows.length>2000||!Array.isArray(inventory.files)||inventory.files.length>50000)fail('viewer_mapping_invalid');
  const rows=new Map(),pins=new Map();
  for(const row of mapping.rows){
   if(!/^[A-Za-z0-9_-]+$/.test(row.id)||rows.has(row.id)||typeof row.newOutputVersion!=='string'||!Array.isArray(row.images))fail('viewer_mapping_invalid');
   inside(root,path.resolve(row.output));rows.set(row.id,row);
  }
  for(const f of inventory.files){if(typeof f.newPath!=='string'||!/^[a-f0-9]{64}$/.test(f.sha256||'')||!Number.isSafeInteger(f.bytes))fail('viewer_mapping_invalid');pins.set(inside(root,path.resolve(f.newPath)),f);}
  for(const row of rows.values())for(const [i,im]of row.images.entries()){
   const name='rendered/slide-'+String(i+1).padStart(3,'0')+'.png',file=path.resolve(row.output,name);
   if(im.name!==name||path.resolve(im.file)!==file||pins.get(file)?.sha256!==im.sha256)fail('viewer_mapping_invalid');
  }
  return this.cache={key,root,rows,pins};
 }
 async status(){try{const {rows}=await this.load(),s=await this.readState();return {available:true,url:'/viewer/',readOnly:true,posts:s.posts.filter(p=>!p.inactive_for_this_batch&&matches(rows.get(p.post_id),p)).map(p=>({post_id:p.post_id,output_version:p.output_version,images:p.images.map(i=>i.asset_id)}))};}catch(e){return {available:false,url:null,readOnly:true,code:e.code||'viewer_unavailable'};}}
 async read(route){
  const {root,rows,pins}=await this.load(),state=await this.readState();
  const navigation=(id)=>`<nav style="position:sticky;top:0;background:#fff;padding:12px;z-index:5"><a href="/?post=${encodeURIComponent(id||'')}">검토 화면으로</a> · <a href="/viewer/">전체 자료 목록</a></nav>`;
  if(route==='/viewer/'||route==='/viewer'){
   const current=state.posts.filter(p=>!p.inactive_for_this_batch&&matches(rows.get(p.post_id),p));
   const html='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>현재 제작물 전체 보기</title><body>'+navigation('')+'<main style="max-width:900px;margin:24px auto;padding:16px"><h1>현재 제작물 전체 보기</h1><p>현재 검토 버전과 일치하는 '+current.length+'개 · 읽기 전용</p><ul>'+current.map(p=>'<li style="margin:12px 0"><a href="/viewer/'+encodeURIComponent(p.post_id)+'/">'+esc(p.source?.display_title||p.source?.label||p.post_id)+'</a> · '+p.images.length+'장</li>').join('')+'</ul></main></body></html>';
   return {bytes:Buffer.from(html),mime:'text/html; charset=utf-8',csp};
  }
  const match=route.match(/^\/viewer\/([A-Za-z0-9_-]+)\/(.*)$/);if(!match)fail('viewer_file_not_allowed',404);
  const [,id,name]=match,row=rows.get(id),current=state.posts.find(p=>p.post_id===id&&!p.inactive_for_this_batch);
  if(!row||!current)fail('viewer_post_unavailable',404);if(!matches(row,current))fail('viewer_version_changed');
  if(name&&!/^(?:rendered\/slide-\d{3,}\.png|source-bundle\.zip|review-preview\.zip)$/.test(name))fail('viewer_file_not_allowed',404);
  const file=inside(root,path.resolve(row.output,name||'이미지 전체 보기.html'));
  const pin=pins.get(file);if(!pin)fail('viewer_file_not_allowed',404);
  const bytes=await regular(file);if(bytes.length!==pin.bytes||sha(bytes)!==pin.sha256)fail('viewer_file_changed');
  if(!name){let text=bytes.toString('utf8');if(!/<body\b[^>]*>/i.test(text)||[...text.matchAll(/<main\b[^>]*>[\s\S]*?<\/main>/gi)].length!==1)fail('viewer_file_invalid');
   // The producer HTML can retain an earlier page count. Project the pinned current
   // sequence into its existing layout in the response, without changing the file.
   const figures=row.images.map((im,i)=>`<figure id="page-${i+1}"><figcaption><b>현재 이미지</b> · ${i+1} / ${row.images.length}</figcaption><a href="${im.name}" target="_blank" rel="noopener"><img loading="${i?'lazy':'eager'}" src="${im.name}" alt="현재 이미지 ${i+1}장"></a></figure>`).join('');
   text=text.replace(/(<main\b[^>]*>)[\s\S]*?<\/main>/i,(_,open)=>open+figures+'</main>')
    .replace(/\d+장 · 검수 전 결과/g,row.images.length+'장 · 검수 전 결과')
    .replace(/href="#page-\d+"(?=>마지막 장)/g,`href="#page-${row.images.length}"`);
   return {bytes:Buffer.from(text.replace(/<body\b[^>]*>/i,m=>m+navigation(id))),mime:'text/html; charset=utf-8',csp};}
  return {bytes,mime:name.endsWith('.png')?'image/png':'application/zip',csp};
 }
}
