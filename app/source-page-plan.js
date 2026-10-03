(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ThreadsPagePlan=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='2026-10-04.1',W=1080,PAD=64,MAX=1350,MIN=608,BODY=46,LINE=68;
  function wrap(text,width,size,measure) {
    const lines=[];for(const paragraph of String(text).replace(/\r\n?/g,'\n').split('\n')){
      if(!paragraph){lines.push('');continue;}let line='';
      for(const word of paragraph.match(/\S+\s*|\s+/g)||[]){
        if(measure(word.trimEnd(),size)<=width){
          if(line&&measure(line+word.trimEnd(),size)>width){lines.push(line.trimEnd());line='';}line+=word;
        }else for(const char of word){if(line&&measure(line+char,size)>width){lines.push(line.trimEnd());line=char;}else line+=char;}
      }lines.push(line.trimEnd());
    }return lines;
  }
  const clean=text=>String(text||'').replace(/[\u200b\ufeff]/g,'').replace(/\n{3,}/g,'\n\n').trim();
  const plainLink=text=>/^(?:https?:\/\/\S+\s*)+$/i.test(clean(text));
  function compile(plan,dimensions,measure) {
    const omitted=[],warnings=[],pages=[];
    const display=(text,sourceId)=>{
      const original=clean(text),urls=original.match(/https?:\/\/[^\s<>]+/gi)||[];
      if(urls.length)omitted.push({sourceId,reason:'source_urls_in_metadata',urls});
      return clean(original.replace(/https?:\/\/[^\s<>]+/gi,'').replace(/^\s*(?:출처|원문|링크|주소)\s*[:：]?\s*$/gm,''));
    };
    const used=(plan.segments||[]).filter(s=>s.selected).map(s=>s.kind==='text'?{...s,text:display(s.text,s.id)}:s).filter(s=>{
      if(s.kind!=='text')return true;
      const text=clean(s.text),reason=!text?'empty_or_url_only':plainLink(text)?'standalone_url':/^[-_=]{2,}$/.test(text)?'separator':
        /^(?:그냥\s*솔직하게.*글\s*내용\s*불편|불펌|무단\s*전재|퍼가(?:지|실))/s.test(text)?'editorial_preface':null;
      if(reason)omitted.push({sourceId:s.id,reason,text});return !reason;
    }),cover=used.find(s=>s.id===plan.cover?.segmentId)||used.find(s=>s.kind==='image')||used[0];
    if(!cover)throw new Error('첫 장의 실제 원문 조각이 없습니다.');
    let title=clean(plan.coverTitle||plan.originalTitle),titleSize=84;
    let titleLines=wrap(title,W-2*PAD,titleSize,measure).filter(Boolean);
    while((titleLines.length>3||titleLines.length>1&&titleLines.at(-1).length<5)&&titleSize>64){titleSize-=2;titleLines=wrap(title,W-2*PAD,titleSize,measure).filter(Boolean);}
    if(titleLines.length>3)throw new Error('대문 제목은 3줄 안에 들어오도록 제작 계획에서 줄이세요.');
    const titleHeight=titleLines.length*Math.round(titleSize*1.2);
    const titleOps=titleLines.map((text,i)=>({kind:'text',role:'title',text,x:PAD,y:0,size:titleSize,weight:900,color:'#fff',sourceId:'title'}));
    let consumed='',coverImage=null,contentOps=[],contentHeight;
    if(cover.kind==='image'){
      const image=dimensions[cover.mediaName.toLowerCase()];if(!image)throw new Error('원문 이미지 파일 누락: '+cover.mediaName);
      const available=MAX-titleHeight-3*PAD,scale=Math.min((W-2*PAD)/image.width,available/image.height);
      const width=Math.round(image.width*scale),height=Math.round(image.height*scale);
      contentHeight=height;coverImage=cover.mediaName.toLowerCase();
      contentOps=[{kind:'image',name:coverImage,x:(W-width)/2,y:PAD,width,height,sourceId:cover.id}];
      if(image.height*(W-2*PAD)/image.width>available*1.3)warnings.push('표지 이미지는 축소 미리보기이며 본문에서 원본을 이어 보여줍니다.');
    }else{
      const full=clean(cover.text),match=full.match(/^[\s\S]{1,300}?(?:\n\n|[.!?。](?:\s|$))/);
      consumed=match?match[0].trim():full.slice(0,260);
      const lines=wrap(consumed,W-2*PAD,48,measure);
      while(lines.length*66>MAX-titleHeight-3*PAD&&consumed.length>40){consumed=consumed.slice(0,-12).trimEnd();lines.splice(0,lines.length,...wrap(consumed,W-2*PAD,48,measure));}
      contentHeight=lines.length*66;
      contentOps=lines.map((text,i)=>({kind:'text',role:'body',text,x:PAD,y:PAD+i*66,size:48,weight:400,color:'#171c26',sourceId:cover.id}));
    }
    const coverH=Math.min(MAX,Math.max(MIN,contentHeight+titleHeight+3*PAD));
    const titleY=coverH-titleHeight-PAD,titleBoxY=titleY-28;
    titleOps.forEach((op,i)=>{op.y=titleY+i*Math.round(titleSize*1.2);});
    pages.push({number:1,role:'cover',width:W,height:coverH,titleBoxY,contentBottom:coverH-PAD,operations:[...contentOps,...titleOps]});
    let ops=[],y=PAD,seenText=new Set(),seenImages=new Set();
    const flush=()=>{if(!ops.length)return;const height=Math.min(MAX,Math.max(MIN,Math.ceil(y+PAD)));
      pages.push({number:pages.length+1,role:'body',width:W,height,contentBottom:y,operations:ops});ops=[];y=PAD;};
    const addLines=(text,sourceId,role='body',size=BODY)=>{
      const blocks=clean(text).split(/\n\s*\n/);
      for(const block of blocks){if(!block.trim())continue;const lines=wrap(block,W-2*PAD,size,measure);
        if(ops.length&&lines.length*LINE<=MAX-2*PAD&&y+lines.length*LINE>MAX-PAD)flush();
        for(const line of lines){if(y+LINE>MAX-PAD)flush();if(line)ops.push({kind:'text',role,text:line,x:PAD,y,size,weight:role==='comment'?800:400,color:'#171c26',sourceId});y+=LINE;}
        y+=22;
      }
    };
    for(const part of used){
      if(part.kind==='text'){
        let text=clean(part.text);
        if(plainLink(text)){omitted.push({sourceId:part.id,reason:'standalone_url',text});continue;}
        if(/^[-_=]{2,}$/.test(text)){omitted.push({sourceId:part.id,reason:'separator'});continue;}
        if(seenText.has(text)){omitted.push({sourceId:part.id,reason:'duplicate_text'});continue;}seenText.add(text);
        if(part.id===cover.id&&consumed)text=text.slice(consumed.length).trim();
        if(text)addLines(text,part.id);
      }else{
        const name=part.mediaName.toLowerCase(),image=dimensions[name];if(!image)throw new Error('원문 이미지 파일 누락: '+part.mediaName);
        const identity=image.sha256||name;
        if(seenImages.has(identity)){omitted.push({sourceId:part.id,reason:'duplicate_image',name});continue;}seenImages.add(identity);
        if(name===coverImage&&image.height*(W-2*PAD)/image.width<=MAX-titleHeight-3*PAD){
          omitted.push({sourceId:part.id,reason:'already_shown_in_cover',name});continue;
        }
        const scale=(W-2*PAD)/image.width,height=image.height*scale,capacity=MAX-2*PAD;
        if(height<=capacity){
          if(y+height>MAX-PAD)flush();
          ops.push({kind:'image',name,x:PAD,y,width:W-2*PAD,height,sourceId:part.id});y+=height+24;
        }else{
          flush();const count=Math.ceil(height/capacity),slice=image.height/count;
          for(let i=0;i<count;i++){
            const h=slice*scale;ops=[{kind:'image',name,x:PAD,y:PAD,width:W-2*PAD,height:h,sourceY:i*slice,sourceHeight:slice,sourceId:part.id}];y=PAD+h;flush();
          }
        }
      }
      if(part.after?.note?.trim())addLines(part.after.note,part.id,'note');
      if(part.after?.gap)y+=Math.min(100,Math.max(0,Number(part.after.gap)||0));
    }
    for(const comment of (plan.comments||[]).filter(c=>c.selected)){
      const text=display(comment.text,comment.id);if(!text||plainLink(text)||seenText.has(text)){omitted.push({sourceId:comment.id,reason:'duplicate_or_link_comment'});continue;}
      seenText.add(text);addLines(text,comment.id,'comment',44);
    }flush();
    if(pages.length>60)throw new Error('원문이 길어 60장 제한을 넘습니다. 원문을 나눠 주세요.');
    for(const page of pages){
      page.bottomWhitespace=Math.round(page.height-page.contentBottom);
      page.elements=page.operations.map(op=>({sourceId:op.sourceId,kind:op.kind,role:op.role||'image',name:op.name||null}));
      if(page.operations.some(op=>op.x<PAD||op.y<PAD||op.kind==='text'&&op.y+op.size>page.height-PAD+1))throw new Error('제작 계획의 안전 여백 검증 실패');
    }
    return {schema:'threads-production-plan-v1',ruleVersion:VERSION,preparedAt:new Date().toISOString(),
      originalTitle:plan.originalTitle,coverTitle:title,titleEvidence:plan.coverTitleEvidence||plan.originalTitle,
      sourceUrl:plan.sourceUrl,sourceSha256:plan.input?.sha256||null,bodyFontSize:BODY,safeMargin:PAD,
      commentsPolicy:'visible_likes_or_best_only',reviewStatus:'needs_review',publicationStatus:'unknown',
      publicationAllowed:false,omitted,warnings,pages};
  }
  function headline(original) {
    let title=clean(original).replace(/^\((?:장문|초?스압|사진|펌|끌올)[^)]*\)\s*/,'');
    if(title.length>30&&/^.*?원덬이\s+/.test(title))title=title.replace(/^.*?원덬이\s+/,'');
    const chars=Array.from(title);return chars.length>42?chars.slice(0,39).join('').trimEnd()+'…':title;
  }
  return Object.freeze({VERSION,compile,wrap,plainLink,headline});
});