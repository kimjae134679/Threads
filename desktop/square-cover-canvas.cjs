'use strict';
module.exports=async function renderSquareCover(){
 await window.coverResourcesReady;
 const {title,imageUrl,emphasis,imageKind}=window.coverInput,width=1080,height=1080,margin=76,available=width-2*margin;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d'),family=getComputedStyle(document.querySelector('.title')).fontFamily;
 const photo=document.querySelector('.photo');
 function font(size){ctx.font='800 '+size+'px '+family;ctx.letterSpacing=(-size*.018)+'px';}
 // Balance each paragraph with character boundaries; prefer spaces and punctuation,
 // but allow Korean tokens to break when necessary. Never abbreviate the source.
 function wrap(size){
  font(size);const lines=[];
  for(const paragraph of title.split('\n')){
   const chars=Array.from(paragraph),n=chars.length;
   if(!n){lines.push('');continue;}
   const best=Array(n+1).fill(null);best[n]={cost:0,lines:[]};
   for(let i=n-1;i>=0;i--){
    for(let j=i+1;j<=n;j++){
     const text=chars.slice(i,j).join('').trim(),w=ctx.measureText(text).width;
     if(w>available)break;if(!best[j])continue;
     if(j<n&&/^[,.)!?\]\u3001\u3002]/u.test(chars[j]))continue;
     const midWord=j<n&&!/\s/u.test(chars[j-1])&&!/\s/u.test(chars[j])&&!/[,.)!?]/u.test(chars[j-1]);
     // Do not split short Korean words such as 그만둔 or 키즈카페 just to
     // keep a larger font. A short title can use another well-spaced line.
     if(midWord&&/[\p{L}\p{N}]/u.test(chars[j-1])&&/[\p{L}\p{N}]/u.test(chars[j])){
      let a=j-1,b=j;while(a>0&&/[\p{L}\p{N}]/u.test(chars[a-1]))a--;while(b<n&&/[\p{L}\p{N}]/u.test(chars[b]))b++;
      if(b-a<=4)continue;
     }
     const cost=100000+(available-w)**2*.07+(midWord?10000:0)+best[j].cost;
     if(!best[i]||cost<best[i].cost)best[i]={cost,lines:[text,...best[j].lines]};
    }
   }
   if(!best[0])throw Error('제목이 안전 영역을 넘어서 보류합니다.');lines.push(...best[0].lines);
  }
  return lines;
 }
 let usePhoto=Boolean(imageUrl),size,lines,lineHeight,titleHeight;
 function fit(maxHeight){for(size=128;size>=80;size-=2){lines=wrap(size);lineHeight=size*1.10;titleHeight=lines.length*lineHeight;if(titleHeight<=maxHeight)return true;}return false;}
 // A dense title gets a complete typographic square instead of a tiny photo title.
 if(usePhoto&&(!fit(480)||size<102||lines.length>4))usePhoto=false;
 if(!usePhoto&&!fit(928))throw Error('제목 전체가 최소 가독 크기를 넘어서 보류합니다.');
 if(lines.join('').replace(/\s/gu,'')!==title.replace(/\s/gu,''))throw Error('제목 손실');
 font(size);ctx.textBaseline='top';
 let y=usePhoto?height-92-titleHeight:(height-titleHeight)/2;
 const ink=usePhoto?'#ffffff':'#243036',accent=usePhoto?'#f1d9b0':'#9b563f';
 ctx.fillStyle=usePhoto?'#171d20':'#f5f1e9';ctx.fillRect(0,0,width,height);
 let imageBox=null,aiLabel='';
 if(usePhoto){
  const scale=Math.min(width/photo.naturalWidth,height/photo.naturalHeight),w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;
  imageBox={x:(width-w)/2,y:(height-h)/2,width:w,height:h,fit:'contain'};
  ctx.drawImage(photo,imageBox.x,imageBox.y,w,h);
  const g=ctx.createLinearGradient(0,Math.min(430,y-110),0,height);g.addColorStop(0,'rgba(12,19,22,0)');g.addColorStop(.34,'rgba(12,19,22,.82)');g.addColorStop(1,'rgba(12,19,22,.98)');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
 }else if(titleHeight<700){ctx.fillStyle=accent;ctx.fillRect(margin,y-40,64,5);ctx.fillStyle='#cec6b8';ctx.fillRect(margin,y+titleHeight+32,available,2);}
 const tokens=title.match(/[\p{L}\p{N}]+/gu)||[];
 const selected=emphasis||tokens.find(t=>t.length>=2&&t.length<=8&&!['예전','남자친구가','번쯤','후기','중기','있는데','있었는데','없는','제목'].includes(t))||'';
 let used=false;const glyphBoxes=[],lineWidths=[];
 for(let n=0;n<lines.length;n++){
  const line=lines[n],at=!used&&selected?line.indexOf(selected):-1,parts=at>=0?[line.slice(0,at),selected,line.slice(at+selected.length)]:[line];let x=margin;
  for(let p=0;p<parts.length;p++){
   const text=parts[p],m=ctx.measureText(text);ctx.fillStyle=at>=0&&p===1?accent:ink;ctx.fillText(text,x,y+n*lineHeight);
   if(text)glyphBoxes.push({x:x-m.actualBoundingBoxLeft,y:y+n*lineHeight-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent});x+=m.width;
  }
  if(at>=0)used=true;lineWidths.push(x-margin);
 }
 if(glyphBoxes.some(b=>b.x<64||b.y<64||b.x+b.width>1016||b.y+b.height>1016)||lineWidths.some(w=>w>available+.5))throw Error('제목 픽셀 안전 영역 초과로 보류합니다.');
 if(usePhoto&&imageKind==='ai-staging'){aiLabel='AI 연출 이미지';ctx.font='400 27px "Malgun Gothic",sans-serif';ctx.letterSpacing='0px';ctx.fillStyle='#d4d7d7';ctx.fillText(aiLabel,margin,1030);}
 return {data:canvas.toDataURL('image/png'),geometry:{width,height,aspectRatio:'square',title,size,weight:800,lines,lineWidths,glyphBoxes,box:{x:margin,y,width:available,height:titleHeight},imageBox,aiLabel,emphasis:used?selected:'',photoFallback:Boolean(imageUrl)&&!usePhoto}};
};
