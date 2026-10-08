'use strict';
const path=require('node:path');
const {writeAtomic}=require('./atomic-file.cjs');
const labels={generated:'검수 전 제작',already_done:'이미 제작됨',needs_source:'원문 부족',needs_access:'접근·제공 권한 필요',
 needs_exact_url:'정확한 주소 필요',needs_media:'본문 이미지 누락',needs_selection:'원문 선별 필요',unavailable:'삭제·없는 글',
 excluded_severe:'소재 제외',failed:'처리 오류',published:'게시 완료 기록'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const href=relative=>relative.replaceAll('\\','/').split('/').map(encodeURIComponent).join('/');
async function writeCatalog(output,report){
 const rows=report.entries.map(row=>{
  const input=path.relative(output,path.join(row.originalInputFolder||report.inputFolder,row.relativePath||'.',row.sourceReferenceFile||'자료 안내.txt'));
  const result=row.outputFolder?href(row.outputFolder+'/rendered/slide-001.png'):null;
  return '<details data-title="'+escape(row.title.toLocaleLowerCase())+'" data-ready="'+(row.outputFolder?'1':'0')+'"><summary><b>'+
   escape(row.title||'제목 미확인')+'</b><span>'+escape(labels[row.status]||row.status)+'</span></summary><div class="body">'+
   (result?'<img loading="lazy" src="'+result+'" alt="검수 전 표지">':'')+
   '<p>'+escape(row.reason)+'</p><p>원문 게시 '+escape(row.sourcePublishedAt||'미확인')+' · 원문 확인 '+escape(row.sourceCheckedAt||'미확인')+' · 수집 '+escape(row.collectedAt||'미확인')+'</p><p>기준 '+escape(row.ruleVersion||'이전 기준')+' · 제작 '+escape(row.generatedAt||'없음')+
   ' · 검수 '+escape(row.reviewStatus==='approved'?'확인 완료':'미확인')+' · 게시 '+escape(row.publicationStatus==='published'?'완료':'확인 기록 없음')+
   '</p><p>'+escape(row.nextAction)+'</p><a href="'+href(input)+'">자료 안내</a> '+
   (row.outputFolder?'<a href="'+href(row.outputFolder+'/이미지 전체 보기.html')+'">이미지 전체 보기</a> <a href="'+href(row.outputFolder+'/review-preview.zip')+'">결과 ZIP</a> <a href="'+href(row.outputFolder+'/source-bundle.zip')+'">원문 ZIP</a>':'')+'</div></details>';
 }).join('\n');
 const ready=report.entries.filter(row=>row.outputFolder).length;
 const html='<!doctype html><html lang="ko"><meta charset="utf-8"><title>Threads 최신 자료 목록</title><style>'+
  'body{font:16px system-ui,sans-serif;background:#f4f6f9;color:#172237;max-width:1100px;margin:40px auto;padding:0 24px}'+
  'h1{font-size:30px}input,select{padding:12px;margin:0 8px 20px 0;font:inherit}input{width:55%}details{background:white;border:1px solid #ddd;border-radius:10px;margin:10px 0}'+
  'summary{padding:18px;cursor:pointer;display:flex;justify-content:space-between;gap:20px}summary span{color:#58677c;min-width:120px}.body{padding:0 18px 18px;overflow:auto}.body img{float:left;max-width:250px;max-height:310px;margin:0 22px 18px 0}a{display:inline-block;padding:10px;border:1px solid #bbc5d1;margin:6px;color:#164da1}small{color:#657389}</style>'+
  '<h1>Threads 최신 자료 목록</h1><p>확인 '+report.entries.length+'/'+report.total+'건 · 검수 전 결과 '+ready+'건 · 자료·확인 필요 '+(report.entries.length-ready)+
  '건</p><small>목록 갱신 '+escape(report.lastRunAt)+' · 게시 기록이 없으면 외부 게시 여부는 미확인입니다.</small><p><input id="search" placeholder="제목 검색"><select id="filter"><option value="ready">최신 제작 결과</option><option value="blocked">보류 자료</option><option value="all">전체</option></select></p>'+
  rows+'<script>function paint(){const q=document.getElementById("search").value.toLocaleLowerCase(),f=document.getElementById("filter").value;document.querySelectorAll("details").forEach(r=>{r.hidden=!(r.dataset.title.includes(q)&&(f==="all"||f==="ready"&&r.dataset.ready==="1"||f==="blocked"&&r.dataset.ready==="0"));});}document.getElementById("search").oninput=paint;document.getElementById("filter").onchange=paint;paint();</script></html>';
 await writeAtomic(path.join(output,'자료 목록.html'),html);
}
async function writeResultGallery(folder,entry){
 let plan=null;try{plan=JSON.parse(await require('node:fs/promises').readFile(path.join(folder,'production-plan.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const asset=entry.coverAsset,credit=asset?'<p class="credit">표지 '+escape(asset.kind==='ai_generated'?'AI 생성 장면':'참고 사진')+' · 실제 사건·당사자 사진 아님 · '+escape(asset.attribution)+' · '+(asset.licenseUrl?'<a href="'+escape(asset.licenseUrl)+'">'+escape(asset.license)+'</a>':escape(asset.license))+(asset.sourceUrl?' · <a href="'+escape(asset.sourceUrl)+'">이미지 출처</a>':'')+'</p>':'';
 const label=p=>p?.role==='cover'?'표지':p?.role==='comments'?'원문 댓글':'본문';
 const pages=plan?.pages||[],firstBody=pages.find(p=>p.role==='body'),firstComment=pages.find(p=>p.role==='comments');
 const images=entry.images.map((image,i)=>{const p=pages[i];return '<figure id="page-'+(i+1)+'"><figcaption><b>'+label(p)+'</b> · '+(i+1)+' / '+entry.images.length+'<small>'+escape(p?.purpose||'순서대로 확인')+'</small></figcaption><a href="'+href(image.name)+'" target="_blank"><img loading="'+(i?'lazy':'eager')+'" src="'+href(image.name)+'" alt="'+label(p)+' '+(i+1)+'장"></a></figure>';}).join('');
 const evidence=plan?'<details><summary>제목과 원문 근거 확인</summary><p>원제: '+escape(plan.originalTitle)+'</p><p>표지: '+escape(plan.coverTitle)+'</p><blockquote>'+escape(plan.titleEvidence)+'</blockquote><p>'+escape(plan.titleEvidenceStatus==='matched_source'?'근거 문구가 원문에 있습니다. 제목이 같은 뜻인지 직접 확인하세요.':'근거 문구를 원문에서 다시 확인하세요.')+'</p><p>'+escape(plan.selectionReason)+'</p></details>':'';
 const warnings=plan?.warnings?.length?'<aside><b>확인할 부분</b><ul>'+plan.warnings.map(w=>'<li>'+escape(w)+'</li>').join('')+'</ul></aside>':'';
 const html='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(entry.title)+'</title><style>body{margin:0;background:#edf0f1;color:#172820;font:16px system-ui,sans-serif;line-height:1.6}header{padding:24px;max-width:900px;margin:auto}h1{font-size:26px;line-height:1.4}a{color:#176351}header>a{display:inline-block;margin:8px 18px 8px 0}details,aside{background:white;padding:14px 18px;margin:16px 0;border-radius:8px}summary{cursor:pointer;font-weight:700}blockquote{border-left:3px solid #176351;padding-left:16px;margin-left:0;white-space:pre-wrap}.credit{font-size:13px;color:#58635e}nav{position:sticky;top:0;z-index:2;background:#fffffff2;padding:10px 18px;display:flex;justify-content:center;gap:20px;flex-wrap:wrap;border-bottom:1px solid #d2dad5}button{font:inherit;border:1px solid #9baca2;padding:4px 12px;background:white;border-radius:5px;cursor:pointer}main{display:grid;grid-template-columns:minmax(0,420px);justify-content:center;gap:26px;padding:20px 16px 60px}main.overview{grid-template-columns:repeat(auto-fit,minmax(280px,360px))}figure{margin:0;scroll-margin-top:80px}img{width:100%;height:auto;display:block;box-shadow:0 2px 14px #0001}figcaption{padding:8px 4px;color:#52645a;font-size:14px}small{display:block;font-size:12px;color:#6b786f}.checklist{padding-left:22px}.checklist li{margin:8px 0}</style></head><body><header><h1>'+escape(entry.title)+'</h1><p>'+entry.images.length+'장 · 검수 전 결과 · 게시 승인 없음</p>'+credit+evidence+warnings+'<details><summary>이 글을 검수할 순서</summary><ol class="checklist"><li>표지: 첫눈에 상황이 보이는지, 강조·줄바꿈·이미지가 원문 의미와 맞는지</li><li>본문: 작은 화면에서 읽히는지, 문장·사진 순서와 원문 금액·결말이 보존됐는지</li><li>댓글: 실제 확보한 반응만 있는지, 본문과 구분되는지</li><li>전체: 장 사이 흐름·잘림·공백·권리·개인정보를 확인한 뒤 별도로 검수 기록</li></ol><p>이 화면을 열거나 이미지를 만들었다고 검수·게시 완료로 기록하지 않습니다.</p></details><a href="review-preview.zip">이미지 ZIP 받기</a><a href="source-bundle.zip">원문 ZIP 받기</a></header><nav><a href="#page-1">표지</a>'+(firstBody?'<a href="#page-'+firstBody.number+'">본문 시작</a>':'')+(firstComment?'<a href="#page-'+firstComment.number+'">원문 댓글</a>':'')+'<a href="#page-'+entry.images.length+'">마지막 장</a><button id="view" type="button" aria-pressed="false">여러 장 비교</button></nav><main>'+images+'</main><script>document.getElementById("view").onclick=function(){const on=document.querySelector("main").classList.toggle("overview");this.textContent=on?"순서대로 읽기":"여러 장 비교";this.setAttribute("aria-pressed",String(on));};</script></body></html>';
 await writeAtomic(path.join(folder,'이미지 전체 보기.html'),html);
}
module.exports={writeCatalog,writeResultGallery};
