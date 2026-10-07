import assert from 'node:assert/strict';import '../app/source-page-plan.js';const P=globalThis.ThreadsPagePlan,measure=(t,s)=>Array.from(t).length*s*.6;
assert.equal(P.headline('[네이트판] 원문 제목'), '원문 제목');
const text=Array.from({length:16},(_,i)=>'본문 확인 '+i+' 번째 줄').join('\n'),plan={originalTitle:'검증용 제목',segments:[{id:'body',kind:'text',selected:true,text}],comments:[],editorial:{templateId:'mint_text'}};
const result=P.compile(plan,{},measure),body=result.pages.filter(p=>p.role==='body');
assert(body.at(-1).operations.filter(o=>o.role==='body').length>=4,'마지막 한 줄을 앞 흐름과 균형 있게 연결');
assert.equal(result.pages.flatMap(p=>p.operations).filter(o=>o.role==='body').map(o=>o.text).join('').replace(/\s/g,''),text.replace(/\s/g,''));
const comments=P.compile({...plan,comments:[{id:'comment',selected:true,text:'검증용 실제 댓글',visibleLikes:3},{id:'reply',selected:true,contentRole:'author_reply',text:'검증용 글쓴이 답변',visibleLikes:2}]},{},measure);
const labels=comments.pages.flatMap(p=>p.operations).filter(o=>o.role==='section').map(o=>o.text);assert(labels.includes('댓글'));assert(labels.includes('글쓴이'));assert(!labels.includes('원문 댓글'));assert(!labels.includes('작성자 답글'));
console.log('Production feedback fixes: visible site prefix cleanup, complete source text, balanced short tail and natural comment labels PASS');
