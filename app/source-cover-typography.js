(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ThreadsCoverTypography=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const VERSION='2026-10-09.6';
 const dark={background:'#101116',ink:'#ffffff',accent:'#f2e34c',line:'#34343d'};
 const palettes={warm:dark,cool:dark,calm:dark,photo:dark};
 function style(title,{emphasis='',accent=null,photo=false,sizeEmphasis,sizeScale=1.03,explicitEmphasis=false,lineBreaks=null}={}){
  const words=title.match(/[\p{L}\p{N}]+/gu)||[],stop=new Set(['후기','근황','이유','있는','없는','예전','한번','생각','다녀온','장문','초스압','긴글주의','너무','정말','하는','한','내가','나는','그리고']);
  const core=/퇴사|사수|상사|입사|손절|결혼|축의금|여행|친구|가족|무직|연락|도둑|실패|찾은|노트북|구매|후회|섭섭|월급|면담|버스|돈까스/;
  const at=emphasis?title.indexOf(emphasis):-1,boundary=at>=0&&!/[\p{L}\p{N}]/u.test(title[at-1]||' ')&&!/[\p{L}\p{N}]/u.test(title[at+emphasis.length]||' ');
  if(explicitEmphasis&&(!emphasis||at<0||emphasis.length>24))throw Error('명시한 색 강조 구절은 원문 제목 안에 있어야 합니다.');
  if(!explicitEmphasis&&(!emphasis||at<0||emphasis.length>24||!boundary)){
   const phrases=[/(?:받는|돌려받는|해결하는|피하는|버티는|그만두는)\s+(?:방법|법)/u,/(?:방|집|돈|시간|기회|자리)(?:을|를)?\s*(?:내어|빌려|돌려|내준|내줬|내줌)[\p{L}\p{N}]*/u,/(?:알바|입사|수습|신입|여행)\s+(?:\d+[년개월주일차]+|첫날|첫\s*출근)/u,/(?:결벽증|우울증|치매|불면증)\s+(?:새언니|남편|아내|친구|부모|엄마|아빠)/u,/(?:아부지|아버지|엄마|어머니|남편|아내|친구|사수|상사)\s+(?:회사|직장|결혼|여행)(?:\s+(?:썰|이야기|후기))?/u,/(?:사수|상사|선배|도움)\s+없이/u];
   emphasis=phrases.map(re=>title.match(re)).find(match=>match&&match[0].length<=24&&!/[\p{L}\p{N}]/u.test(title[match.index-1]||' ')&&!/[\p{L}\p{N}]/u.test(title[match.index+match[0].length]||' '))?.[0]||words.find(w=>w.length>=2&&w.length<=12&&core.test(w))||words.find(w=>w.length>=2&&w.length<=10&&!stop.has(w)&&!/^\d/.test(w)&&!/(?:해서|했는데|한다고|할까요|을까요|있어요|없어요|좋아함|듣는거|하는거|하니까|하면)$/u.test(w))||'';
  }
  if(!Number.isFinite(sizeScale)||sizeScale<1||sizeScale>1.24)throw Error('크기 강조 배율은 1~1.24 범위입니다.');
  if(sizeEmphasis===undefined)sizeEmphasis=emphasis;
  if(typeof sizeEmphasis!=='string'||sizeEmphasis&&(!emphasis.includes(sizeEmphasis)||!title.includes(sizeEmphasis)))throw Error('크기 강조는 색 강조 구절 내부에 있어야 합니다.');
  const mood=photo?'photo':/회사|사수|상사|직원|퇴사|입사|프로젝트|면담|노트북|공유기|직장|업무/.test(title)?'cool':/여행|버스|구매|음식|돈까스|군대리아|롯데리아|급식|식당|찾은|산책/.test(title)?'calm':'warm';
  const palette={...palettes[mood]};if(accent!==null){if(!/^#[a-f\d]{6}$/i.test(accent))throw Error('제목 포인트색 형식');palette.accent=accent;}
  if(lineBreaks!==null&&(!Array.isArray(lineBreaks)||!lineBreaks.length||lineBreaks.some(line=>typeof line!=='string'||!line.trim()||line.trim().replace(/\s/gu,'').length<2)||lineBreaks.map(line=>line.trim()).join(' ').replace(/\s+/gu,' ')!==title.trim().replace(/\s+/gu,' ')))throw Error('줄바꿈은 제목 전체와 단어 경계를 보존해야 합니다.');
  return{version:VERSION,mood,palette,emphasis,sizeEmphasis,explicitEmphasis,lineBreaks:lineBreaks?.map(line=>line.trim())||null,emphasisScale:sizeScale,secondaryScale:explicitEmphasis?1:.97,maxColors:2};
 }
 function runs(line,size,style,index,count){
  const at=style.emphasis?line.indexOf(style.emphasis):-1,sized=style.sizeEmphasis===undefined?style.emphasis:style.sizeEmphasis,large=sized?line.indexOf(sized):-1,normal=Math.round(size*(index===count-1&&count>1?style.secondaryScale:1));
  const edges=[0,line.length];if(at>=0)edges.push(at,at+style.emphasis.length);if(large>=0)edges.push(large,large+sized.length);
  const points=[...new Set(edges)].sort((a,b)=>a-b);
  return points.slice(0,-1).map((from,i)=>{const to=points[i+1],emphasized=at>=0&&from>=at&&to<=at+style.emphasis.length,sizeEmphasized=large>=0&&from>=large&&to<=large+sized.length;return {text:line.slice(from,to),size:sizeEmphasized?Math.round(size*style.emphasisScale):normal,weight:900,color:emphasized?style.palette.accent:style.palette.ink,emphasized,sizeEmphasized};}).filter(r=>r.text);
 }
 function fit(title,box,measure,policy,style,maxSize=124,minSize=48){
  let size=maxSize,lines=null,lineHeight;
  for(;size>=minSize;size-=2){const metric=t=>measure(t,Math.round(size*style.emphasisScale),900);lines=style.lineBreaks||policy.wrapTitle(title,box.width,metric);lineHeight=Math.ceil(size*Math.max(1.24,style.emphasisScale+.12));if(lines&&lines.every(line=>metric(line)<=box.width)&&lines.length*lineHeight<=box.height)break;}
  if(size<minSize||!lines||!lines.length)throw Error('전체 제목 타이포 공간 부족: 생략하지 않고 보류');
  if(lines.join('').replace(/\s/gu,'')!==title.replace(/\s/gu,''))throw Error('제목 문자 누락');
  const normalized=title.replace(/\s+/gu,' ').trim(),emphasis=style.emphasis.replace(/\s+/gu,' '),sized=(style.sizeEmphasis===undefined?style.emphasis:style.sizeEmphasis).replace(/\s+/gu,' '),start=emphasis?normalized.indexOf(emphasis):-1,sizeStart=sized?normalized.indexOf(sized,start>=0?start:0):-1;let cursor=0;
  const lineRuns=lines.map((line,i)=>{const position=normalized.indexOf(line,cursor);cursor=position+line.length;const from=Math.max(position,start),to=Math.min(position+line.length,start+emphasis.length);
   const sizeFrom=Math.max(position,sizeStart),sizeTo=Math.min(position+line.length,sizeStart+sized.length);
   return runs(line,size,{...style,emphasis:start>=0&&to>from?line.slice(from-position,to-position):'',sizeEmphasis:sizeStart>=0&&sizeTo>sizeFrom?line.slice(sizeFrom-position,sizeTo-position):''},i,lines.length);});
  return{size,lines,lineHeight,height:lines.length*lineHeight,runs:lineRuns};
 }
 return Object.freeze({VERSION,style,runs,fit});
});
