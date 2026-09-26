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
  const imageName = src => { try { return decodeURIComponent(new URL(src,'https://source.invalid/').pathname.split('/').pop()); } catch { return ''; } };
  function htmlDraft(html, available=[]) {
    const doc = new DOMParser().parseFromString(html,'text/html');
    const selector=['[itemprop="articleBody"]','#bo_v_con','.post-content','.article-content','.view_content','.xe_content','.rd_body','.se-main-container'];
    let body=null;
    for (const s of selector) { const nodes=[...doc.querySelectorAll(s)]; if(nodes.length===1 && nodes[0].textContent.trim()) {body=nodes[0];break;} }
    if (!body) { const articles=[...doc.querySelectorAll('article')].filter(n=>n.textContent.trim().length>80);
      if (articles.length===1) body=articles[0]; }
    if (!body) throw new Error('게시글 본문을 특정하지 못했습니다. 본문 선택 없이 제작할 수 없습니다.');
    const originalTitle=(doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      doc.querySelector('.post-title,.article-title,.view_title,h1')?.textContent || '').trim();
    const segments=[];
    const mediaNames = new Set(available.map(x=>String(x).replaceAll('\\','/').split('/').pop().toLowerCase()));
    function addText(text,node) {
      const value=String(text).replace(/\r\n?/g,'\n').trim();
      if (value) segments.push({id:'s'+segments.length,kind:'text',text:value,location:sourcePath(node),selected:false});
    }
    function walk(node) {
      if (segments.length>=400) return;
      if (node.nodeType===3) { addText(node.nodeValue,node.parentElement);return; }
      if (node.nodeType!==1 || skipTags.has(node.tagName) || node.hidden || node.getAttribute('aria-hidden')==='true' ||
        excluded.test(String(node.className||'')+' '+(node.id||'')) ||
        node.matches?.('.comment,.comment-item,.comment-list,.reply,.reply-item,[data-comment-id]')) return;
      if (node.tagName==='IMG') {
        const w=Number(node.getAttribute('width')),h=Number(node.getAttribute('height'));
        if (w&&w<=32 || h&&h<=32) return;
        const src=node.getAttribute('data-original')||node.getAttribute('data-src')||node.getAttribute('src')||'';
        const name=imageName(src);
        if(name) segments.push({id:'s'+segments.length,kind:'image',mediaName:name,
          location:sourcePath(node),available:mediaNames.has(name.toLowerCase()),selected:false});
        return;
      }
      if (node.tagName==='BR') { addText('\n',node);return; }
      for (const child of node.childNodes) walk(child);
    }
    walk(body);
    const commentSelectors='[data-comment-id],.comment-item,.reply-item,li.comment,.comment-list > li';
    const comments=[...doc.querySelectorAll(commentSelectors)].filter(n=>!n.parentElement?.closest(commentSelectors))
      .slice(0,100).map((n,i)=>{
        const text=(n.querySelector('.comment-content,.comment-text,.text,.content')||n).textContent?.trim()||'';
        const likesText=n.getAttribute('data-likes')||n.querySelector('.like-count,.vote-count,.likes')?.textContent||'';
        const m=String(likesText).replaceAll(',','').match(/\d+/);
        return {id:'c'+i,text,likes:m?Number(m[0]):null,best:n.classList.contains('best')||n.classList.contains('popular'),
          location:sourcePath(n),selected:false};
      }).filter(c=>c.text);
    return {schema,sourceType:'html',originalTitle,coverTitle:'',coverTitleEvidence:originalTitle,cover:{kind:null,segmentId:null},
      segments,comments,review:{bodyVerified:false,mediaVerified:false,commentsVerified:false},
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
  function validate(plan, files) {
    const errors=[];
    if(plan?.schema!==schema) return ['지원하지 않는 원문 ZIP 형식입니다.'];
    if(!plan.originalTitle?.trim() || !plan.coverTitle?.trim()) errors.push('원문 제목과 대문 글씨를 확인하세요.');
    if(!plan.coverTitleEvidence?.trim() || ![plan.originalTitle,...(plan.segments||[]).filter(s=>s.selected&&s.kind==='text').map(s=>s.text)]
      .some(text=>text?.includes(plan.coverTitleEvidence.trim())))
      errors.push('첫 장 문구의 근거 문장을 원문 제목 또는 선택한 본문 그대로 적으세요.');
    if(!plan.review?.bodyVerified || !plan.review?.mediaVerified || !plan.review?.commentsVerified)
      errors.push('본문·이미지·댓글 확인 표시가 모두 필요합니다.');
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
    for(const c of plan.comments||[]) if(c.selected && (!c.text?.trim() || !c.location)) errors.push('댓글 원문·위치를 확인하세요.');
    if(plan.publicationAllowed!==false) errors.push('게시 승인을 이 화면에서 부여할 수 없습니다.');
    return errors;
  }
  return Object.freeze({schema,htmlDraft,exactDraft,validate});
});
