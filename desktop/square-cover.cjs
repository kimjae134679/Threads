'use strict';
const render=require('./square-cover-canvas.cjs');
const titleLayout=require('./title-layout.cjs');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function squareCoverHtml({id='',title,imageUrl=null,fontUrl=null,emphasis='',imageKind='ai-staging'}){
 if(typeof title!=='string'||!title.trim()||title.length>300)throw Error('제목 전체를 확인하세요.');
 if(emphasis&&(!title.includes(emphasis)||emphasis.length>16))throw Error('강조는 원문에 있는 짧은 구절만 사용하세요.');
 if(!['ai-staging','source'].includes(imageKind))throw Error('이미지 용도를 확인하세요.');
 const info=titleLayout.titleInfo(title);title=info.displayTitle;
 if(emphasis&&!title.includes(emphasis))emphasis='';
 if(!title)throw Error('출처 표시 외의 제목 본문이 없습니다.');
 const data={id,title,originalTitle:info.originalTitle,sourceLabels:info.sourceLabels,imageUrl,emphasis,imageKind};
 return '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+escape(title)+'</title><style>'+
 (fontUrl?'@font-face{font-family:SquareCover;src:url("'+escape(fontUrl)+'");font-weight:800;font-style:normal}':'')+
 '*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1080px;background:#f5f1e9}.title{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);font-family:SquareCover,"Malgun Gothic",sans-serif;font-weight:800}.photo{display:none}.rendered{display:block;width:1080px;height:1080px}</style><body><main data-id="'+escape(id)+'"><h1 class="title">'+escape(title)+'</h1>'+
 (imageUrl?'<img class="photo" src="'+escape(imageUrl)+'" alt="">':'')+'<img class="rendered" alt="'+escape(title)+'"></main><script>window.titleLayout={wrapTitle:'+titleLayout.wrapTitle.toString()+'};window.coverInput='+JSON.stringify(data).replace(/</g,'\\u003c')+';window.coverResourcesReady=(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll("img.photo")].map(i=>i.decode()));})();window.coverPNG='+render.toString()+';window.coverReady=(async()=>{const r=await window.coverPNG();const i=document.querySelector(".rendered");i.src=r.data;await i.decode();return r.geometry;})();</script></body></html>';
}
module.exports={squareCoverHtml};
