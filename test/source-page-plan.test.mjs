import assert from 'node:assert/strict';
import '../app/source-page-plan.js';
const P=globalThis.ThreadsPagePlan;
const measure=(text,size)=>Array.from(text).length*size;
const photo={id:'photo',kind:'image',mediaName:'a.jpg',selected:true};
const base={originalTitle:'야간 편돌이 담배 도둑맞은 썰',coverTitle:'야간 편돌이 담배 도둑맞은 썰',cover:{segmentId:'photo'},segments:[photo],comments:[]};
const wide=P.compile(base,{'a.jpg':{width:1600,height:600}},measure);
assert.equal(wide.pages.length,1);
assert(wide.pages[0].height<1000);
assert.equal(wide.pages[0].operations.filter(o=>o.role==='title').length,2);
assert(wide.pages[0].operations.every(o=>o.y>=64));
assert(wide.omitted.some(o=>o.reason==='already_shown_in_cover'));
const tall=P.compile(base,{'a.jpg':{width:1000,height:3500,analysis:{kind:'screenshot',breakRows:[{y:1100},{y:2200},{y:3300}]}}},measure);
assert.throws(()=>P.compile(base,{'a.jpg':{width:1000,height:3500,analysis:{kind:'screenshot'}}},measure),/안전한 이미지 분할 경계/);
const slices=tall.pages.flatMap(p=>p.operations).filter(o=>o.sourceHeight);
assert.equal(slices.reduce((n,o)=>n+o.sourceHeight,0),3500);
assert.equal(slices[0].sourceY,0);
assert.equal(slices.at(-1).sourceY+slices.at(-1).sourceHeight,3500);
for(const page of tall.pages){assert(page.height<=1350);if(page.role!=='cover')assert(page.bottomWhitespace<=120);}
const body='첫 원문 문장입니다.\n\n두 번째 문장도 보존합니다.';
const textPlan={...base,coverTitle:'원문 제목',cover:{segmentId:'intro'},segments:[
 {id:'intro',kind:'text',text:body,selected:true},
 {id:'url',kind:'text',text:'https://example.com/source',selected:true},
 {id:'duplicate',kind:'text',text:body,selected:true}],comments:[]};
const text=P.compile(textPlan,{},measure);
assert(text.omitted.some(o=>o.reason==='source_urls_in_metadata'));
const mixed=P.compile({...textPlan,segments:[{id:'intro',kind:'text',selected:true,text:'원문 문장\nhttps://example.com/reference\n다음 원문 문장'}]}, {},measure);
assert(!mixed.pages.flatMap(p=>p.operations).some(o=>/https?:/.test(o.text||'')));
assert(text.omitted.some(o=>o.reason==='duplicate_text'));
assert(!text.pages.flatMap(p=>p.operations).some(o=>/https:/.test(o.text||'')));
assert.equal(textPlan.segments[0].text,body);
assert.equal(text.publicationAllowed,false);assert.equal(text.publicationStatus,'unknown');
assert.equal(P.headline('개 한번도 안 키워본 원덬이 친구 강아지 일주일간 돌본 후기'),'친구 강아지 일주일간 돌본 후기');
assert.throws(()=>P.compile(base,{},measure),/이미지 파일 누락/);
console.log('Source page plan: safe title, adaptive wide image, complete tall slices, links, duplicate audit and source preservation PASS');
