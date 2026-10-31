(function (root, factory) {
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ThreadsUnifiedMaterialTxt=api;
})(typeof globalThis!=='undefined'?globalThis:this,function () {
  'use strict';
  const SCHEMA='threads-unified-material-v1';
  const DIVIDER='==============================\n프로그램용 데이터들';
  const fail=()=>{throw Object.assign(new Error('unified_material_invalid'),{code:'unified_material_invalid'});};
  function humanPrefix(h,eol='\n'){
    if(!['\n','\r\n'].includes(eol))fail();
    if(!h||typeof h.sourceUrl!=='string'||typeof h.title!=='string'||!h.title.trim()||
      typeof h.body!=='string'||!['verbatim','summary','preserved','unavailable'].includes(h.bodyKind)||
      !h.platformCaptions||Array.isArray(h.platformCaptions)||typeof h.platformCaptions!=='object')fail();
    const label={verbatim:'원문 그대로',summary:'명시 요약 — 원문 전문 아님',preserved:'보존 원문 기록 — 전문·verbatim 미확인',unavailable:'원문 본문 미확보'}[h.bodyKind];
    let prefix='원문링크 - '+h.sourceUrl+eol+'제목 - '+h.title+eol+'내용 - ['+label+']'+eol+h.body+eol+'게시문안 -'+eol;
    for(const [platform,caption] of Object.entries(h.platformCaptions)){
      if(!/^[a-z][a-z0-9_-]*$/.test(platform)||typeof caption!=='string')fail();
      prefix+='['+platform+']'+eol+caption+eol;
    }
    return prefix;
  }
  function isUnifiedText(value){return /^\ufeff?원문링크 - /.test(String(value));}
  function jsonValue(value){
    if(value===null||typeof value==='string'||typeof value==='boolean')return;
    if(typeof value==='number'&&Number.isFinite(value))return;
    if(!value||typeof value!=='object')fail();
    if(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype)fail();
    for(const x of Object.values(value))jsonValue(x);
  }
  function publicScope(value){
    const forbidden=()=>{throw Object.assign(new Error('unified_material_public_scope'),{code:'unified_material_public_scope'});};
    if(Object.keys(value.records).some(key=>!['source','candidate','caption'].includes(key)))forbidden();
    const visit=x=>{
      if(typeof x==='string'&&/^(?:[A-Za-z]:[\\/]|\\\\|\/(?:Users|home|mnt|tmp|private|var)\/)/.test(x))forbidden();
      if(x&&typeof x==='object')for(const [key,v] of Object.entries(x)){
        if(/(?:password|token|secret|credential|cookie|provider|evaluation|review|authorization|delivery[_-]?log)/i.test(key))forbidden();
        visit(v);
      }
    };
    visit(value);
  }
  function serialize(value,{lineEnding='\n',bom=false,visibility='private'}={}){
    jsonValue(value);
    if(!value.records||Array.isArray(value.records)||typeof value.records!=='object')fail();
    const prefix=humanPrefix(value.human,lineEnding);
    if(!['private','public'].includes(visibility))fail();
    const data={...value,schema:SCHEMA,visibility,lineEnding,humanPrefixLength:prefix.length};
    if(visibility==='public')publicScope(data);
    return (bom?'\ufeff':'')+prefix+DIVIDER.replace('\n',lineEnding)+lineEnding+JSON.stringify(data,null,2)+lineEnding;
  }
  function parse(value){
    let text;try{text=(value instanceof Uint8Array?new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(value):String(value)).replace(/^\ufeff/,'');}catch{fail();}
    if(!isUnifiedText(text))return null;
    // Try only line-boundary candidates. JSON is validated against the *entire*
    // human prefix, not a regex over headings that can also occur in the source.
    const candidates=[...text.matchAll(/(?:^|\r?\n)==============================\r?\n프로그램용 데이터들\r?\n/g)].reverse();
    for(const candidate of candidates){
      const at=candidate.index,contentAt=at+candidate[0].length;
      let data;try{data=JSON.parse(text.slice(contentAt));}catch{continue;}
      if(data?.schema!==SCHEMA||!Number.isInteger(data.humanPrefixLength)||
        !data.records||Array.isArray(data.records)||typeof data.records!=='object')fail();
      const eol=data.lineEnding||'\n',prefix=humanPrefix(data.human,eol);
      const separatorAt=at+(text[at]==='\r'?2:text[at]==='\n'?1:0);
      if(data.humanPrefixLength!==prefix.length||separatorAt!==prefix.length||text.slice(0,separatorAt)!==prefix)fail();
      if(data.visibility&&!['private','public'].includes(data.visibility))fail();
      if(data.visibility==='public')publicScope(data);
      return data;
    }
    fail();
  }
  function verbatimSource(data,titlePolicy=globalThis.ThreadsPagePlan?.titleInfo){
    existingId(data);
    if(data.human.bodyKind!=='verbatim')throw Object.assign(new Error('unified_material_not_verbatim'),{code:'unified_material_not_verbatim'});
    const source=data.records.source;
    if(!source||source.schema!=='threads-verbatim-source-v1'||source.verbatim!==true||typeof source.body!=='string'||!source.body.trim()||typeof source.title!=='string'||!source.title.trim()||
      source.body!==data.human.body||(source.sourceUrl||'')!==data.human.sourceUrl)
      throw Object.assign(new Error('unified_material_source_mismatch'),{code:'unified_material_source_mismatch'});
    const info=typeof titlePolicy==='function'?titlePolicy(source.title):null;
    const title=data.records.titleInput;
    if((info?info.displayTitle!==data.human.title:source.title!==data.human.title)||
      (title&&(title.schema!=='threads-title-input-v1'||title.originalTitle!==source.title||title.displayTitle!==data.human.title||title.captionInputTitle!==data.human.title||title.sourceUrl!==(source.sourceUrl||''))))
      throw Object.assign(new Error('unified_material_title_mismatch'),{code:'unified_material_title_mismatch'});
    return source;
  }
  function existingId(data){
    const ids=[data.records.manifest?.id,data.records.source?.intake?.id,data.records.source?.id,data.records.approvedBinding?.postId].filter(x=>x!==undefined&&x!==null&&x!=='');
    if(new Set(ids).size>1)throw new Error('unified_material_id_conflict');
    const id=ids[0]||'';
    if(id&&(typeof id!=='string'||!/^[-\w.]{1,200}$/.test(id)))throw new Error('unified_material_id_invalid');
    const prepared=data.records.preparedInput;
    if(prepared){
      if(prepared.schema!=='threads-prepared-input-v1'||prepared.sourceId!==id||prepared.postId!==id||!/^[a-f0-9]{64}$/.test(prepared.fingerprint||'')||prepared.id!==id+'-'+prepared.fingerprint.slice(0,16))throw new Error('unified_material_id_conflict');
      return prepared.id;
    }
    return id;
  }
  function sourceDocument(data,titlePolicy=globalThis.ThreadsPagePlan?.titleInfo){
    existingId(data);const doc=data.records.sourceDocument,invalid=()=>{throw new Error('unified_material_document_invalid');};
    if(!doc||doc.schema!=='threads-source-document-v1'||doc.name!=='source.html'||doc.relativePath!=='source/source.html'||data.records.source||data.human.bodyKind==='verbatim'||
      typeof doc.originalTitle!=='string'||!doc.originalTitle.trim()||doc.sourceUrl!==data.human.sourceUrl||typeof doc.data!=='string'||!doc.data.length||doc.data.length>7*1024*1024||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(doc.data)||doc.data.length%4!==0||!Number.isInteger(doc.bytes)||doc.bytes<1||doc.bytes>5*1024*1024||!/^[a-f0-9]{64}$/.test(doc.sha256||''))invalid();
    const display=typeof titlePolicy==='function'?titlePolicy(doc.originalTitle).displayTitle:doc.originalTitle;
    if(display!==data.human.title||data.records.manifest?.title&&data.records.manifest.title!==doc.originalTitle)throw new Error('unified_material_title_mismatch');
    if(doc.acquisition?.htmlSha256&&doc.acquisition.htmlSha256!==doc.sha256)invalid();
    return doc;
  }
  async function documentBytes(data,titlePolicy){
    const doc=sourceDocument(data,titlePolicy),bytes=Uint8Array.from(atob(doc.data),c=>c.charCodeAt(0));
    const digest=[...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    if(bytes.length!==doc.bytes||digest!==doc.sha256)throw new Error('unified_material_document_hash_mismatch');return bytes;
  }
  return Object.freeze({SCHEMA,DIVIDER,isUnifiedText,parse,serialize,humanPrefix,verbatimSource,existingId,sourceDocument,documentBytes});
});
