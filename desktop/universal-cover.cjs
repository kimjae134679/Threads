'use strict';
const renderCoverCanvas=require('./universal-cover-canvas.cjs');
const titleLayout=require('./title-layout.cjs');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function coverHtml({id,title,context='',imageUrl=null,variant='paper',credit='',fontUrl=null,emphasis='',aspectRatio='legacy'}){
 if(typeof title!=='string'||!title.trim()||title.length>300)throw Error('원문 제목을 확인하세요.');
 if(!['paper','ink','photo'].includes(variant)||variant==='photo'&&!imageUrl)throw Error('사진 후보에는 관련 원본 이미지가 필요합니다.');
 if(emphasis&&(!title.includes(emphasis)||emphasis.length>24))throw Error('강조는 원래 제목 안의 짧은 한 구절만 사용하세요.');
 if(!['legacy','auto','square','4:5'].includes(aspectRatio))throw Error('표지 비율은 auto, square 또는 4:5를 선택하세요.');
 const titleMetadata=titleLayout.titleInfo(title);title=titleMetadata.displayTitle;
 if(emphasis&&!title.includes(emphasis))emphasis='';
 if(!title)throw Error('출처 표시 외의 제목 본문이 없습니다.');
 // Opt in once, then replace only the title. The existing release stays legacy.
 if(aspectRatio==='auto')aspectRatio=title.replace(/\s/gu,'').length>70?'4:5':'square';
 if(aspectRatio!=='legacy'){
  const height=aspectRatio==='square'?1080:1350;
  const data={id,title,originalTitle:titleMetadata.originalTitle,sourceLabels:titleMetadata.sourceLabels,context,imageUrl,variant,credit,emphasis,aspectRatio,width:1080,height};
  return '<!doctype html><html lang="ko"><script>window.titleLayout={wrapTitle:'+titleLayout.wrapTitle.toString()+'}</script><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+escape(title)+'</title><style>'+
   (fontUrl?'@font-face{font-family:Cover;src:url("'+escape(fontUrl)+'");font-weight:900}':'')+
   '*{box-sizing:border-box}html,body{margin:0;width:1080px;height:'+height+'px;background:#15171c}.cover{position:relative;width:1080px;height:'+height+'px;font-family:Cover,"Malgun Gothic",sans-serif}.rendered{display:block;width:1080px;height:'+height+'px}.title,.photo{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.title{font-family:inherit;font-weight:900}</style><body><main class="cover '+variant+'" data-id="'+escape(id)+'"><h1 class="title">'+escape(title)+'</h1>'+
   (imageUrl?'<img class="photo" src="'+escape(imageUrl)+'" alt="">':'')+'<img class="rendered" alt="'+escape(title)+'"></main><script>window.coverInput='+JSON.stringify(data).replace(/</g,'\\u003c')+';window.coverResourcesReady=(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll("img.photo")].map(i=>i.decode()));})();window.coverPNG='+renderCoverCanvas.toString()+';window.coverReady=(async()=>{await window.coverResourcesReady;const result=await window.coverPNG();const preview=document.querySelector(".rendered");preview.src=result.data;await preview.decode();return result.geometry;})();</script></body></html>';
 }
 const headline=emphasis?escape(title.slice(0,title.indexOf(emphasis)))+'<mark>'+escape(emphasis)+'</mark>'+escape(title.slice(title.indexOf(emphasis)+emphasis.length)):escape(title);
 const background=variant==='paper'?'#f4eee5':variant==='ink'?'#15171c':'#17191d',color=variant==='paper'?'#242323':'#fff',accent=variant==='paper'?'#9f4436':'#ead098';
 const data={id,title,originalTitle:titleMetadata.originalTitle,sourceLabels:titleMetadata.sourceLabels,variant};
 return '<!doctype html><html lang="ko"><script>window.titleLayout={wrapTitle:'+titleLayout.wrapTitle.toString()+'}</script><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>'+escape(title)+'</title><style>'+
 (fontUrl?'@font-face{font-family:Cover;src:url("'+escape(fontUrl)+'");font-weight:900}':'')+
 '*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden}.cover{width:1080px;height:1920px;position:relative;background:'+background+';color:'+color+';font-family:Cover,"Malgun Gothic",sans-serif}.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 28%,rgba(0,0,0,.14) 44%,rgba(0,0,0,.84) 70%,#08090a 100%)}.rule{position:absolute;left:108px;top:260px;width:92px;height:10px;background:'+accent+'}.text{position:absolute;left:108px;right:108px;bottom:150px}.title{margin:0;font-weight:900;font-size:132px;line-height:1.14;letter-spacing:-3px;word-break:keep-all;overflow-wrap:anywhere;white-space:pre-wrap}.context{font-family:"Malgun Gothic",sans-serif;font-weight:500;font-size:37px;line-height:1.55;margin:44px 0 0;opacity:.84;max-height:120px;overflow:hidden}.credit{position:absolute;left:108px;right:108px;top:76px;font-family:"Malgun Gothic",sans-serif;font-size:24px;color:inherit;opacity:.8}.photo~.credit{background:#0009;border-radius:8px;padding:12px 16px;width:max-content;max-width:864px}.paper .rule{top:160px}.paper .text{top:280px;bottom:auto}.ink .text{bottom:250px}mark{color:'+accent+';background:none}.paper .context{color:#615552}</style><body><main class="cover '+variant+'" data-id="'+escape(id)+'">'+
 (imageUrl?'<img class="photo" src="'+escape(imageUrl)+'" alt=""><div class="shade"></div>':'<div class="rule"></div>')+
 '<p class="credit">'+escape(credit)+'</p><section class="text"><h1 class="title">'+headline+'</h1>'+(context?'<p class="context">'+escape(context)+'</p>':'')+'</section></main><script>window.coverInput='+JSON.stringify(data).replace(/</g,'\\u003c')+';window.coverReady=(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));const title=document.querySelector(".title");let size=132;const max=1000;while((title.scrollHeight>max||title.scrollWidth>title.clientWidth)&&size>64){size-=2;title.style.fontSize=size+"px";}const box=title.getBoundingClientRect();if(title.scrollHeight>max||title.scrollWidth>title.clientWidth||box.x<100||box.right>980||box.bottom>1810)throw Error("제목 공간 부족: 제목을 줄이지 않고 검토 보류합니다.");if(title.textContent!==window.coverInput.title)throw Error("제목 손실");return {title:window.coverInput.title,size,box:{x:box.x,y:box.y,width:box.width,height:box.height},width:1080,height:1920};})();</script><script>window.coverPNG='+renderCoverCanvas.toString()+'</script></body></html>';
}
module.exports={coverHtml};
