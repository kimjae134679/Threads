'use strict';
module.exports=async function renderTypographyCover(){
 await window.coverResourcesReady;
 const input=window.coverInput,{width,height,title,credit}=input,photo=document.querySelector('img.photo');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),family=getComputedStyle(document.querySelector('.title')).fontFamily;
 const typography=window.ThreadsCoverTypography,policy=window.ThreadsPagePlan,manual=input.titleStyle,style=typography.style(title,{emphasis:manual?.emphasis||input.emphasis,accent:manual?.accent||input.accent||null,photo:!!photo,sizeEmphasis:manual?.sizeEmphasis,sizeScale:manual?.sizeScale??1.06,explicitEmphasis:!!manual?.emphasis}),margin=84,available=width-margin*2;
 const measure=(text,size,weight)=>{ctx.font=weight+' '+size+'px '+family;ctx.letterSpacing=(-size*.015)+'px';return ctx.measureText(text).width;};
 const box={x:margin,y:margin,width:available,height:photo?height*.52:height-2*margin-80-(credit?56:0)};
 const fit=typography.fit(title,box,measure,policy,style,photo?104:124,48),top=photo?height-margin-fit.height-(credit?52:0):Math.max(150,(height-fit.height)/2-20);
 ctx.fillStyle=style.palette.background;ctx.fillRect(0,0,width,height);let imageBox=null;
 if(photo){
  const areaHeight=top-28,scale=Math.min(width/photo.naturalWidth,areaHeight/photo.naturalHeight),w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;
  imageBox={x:(width-w)/2,y:Math.max(0,(areaHeight-h)/2),width:w,height:h,fit:'contain'};ctx.drawImage(photo,imageBox.x,imageBox.y,w,h);
  ctx.fillStyle=style.palette.accent;ctx.fillRect(margin,top-16,56,4);
 }else{
  ctx.strokeStyle=style.palette.line;ctx.lineWidth=2;ctx.strokeRect(38,38,width-76,height-76);
  ctx.fillStyle=style.palette.accent;ctx.fillRect(margin,top-32,56,5);
  ctx.strokeStyle=style.palette.line;ctx.beginPath();ctx.moveTo(margin,top+fit.height+30);ctx.lineTo(width-margin,top+fit.height+30);ctx.stroke();
 }
 ctx.textBaseline='top';ctx.textAlign='left';const glyphBoxes=[],lineWidths=[],renderedRuns=[];
 for(let i=0;i<fit.lines.length;i++){
  let x=margin;const lineY=top+i*fit.lineHeight;
  for(const run of fit.runs[i]){
   const advance=measure(run.text,run.size,run.weight),m=ctx.measureText(run.text);ctx.fillStyle=run.color;
   const y=lineY+(fit.size*style.emphasisScale-run.size)*.8;
   ctx.lineJoin='round';ctx.strokeStyle=photo?'#101722':style.palette.background;ctx.lineWidth=photo?Math.max(1.5,run.size*.024):Math.max(.8,run.size*.01);ctx.strokeText(run.text,x,y);ctx.fillText(run.text,x,y);
   if(run.text.trim())glyphBoxes.push({x:x-m.actualBoundingBoxLeft,y:y-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent});
   renderedRuns.push({...run,x,y,line:i});x+=advance;
  }
  lineWidths.push(x-margin);
 }
 if(lineWidths.some(w=>w>available+.5)||glyphBoxes.some(b=>b.x<72||b.x+b.width>width-72||b.y<72||b.y+b.height>height-72))throw Error('타이포 제목 픽셀 안전 여백 초과');
 if(imageBox&&glyphBoxes.some(b=>b.y<imageBox.y+imageBox.height))throw Error('제목이 사진 행동 영역을 덮음');
 if(credit){ctx.font='24px "Malgun Gothic",sans-serif';ctx.letterSpacing='0px';ctx.fillStyle=photo?'#d3dae3':'#5b625f';if(ctx.measureText(credit).width>available)throw Error('출처 표기 공간 부족');ctx.fillText(credit,margin,height-56);}
 return{data:canvas.toDataURL('image/png'),geometry:{title,size:fit.size,lines:fit.lines,lineWidths,glyphBoxes,box:{x:margin,y:top,width:available,height:fit.height},imageBox,width,height,aspectRatio:input.aspectRatio,typography:style,renderedRuns,emphasis:style.emphasis,contextLines:[],protectedImageRegion:imageBox?'separate_band':null}};
};
