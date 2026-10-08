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
const cropInput={originalTitle:'사진 흐름',segments:[readingSource],comments:[],editorial:{templateId:'white_title',transcriptions:{capture:{mediaName:'source.jpg',sha256:sourceSha,verifiedBy:'manual_visual_two_pass',segments:[{kind:'image',mediaName:'source.jpg'},{kind:'image',mediaName:'source.jpg'},{kind:'image',mediaName:'source.jpg'}]}},regions:{'capture-transcribed-0':{x:0,y:0,width:800,height:300},'capture-transcribed-1':{x:0,y:400,width:800,height:300},'capture-transcribed-2':{x:0,y:400,width:800,height:300}}}};
const photoSequence=P.compile(cropInput,verifiedDimensions,measure);
const intactTable=P.compile({...cropInput,editorial:{...cropInput.editorial,transcriptions:{capture:{...cropInput.editorial.transcriptions.capture,segments:[{kind:'image',mediaName:'source.jpg'}]}},regions:{'capture-transcribed-0':{x:0,y:0,width:133,height:245}},imageRoles:{'capture-transcribed-0':'reading'},imageFit:{'capture-transcribed-0':'contain'}}},verifiedDimensions,measure);
const tableImages=intactTable.pages.flatMap(p=>p.operations).filter(o=>o.kind==='image');
assert.equal(tableImages.length,1,'An explicitly intact table must survive without unsafe splitting');
assert.equal(tableImages[0].sourceHeight,245);
assert.equal(tableImages[0].sourceWidth,133);
assert(tableImages[0].y+tableImages[0].height<=1350-72);
assert.deepEqual(photoSequence.pages.flatMap(p=>p.operations).filter(o=>o.kind==='image').map(o=>o.sourceY),[0,400],'Different actual frames from one original survive; duplicate frame is omitted');
assert(photoSequence.omitted.some(o=>o.sourceId==='capture-transcribed-2'&&o.reason==='duplicate_image'));
const cleanedFooter=P.compile({originalTitle:'사연',segments:[{id:'story',kind:'text',selected:true,text:'끝까지 남기는 실제 결말.\n\n원문 출처 (삭제됨)'},{id:'bullets',kind:'text',selected:true,text:'•\n•'}],comments:[]},{},measure);
assert(cleanedFooter.pages.flatMap(p=>p.operations).some(o=>o.text?.includes('실제 결말')));
assert(!cleanedFooter.pages.flatMap(p=>p.operations).some(o=>o.text?.includes('삭제됨')||o.text==='•'));
assert(cleanedFooter.omitted.some(o=>o.sourceId==='story'&&o.reason==='display_metadata'));
assert(cleanedFooter.omitted.some(o=>o.sourceId==='bullets'&&o.reason==='empty_bullets'));
const verified=P.compile(verifiedInput,verifiedDimensions,measure),verifiedOps=verified.pages.flatMap(p=>p.operations);
assert.equal(verified.selectedComments.length,2);
assert.equal(verified.selectedComments[1].contentRole,'author_reply');
assert.equal(verified.selectedComments[0].location.sha256,sourceSha);
assert(verifiedOps.some(o=>o.text==='글쓴이'));
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
assert.equal(P.headline('개 한번도 안 키워본 원덬이 친구 강아지 일주일간 돌본 후기'),'개 한번도 안 키워본 원덬이 친구 강아지 일주일간 돌본 후기','Only site labels may be hidden; source title content survives');
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
assert(explained.pages.flatMap(p=>p.operations).some(o=>o.role==='note'&&o.text?.includes('용어 설명')));assert.equal(explained.editorialAnnotations[0].actualSourceComment,false);
assert.throws(()=>P.compile({...textPlan,editorial:{annotations:[{kind:'explanation',text:'근거 없는 설명'}]}},{},measure),/근거/);
assert.equal(text.pages[0].background,"#fff");

const linkMetadata=P.compile({originalTitle:'검수 제목',segments:[{id:'links',kind:'text',selected:true,text:'보존할 여행 본문입니다.\n(런던 : https://example.com/travel)\n원문 출처 https://example.com/old (삭제됨)'}],comments:[]},{},measure);
const visibleLinkText=linkMetadata.pages.flatMap(p=>p.operations).filter(o=>o.kind==='text').map(o=>o.text).join('');
assert(visibleLinkText.includes('보존할 여행 본문입니다.'));
assert(!visibleLinkText.includes('런던 :')&&!visibleLinkText.includes('(삭제됨)'),'Remove empty linked labels and deleted-source footers after URL stripping');
for(const heading of ['1-5. 촬영','A2','[추가 후기]','<구매 팁>','>발단','++추가','6.','■ 시간도 돈도 반반인 계약 부부의 일상']){
 const grouped=P.compile({originalTitle:'검수 제목',segments:[
 {id:'lead',kind:'text',selected:true,text:('앞쪽 본문입니다. ').repeat(14)},
 {id:'heading',kind:'text',selected:true,text:heading},
 {id:'body',kind:'text',selected:true,text:'이어지는 첫 문장을 보존합니다. '+('다음 내용은 원문에서 왔습니다. ').repeat(12)}],comments:[]},{},measure);
 const page=grouped.pages.find(p=>p.operations.some(o=>o.sourceId==='heading'));
 assert(page.operations.some(o=>o.sourceId==='body'),'Heading must share a page with its actual next source unit: '+heading);
 assert(grouped.sourceUnits.some(u=>u.id==='heading')&&grouped.sourceUnits.some(u=>u.id==='body'),'Keep original source IDs separate');
}
assert.throws(()=>P.compile({originalTitle:'검수',segments:[{id:'a',kind:'text',selected:true,text:'본문'}],editorial:{keepHeadingTexts:['x'.repeat(181)]}},{},measure),/소제목/);

const commentUi=P.compile({originalTitle:'댓글 사례',segments:[{id:'header',kind:'text',selected:true,text:'38. 무명의 더쿠 2025-12-08 23:51:19'},{id:'body',kind:'text',selected:true,text:'실제 댓글의 본문만 남깁니다.'}],comments:[]},{},measure);
assert(commentUi.omitted.some(o=>o.sourceId==='header'&&o.reason==='display_metadata'));
assert(commentUi.sourceUnits.some(o=>o.id==='body'));

const extraLabel=P.compile({originalTitle:'캡처와 웹 덧붙임',segments:[{id:'capture',kind:'text',selected:true,text:'캡처 속 원문 본문'},{id:'extra',kind:'text',selected:true,text:'웹 원문에 실제 있는 덧붙임'}],editorial:{sourceLabels:{extra:'원문 덧붙임'}}},{},measure);
assert.equal(extraLabel.sourceUnits.find(u=>u.id==='extra').text,'웹 원문에 실제 있는 덧붙임');
const labelledPage=extraLabel.pages.find(p=>p.operations.some(o=>o.role==='editorial_label'));
assert(labelledPage.operations.some(o=>o.sourceId==='extra'&&o.role==='body'),'A source label must share its page with its actual body');
assert.throws(()=>P.compile({originalTitle:'캡처',segments:[{id:'a',kind:'text',selected:true,text:'본문'}],editorial:{sourceLabels:{a:'가짜 인기 댓글'}}},{},measure),/덧붙임/);

const bestWithoutCount=P.compile({...verifiedInput,editorial:{...verifiedEditorial,transcriptions:{capture:{...verifiedEditorial.transcriptions.capture,segments:[{kind:'text',text:'실제 본문'},{kind:'comment',text:'원본에 베플 표시가 있고 숫자는 없는 실제 댓글',visibleBest:true,visibleLikes:null}]}}}},verifiedDimensions,measure);
assert(bestWithoutCount.pages.flatMap(p=>p.operations).some(o=>o.role==='comment'));
const bestMeta=bestWithoutCount.selectedComments.find(c=>c.text.includes('원본에 베플'));
assert.equal(bestMeta.visibleLikes,null);assert.equal(bestMeta.visibleBest,true);
assert.throws(()=>P.compile({...verifiedInput,editorial:{...verifiedEditorial,transcriptions:{capture:{...verifiedEditorial.transcriptions.capture,segments:[{kind:'comment',text:'근거 없는 인기 댓글',visibleLikes:null}]}}}},verifiedDimensions,measure),/베플/);

const spacedHead=P.compile({originalTitle:'공백 소제목',segments:[{id:'story',kind:'text',selected:true,text:('앞 문장입니다. ').repeat(24)+'\n\n그외의 남자들\n\n진지하게 만날려고 하는 사람들도 있음'}],editorial:{keepHeadingTexts:['그외의 남자들 ']}},{},measure);
const headPage=spacedHead.pages.find(p=>p.operations.some(o=>o.text==='그외의 남자들'));
assert(headPage.operations.some(o=>o.text?.includes('진지하게')),'Trailing source whitespace must not defeat heading protection');
for(let n=3;n<18;n++){
 const bodyA=('첫 항목 내용 '.repeat(n))+'끝';
 const grouped=P.compile({originalTitle:'번호 항목',segments:[{id:'story',kind:'text',selected:true,text:'1. 첫 항목\n\n'+bodyA+'\n\n2. 둘째 항목\n\n둘째 항목 실제 설명입니다. 더 긴 설명을 잇습니다.'}]},{},measure);
 const second=grouped.pages.find(p=>p.operations.some(o=>o.text==='2. 둘째 항목'));
 assert(second.operations.some(o=>o.text?.includes('둘째 항목 실제 설명')),'The previous protected item must not absorb the next heading');
}
const bareLink=P.compile({originalTitle:'출처 보존',segments:[{id:'url',kind:'text',selected:true,text:'pann.nate.com/talk/338179867'},{id:'body',kind:'text',selected:true,text:'시누이가 개사이다'},{id:'domain',kind:'text',selected:true,text:'example.com은 실제 서비스 이름입니다.'}]},{},measure);
assert(!bareLink.sourceUnits.some(u=>u.id==='url'));
assert(bareLink.omitted.some(o=>o.sourceId==='url'&&o.reason==='source_urls_in_metadata'));
assert(bareLink.sourceUnits.some(u=>u.text==='시누이가 개사이다')&&bareLink.sourceUnits.some(u=>u.id==='domain'));
const cropCover=P.compile({...cropInput,editorial:{...cropInput.editorial,templateId:'photo_cover',coverPresentation:'panel',coverSegmentId:'capture-transcribed-0',imageRoles:{'capture-transcribed-0':'photo'},regions:{'capture-transcribed-0':{x:0,y:0,width:800,height:300},'capture-transcribed-1':{x:0,y:400,width:800,height:300},'capture-transcribed-2':{x:0,y:400,width:800,height:300}}}},verifiedDimensions,measure);
assert.equal(cropCover.pages[0].operations.find(o=>o.kind==='image').sourceHeight,300,'Cover must use the verified photo region');
assert(cropCover.pages.slice(1).flatMap(p=>p.operations).some(o=>o.kind==='image'&&o.sourceY===400),'Another verified region of the same file must survive cover dedup');
const headingPicture=P.compile({originalTitle:'결말',segments:[{id:'lead',kind:'text',selected:true,text:('앞 문장입니다. ').repeat(22)},{id:'head',kind:'text',selected:true,text:'결말'},{id:'image',kind:'image',mediaName:'source.jpg',selected:true}],editorial:{templateId:'mint_text',keepHeadingTexts:['결말'],imageRoles:{image:'reading'},imageFit:{image:'contain'}}},verifiedDimensions,measure);
const pictureHead=headingPicture.pages.find(p=>p.operations.some(o=>o.sourceId==='head'));
assert(pictureHead.operations.some(o=>o.kind==='image'&&o.sourceId==='image'),'Heading and contained source picture must share a page');

// Heading protection must consume the opening sentence in the original paragraph's coordinate system.
for(const indentation of ['   ','\t','    \t']){
 const originalText='1. Heading\n\n'+indentation+'Opening sentence ends here. Remaining sentence must appear once.';
 const indented=P.compile({originalTitle:'Heading indentation',segments:[{id:'indented',kind:'text',selected:true,text:originalText}],comments:[],editorial:{templateId:'mint_text'}},{},measure);
 const rendered=indented.pages.flatMap(page=>page.operations).filter(op=>op.role==='body'&&op.sourceId==='indented').map(op=>op.text).join('');
 assert.equal(rendered.replace(/\s/g,''),originalText.replace(/\s/g,''),'Protecting an indented opening sentence must not duplicate its final characters');
}
