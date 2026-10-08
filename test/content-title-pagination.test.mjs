import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../app/source-page-plan.js';
import '../app/universal-production-model.js';
const P=globalThis.ThreadsPagePlan,U=globalThis.ThreadsUniversalProductionModel;
const {squareCoverHtml}=createRequire(import.meta.url)('../desktop/square-cover.cjs');
const {coverHtml}=createRequire(import.meta.url)('../desktop/universal-cover.cjs');
const measure=(text,size)=>Array.from(text).length*size*.6;
const cases=[
 ['(네이트판) 친구 결혼식 이야기','친구 결혼식 이야기'],
 ['[네이트판] 친구 결혼식 이야기','친구 결혼식 이야기'],
 ['돈많은 시부모한테는 기어야 하나요? (네이트판)','돈많은 시부모한테는 기어야 하나요?'],
 ['(사이다!) 원덬이 친구 이야기.jpg','(사이다!) 원덬이 친구 이야기.jpg'],
 ['친구 아빠한테 받은 네이트판글 후기','친구 아빠한테 받은 네이트판글 후기'],
];
let failures=[];
for(const [original,display]of cases)try{
 assert.equal(P.headline(original),display);
 const raw={originalTitle:original,coverTitle:original,segments:[]};
 const prepared=U.preparePlan(raw);
 assert.equal(prepared.originalTitle,original);assert.equal(raw.coverTitle,original);assert.equal(prepared.coverTitle,display);
}catch(e){failures.push(e.message);}
try{
 assert.equal(typeof P.wrapTitle,'function');
 const title='긴단어시부모한테는 기어야 하나요?';
 const lines=P.wrapTitle(title,240,t=>Array.from(t).length*30);
 assert.equal(lines,null,'Reduce font instead of splitting a Korean word');
 const fitted=P.wrapTitle(title,240,t=>Array.from(t).length*20);
 assert(fitted.every(line=>line.length>1));assert.equal(fitted.join('').replace(/\s/g,''),title.replace(/\s/g,''));
}catch(e){failures.push(e.message);}
try{
 const plan={originalTitle:'에버레스트 비용',editorial:{templateId:'mint_text'},segments:[
  {id:'image',kind:'image',selected:true,mediaName:'mountain.png'},
  {id:'explanation',kind:'text',selected:true,text:'그리고 저렇게 입산해서 가지고 간 물자 다\n버리고 내려오기 때문에'},
  {id:'ending',kind:'text',selected:true,text:'산 개더러움'}],comments:[]};
 const layout=P.compile(plan,{'mountain.png':{width:936,height:1022,analysis:{kind:'screenshot'}}},measure);
 const last=layout.pages.at(-1);
 assert(last.operations.some(op=>op.sourceId==='explanation'),'Keep final line with preceding actual explanation after image');
 assert.equal(layout.pages.flatMap(p=>p.operations).filter(o=>o.role==='body').map(o=>o.text).join('').replace(/\s/g,''),plan.segments.filter(s=>s.kind==='text').map(s=>s.text).join('').replace(/\s/g,''));
 assert(U.auditLayout(layout).ok);
}catch(e){failures.push(e.message);}
try{
 const title='  (네이트판) 돈많은 시부모 이야기 (후기)  ';
 const html=squareCoverHtml({title}),data=JSON.parse(html.match(/window\.coverInput=(.*?);window\.coverResourcesReady/s)[1]);
 assert.equal(data.originalTitle,title);assert.equal(data.title,'돈많은 시부모 이야기 (후기)');assert.deepEqual(data.sourceLabels,['(네이트판)']);
 const emphasis=squareCoverHtml({title:'(네이트판) 실제 제목',emphasis:'네이트판'});
 assert.equal(JSON.parse(emphasis.match(/window\.coverInput=(.*?);window\.coverResourcesReady/s)[1]).emphasis,'');
 assert(coverHtml({title:'(네이트판) 실제 제목',emphasis:'네이트판'}).includes('<h1 class="title">실제 제목</h1>'),'Removing a label emphasis must not corrupt legacy markup');
 const lines=P.wrapTitle('긴단어 단어 가',50,t=>Array.from(t).length*10);
 assert(lines.every(line=>Array.from(line).length>1),'Never leave a final character alone');
 const stale=P.wrapTitle('긴단어 단어\n가',50,t=>Array.from(t).length*10);
 assert(stale.every(line=>Array.from(line).length>1),'Reflow an old explicit newline that isolates the final character');
}catch(e){failures.push(e.message);}
try{
 const text=Array.from({length:16},(_,i)=>'본문 줄 번호 '+i).join('\n');
 const layout=P.compile({originalTitle:'본문 경계',editorial:{templateId:'mint_text'},segments:[{id:'body',kind:'text',selected:true,text},{id:'image',kind:'image',selected:true,mediaName:'photo.png'}]}, {'photo.png':{width:936,height:400,analysis:{kind:'photo'}}},measure);
 const page=layout.pages.find(p=>p.operations.some(o=>o.sourceId==='image'));
 assert(page.operations.filter(o=>o.sourceId==='body').length>=2,'The following image must not mask a single-line paragraph continuation');
 assert(U.auditLayout(layout).ok);
}catch(e){failures.push(e.message);}
try{
 const raw={originalTitle:'군대리아 최신 근황',coverTitle:'군대리아 근황',editorial:{coverTitle:'군대리아 근황',coverLines:['군대리아','근황'],titleHighlights:['없는 숫자']},segments:[]};
 const prepared=U.preparePlan(raw);assert.equal(prepared.coverTitle,raw.originalTitle);assert.equal(prepared.editorial.coverTitle,raw.originalTitle);assert(!prepared.editorial.coverLines);assert.deepEqual(prepared.editorial.titleHighlights,[]);
 const manual=P.compile({originalTitle:'가 나',editorial:{templateId:'mint_text',coverLines:['가','나']},segments:[{id:'b',kind:'text',selected:true,text:'본문'}]}, {},measure);
 assert(manual.pages[0].operations.filter(o=>o.role==='title').every(o=>Array.from(o.text).length>1));
 const labelled=P.compile({originalTitle:'연속 내용',editorial:{templateId:'mint_text',sourceLabels:{t:'원문 덧붙임'}},segments:[{id:'i',kind:'image',selected:true,mediaName:'screen.png'},{id:'t',kind:'text',selected:true,text:'Line content\nMore text'},{id:'end',kind:'text',selected:true,text:'Ending text'}]}, {'screen.png':{width:936,height:900,analysis:{kind:'screenshot'}}},measure);
 const page=labelled.pages.find(p=>p.operations.some(o=>o.role==='editorial_label'));
 assert(page.operations.some(o=>o.role==='body'&&o.sourceId==='t'),'Move the explanation label with its text');assert(U.auditLayout(labelled).ok);
}catch(e){failures.push(e.message);}
assert.deepEqual(failures,[]);
console.log('Site-label separation, exact titles, Korean word boundaries and mixed image/text ending PASS');
