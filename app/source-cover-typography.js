(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ThreadsCoverTypography=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const VERSION='2026-10-09.1';
 const palettes={warm:{background:'#f5f1e9',ink:'#253039',accent:'#a44532',line:'#d7ccc0'},cool:{background:'#eff3f8',ink:'#22324b',accent:'#2855a0',line:'#c7d4e4'},calm:{background:'#eef4f0',ink:'#203933',accent:'#246b57',line:'#c5d8ce'},photo:{background:'#151c27',ink:'#f8f7f3',accent:'#f0cb71',line:'#43505f'}};
 function style(title,{emphasis='',accent=null,photo=false}={}){
  const words=title.match(/[\p{L}\p{N}]+/gu)||[],stop=new Set(['후기','근황','이유','있는','없는','예전','한번','생각','다녀온','장문','초스압','긴글주의','너무','정말','하는','한','내가','나는','그리고']);
  const core=/퇴사|사수|상사|입사|손절|결혼|축의금|여행|친구|가족|무직|연락|도둑|실패|찾은|노트북|구매|후회|섭섭|월급|면담|버스|돈까스/;
  const at=emphasis?title.indexOf(emphasis):-1,boundary=at>=0&&!/[\p{L}\p{N}]/u.test(title[at-1]||' ')&&!/[\p{L}\p{N}]/u.test(title[at+emphasis.length]||' ');
  if(!emphasis||at<0||emphasis.length>24||!boundary)emphasis=words.find(w=>w.length>=2&&w.length<=12&&core.test(w))||words.filter(w=>w.length>=2&&w.length<=10&&!stop.has(w)&&!/^\d/.test(w)).sort((a,b)=>b.length-a.length)[0]||'';
  const mood=photo?'photo':/회사|사수|상사|퇴사|입사|프로젝트|면담|노트북|공유기|직장|업무/.test(title)?'cool':/여행|버스|구매|음식|돈까스|찾은|산책/.test(title)?'calm':'warm';
  const palette={...palettes[mood]};if(accent!==null){if(!/^#[a-f\d]{6}$/i.test(accent))throw Error('제목 포인트색 형식');palette.accent=accent;}
  return{version:VERSION,mood,palette,emphasis,emphasisScale:1.06,secondaryScale:.97,maxColors:2};
 }
 function runs(line,size,style,index,count){
  const at=style.emphasis?line.indexOf(style.emphasis):-1,normal=Math.round(size*(index===count-1&&count>1?style.secondaryScale:1));
  const run=(text,emphasized=false)=>({text,size:emphasized?Math.round(size*style.emphasisScale):normal,weight:900,color:emphasized?style.palette.accent:style.palette.ink,emphasized});
  return at<0?[run(line)]:[run(line.slice(0,at)),run(style.emphasis,true),run(line.slice(at+style.emphasis.length))].filter(r=>r.text);
 }
 function fit(title,box,measure,policy,style,maxSize=124,minSize=48){
  let size=maxSize,lines=null,lineHeight;
  for(;size>=minSize;size-=2){lines=policy.wrapTitle(title,box.width,t=>measure(t,Math.round(size*style.emphasisScale),900));lineHeight=Math.ceil(size*1.24);if(lines&&lines.length*lineHeight<=box.height)break;}
  if(size<minSize||!lines||!lines.length)throw Error('전체 제목 타이포 공간 부족: 생략하지 않고 보류');
  if(lines.join('').replace(/\s/gu,'')!==title.replace(/\s/gu,''))throw Error('제목 문자 누락');
  const normalized=title.replace(/\s+/gu,' ').trim(),emphasis=style.emphasis.replace(/\s+/gu,' '),start=emphasis?normalized.indexOf(emphasis):-1;let cursor=0;
  const lineRuns=lines.map((line,i)=>{const position=normalized.indexOf(line,cursor);cursor=position+line.length;const from=Math.max(position,start),to=Math.min(position+line.length,start+emphasis.length);
   return runs(line,size,{...style,emphasis:start>=0&&to>from?line.slice(from-position,to-position):''},i,lines.length);});
  return{size,lines,lineHeight,height:lines.length*lineHeight,runs:lineRuns};
 }
 return Object.freeze({VERSION,style,runs,fit});
});
