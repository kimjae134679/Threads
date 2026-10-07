import assert from 'node:assert/strict';
import '../app/source-page-plan.js';
const P=globalThis.ThreadsPagePlan;
const measure=(text,size)=>Array.from(text).length*size;
const sourceSha='a'.repeat(64),readingSource={id:'capture',kind:'image',mediaName:'source.jpg',selected:true};
const verifiedEditorial={templateId:'mint_text',transcriptions:{capture:{mediaName:'source.jpg',sha256:sourceSha,verifiedBy:'manual_visual_two_pass',segments:[
 {kind:'text',text:'원본 첫 문단입니다.\n\n원본 마지막 문단입니다.'},
 {kind:'comment',text:'실제 댓글 내용',visibleLikes:19},
 {kind:'author_reply',text:'작성자의 후속 답변',visibleLikes:10}]}}};
const verifiedInput={originalTitle:'원본 제목',segments:[readingSource],comments:[],editorial:verifiedEditorial};
const verifiedDimensions={'source.jpg':{width:800,height:1200,sha256:sourceSha}};
const verified=P.compile(verifiedInput,verifiedDimensions,measure),verifiedOps=verified.pages.flatMap(p=>p.operations);
assert.equal(verified.selectedComments.length,2);
assert.equal(verified.selectedComments[1].contentRole,'author_reply');
assert.equal(verified.selectedComments[0].location.sha256,sourceSha);
assert(verifiedOps.some(o=>o.text==='작성자 답글'));
assert(verifiedOps.findIndex(o=>o.text?.includes('원본 마지막 문단'))<verifiedOps.findIndex(o=>o.text==='실제 댓글 내용'));
assert(!verifiedOps.some(o=>o.kind==='image'),'Verified body is typeset without captured metadata');
assert.throws(()=>P.compile(verifiedInput,{'source.jpg':{...verifiedDimensions['source.jpg'],sha256:'b'.repeat(64)}},measure),/전사 원본 이미지/);
assert.throws(()=>P.compile({...verifiedInput,editorial:{transcriptions:{missing:verifiedEditorial.transcriptions.capture}}},verifiedDimensions,measure),/전사 대상/);
const unselected=P.compile({...verifiedInput,segments:[{...readingSource,selected:false},{id:'body',kind:'text',selected:true,text:'선택한 본문만 표시'}]},verifiedDimensions,measure);
assert.equal(unselected.selectedComments.length,0,'Unselected image never supplies selected comments');
const roleOverride=P.compile({originalTitle:'설명 그림',segments:[readingSource,{id:'emoji',kind:'text',selected:true,text:'👀..'}],comments:[],editorial:{imageRoles:{capture:'reading'},templateId:'white_title'}},verifiedDimensions,measure);
assert.equal(roleOverride.templateId,'white_title');
assert.equal(roleOverride.pages[0].background,'#fff');
assert(roleOverride.omitted.some(o=>o.sourceId==='emoji'&&o.reason==='isolated_filler_reaction'));
assert(roleOverride.pages.flatMap(p=>p.operations).some(o=>o.kind==='image'),'Reading image remains in the story');
const numbered=P.compile({originalTitle:'번호가 있는 원문',segments:[{id:'long',kind:'text',selected:true,text:'서론 문장입니다.\n'.repeat(13)+'\n1. 다음 사건\n\n이 소제목에 이어지는 실제 본문입니다.'}],comments:[],editorial:{templateId:'mint_text'}},{},measure);
const headingPage=numbered.pages.find(p=>p.operations.some(o=>o.text==='1. 다음 사건'));
assert(headingPage.operations.filter(o=>o.text).map(o=>o.text).join('').includes('이어지는 실제본문'),'Short numbered heading stays with its following paragraph');
const photo={id:'photo',kind:'image',mediaName:'a.jpg',selected:true};
const longFollowing=P.compile({originalTitle:'긴 문단 소제목',segments:[{id:'body',kind:'text',selected:true,text:'서론입니다.\n'.repeat(13)+'\n5. 학벌이 중요하다\n\n첫 문장을 함께 보존합니다. '+('뒤의 긴 본문입니다. '.repeat(100))}],comments:[],editorial:{templateId:'mint_text',keepLongHeadingsWithNext:true}},{},measure);
const longHeadingPage=longFollowing.pages.find(p=>p.operations.some(o=>o.text==='5. 학벌이 중요하다'));
assert(longHeadingPage.operations.filter(o=>o.text).map(o=>o.text).join('').replace(/\s/g,'').includes('첫문장을함께보존합니다.'),'Long paragraph heading stays with its first sentence');
assert.equal(longFollowing.pages.flatMap(p=>p.operations).filter(o=>o.text?.includes('뒤의')).length>0,true,'Remaining body survives heading grouping');
const base={originalTitle:'야간 편돌이 담배 도둑맞은 썰',coverTitle:'야간 편돌이 담배 도둑맞은 썰',cover:{segmentId:'photo'},segments:[photo],comments:[]};
const wide=P.compile(base,{'a.jpg':{width:1600,height:600}},measure);
assert.equal(wide.pages.length,1);
assert(wide.pages[0].height<1000);
assert.equal(wide.pages[0].operations.filter(o=>o.role==='title').length,2);
assert(wide.pages[0].operations.filter(o=>o.kind==='text').every(o=>o.y>=64));
assert.equal(wide.pages[0].operations[0].x,0,'Wide photos use the full card width without cropping');
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

const explicit=P.compile({...textPlan,editorial:{templateId:'mint_text',coverTitle:'원문 제목',coverLines:['원문','제목'],titleHighlights:['제목']}}, {},measure);
assert.deepEqual(explicit.pages[0].operations.filter(o=>o.role==='title').map(o=>o.text),['원문','제목']);
assert.deepEqual(explicit.pages[0].operations.filter(o=>o.role==='title')[1].highlights,['제목']);
assert.throws(()=>P.compile({...textPlan,editorial:{coverLines:['원문']}},{},measure),/모든 글자/);
assert.throws(()=>P.compile({...textPlan,editorial:{titleHighlights:['없는 사실']}},{},measure),/제목 안/);
const longTitle='아주 긴 원문 제목의 뒷부분에도 중요한 반전이 있어서 이 부분을 마음대로 자르면 안 됩니다';
assert.equal(P.headline(longTitle),longTitle);
const chart=P.compile({...base,coverTitle:'돈관리 유형'},{'a.jpg':{width:700,height:467,analysis:{kind:'photo',textBands:4}}},measure);
assert.equal(chart.templateId,'screenshot');assert(chart.pages[0].operations.every(o=>o.kind!=='image'));assert(chart.pages.slice(1).flatMap(p=>p.operations).some(o=>o.kind==='image'));assert(!chart.omitted.some(o=>o.reason==='already_shown_in_cover'));

const caption=P.compile({...base,segments:[photo,{...photo,id:'second',mediaName:'b.jpg'},{id:'caption',kind:'text',text:'원문 사진 설명',selected:true}]},{'a.jpg':{width:800,height:600,analysis:{kind:'photo'}},'b.jpg':{width:800,height:1067,analysis:{kind:'photo'}}},measure);
assert.equal(caption.pages.length,2);assert(caption.pages[1].operations.some(o=>o.sourceId==='caption'));
const excluded=P.compile({...textPlan,editorial:{exclusions:{duplicate:'원문과 완전히 같은 반복 문단'}}},{},measure);
assert(excluded.omitted.some(o=>o.sourceId==='duplicate'&&o.reason==='explicit_editorial_exclusion'));
assert.throws(()=>P.compile({...textPlan,editorial:{exclusions:{absent:'없는 이미지'}}},{},measure),/제외할 원문/);

const panel=P.compile({...base,editorial:{templateId:"photo_cover",coverPresentation:"panel",titleHighlights:["담배"]}},{"a.jpg":{width:700,height:467,analysis:{kind:"screenshot",textBands:4}}},measure);
assert.equal(panel.templateId,'screenshot');assert.equal(panel.pages[0].background,"#B8DCD4");
assert(panel.pages.slice(1).flatMap(p=>p.operations).some(o=>o.sourceId==='photo'&&o.sourceHeight===467));
const noFiller=P.compile({...base,segments:[photo,{id:'filler',kind:'text',selected:true,text:'헉'},{id:'real',kind:'text',selected:true,text:'본문에 실제로 있는 설명을 그대로 보존합니다.\n원문 출처(삭제됨): https://example.com'}]}, {'a.jpg':{width:800,height:753,analysis:{kind:'screenshot',textBands:4}}},measure);
assert(noFiller.omitted.some(o=>o.reason==='isolated_filler_reaction'));assert(noFiller.pages.flatMap(p=>p.operations).some(o=>o.text?.includes('실제로 있는 설명')));
const explained=P.compile({...textPlan,editorial:{annotations:[{kind:'explanation',text:'독자를 위한 용어 설명',evidenceUrl:'https://example.com/official'}]}},{},measure);
assert(explained.pages.flatMap(p=>p.operations).some(o=>o.role==='note'&&o.text.includes('용어 설명')));assert.equal(explained.editorialAnnotations[0].actualSourceComment,false);
assert.throws(()=>P.compile({...textPlan,editorial:{annotations:[{kind:'explanation',text:'근거 없는 설명'}]}},{},measure),/근거/);
assert.equal(text.pages[0].background,"#fff");
