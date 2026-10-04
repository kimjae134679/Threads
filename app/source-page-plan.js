(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ThreadsPagePlan=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='2026-10-05.3',W=1080,PAD=72,MAX=1350,MIN=240,BODY=52,LINE=78;
  const clean=text=>String(text||'').replace(/[\u200b\ufeff]/g,'').replace(/\n{3,}/g,'\n\n').trim();
  const plainLink=text=>/^(?:https?:\/\/\S+\s*)+$/i.test(clean(text));
  function wrap(text,width,size,measure,weight=400) {
    const lines=[];
    for(const paragraph of String(text).replace(/\r\n?/g,'\n').split('\n')) {
      if(!paragraph){lines.push('');continue;}let line='';
      for(const word of paragraph.match(/\S+\s*|\s+/g)||[]) {
        if(measure(word.trimEnd(),size,weight)<=width) {
          if(line&&measure(line+word.trimEnd(),size,weight)>width){lines.push(line.trimEnd());line='';}line+=word;
        }else for(const char of word){if(line&&measure(line+char,size,weight)>width){lines.push(line.trimEnd());line=char;}else line+=char;}
      }
      lines.push(line.trimEnd());
    }
    return lines;
  }
  function headline(original) {
    let title=clean(original).replace(/^(?:\((?:장문|초?스압|사진|펌|끌올)[^)]*\)|\[(?:장문|초?스압|사진|펌|끌올)[^\]]*\])\s*/,'').replace(/\.(?:jpg|jpeg|png|txt)$/i,'');
    if(title.length>30&&/^.*?원덬이\s+/.test(title))title=title.replace(/^.*?원덬이\s+/,'');
    return title;
  }
  function compile(plan,dimensions,measure) {
    const omitted=[],warnings=[],pages=[],editorial=plan.editorial||{},style=plan.style||{};
    const fixed=style.canvasMode==='instagram',MAXH=fixed&&style.aspectRatio==='3:4'?1440:MAX;
    const display=(text,sourceId)=>{
      const original=clean(text),urls=original.match(/https?:\/\/[^\s<>]+/gi)||[];
      if(urls.length)omitted.push({sourceId,reason:'source_urls_in_metadata',urls});
      return clean(original.replace(/https?:\/\/[^\s<>]+/gi,'').replace(/^\s*(?:출처|원문|링크|주소)\s*[:：]?\s*$/gm,''));
    };
    const excluded=editorial.exclusions||{};
    for(const [id,reason] of Object.entries(excluded)){
      if(!plan.segments?.some(s=>s.id===id)||typeof reason!=='string'||!reason.trim())throw new Error('제외할 원문 조각과 이유를 확인하세요.');
      omitted.push({sourceId:id,reason:'explicit_editorial_exclusion',explanation:reason});
    }
    const used=(plan.segments||[]).filter(s=>s.selected&&!Object.hasOwn(excluded,s.id)).map(s=>s.kind==='text'?{...s,text:display(s.text,s.id)}:s).filter(s=>{
      if(s.kind!=='text')return true;
      const text=clean(s.text),reason=!text?'empty_or_url_only':/^[-_=]{2,}$/.test(text)?'separator':
        /^(?:그냥\s*솔직하게.*글\s*내용\s*불편|불펌|무단\s*전재|퍼가(?:지|실))/s.test(text)?'editorial_preface':null;
      if(reason)omitted.push({sourceId:s.id,reason,text});return !reason;
    });
    if(!used.length)throw new Error('첫 장의 실제 원문 조각이 없습니다.');
    const imageParts=used.filter(s=>s.kind==='image');
    for(const part of imageParts)if(!dimensions[part.mediaName.toLowerCase()])throw new Error('원문 이미지 파일 누락: '+part.mediaName);
    const photographs=imageParts.filter(s=>dimensions[s.mediaName.toLowerCase()].analysis?.kind!=='screenshot'&&(dimensions[s.mediaName.toLowerCase()].analysis?.textBands||0)<3&&
      dimensions[s.mediaName.toLowerCase()].height/dimensions[s.mediaName.toLowerCase()].width<2.1);
    const manualCover=used.find(s=>s.id===editorial.coverSegmentId);
    const cover=manualCover||photographs.slice().sort((a,b)=>(dimensions[b.mediaName.toLowerCase()].analysis?.photoScore||0)-
      (dimensions[a.mediaName.toLowerCase()].analysis?.photoScore||0))[0]||used.find(s=>s.id===plan.cover?.segmentId)||used[0];
    const requested=editorial.templateId||style.templateId||'auto';
    const totalText=used.filter(s=>s.kind==='text').reduce((n,s)=>n+s.text.length,0);
    const templateId=requested==='auto'?(photographs.length?'photo_cover':imageParts.length?'screenshot':totalText<=260?'white_title':'mint_text'):requested;
    if(!['photo_cover','screenshot','white_title','mint_text','explainer'].includes(templateId))throw new Error('제작 형식을 확인하세요.');
    if(templateId==='photo_cover'&&cover.kind!=='image')throw new Error('사진 표지에는 실제 원본 사진이 필요합니다.');
    const selectionReason=editorial.selectionReason||(templateId==='photo_cover'?'원문 첨부 중 사진으로 분석된 이미지를 표지로 선택':
      templateId==='screenshot'?'대화·원문 화면을 축소 표지로 쓰지 않고 본문에서 읽히는 크기로 보존':
      templateId==='white_title'?'짧은 글은 흰 바탕의 제목과 원문을 한 흐름으로 배치':'긴 글은 큰 제목 표지 뒤에 원문 문단을 이어 배치');
    const title=clean(editorial.coverTitle||plan.coverTitle||plan.originalTitle),manual=style.manualTitleLayout===true;
    const titleWeight=style.titleWeight||900,titleX=manual?Number(style.coverLeft):PAD;
    const specified=editorial.coverLines;
    if(specified&&(!Array.isArray(specified)||!specified.length||specified.some(line=>typeof line!=='string'||!line.trim())||
      specified.join(' ').replace(/\s+/g,' ').trim()!==title.replace(/\s+/g,' ').trim()))throw new Error('표지 줄바꿈은 표지 제목의 모든 글자를 그대로 포함해야 합니다.');
    const highlights=editorial.titleHighlights||[];
    if(!Array.isArray(highlights)||highlights.some(word=>typeof word!=='string'||!word.trim()||!title.includes(word)))throw new Error('강조할 문구는 표지 제목 안에서 선택하세요.');
    const titleOp=(text,x,y,t,color,extra={})=>({kind:'text',role:'title',text,x,y,size:t.size,weight:titleWeight,color,lineHeight:t.lineHeight,sourceId:'title',
      highlights:highlights.filter(word=>text.includes(word)),highlightColor:color==='#fff'?'#FFE36D':'#176B57',...extra});
    const fitTitle=(width,min,max,maxLines)=>{
      if(manual){min=max=Number(style.coverSize);width=W-titleX-PAD;}
      let size=max,lines=specified||wrap(title,width,size,measure,titleWeight).filter(Boolean);
      while((lines.length>maxLines||lines.some(line=>measure(line,size,titleWeight)>width)||!specified&&lines.length>1&&lines.at(-1).length<3)&&size>min){size-=2;lines=specified||wrap(title,width,size,measure,titleWeight).filter(Boolean);}
      if(lines.length>maxLines||lines.some(line=>measure(line,size,titleWeight)>width))throw new Error('대문 제목을 원문 근거 안에서 더 짧게 정하세요.');
      return {size,lines,lineHeight:Math.round(size*1.23)};
    };
    let ops=[],y=PAD,pageRole='body';const seenText=new Set(),seenImages=new Set();
    function finishPage() {
      if(!ops.length)return;
      const contentBottom=Math.max(...ops.map(op=>op.y+(op.kind==='text'?op.lineHeight||op.size*1.35:op.height)));
      const height=fixed?MAXH:Math.min(MAXH,Math.max(MIN,Math.ceil(contentBottom+PAD)));
      pages.push({number:pages.length+1,role:pageRole,width:W,height,background:pageRole==='cover'&&templateId==='mint_text'?'#B8DCD4':'#fff',contentBottom,operations:ops});
      ops=[];y=PAD;pageRole='body';
    }
    function addText(text,sourceId,role='body',size=BODY) {
      const weight=role==='comment'?titleWeight:style.fontId==='gothic'?800:400;
      const paragraphs=clean(text).split(/\n\s*\n/);
      for(let p=0;p<paragraphs.length;p++) {
        let paragraph=paragraphs[p];
        if(/[?？]$/.test(paragraph)&&paragraphs[p+1]&&wrap(paragraph+'\n'+paragraphs[p+1],W-2*PAD,size,measure,weight).length*LINE<=MAXH-2*PAD)
          paragraph+='\n'+paragraphs[++p];
        if(!paragraph)continue;
        // Keep complete sentences together when a paragraph exceeds one page.
        const full=wrap(paragraph,W-2*PAD,size,measure,weight),fits=full.length*LINE<=MAXH-2*PAD;
        const units=fits?[paragraph]:paragraph.split(/(?<=[.!?。])\s+(?=\S)/);
        for(const unit of units) {
          const lines=wrap(unit.trim(),W-2*PAD,size,measure,weight);
          if(ops.length&&lines.length*LINE<=MAXH-2*PAD&&y+lines.length*LINE>MAXH-PAD)finishPage();
          for(const line of lines){if(y+LINE>MAXH-PAD)finishPage();if(line)ops.push({kind:'text',role,text:line,x:PAD,y,size,weight,color:'#171717',lineHeight:LINE,sourceId});y+=LINE;}
        }
        y+=28;
      }
    }
    let photoName=null,photoConsumed=false;
    if(templateId==='photo_cover') {
      const image=dimensions[cover.mediaName.toLowerCase()];
      const scale=Math.min(W/image.width,(MAXH-2*PAD)/image.height),iw=Math.round(image.width*scale),ih=Math.round(image.height*scale);
      const t=fitTitle(iw-2*PAD,60,96,4);
      const height=fixed?MAXH:Math.max(608,ih+PAD),imageY=fixed?Math.max(0,(height-ih)/2):0;
      photoName=cover.mediaName.toLowerCase();
      ops=[{kind:'image',name:photoName,x:(W-iw)/2,y:imageY,width:iw,height:ih,sourceId:cover.id}];
      const titleY=manual?Number(style.coverTop):imageY+ih-t.lines.length*t.lineHeight-40;
      if(titleY<PAD+40){warnings.push('사진 높이가 짧아 제목을 별도 영역에 배치했습니다.');
        const separateY=manual?titleY:imageY+ih+30;for(const [i,text] of t.lines.entries())ops.push(titleOp(text,titleX,separateY+i*t.lineHeight,t,'#171717'));
      }else{
        const gradientY=Math.max(imageY,titleY-100);
        ops.push({kind:'gradient',x:(W-iw)/2,y:gradientY,width:iw,height:imageY+ih-gradientY});
        for(const [i,text] of t.lines.entries())ops.push(titleOp(text,manual?titleX:(W-iw)/2+PAD,titleY+i*t.lineHeight,t,'#fff',{stroke:'#111',strokeWidth:2}));
      }
      pageRole='cover';finishPage();photoConsumed=true;
    }else if(templateId==='mint_text'||templateId==='screenshot') {
      const t=fitTitle(W-2*PAD,60,116,6),height=fixed?MAXH:1080,start=manual?Number(style.coverTop):(height-t.lines.length*t.lineHeight)/2;
      const titleOps=t.lines.map((text,i)=>titleOp(text,manual?titleX:W/2,start+i*t.lineHeight,t,'#111',{align:manual?'left':'center'}));
      pages.push({number:1,role:'cover',width:W,height,background:templateId==='mint_text'?'#B8DCD4':'#fff',contentBottom:start+t.lines.length*t.lineHeight,operations:titleOps});
    }else {
      const t=fitTitle(W-2*PAD,60,92,6);
      const top=manual?Number(style.coverTop):PAD;
      for(const [i,text] of t.lines.entries())ops.push(titleOp(text,titleX,top+i*t.lineHeight,t,'#111'));
      y=top+t.lines.length*t.lineHeight+52;pageRole='cover';
    }
    function addImage(part,tailReserve=0) {
      const name=part.mediaName.toLowerCase(),image=dimensions[name],identity=image.sha256||name;
      if(seenImages.has(identity)&&part.allowRepeat!==true){omitted.push({sourceId:part.id,reason:'duplicate_image',name});return;}
      seenImages.add(identity);
      if(name===photoName&&photoConsumed){omitted.push({sourceId:part.id,reason:'already_shown_in_cover',name});return;}
      const custom=editorial.regions?.[part.id],auto=image.analysis?.bounds;
      const region=custom||auto||{x:0,y:0,width:image.width,height:image.height};
      if(![region.x,region.y,region.width,region.height].every(Number.isFinite)||region.x<0||region.y<0||region.width<=0||region.height<=0||region.x+region.width>image.width+1||region.y+region.height>image.height+1)throw new Error('원문 이미지 사용 영역을 확인하세요.');
      const ordinaryPhoto=image.analysis?.kind==='photo'&&region.height/region.width<2.1;
      const scale=ordinaryPhoto?Math.min((W-2*PAD)/region.width,(MAXH-2*PAD-tailReserve)/region.height):(W-2*PAD)/region.width;
      const capacity=(MAXH-2*PAD)/scale;
      if(region.y>0||region.height<image.height||region.x>0||region.width<image.width)omitted.push({sourceId:part.id,reason:custom?'explicit_editorial_crop':'outer_blank_margin',region});
      if(region.height*scale<=MAXH-2*PAD) {
        if(y+region.height*scale>MAXH-PAD)finishPage();
        const width=region.width*scale;
        ops.push({kind:'image',name,x:(W-width)/2,y,width,height:region.height*scale,sourceX:region.x,sourceY:region.y,sourceWidth:region.width,sourceHeight:region.height,sourceId:part.id});y+=region.height*scale+28;return;
      }
      finishPage();let start=region.y,end=region.y+region.height;
      const explicit=editorial.splitRows?.[part.id]||[];
      const breaks=explicit.length?explicit.map(y=>({y,gap:100})):(image.analysis?.breakRows||[]);
      while(start<end-0.5) {
        const desired=Math.min(end,start+capacity);
        let cut=desired,boundary='end';
        if(desired<end) {
          const candidates=breaks.filter(b=>b.y>start+capacity*0.25&&b.y<=desired&&b.y<end);
          if(candidates.length){cut=candidates.at(-1).y;boundary=explicit.length?'editorial_boundary':'blank_row';}
          else {
            const next=breaks.find(b=>b.y>desired&&b.y<=start+capacity*1.2&&b.y<end);
            if(end-start<=capacity*1.2){cut=end;boundary='end';}
            else if(next){cut=next.y;boundary=explicit.length?'editorial_boundary':'blank_row';}
            else throw new Error('본문 조각의 안전한 이미지 분할 경계를 찾지 못했습니다: '+part.id);
          }
        }
        const sliceScale=Math.min(scale,(MAXH-2*PAD)/(cut-start)),sliceWidth=region.width*sliceScale;
        ops.push({kind:'image',name,x:(W-sliceWidth)/2,y:PAD,width:sliceWidth,height:(cut-start)*sliceScale,sourceX:region.x,sourceY:start,sourceWidth:region.width,sourceHeight:cut-start,sourceId:part.id,splitBoundary:boundary});
        y=PAD+(cut-start)*sliceScale+28;if(cut<end-0.5)finishPage();start=cut;
      }
    }
    for(const [index,part] of used.entries()) {
      if(part.kind==='text') {
        const text=clean(part.text);if(seenText.has(text)){omitted.push({sourceId:part.id,reason:'duplicate_text'});continue;}seenText.add(text);addText(text,part.id);
      }else {
        const next=used[index+1],lines=next?.kind==='text'&&next.text.length<=80?wrap(next.text,W-2*PAD,BODY,measure).length:0;
        addImage(part,lines&&lines<=2?lines*LINE+28:0);
      }
      if(part.after?.note?.trim())addText(part.after.note,part.id,'note');
      if(part.after?.gap)y+=Math.min(100,Math.max(0,Number(part.after.gap)||0));
    }
    const comments=(plan.comments||[]).filter(c=>c.selected),includedComments=[];
    for(const comment of comments) {
      const text=display(comment.text,comment.id);if(!text||seenText.has(text)){omitted.push({sourceId:comment.id,reason:'duplicate_or_link_comment'});continue;}
      if(!includedComments.length){if(y+LINE*3>MAXH-PAD)finishPage();ops.push({kind:'text',role:'section',text:'원문 댓글',x:PAD,y,size:34,weight:900,color:'#596168',lineHeight:48,sourceId:'comments-heading'});y+=64;}
      seenText.add(text);includedComments.push(comment.id);addText(text,comment.id,'comment',48);
    }
    finishPage();
    if(pages.length>60)throw new Error('원문이 길어 60장 제한을 넘습니다. 원문을 나눠 주세요.');
    for(const page of pages) {
      page.bottomWhitespace=Math.round(page.height-page.contentBottom);
      page.purpose=page.role==='cover'?'제목으로 상황 소개':page.operations.some(o=>o.role==='comment')?'원문 반응과 끝맺음':'원문 순서와 사건 전개';
      page.elements=page.operations.filter(o=>o.kind!=='gradient').map(op=>({sourceId:op.sourceId,kind:op.kind,role:op.role||'image',name:op.name||null}));
      page.sourceIds=[...new Set(page.elements.map(e=>e.sourceId).filter(id=>!['title','comments-heading'].includes(id)))];
      if(page.operations.some(op=>op.y<0||op.kind==='text'&&op.y+(op.lineHeight||op.size)>page.height-PAD+2))throw new Error('제작 계획의 안전 여백 검증 실패');
    }
    return {schema:'threads-production-plan-v1',ruleVersion:VERSION,preparedAt:new Date().toISOString(),
      originalTitle:plan.originalTitle,coverTitle:title,titleEvidence:editorial.titleEvidence||plan.coverTitleEvidence||plan.originalTitle,
      templateId,selectionReason,canvasMode:fixed?'instagram':'threads',aspectRatio:fixed?(style.aspectRatio||'4:5'):null,
      sourceUrl:plan.sourceUrl,sourceSha256:plan.input?.sha256||null,sourcePublishedAt:plan.sourcePublishedAt||null,
      sourceCheckedAt:plan.sourceCheckedAt||null,collectedAt:plan.collectedAt||null,bodyFontSize:BODY,safeMargin:PAD,
      sourceUnits:used.map(s=>({id:s.id,kind:s.kind,location:s.location||null,role:s.contentRole||'primary_source',text:s.kind==='text'?s.text:null,mediaName:s.mediaName||null})),
      selectedCommentIds:includedComments,commentsPolicy:'visible_likes_or_best_only',reviewStatus:'needs_review',publicationStatus:'unknown',
      publicationAllowed:false,omitted,warnings:[...new Set(warnings)],pages};
  }
  return Object.freeze({VERSION,compile,wrap,plainLink,headline});
});
