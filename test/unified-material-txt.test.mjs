import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import '../app/unified-material-txt.js';
import '../app/source-batch-core.js';

// The change under test: the existing batch parser must read the new single TXT,
// without treating headers inside its body as section boundaries.
const human={sourceUrl:'https://example.invalid/post/1',title:'원문 제목',bodyKind:'verbatim',
  body:'첫 줄  \r\n제목- 본문 속 제목\r\n==============================프로그램용 데이터들\r\n끝 문장',
  platformCaptions:{instagram:'게시 제목\n\n실제 결말\n\n#썰 #사연 #학교 #친구',threads:'원문 근거 문안'}};
const prefix='원문링크 - '+human.sourceUrl+'\n제목 - '+human.title+'\n내용 - [원문 그대로]\n'+human.body+
  '\n게시문안 -\n[instagram]\n'+human.platformCaptions.instagram+'\n[threads]\n'+human.platformCaptions.threads+'\n';
const records={source:{schema:'threads-verbatim-source-v1',verbatim:true,title:human.title,body:human.body,
  sourceUrl:human.sourceUrl,comments:[],images:[{order:1,sha256:'a'.repeat(64)}]},
  production:{id:'source-existing',outputVersion:'existing-version',reviewRound:'round-38',provider:{state:'paused',extra:null}},
  review:{score:7,note:'기존 메모',publicationAllowed:false}};
export const fixture={schema:'threads-unified-material-v1',humanPrefixLength:prefix.length,human,records};
export const fixtureText=prefix+'==============================\n프로그램용 데이터들\n'+JSON.stringify(fixture,null,2)+'\n';

test('existing batch parser accepts unified TXT without changing Korean whitespace or body headers',()=>{
  const parsed=globalThis.ThreadsSourceBatchCore.parseExactText('\ufeff'+fixtureText);
  assert.ok(parsed,'new single-TXT format must be recognized');
  assert.equal(parsed.title,human.title);
  assert.equal(parsed.body,human.body);
  assert.equal(parsed.sourceUrl,human.sourceUrl);
  assert.equal(parsed.verbatim,true);
});

test('unified writer roundtrips all existing identity, judgment and unknown provider fields',()=>{
  const C=globalThis.ThreadsUnifiedMaterialTxt;
  assert.equal(typeof C.serialize,'function');
  const output=C.serialize({human,records});
  assert.deepEqual(C.parse(output).records,records);
  assert.deepEqual(C.parse(output).human,human);
  assert.equal(C.parse(output).records.production.reviewRound,'round-38');
});

test('header CRLF and BOM do not normalize original body or captions',()=>{
  const C=globalThis.ThreadsUnifiedMaterialTxt;
  assert.equal(typeof C.serialize,'function');
  const output=C.serialize({human,records},{lineEnding:'\r\n',bom:true});
  assert.ok(output.startsWith('\ufeff원문링크 - '));
  assert.deepEqual(C.parse(output).human,human);
});

test('damaged human prefix, footer and UTF8 bytes fail closed',()=>{
  const C=globalThis.ThreadsUnifiedMaterialTxt;
  assert.throws(()=>C.parse(fixtureText.replace('제목 - 원문 제목','제목 - 다른 제목')),/unified_material_invalid/);
  assert.throws(()=>C.parse(fixtureText.slice(0,-12)),/unified_material_invalid/);
  const bytes=Buffer.from(fixtureText);const at=bytes.indexOf(Buffer.from('끝 문장'));bytes[at]=0xff;
  assert.throws(()=>C.parse(bytes),/unified_material_invalid/);
});

test('explicit summaries remain summaries rather than verbatim production input',()=>{
  const C=globalThis.ThreadsUnifiedMaterialTxt;
  assert.equal(typeof C.serialize,'function');
  const output=C.serialize({human:{...human,bodyKind:'summary'},records});
  assert.equal(globalThis.ThreadsSourceBatchCore.parseExactText(output).verbatim,false);
  assert.match(output,/명시 요약 — 원문 전문 아님/);
});

test('private material and uploader local state roots are ignored before migration',()=>{
  const ignore=fs.readFileSync(new URL('../.gitignore',import.meta.url),'utf8').split(/\r?\n/);
  assert.ok(ignore.includes('/local-private/'));
  assert.ok(ignore.includes('/upload-studio/.local/'));
});

test('public TXT rejects live review/provider records and absolute private paths',()=>{
  const C=globalThis.ThreadsUnifiedMaterialTxt;
  assert.throws(()=>C.serialize({human,records},{visibility:'public'}),/unified_material_public_scope/);
  assert.throws(()=>C.serialize({human,records:{source:{path:'D:\\private\\source.txt'}}},{visibility:'public'}),/unified_material_public_scope/);
  const publicRecords={source:{sourceUrl:human.sourceUrl,publicationAllowed:false},candidate:{originalKey:'existing-filename.md',rights:'unknown'}};
  assert.deepEqual(C.parse(C.serialize({human,records:publicRecords},{visibility:'public'})).records,publicRecords);
});

test('unverified stored source notes are preserved without claiming verbatim or summary provenance',()=>{
  const C=globalThis.ThreadsUnifiedMaterialTxt;
  const output=C.serialize({human:{...human,bodyKind:'preserved'},records});
  assert.match(output,/보존 원문 기록 — 전문·verbatim 미확인/);
  assert.equal(globalThis.ThreadsSourceBatchCore.parseExactText(output).verbatim,false);
});

test('browser production parser keeps comment arrays and rejects summary/source mismatches',()=>{
  const B=globalThis.ThreadsSourceBatchCore,C=globalThis.ThreadsUnifiedMaterialTxt;
  assert.equal(typeof B.parseVerbatimSource,'function');
  const data={human,records:{...records,source:{...records.source,comments:[{text:'댓글  그대로',likes:8,unknown:0}]}}};
  assert.deepEqual(B.parseVerbatimSource(C.serialize(data)),data.records.source);
  assert.throws(()=>B.parseVerbatimSource(C.serialize({...data,human:{...human,bodyKind:'summary'}})),/unified_material_not_verbatim/);
  assert.throws(()=>B.parseVerbatimSource(C.serialize({...data,records:{...records,source:{...records.source,body:'다른 원문'}}})),/unified_material_source_mismatch/);
});

test('legacy BOM text and browser script loading remain compatible',()=>{
  const B=globalThis.ThreadsSourceBatchCore;
  assert.equal(B.parseExactText('\ufeff[TITLE]\r\n원제\r\n[BODY]\r\n본문\r\n[COMMENTS]\r\nNONE\r\n')?.body,'본문\r\n');
  for(const name of ['../app/source-batch.html']){
    const html=fs.readFileSync(new URL(name,import.meta.url),'utf8');
    const at=html.indexOf('unified-material-txt.js');assert.ok(at>=0&&at<html.indexOf('source-batch-core.js'));
  }
});


test('display header uses real title policy without rewriting the original source title',async()=>{
 await import('../app/source-page-plan.js');
 const C=globalThis.ThreadsUnifiedMaterialTxt,P=globalThis.ThreadsPagePlan;
 const raw='[네이트판] [후기] 원문 제목',display=P.titleInfo(raw).displayTitle,source={...records.source,title:raw};
 const prepared={schema:'threads-title-input-v1',originalTitle:raw,displayTitle:display,captionInputTitle:display,sourceUrl:human.sourceUrl};
 const data={human:{...human,title:display},records:{source,titleInput:prepared}},text=C.serialize(data);
 assert.match(text,/제목 - 원문 제목/);
 assert.deepEqual(globalThis.ThreadsSourceBatchCore.parseVerbatimSource(text),source);
 assert.equal(C.parse(text).records.source.title,raw);
 assert.throws(()=>globalThis.ThreadsSourceBatchCore.parseVerbatimSource(C.serialize({...data,human:{...human,title:'임의로 바꾼 원제'}})),/unified_material_title_mismatch/);
 assert.throws(()=>globalThis.ThreadsSourceBatchCore.parseVerbatimSource(C.serialize({...data,records:{source,titleInput:{...prepared,originalTitle:'다른 원제'}}})),/unified_material_title_mismatch/);
});

test('browser source input restores typed HTML bytes without treating saved notes as verbatim',async()=>{
 const {createHash}=await import('node:crypto'),C=globalThis.ThreadsUnifiedMaterialTxt,B=globalThis.ThreadsSourceBatchCore,raw=Buffer.from('\ufeff<html><title>원문 제목</title><body>원래 HTML</body></html>'),sha=createHash('sha256').update(raw).digest('hex'),data={human:{...human,body:'참고 요약',bodyKind:'preserved'},records:{manifest:{id:'existing-source'},sourceDocument:{schema:'threads-source-document-v1',name:'source.html',relativePath:'source/source.html',originalTitle:human.title,sourceUrl:human.sourceUrl,data:raw.toString('base64'),bytes:raw.length,sha256:sha,acquisition:{htmlSha256:sha,contentType:'text/html; charset=utf-8'}}}};
 const doc=await B.parseSourceDocument(C.serialize(data));assert.equal(doc.name,'source.html');assert.deepEqual(Buffer.from(doc.raw),raw);assert.equal(doc.originalTitle,human.title);assert.throws(()=>B.parseVerbatimSource(C.serialize(data)),/not_verbatim/);
 await assert.rejects(B.parseSourceDocument(C.serialize({...data,records:{...data.records,sourceDocument:{...data.records.sourceDocument,data:Buffer.from('changed').toString('base64')}}})),/document_hash/);
 await assert.rejects(B.parseSourceDocument(C.serialize({...data,human:{...data.human,title:'위장'}})),/title_mismatch/);
});
