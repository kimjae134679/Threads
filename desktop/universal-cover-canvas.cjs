'use strict';
module.exports=async function renderCoverCanvas(){
 await window.coverReady;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d'),main=document.querySelector('.cover'),title=document.querySelector('.title'),style=getComputedStyle(title),variant=window.coverInput.variant;
 ctx.fillStyle=getComputedStyle(main).backgroundColor;ctx.fillRect(0,0,1080,1920);
 const photo=document.querySelector('img.photo');
 if(photo){const scale=Math.max(1080/photo.naturalWidth,1920/photo.naturalHeight),w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;ctx.drawImage(photo,(1080-w)/2,(1920-h)/2,w,h);const g=ctx.createLinearGradient(0,540,0,1920);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.35,'rgba(0,0,0,.45)');g.addColorStop(.7,'rgba(0,0,0,.88)');g.addColorStop(1,'#08090a');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1920);}
 else{ctx.fillStyle=variant==='paper'?'#9f4436':'#ead098';ctx.fillRect(108,260,92,10);}
 function lines(text,size,font,spacing=0){ctx.font=font;ctx.letterSpacing=spacing+'px';const out=[];for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.match(/\S+\s*|\s+/g)||[]){if(ctx.measureText(word.trimEnd()).width<=864){if(line&&ctx.measureText(line+word.trimEnd()).width>864){out.push(line.trimEnd());line='';}line+=word;}else for(const c of word){if(line&&ctx.measureText(line+c).width>864){out.push(line.trimEnd());line=c;}else line+=c;}}out.push(line.trimEnd());}return out;}
 let size=132,wrapped;do{wrapped=lines(title.textContent,size,'900 '+size+'px '+style.fontFamily,-3);if(wrapped.length*size*1.14<=1000)break;size-=2;}while(size>=64);
 if(size<64)throw Error('원문 제목이 안전한 범위를 초과합니다.');
 const context=document.querySelector('.context')?.textContent||'',clines=context?lines(context,37,'500 37px "Malgun Gothic"',0).slice(0,2):[],lh=size*1.14,contextHeight=clines.length*58,bottom=variant==='paper'?290:variant==='ink'?250:150;
 let y=1920-bottom-wrapped.length*lh-(contextHeight?44+contextHeight:0),top=y;
 ctx.textBaseline='top';ctx.font='900 '+size+'px '+style.fontFamily;ctx.letterSpacing='-3px';ctx.fillStyle=style.color;
 const emphasis=title.querySelector('mark')?.textContent||'';
 for(const line of wrapped){if(ctx.measureText(line).width>865)throw Error('제목 가로 넘침');const at=emphasis?line.indexOf(emphasis):-1;if(at<0)ctx.fillText(line,108,y);else{const a=line.slice(0,at),b=line.slice(at+emphasis.length);ctx.fillText(a,108,y);const x=108+ctx.measureText(a).width;ctx.fillStyle=variant==='paper'?'#9f4436':'#ead098';ctx.fillText(emphasis,x,y);ctx.fillStyle=style.color;ctx.fillText(b,x+ctx.measureText(emphasis).width,y);}y+=lh;}
 if(contextHeight){y+=44;ctx.font='500 37px "Malgun Gothic"';ctx.letterSpacing='0px';ctx.fillStyle=variant==='paper'?'#615552':'#dedede';for(const line of clines){ctx.fillText(line,108,y);y+=58;}}
 const credit=document.querySelector('.credit').textContent;if(credit){ctx.font='24px "Malgun Gothic"';ctx.letterSpacing='0px';if(photo){ctx.fillStyle='#0009';ctx.fillRect(96,64,Math.min(888,ctx.measureText(credit).width+40),56);}ctx.fillStyle=variant==='paper'?'#615552':'#ddd';ctx.fillText(credit,108,78);}
 if(wrapped.join('').replace(/\s/g,'')!==window.coverInput.title.replace(/\s/g,''))throw Error('제목 문자 손실');
 return {data:canvas.toDataURL('image/png'),geometry:{title:window.coverInput.title,size,lines:wrapped,box:{x:108,y:top,width:864,height:wrapped.length*lh},width:1080,height:1920}};
};
