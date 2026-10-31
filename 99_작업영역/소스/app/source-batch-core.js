(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ThreadsSourceBatchCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function rankPopular(comments, limit = 5) {
    return (Array.isArray(comments) ? comments : [])
      .map((c, i) => ({ text: String(c.text || ''), likes: Number(c.likes), best: c.best === true,
        sourceOrder: Number.isInteger(c.sourceOrder) ? c.sourceOrder : i }))
      .filter(c => c.text.trim() && (Number.isFinite(c.likes) && c.likes > 0 || c.best))
      .sort((a, b) => Number(b.best) - Number(a.best) || (Number.isFinite(b.likes) ? b.likes : 0) -
        (Number.isFinite(a.likes) ? a.likes : 0) || a.sourceOrder - b.sourceOrder).slice(0, limit);
  }
  function classifyPath(path) {
    const p = String(path).replaceAll('\\', '/');
    if (/\/_TEMP_TEST_ONLY_DO_NOT_PUBLISH\//.test('/' + p)) return 'test_only';
    if (/\/candidate_batches\//.test('/' + p)) return 'generated_batch';
    if (/\/jev_results\//.test('/' + p)) return 'jev_evaluation';
    if (/\/candidate_bundles\//.test('/' + p)) return 'canonical_or_legacy_bundle';
    if (/\/source-packages\//.test('/' + p)) return 'source_package';
    if (/\/candidates\//.test('/' + p)) return 'legacy_candidate';
    return 'other';
  }
  function status(record) {
    if (record?.excludedSevere) return 'excluded_severe';
    if (!record || !record.title || !record.body) return 'needs_source';
    if (!record.exactText) return 'needs_verbatim_check';
    if ((record.missingMedia || []).length) return 'needs_media';
    if (record.commentStatus === 'unknown') return 'needs_comment_check';
    if (record.commentCount > 0 && !record.popularComments?.length) return 'needs_comment_ranking';
    if (!record.renderedPages || record.renderedPages < 1) return 'ready_to_render';
    return 'converted';
  }
  function severeScreen(record, comfortScan) {
    const text = [record?.body || '', ...(record?.popularComments || []).map(c => c.text || '')].join('\n');
    const scan = comfortScan({ title: record?.title || '', note: text });
    const reasons = (scan.categories || []).filter(c => c.severity === 'block').map(c => c.label || c.id);
    return { excluded: reasons.length > 0, reasons };
  }
  function splitBody(body) {
    const text = String(body);
    const result = [], pattern = /^\[IMAGE:([^\]\r\n]+)\](?:\r?\n|$)/gm;
    let position = 0, match;
    while ((match = pattern.exec(text))) {
      if (match.index > position) result.push({ type: 'text', value: text.slice(position, match.index) });
      result.push({ type: 'image', value: match[1] });
      position = pattern.lastIndex;
    }
    if (position < text.length) result.push({ type: 'text', value: text.slice(position) });
    return result;
  }
  function parseExactText(text) {
    if(globalThis.ThreadsUnifiedMaterialTxt?.isUnifiedText(text)){
      const data=globalThis.ThreadsUnifiedMaterialTxt.parse(text),h=data.human;
      return {title:h.title,body:h.body,sourceUrl:h.sourceUrl,
        verbatim:h.bodyKind==='verbatim',comments:data.records.source?.comments||'',unifiedMaterial:data};
    }
    const source = String(text).replace(/^\ufeff/,''), title = /^\[TITLE\]\r?\n/.exec(source);
    if (!title) return null;
    const body = /^\[BODY\]\r?\n/gm, comments = /^\[COMMENTS\]\r?\n/gm;
    body.lastIndex = title[0].length;
    const b = body.exec(source); if (!b) return null;
    comments.lastIndex = body.lastIndex; const c = comments.exec(source);
    return { title: source.slice(title[0].length, b.index).replace(/\r?\n$/, ''),
      body: source.slice(body.lastIndex, c ? c.index : undefined),
      comments: c ? source.slice(comments.lastIndex) : '' };
  }
  function parseVerbatimSource(text){
    const codec=globalThis.ThreadsUnifiedMaterialTxt;
    if(codec?.isUnifiedText(text))return codec.verbatimSource(codec.parse(text));
    const data=parseExactText(text);
    if(!data)throw new Error('정확한 [TITLE]·[BODY] 원문 TXT가 필요합니다.');
    const comments=data.comments.trim()==='NONE'?[]:data.comments.split(/\r?\n/).flatMap((line,i)=>{
      const match=/^\[\+(\d+)\] (.+)$/.exec(line);return match?[{text:match[2],likes:Number(match[1]),sourceOrder:i}]:[];
    });
    return {schema:'threads-verbatim-source-v1',verbatim:true,title:data.title,body:data.body,comments};
  }
  async function parseSourceDocument(text){
    const codec=globalThis.ThreadsUnifiedMaterialTxt;if(!codec?.isUnifiedText(text))return null;
    const data=codec.parse(text);if(!data.records.sourceDocument)return null;
    const doc=codec.sourceDocument(data),raw=await codec.documentBytes(data);return{...doc,raw,unifiedMaterial:data};
  }
  return Object.freeze({ rankPopular, classifyPath, status, severeScreen, splitBody, parseExactText,parseVerbatimSource,parseSourceDocument });
});
