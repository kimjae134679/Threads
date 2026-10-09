'use strict';
module.exports=async function renderCoverCanvas(){
 if(window.coverInput.aspectRatio&&window.coverInput.aspectRatio!=='legacy'){
  await window.coverResourcesReady;
  const input=window.coverInput,{width,height,title,variant,context,credit}=input;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d'),family=getComputedStyle(document.querySelector('.title')).fontFamily;
  const portrait=input.aspectRatio==='3:4',safe=portrait?120:72,margin=portrait?132:96,available=width-margin*2,photo=document.querySelector('img.photo');
  const color=variant==='paper'?'#242323':'#fff',accent=variant==='paper'?'#a34535':'#ead098';
  ctx.fillStyle=variant==='paper'?'#f4eee5':'#15171c';ctx.fillRect(0,0,width,height);
  // Keep one layout for the preview and exported pixels. Preserve every character,
  // split at words first, and only split a token when it cannot fit by itself.
  function wrap(text,fontSize,weight=900){
   ctx.font=weight+' '+fontSize+'px '+family;ctx.letterSpacing=(weight===900?-fontSize*.018:0)+'px';
   const lines=[];
   for(const paragraph of text.split('\n')){
    let line='';
    for(const token of paragraph.match(/\S+\s*|\s+/gu)||[]){
     if(ctx.measureText(token.trimEnd()).width>available){
      for(const character of token){if(line&&ctx.measureText((line+character).trimEnd()).width>available){lines.push(line.trimEnd());line='';}line+=character;}
     }else{if(line&&ctx.measureText((line+token).trimEnd()).width>available){lines.push(line.trimEnd());line='';}line+=token;}
    }
    lines.push(line.trimEnd());
   }
   return lines;
  }
  const contextLines=context?wrap(context,32,500):[],contextHeight=contextLines.length?contextLines.length*46+32:0;
  if(contextLines.length>3)throw Error('표지 맥락이 너무 깁니다. 내용을 자르지 않고 검토 보류합니다.');
  const maxHeight=photo?height*.54:height-216-contextHeight-(credit?48:0);
  let size=photo?104:128,lines;
  for(;size>=64;size-=2){lines=wrap(title,size);if(lines.length*size*1.16<=maxHeight)break;}
  if(size<64)throw Error('원문 제목이 안전한 범위를 초과합니다. 제목을 자르지 않고 검토 보류합니다.');
  if(lines.join('').replace(/\s/gu,'')!==title.replace(/\s/gu,''))throw Error('제목 문자 손실');
  const lineHeight=size*1.16,titleHeight=lines.length*lineHeight;
  const y=photo?height-margin-titleHeight-contextHeight-(credit?48:0):(height-titleHeight-contextHeight)/2;
  if(y<safe||y+titleHeight+contextHeight>height-safe)throw Error('표지 안전 여백 부족');
  let imageBox=null;
  if(photo){
   // Fit the photograph above the title, preserving the full source image.
   // A dark base and a short gradient connect it to the lower text area.
   const imageHeight=Math.min(height*.74,y+size*.22),scale=Math.min(width/photo.naturalWidth,imageHeight/photo.naturalHeight);
   const w=photo.naturalWidth*scale,h=photo.naturalHeight*scale,x=(width-w)/2;
   imageBox={x,y:0,width:w,height:h,fit:'contain'};ctx.drawImage(photo,x,0,w,h);
   const gradient=ctx.createLinearGradient(0,Math.max(0,h-150),0,h);gradient.addColorStop(0,'rgba(21,23,28,0)');gradient.addColorStop(1,'#15171c');ctx.fillStyle=gradient;ctx.fillRect(0,Math.max(0,h-150),width,150);
  }else{
   ctx.strokeStyle=variant==='paper'?'#d7cabb':'#393b40';ctx.lineWidth=2;ctx.strokeRect(38,38,width-76,height-76);
   ctx.fillStyle=accent;ctx.fillRect(margin,y-40,64,6);
  }
  // At most one existing token. Numbers receive no special invented callout.
  const tokens=title.match(/[\p{L}\p{N}]+/gu)||[];
  const emphasis=input.emphasis||tokens.find(t=>t.length>=2&&t.length<=8&&!['후기','근황','이유','있는','없는','예전','한번','생각','다녀온'].includes(t))||'';
  const at=emphasis?title.indexOf(emphasis):-1;
  let used=false;
  ctx.textBaseline='top';ctx.font='900 '+size+'px '+family;ctx.letterSpacing=(-size*.018)+'px';
  const lineWidths=[],glyphBoxes=[];
  for(let n=0;n<lines.length;n++){
   const line=lines[n];let x=margin;const lineY=y+n*lineHeight;
   const index=!used&&at>=0?line.indexOf(emphasis):-1;
   const parts=index>=0?[line.slice(0,index),emphasis,line.slice(index+emphasis.length)]:[line];
   for(let p=0;p<parts.length;p++){
    const text=parts[p];ctx.fillStyle=index>=0&&p===1?accent:color;
    const metrics=ctx.measureText(text);ctx.fillText(text,x,lineY);
    if(text)glyphBoxes.push({x:x-metrics.actualBoundingBoxLeft,y:lineY-metrics.actualBoundingBoxAscent,width:metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight,height:metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent});
    x+=metrics.width;
   }
   if(index>=0)used=true;lineWidths.push(x-margin);
  }
  if(lineWidths.some(w=>w>available+.5))throw Error('제목 가로 넘침');
  if(glyphBoxes.some(b=>b.x<safe||b.x+b.width>width-safe||b.y<safe||b.y+b.height>height-safe))throw Error('제목 픽셀 안전 영역 초과');
  if(contextLines.length){ctx.font='500 32px '+family;ctx.letterSpacing='0px';ctx.fillStyle=variant==='paper'?'#615552':'#dedede';for(let n=0;n<contextLines.length;n++)ctx.fillText(contextLines[n],margin,y+titleHeight+32+n*46);}
  let creditBox=null;
  if(credit){ctx.font='24px "Malgun Gothic",sans-serif';ctx.letterSpacing='0px';const m=ctx.measureText(credit),cy=portrait?height-margin-32:height-64;if(m.width>available)throw Error('출처 표기 공간 부족');creditBox={x:margin-m.actualBoundingBoxLeft,y:cy-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent};if(portrait&&(creditBox.x<safe||creditBox.x+creditBox.width>width-safe||creditBox.y<safe||creditBox.y+creditBox.height>height-safe))throw Error('출처 픽셀 안전 여백 초과');ctx.fillStyle=variant==='paper'?'#615552':'#dedede';ctx.fillText(credit,margin,cy);}
  return {data:canvas.toDataURL('image/png'),geometry:{title,size,lines,emphasis:used?emphasis:'',box:{x:margin,y,width:available,height:titleHeight},glyphBoxes,creditBox,lineWidths,imageBox,width,height,aspectRatio:input.aspectRatio,contextLines}};
 }
 await window.coverReady;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d'),main=document.querySelector('.cover'),title=document.querySelector('.title'),style=getComputedStyle(title),variant=window.coverInput.variant;
 ctx.fillStyle=getComputedStyle(main).backgroundColor;ctx.fillRect(0,0,1080,1920);
 const photo=document.querySelector('img.photo');
 if(photo){const scale=Math.max(1080/photo.naturalWidth,1920/photo.naturalHeight),w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;ctx.drawImage(photo,(1080-w)/2,(1920-h)/2,w,h);const g=ctx.createLinearGradient(0,540,0,1920);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.35,'rgba(0,0,0,.45)');g.addColorStop(.7,'rgba(0,0,0,.88)');g.addColorStop(1,'#08090a');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1920);}
 else{ctx.fillStyle=variant==='paper'?'#9f4436':'#ead098';ctx.fillRect(108,variant==='paper'?160:260,92,10);}
 function lines(text,size,font,spacing=0){ctx.font=font;ctx.letterSpacing=spacing+'px';const out=[];for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.match(/\S+\s*|\s+/g)||[]){if(ctx.measureText(word.trimEnd()).width<=864){if(line&&ctx.measureText(line+word.trimEnd()).width>864){out.push(line.trimEnd());line='';}line+=word;}else for(const c of word){if(line&&ctx.measureText(line+c).width>864){out.push(line.trimEnd());line=c;}else line+=c;}}out.push(line.trimEnd());}return out;}
 let size=132,wrapped;do{wrapped=lines(title.textContent,size,'900 '+size+'px '+style.fontFamily,-3);if(wrapped.length*size*1.14<=1000)break;size-=2;}while(size>=64);
 if(size<64)throw Error('원문 제목이 안전한 범위를 초과합니다.');
 const context=document.querySelector('.context')?.textContent||'',clines=context?lines(context,37,'500 37px "Malgun Gothic"',0).slice(0,2):[],lh=size*1.14,contextHeight=clines.length*58,bottom=variant==='paper'?290:variant==='ink'?250:150;
 let y=variant==='paper'?280:1920-bottom-wrapped.length*lh-(contextHeight?44+contextHeight:0),top=y;
 ctx.textBaseline='top';ctx.font='900 '+size+'px '+style.fontFamily;ctx.letterSpacing='-3px';ctx.fillStyle=style.color;
 const emphasis=title.querySelector('mark')?.textContent||'';
 for(const line of wrapped){if(ctx.measureText(line).width>865)throw Error('제목 가로 넘침');const at=emphasis?line.indexOf(emphasis):-1;if(at<0)ctx.fillText(line,108,y);else{const a=line.slice(0,at),b=line.slice(at+emphasis.length);ctx.fillText(a,108,y);const x=108+ctx.measureText(a).width;ctx.fillStyle=variant==='paper'?'#9f4436':'#ead098';ctx.fillText(emphasis,x,y);ctx.fillStyle=style.color;ctx.fillText(b,x+ctx.measureText(emphasis).width,y);}y+=lh;}
 if(contextHeight){y+=44;ctx.font='500 37px "Malgun Gothic"';ctx.letterSpacing='0px';ctx.fillStyle=variant==='paper'?'#615552':'#dedede';for(const line of clines){ctx.fillText(line,108,y);y+=58;}}
 const credit=document.querySelector('.credit').textContent;if(credit){ctx.font='24px "Malgun Gothic"';ctx.letterSpacing='0px';if(photo){ctx.fillStyle='#0009';ctx.fillRect(96,64,Math.min(888,ctx.measureText(credit).width+40),56);}ctx.fillStyle=variant==='paper'?'#615552':'#ddd';ctx.fillText(credit,108,78);}
 if(wrapped.join('').replace(/\s/g,'')!==window.coverInput.title.replace(/\s/g,''))throw Error('제목 문자 손실');
 return {data:canvas.toDataURL('image/png'),geometry:{title:window.coverInput.title,size,lines:wrapped,box:{x:108,y:top,width:864,height:wrapped.length*lh},width:1080,height:1920}};
};
