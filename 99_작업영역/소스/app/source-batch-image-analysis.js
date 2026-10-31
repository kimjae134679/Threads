(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ThreadsImageAnalysis=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='2026-10-04.4';
  function analyze(data,width,height,originalWidth=width,originalHeight=height) {
    const rows=[],columns=Array.from({length:width},()=>({pale:0,black:0,blankLight:0,blankDark:0})),colors=new Map();let pale=0,colored=0,black=0;
    for(let y=0;y<height;y++) {
      let rowPale=0,rowDark=0,rowBlack=0,rowLight=0,blankLight=0,blankDark=0;
      for(let x=0;x<width;x++) {
        const i=(y*width+x)*4,r=data[i],g=data[i+1],b=data[i+2];
        if(Math.min(r,g,b)>232){pale++;rowPale++;columns[x].pale++;}
        if(Math.max(r,g,b)<40){black++;rowBlack++;columns[x].black++;}
        if(Math.min(r,g,b)>=245){blankLight++;columns[x].blankLight++;}
        if(Math.max(r,g,b)<=12){blankDark++;columns[x].blankDark++;}
        if(Math.min(r,g,b)>180)rowLight++;
        if(Math.max(r,g,b)<160)rowDark++;
        if(Math.max(r,g,b)-Math.min(r,g,b)>35)colored++;
        const key=(r>>4)*256+(g>>4)*16+(b>>4);colors.set(key,(colors.get(key)||0)+1);
      }
      rows.push({pale:rowPale/width,ink:rowDark/width,black:rowBlack/width,light:rowLight/width,blankLight,blankDark});
    }
    const total=width*height,paleRatio=pale/total;
    const [backgroundKey,backgroundCount]=[...colors].sort((a,b)=>b[1]-a[1])[0],dominant=backgroundCount/total;
    for(let y=0;y<height;y++){let background=0;for(let x=0;x<width;x++){
      const i=(y*width+x)*4,key=(data[i]>>4)*256+(data[i+1]>>4)*16+(data[i+2]>>4);if(key===backgroundKey)background++;
    }rows[y].background=background/width;}
    const darkMode=black/total>0.5&&colored/total<0.07;
    let textBands=0,inBand=false;
    for(const row of rows){const ink=darkMode?row.light:row.ink,bg=darkMode?row.black:row.pale;
      const isBand=ink>0.012&&ink<0.85&&bg>0.2;if(isBand&&!inBand)textBands++;inBand=isBand;}
    let flatBands=0,flatInk=false;
    for(const row of rows){const ink=1-row.background,band=ink>0.012&&ink<0.6;if(band&&!flatInk)flatBands++;flatInk=band;}
    // Saturated message bubbles do not turn a flat, dark conversation into a photo.
    const dominantDark=(backgroundKey>>8)<=1&&((backgroundKey>>4)&15)<=1&&(backgroundKey&15)<=1;
    const flatMode=dominant>0.5&&flatBands>=3&&(colored/total<0.1||dominantDark);
    const screenshot=paleRatio>0.42&&textBands>=3||paleRatio>0.66||dominant>0.22&&textBands>=8||darkMode&&textBands>=3||flatMode;
    const kind=screenshot?'screenshot':'photo';
    const breaks=[];let start=null;
    for(let y=0;y<=height;y++) {
      if(y<height&&(flatMode?rows[y].background:darkMode?rows[y].black:rows[y].pale)>0.985){if(start===null)start=y;}
      else if(start!==null){if(y-start>=2)breaks.push({y:(start+y)/2/height*originalHeight,gap:(y-start)/height*originalHeight});start=null;}
    }
    let top=0,bottom=height,left=0,right=width;
    if(screenshot){const blank=row=>(darkMode?row.blankDark:row.blankLight)===width;
      while(top<bottom&&blank(rows[top]))top++;while(bottom>top&&blank(rows[bottom-1]))bottom--;
      const empty=x=>(darkMode?columns[x].blankDark:columns[x].blankLight)===height;
      while(left<right&&empty(left))left++;while(right>left&&empty(right-1))right--;
      left=Math.max(0,left-4);right=Math.min(width,right+4);}
    // Preserve breathing room around the first and last nonblank rows.
    top=Math.max(0,top-4);bottom=Math.min(height,bottom+4);
    return {kind,confidence:screenshot?Math.min(0.95,0.6+paleRatio/3):0.65,
      paleRatio,dominantColorRatio:dominant,textBands,colorRatio:colored/total,darkMode,flatBands,
      photoScore:screenshot?-1:(1-dominant)+(colored/total)*0.3,
      bounds:{x:Math.floor(left/width*originalWidth),y:Math.floor(top/height*originalHeight),width:Math.ceil((right-left)/width*originalWidth),height:Math.ceil((bottom-top)/height*originalHeight)},
      breakRows:breaks,analysisMethod:'pixel_whitespace_and_text_bands_not_ocr'};
  }
  function inspect(image) {
    const scale=Math.min(1,384/image.naturalWidth,8192/image.naturalHeight);
    const width=Math.max(1,Math.round(image.naturalWidth*scale)),height=Math.max(1,Math.round(image.naturalHeight*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
    return analyze(ctx.getImageData(0,0,width,height).data,width,height,image.naturalWidth,image.naturalHeight);
  }
  return Object.freeze({VERSION,analyze,inspect});
});
