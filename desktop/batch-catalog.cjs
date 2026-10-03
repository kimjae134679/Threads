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
  const input=path.relative(output,path.join(report.inputFolder,row.relativePath||'.','자료 안내.txt'));
  const result=row.outputFolder?href(row.outputFolder+'/rendered/slide-001.png'):null;
  return '<details data-title="'+escape(row.title.toLocaleLowerCase())+'" data-ready="'+(row.outputFolder?'1':'0')+'"><summary><b>'+
   escape(row.title||'제목 미확인')+'</b><span>'+escape(labels[row.status]||row.status)+'</span></summary><div class="body">'+
   (result?'<img loading="lazy" src="'+result+'" alt="검수 전 표지">':'')+
   '<p>'+escape(row.reason)+'</p><p>기준 '+escape(row.ruleVersion||'이전 기준')+' · 제작 '+escape(row.generatedAt||'없음')+
   ' · 검수 '+escape(row.reviewStatus==='approved'?'확인 완료':'미확인')+' · 게시 '+escape(row.publicationStatus==='published'?'완료':'확인 기록 없음')+
   '</p><p>'+escape(row.nextAction)+'</p><a href="'+href(input)+'">자료 안내</a> '+
   (row.outputFolder?'<a href="'+href(row.outputFolder+'/review-preview.zip')+'">결과 ZIP</a> <a href="'+href(row.outputFolder+'/source-bundle.zip')+'">원문 ZIP</a>':'')+'</div></details>';
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
module.exports={writeCatalog};
