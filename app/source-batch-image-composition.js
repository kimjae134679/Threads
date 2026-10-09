(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ThreadsImageComposition=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const dimensions=ratio=>({width:1080,height:({'1:1':1080,'4:5':1350,'9:16':1920,'16:9':608})[ratio]||1080});
 function imageOperation(asset,source,box){
  if(!source?.width||!source?.height)throw Error('합성 이미지 크기 누락');
  const c=asset.composition,contain=c.crop==='contain',scale=(contain?Math.min:Math.max)(box.width/source.width,box.height/source.height);
  const anchor=c.subjectRegion==='left'?[0,.5]:c.subjectRegion==='right'?[1,.5]:c.subjectRegion==='center_lower'?[.5,1]:[.5,.5];
  const sw=contain?source.width:box.width/scale,sh=contain?source.height:box.height/scale;
  return {kind:'image',role:'illustration',supplementary:true,sourceId:'illustration:'+asset.itemId,name:asset.name.toLowerCase(),
   sourceX:(source.width-sw)*anchor[0],sourceY:(source.height-sh)*anchor[1],sourceWidth:sw,sourceHeight:sh,
   x:box.x+(contain?(box.width-source.width*scale)*anchor[0]:0),y:box.y+(contain?(box.height-source.height*scale)*anchor[1]:0),
   width:contain?source.width*scale:box.width,height:contain?source.height*scale:box.height};
 }
 function titleOperations(title,box,measure,policy,color,maxSize=100,titleStyle=null){
  const typography=globalThis.ThreadsCoverTypography;
  if(typography){
   const style=typography.style(title,{emphasis:titleStyle?.emphasis||'',accent:titleStyle?.accent||null,photo:color==='#fff',sizeEmphasis:titleStyle?.sizeEmphasis,sizeScale:titleStyle?.sizeScale??1.06,explicitEmphasis:!!titleStyle?.emphasis}),fit=typography.fit(title,box,measure,policy,style,Math.min(maxSize,124),32),y=box.y+box.height-fit.height;
   return fit.lines.map((text,index)=>({kind:'text',role:'title',sourceId:'title',text,x:box.x,y:y+index*fit.lineHeight,size:fit.size,lineHeight:fit.lineHeight,weight:900,color:style.palette.ink,runs:fit.runs[index],stroke:color==='#fff'?'#101722':null,strokeWidth:2,typography:style}));
  }
  let lines=null,size=maxSize,lineHeight;
  for(;size>=32;size-=2){lines=policy.wrapTitle(title,box.width,t=>measure(t,size,900));lineHeight=Math.ceil(size*1.18);if(lines&&lines.length*lineHeight<=box.height)break;}
  if(size<32||!lines)throw Error('제목 전체가 이미지 안전 영역을 넘어서 제작 보류');
  const y=box.y+box.height-lines.length*lineHeight;
  return lines.map((text,index)=>({kind:'text',role:'title',sourceId:'title',text,x:box.x,y:y+index*lineHeight,size,lineHeight,weight:900,color}));
 }
 function accentTitle(operations,title,style){
  if(!style?.emphasis)return;
  // Typography already validates the ranges and applies the chosen palette to runs.
  if(operations.filter(o=>o.role==='title').every(o=>o.typography&&o.runs))return;
  if(!title.includes(style.emphasis)||style.emphasis.length>24||!/^#[a-f0-9]{6}$/i.test(style.accent||''))throw Error('강조는 원제 안의 한 구절과 단일 포인트색만 허용됩니다.');
  for(const op of operations.filter(o=>o.role==='title'))if(op.text.includes(style.emphasis)){op.highlights=[style.emphasis];op.highlightColor=style.accent;}
 }
 function applyComposition(layout,plan,imageDimensions,measure,policy){
  const contract=plan.imageComposition;
  if(contract?.assets?.some(a=>a.placement.position!=='cover'))throw Error('body image composition held: current approved scope is cover only');
  if(plan.completeCover&&!contract?.assets?.some(a=>a.placement.position==='cover')){
   const info=policy.titleInfo(plan.originalTitle||plan.coverTitle),box={x:72,y:180,width:936,height:720};
   const operations=titleOperations(info.displayTitle,box,measure,policy,globalThis.ThreadsCoverTypography?'#253039':'#fff',190,contract?.titleStyle||plan.coverTitleStyle);
   accentTitle(operations,info.displayTitle,contract?.titleStyle||plan.coverTitleStyle);
   const total=operations.length*operations[0].lineHeight;operations.forEach((o,index)=>{o.y=(1080-total)/2+index*o.lineHeight;});
   layout.pages[0]={number:1,role:'cover',width:1080,height:1080,background:operations[0].typography?.palette.background||'#151b26',operations,elements:[{kind:'text',sourceId:'title'}],contentBottom:operations.at(-1).y+operations.at(-1).lineHeight,
    geometry:{title:info.displayTitle,lines:operations.map(o=>o.text),titleBox:box}};
   layout.coverTitle=info.displayTitle;layout.titleSourceLabels=info.sourceLabels;layout.templateId='complete_text';
  }
  if(!contract?.assets?.length)return layout;
  const records=[];
  for(const a of contract.assets){
   const d=dimensions(a.composition.aspectRatio),record=JSON.parse(JSON.stringify(a));delete record.data;
   if(a.placement.position==='cover'){
    const info=policy.titleInfo(plan.originalTitle||plan.coverTitle),safe=a.composition.safeArea;
    const edges=[['bottom',safe.bottom],['top',safe.top],['left',safe.left],['right',safe.right]].sort((a,b)=>b[1]-a[1]);
    const [edge,space]=edges[0],overlay=space>=.2,margin=56;
    const region=overlay?(edge==='bottom'?{x:0,y:d.height*(1-space),width:d.width,height:d.height*space}:edge==='top'?{x:0,y:0,width:d.width,height:d.height*space}:edge==='left'?{x:0,y:0,width:d.width*space,height:d.height}:{x:d.width*(1-space),y:0,width:d.width*space,height:d.height}):{x:0,y:d.height*.66,width:d.width,height:d.height*.34};
    const titleBox={x:region.x+margin,y:region.y+margin,width:region.width-2*margin,height:region.height-2*margin};
    const ops=[imageOperation(a,imageDimensions[a.name.toLowerCase()],{x:0,y:0,width:d.width,height:overlay?d.height:region.y})];
    if(overlay)ops.push({kind:edge==='bottom'?'gradient':'rect',...region,color:'rgba(5,10,17,.65)'});
    ops.push(...titleOperations(info.displayTitle,titleBox,measure,policy,'#fff',100,contract.titleStyle));
    accentTitle(ops,info.displayTitle,contract.titleStyle);
    layout.pages[0]={number:1,role:'cover',...d,background:'#111720',operations:ops,elements:[{kind:'image',sourceId:'illustration:'+a.itemId},{kind:'text',sourceId:'title'}],
     contentBottom:d.height-margin,geometry:{title:info.displayTitle,lines:ops.filter(o=>o.role==='title').map(o=>o.text),titleBox,protectedImageRegion:overlay?edge:'separate_band'}};
    layout.coverTitle=info.displayTitle;layout.titleSourceLabels=info.sourceLabels;layout.templateId='composed_photo';
    record.renderedPage=1;record.titleBox=titleBox;record.crop=ops[0];
   }
   records.push(record);
  }
  layout.imageComposition={...contract,assets:records};
  return layout;
 }
 return Object.freeze({applyComposition,imageOperation});
});
