'use strict';
module.exports=async function renderTypographyCover(){
 await window.coverResourcesReady;
 const input=window.coverInput,{width,height,title,credit}=input,photo=document.querySelector('img.photo');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),family=getComputedStyle(document.querySelector('.title')).fontFamily;
 const typography=window.ThreadsCoverTypography,policy=window.ThreadsPagePlan,manual=input.titleStyle,style=typography.style(title,{emphasis:manual?.emphasis||input.emphasis,accent:manual?.accent||input.accent||null,photo:!!photo,sizeEmphasis:manual?.sizeEmphasis,sizeScale:manual?.sizeScale??1.03,explicitEmphasis:!!manual?.emphasis,lineBreaks:manual?.lineBreaks||null}),margin=84,available=width-margin*2;
 const measure=(text,size,weight)=>{ctx.font=weight+' '+size+'px '+family;ctx.letterSpacing=(-size*.04)+'px';return ctx.measureText(text).width;};
 const box={x:margin,y:margin,width:available,height:photo?height*.20:height-2*margin-80-(credit?56:0)};
 const fit=typography.fit(title,box,measure,policy,style,140,photo?36:48),top=photo?height-margin-20-fit.height-(credit?52:0):Math.max(150,(height-fit.height)/2-20);
 ctx.textBaseline='alphabetic';ctx.textAlign='left';const glyphBoxes=[],lineWidths=[],renderedRuns=[];
 for(let i=0;i<fit.lines.length;i++){
  let x=margin;const lineY=top+i*fit.lineHeight;
  for(const run of fit.runs[i]){
   const advance=measure(run.text,run.size,run.weight),m=ctx.measureText(run.text),y=lineY+fit.size*style.emphasisScale*.9;
   if(run.text.trim())glyphBoxes.push({x:x-m.actualBoundingBoxLeft,y:y-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent});
   renderedRuns.push({...run,x,y,line:i});x+=advance;
  }
  lineWidths.push(x-margin);
 }
 if(lineWidths.some(w=>w>available+.5)||glyphBoxes.some(b=>b.x<72||b.x+b.width>width-72||b.y<72||b.y+b.height>height-72))throw Error('타이포 제목 픽셀 안전 여백 초과 '+JSON.stringify({title,lineWidths,glyphBoxes}));
 if(photo&&glyphBoxes.some(b=>b.y<height*.68))throw Error('제목이 사진의 인물/행동 영역을 덮음');
 ctx.fillStyle=style.palette.background;ctx.fillRect(0,0,width,height);let imageBox=null,shadeSamples=[],gradientGeometry=null;
 if(photo){
  const scale=Math.max(width/photo.naturalWidth,height/photo.naturalHeight),sw=width/scale,sh=height/scale;
  const crop={x:(photo.naturalWidth-sw)/2,y:(photo.naturalHeight-sh)/2,width:sw,height:sh};
  imageBox={x:0,y:0,width,height,fit:'cover',crop};ctx.drawImage(photo,crop.x,crop.y,crop.width,crop.height,0,0,width,height);
  const inkTop=Math.min(...glyphBoxes.map(b=>b.y)),inkBottom=Math.max(...glyphBoxes.map(b=>b.y+b.height)),plateauStart=inkTop-8,plateauEnd=inkBottom+8,start=Math.max(height*.64,plateauStart-height*.055);
  if(plateauEnd-plateauStart>height*.22)throw Error('제목 뒤 어두운 구간이 너무 넓음');
  const opacityAt=y=>y<=start?0:y<plateauStart ? .85*(y-start)/(plateauStart-start):y<=plateauEnd ? .85:.85-(.85-.20)*(y-plateauEnd)/(height-plateauEnd);
  shadeSamples=[.55,.65,.70,.8,.95].map(at=>{const x=24,y=Math.round(height*at);return{x,y,opacity:opacityAt(y),before:[...ctx.getImageData(x,y,1,1).data].slice(0,3)};});
  const gradient=ctx.createLinearGradient(0,start,0,height);gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop((plateauStart-start)/(height-start),'rgba(0,0,0,.85)');gradient.addColorStop((plateauEnd-start)/(height-start),'rgba(0,0,0,.85)');gradient.addColorStop(1,'rgba(0,0,0,.20)');ctx.fillStyle=gradient;ctx.fillRect(0,start,width,height-start);
  gradientGeometry={start,plateauStart,plateauEnd,end:height,peakOpacity:.85,bottomOpacity:.20,opaqueBandHeight:plateauEnd-plateauStart,inkTop,inkBottom,recipe:'title-local-shade-v2'};
  shadeSamples=shadeSamples.map(sample=>({...sample,after:[...ctx.getImageData(sample.x,sample.y,1,1).data].slice(0,3)}));
 }else{
  ctx.strokeStyle=style.palette.line;ctx.lineWidth=2;ctx.strokeRect(38,38,width-76,height-76);
  ctx.fillStyle=style.palette.accent;ctx.fillRect(margin,top-32,56,5);
  ctx.strokeStyle=style.palette.line;ctx.beginPath();ctx.moveTo(margin,top+fit.height+30);ctx.lineTo(width-margin,top+fit.height+30);ctx.stroke();
 }
 for(const run of renderedRuns){measure(run.text,run.size,run.weight);ctx.fillStyle=run.color;ctx.fillText(run.text,run.x,run.y);}
 if(credit){ctx.font='24px "Malgun Gothic",sans-serif';ctx.letterSpacing='0px';ctx.fillStyle=photo?'#d3dae3':'#5b625f';if(ctx.measureText(credit).width>available)throw Error('출처 표기 공간 부족');ctx.fillText(credit,margin,height-56);}
 return{data:canvas.toDataURL('image/png'),geometry:{title,size:fit.size,lines:fit.lines,lineWidths,glyphBoxes,box:{x:margin,y:top,width:available,height:fit.height},imageBox,width,height,aspectRatio:input.aspectRatio,typography:style,renderedRuns,emphasis:style.emphasis,contextLines:[],gradient:imageBox?{...gradientGeometry,shadeSamples}:null,protectedImageRegion:imageBox?'upper_two_thirds':null}};
};
