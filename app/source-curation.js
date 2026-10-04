(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ThreadsSourceCuration = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const schema = 'threads-curated-source-v1';
  const excluded = /(^|[\s_-])(ad|ads|advertisement|banner|nav|sidebar|share|social|footer|header|related|recommend|profile|toolbar|pagination)([\s_-]|$)/i;
  const skipTags = new Set(['SCRIPT','STYLE','NOSCRIPT','NAV','ASIDE','FOOTER','BUTTON','FORM','SVG','IFRAME']);
  const sourcePath = node => {
    const parts=[];
    for (let n=node; n?.nodeType===1 && parts.length<9; n=n.parentElement) {
      const index=n.parentElement ? [...n.parentElement.children].filter(e=>e.tagName===n.tagName).indexOf(n)+1 : 1;
      parts.unshift(n.tagName.toLowerCase()+':nth-of-type('+index+')');
    }
    return parts.join(' > ');
  };
  const imageName = src => { try { const url=new URL(src,'https://source.invalid/'),name=decodeURIComponent(url.pathname.split('/').pop());
    if(/\.(png|jpe?g|webp|gif)$/i.test(name))return name;
    let hash=2166136261;for(const char of url.href){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
    return 'asset-'+(hash>>>0).toString(16)+'.jpg';} catch { return ''; } };
  const coverHeight = (width,height) => Math.max(608,Math.min(1350,Math.round(1080*height/width)));
  function htmlDraft(html, available=[]) {
    const doc = new DOMParser().parseFromString(html,'text/html');
    const selector=['[itemprop="articleBody"]','#bo_v_con','#powerbbsContent','.contentBody','.write_div','.board-contents','.board-contents-view','.board-contents__body','.article-view-content','.articleView','.viewArea','.viewarea','.post-content','.article-content','.view_content','.xe_content','.rd_body','.se-main-container'];
    let body=null;
    for (const s of selector) { const nodes=[...doc.querySelectorAll(s)]; if(nodes.length===1 &&
      (nodes[0].textContent.trim() || nodes[0].querySelector('img'))) {body=nodes[0];break;} }
    if (!body) { const articles=[...doc.querySelectorAll('article')].filter(n=>
      n.textContent.trim().length>80 || n.querySelector('img'));
      if (articles.length===1) body=articles[0]; }
    if (!body) throw new Error('게시글 본문을 특정하지 못했습니다. 본문 선택 없이 제작할 수 없습니다.');
    const titleNodes=[...doc.querySelectorAll('.rd_hd .title,.post-title,.article-title,.view_title,.title_subject,.articleSubject,.board-title,.view_title,.tit,h1')];
    const originalTitle=(doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      titleNodes.find(node=>node.textContent.trim())?.textContent || '').trim();
    if(originalTitle.includes('�'))throw new Error('제목의 문자 인코딩이 깨졌습니다. 원본 파일을 확인하세요.');
    const unsupportedMedia=[...body.querySelectorAll('video,audio,iframe,embed,object')].map(node=>({
      kind:node.tagName.toLowerCase(),location:sourcePath(node),url:node.getAttribute('data-src')||node.getAttribute('src')||node.getAttribute('data')||node.querySelector('source')?.getAttribute('src')||null}));
    const segments=[];
    const mediaNames = new Set(available.map(x=>String(x).replaceAll('\\','/').split('/').pop().toLowerCase()));
    const blocks=new Set(['P','DIV','SECTION','ARTICLE','UL','OL','LI','BLOCKQUOTE','H2','H3','H4','PRE','TABLE','TR']);
    let textBuffer='',textLocation='';
    function flushText() {
      const value=textBuffer.replace(/\r\n?/g,'\n').trim();
      if(value) segments.push({id:'s'+segments.length,kind:'text',text:value,location:textLocation,selected:false});
      textBuffer='';textLocation='';
    }
    function addText(text,node) {
      if(!textLocation)textLocation=sourcePath(node);
      textBuffer+=String(text);
    }
    function walk(node) {
      if (segments.length>=400) return;
      if (node.nodeType===3) { addText(node.nodeValue,node.parentElement);return; }
      if (node.nodeType!==1 || skipTags.has(node.tagName) || node.hidden || node.getAttribute('aria-hidden')==='true' ||
        excluded.test(String(node.className||'')+' '+(node.id||'')) ||
        node.matches?.('.comment,.comment-item,.comment-list,.reply,.reply-item,[data-comment-id]')) return;
      if(blocks.has(node.tagName)&&textBuffer.trim()) flushText();
      if (node.tagName==='IMG') {
        flushText();
        const w=Number(node.getAttribute('width')),h=Number(node.getAttribute('height'));
        if (w&&w<=32 || h&&h<=32) return;
        const src=node.getAttribute('data-original')||node.getAttribute('data-src')||node.getAttribute('data-lazy-src')||node.getAttribute('src')||'';
        if(/(?:^|\/)(?:ico_talkchoice|icon|spacer)(?:[._/]|$)/i.test(src))return;
        const embedded=/^data:image\/(png|jpeg|webp|gif);base64,/i.exec(src);
        const name=embedded?'embedded-'+segments.length+'.'+(embedded[1].toLowerCase()==='jpeg'?'jpg':embedded[1].toLowerCase()):imageName(src);
        if(name) segments.push({id:'s'+segments.length,kind:'image',mediaName:name,
          location:sourcePath(node),mediaUrl:src,available:mediaNames.has(name.toLowerCase()),selected:false});
        return;
      }
      if (node.tagName==='BR') { addText('\n',node);return; }
      for (const child of node.childNodes) walk(child);
      if(blocks.has(node.tagName)) flushText();
    }
    walk(body);flushText();
    const commentSelectors='[data-comment-id],.comment-item,.reply-item,li.comment,.comment-list > li,.comment_line,.reply_list > li,.cmt_info';
    const comments=[...doc.querySelectorAll(commentSelectors)].filter(n=>!n.parentElement?.closest(commentSelectors))
      .slice(0,100).map((n,i)=>{
        const content=n.querySelector('.comment-content,.comment-text,.reply-text,.reply-body,.comment,.cmt_txt,.memo');
        const text=(content?.textContent||[...n.childNodes].filter(child=>child.nodeType===3).map(child=>child.nodeValue).join('')).trim();
        const likesText=n.getAttribute('data-likes')||n.querySelector('.like-count,.vote-count,.likes,.comment_vote,.recommend,.up_num')?.textContent||'';
        const m=String(likesText).replaceAll(',','').match(/\d+/);
        return {id:'c'+i,text,likes:m?Number(m[0]):null,best:n.classList.contains('best')||n.classList.contains('popular'),
          location:sourcePath(n),selected:false};
      }).filter(c=>c.text);
    return {schema,sourceType:'html',originalTitle,coverTitle:'',coverTitleEvidence:originalTitle,cover:{kind:null,segmentId:null},
      segments,comments,unsupportedMedia,review:{bodyVerified:false,mediaVerified:false,commentsVerified:false},
      sourceUrl:doc.querySelector('link[rel="canonical"]')?.href||null,publicationAllowed:false};
  }
  function exactDraft(record) {
    const segments=[];
    const pattern=/^\[IMAGE:([^\]\r\n]+)\](?:\r?\n|$)/gm;
    let last=0, match;
    while((match=pattern.exec(record.body))) {
      if(match.index>last) segments.push({id:'s'+segments.length,kind:'text',text:record.body.slice(last,match.index),location:'body:'+last,selected:true});
      segments.push({id:'s'+segments.length,kind:'image',mediaName:match[1],location:'body:'+match.index,selected:true});last=pattern.lastIndex;
    }
    if(last<record.body.length) segments.push({id:'s'+segments.length,kind:'text',text:record.body.slice(last),location:'body:'+last,selected:true});
    return {schema,sourceType:'exact',originalTitle:record.title,coverTitle:'',coverTitleEvidence:record.title,cover:{kind:null,segmentId:null},segments,
      comments:(record.comments||[]).map((c,i)=>({id:'c'+i,text:c.text,likes:c.likes??null,best:c.best===true,
        location:'comments:'+i,selected:false})),review:{bodyVerified:true,mediaVerified:false,commentsVerified:false},
      sourceUrl:record.sourceUrl||null,publicationAllowed:false};
  }
  function savedMediaDraft({title,sourceUrl,mediaNames}) {
    if(!String(title||'').trim()) throw new Error('저장 자료에 확인된 원문 제목이 없습니다.');
    if(!Array.isArray(mediaNames)||!mediaNames.length) throw new Error('원문 이미지가 없습니다.');
    const segments=mediaNames.map((name,i)=>({id:'s'+i,kind:'image',mediaName:name,
      location:'stored-image:'+String(i+1),selected:true}));
    return {schema,sourceType:'saved-media',originalTitle:String(title).trim(),coverTitle:'',
      coverTitleEvidence:String(title).trim(),cover:{kind:null,segmentId:null},segments,comments:[],
      review:{bodyVerified:false,mediaVerified:false,commentsVerified:false},
      sourceUrl:sourceUrl||null,publicationAllowed:false};
  }
  function suggest(plan,available=[]) {
    const media=new Set(available.map(name=>String(name).replaceAll('\\','/').split('/').pop().toLowerCase()));
    const boilerplate=/^(?:댓글|목록|이전글|다음글|추천|공유|로그인|신고|스크랩|작성자|게시글)$/i;
    let body=0,images=0,missing=0;
    for(const segment of plan.segments||[]) {
      if(segment.kind==='text') segment.selected=!!segment.text?.trim()&&!boilerplate.test(segment.text.trim());
      else if(segment.kind==='image') {
        segment.selected=true;
        if(media.has(segment.mediaName?.toLowerCase())) images++; else missing++;
      }
      if(segment.kind==='text'&&segment.selected) body++;
    }
    const ranked=(plan.comments||[]).filter(c=>c.text?.trim()&&(c.best||Number(c.likes)>0))
      .sort((a,b)=>Number(b.best)-Number(a.best)||(b.likes||0)-(a.likes||0));
    for(const comment of plan.comments||[]) comment.selected=ranked.slice(0,3).includes(comment);
    const cover=plan.segments.find(s=>s.selected&&s.kind==='image'&&media.has(s.mediaName?.toLowerCase()))||
      plan.segments.find(s=>s.selected&&s.kind==='text')||plan.segments.find(s=>s.selected);
    plan.cover={kind:cover?.kind||null,segmentId:cover?.id||null};
    plan.coverTitle=plan.originalTitle?.trim()||'';
    plan.coverTitleEvidence=plan.originalTitle?.trim()||'';
    plan.review={bodyVerified:false,mediaVerified:false,commentsVerified:false};
    plan.suggestion={body,images,missing,comments:ranked.slice(0,3).length};
    return plan.suggestion;
  }
  function validate(plan, files) {
    const errors=[];
    if(plan?.schema!==schema) return ['지원하지 않는 원문 ZIP 형식입니다.'];
    if(!plan.originalTitle?.trim() || !plan.coverTitle?.trim()) errors.push('원문 제목과 대문 글씨를 확인하세요.');
    if(!plan.coverTitleEvidence?.trim() || ![plan.originalTitle,...(plan.segments||[]).filter(s=>s.selected&&s.kind==='text').map(s=>s.text)]
      .some(text=>text?.includes(plan.coverTitleEvidence.trim())))
      errors.push('첫 장 문구의 근거 문장을 원문 제목 또는 선택한 본문 그대로 적으세요.');
    if(!plan.review?.bodyVerified || !plan.review?.mediaVerified || !plan.review?.commentsVerified)
      errors.push('본문·이미지·댓글 확인 표시가 모두 필요합니다.');
    if(plan.unsupportedMedia?.length) errors.push('원문 영상·임베드가 포함되어 정지 이미지 자동 제작을 보류합니다. 원본 전체 내용을 확인하세요.');
    const chosen=(plan.segments||[]).filter(s=>s.selected);
    if(!chosen.length) errors.push('사용할 본문 글 또는 이미지를 고르세요.');
    const ids=new Set(chosen.map(x=>x.id));
    if(!ids.has(plan.cover?.segmentId) || !['text','image'].includes(plan.cover?.kind) ||
       chosen.find(x=>x.id===plan.cover?.segmentId)?.kind!==plan.cover?.kind)
      errors.push('첫 장의 배경으로 쓸 본문 조각 또는 이미지를 지정하세요.');
    for(const s of chosen) {
      if(!s.location) errors.push('본문 조각의 원문 위치가 빠졌습니다.');
      if(s.kind==='text' && !s.text?.trim()) errors.push('빈 본문 조각은 사용할 수 없습니다.');
      if(s.kind==='image' && (!s.mediaName || !files.has(s.mediaName.toLowerCase())))
        errors.push('원문 이미지 파일 누락: '+(s.mediaName||'이름 없음'));
      if(s.after && (!Number.isInteger(Number(s.after.gap)) || Number(s.after.gap)<0 || Number(s.after.gap)>400 ||
        typeof s.after.note!=='string' || s.after.note.length>500))
        errors.push('조각 뒤 여백은 0~400px, 작성 의견은 500자 이하로 입력하세요.');
    }
    if(plan.style && (!['sans','gothic'].includes(plan.style.fontId) ||
      !({sans:[400,900],gothic:[800]}[plan.style.fontId]||[]).includes(Number(plan.style.titleWeight))))
      errors.push('동봉된 상업적 사용 허용 폰트와 실제 굵기를 선택하세요.');
    if(plan.style?.coverSize!==undefined && (!Number.isInteger(Number(plan.style.coverSize)) ||
      Number(plan.style.coverSize)<48 || Number(plan.style.coverSize)>120)) errors.push('첫 장 글씨 크기는 48~120px로 정하세요.');
    if(plan.style?.coverTop!==undefined && (!Number.isInteger(Number(plan.style.coverTop)) ||
      Number(plan.style.coverTop)<16 || Number(plan.style.coverTop)>280)) errors.push('첫 장 위쪽 여백은 16~280px로 정하세요.');
    if(plan.style?.coverLeft!==undefined && (!Number.isInteger(Number(plan.style.coverLeft)) ||
      Number(plan.style.coverLeft)<40 || Number(plan.style.coverLeft)>320)) errors.push('첫 장 왼쪽 여백은 40~320px로 정하세요.');
    for(const c of plan.comments||[]) if(c.selected && (!c.text?.trim() || !c.location)) errors.push('댓글 원문·위치를 확인하세요.');
    if(plan.publicationAllowed!==false) errors.push('게시 승인을 이 화면에서 부여할 수 없습니다.');
    return errors;
  }
  return Object.freeze({schema,htmlDraft,exactDraft,savedMediaDraft,suggest,validate,coverHeight});
});
