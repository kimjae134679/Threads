// Readable private TXT extraction only. The original HTML remains byte-pinned;
// this is not verbatim verification, OCR, rights review or production approval.
import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
import {DOMParser} from 'linkedom';
import '../app/source-page-plan.js';
const require=createRequire(import.meta.url),{decodeHtml}=require('../desktop/public-source.cjs');
const context=vm.createContext({DOMParser,URL,ThreadsPagePlan:globalThis.ThreadsPagePlan});
vm.runInContext(fs.readFileSync(new URL('../app/source-curation.js',import.meta.url),'utf8'),context,{filename:'authoritative-source-curation.js'});
const unknown=()=>({supported:false,selector:null,images:0,textSegments:0,body:'[보존 HTML · 본문 선택 미확인]\n본문을 안전하게 특정하지 못했습니다. 원본 HTML 전체 바이트는 아래 프로그램용 데이터에 보존합니다. 참고 노트를 원문으로 승격하지 않습니다.'});
export function readableSourceHtml(raw,contentType=''){
 if(!Buffer.isBuffer(raw)||raw.length>5*1024*1024)throw Error('readable_html_size_invalid');
 const decoded=decodeHtml(raw,contentType);
 let plan;try{plan=context.ThreadsSourceCuration.htmlDraft(decoded,[],{readable:true});}catch{return unknown();}
 if(plan.readableBody?.truncated)return unknown();
 if(plan.segments.some(segment=>segment.kind==='text'&&segment.text.includes('\ufffd')||segment.kind==='image'&&(/\ufffd|%ef%bf%bd/i.test(segment.mediaUrl))))return unknown();
 let images=0,textSegments=0;const pieces=[];
 for(const segment of plan.segments){
  if(segment.kind==='text'){pieces.push(segment.text);textSegments++;}
  else if(segment.kind==='image'){images++;const src=segment.mediaUrl;pieces.push('[이미지 '+images+' · 픽셀/문구 미검증: '+(/^data:/i.test(src)?'내장 이미지 원본은 HTML에 보존':src)+']');}
 }
 if(!pieces.length)return unknown();
 return{supported:true,selector:plan.readableBody.selector,images,textSegments,body:'[보존 HTML의 읽기용 본문 · 원문 검증/권리/제작 승인 아님]\n\n'+pieces.join('\n\n')+(plan.unsupportedMedia?.length?'\n\n[원문에 별도 영상/오디오 등 매체가 있으며 시청·내용 검증은 하지 않았습니다.]':'')};
}
