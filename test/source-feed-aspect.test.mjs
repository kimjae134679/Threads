import assert from 'node:assert/strict';
import test from 'node:test';
import '../app/source-page-plan.js';
const P=globalThis.ThreadsPagePlan;
const measure=(text,size)=>Array.from(text).length*size;
const page=(height,number=1)=>({number,role:'body',width:1080,height,background:'#faf8f3',contentBottom:height-72,
  operations:[{kind:'text',role:'body',text:'짧은 원문 그대로',x:72,y:72,size:52,lineHeight:78,weight:400,
    runs:[{text:'짧은 원문 그대로',size:52,weight:400,color:'#171c26'}]},
  {kind:'image',name:'photo.png',x:72,y:180,width:400,height:200,sourceX:12,sourceY:23,sourceWidth:400,sourceHeight:200}]});

test('feed boundaries use exact integer dimensions, including rounding',()=>{
  assert.equal(P.feedAspect(1080,565).ok,false);
  assert.equal(P.feedAspect(1080,566).ok,true);
  assert.equal(P.feedAspect(1080,1440).ok,true);
  assert.equal(P.feedAspect(1080,1441).ok,false);
  assert.equal(P.feedAspect(191,100).ok,true);
  assert.equal(P.feedAspect(3,4).ok,true);
  for(const width of [191,1000,1080,1081]){
    const min=Math.ceil(width*100/191),max=Math.floor(width*4/3);
    assert.equal(P.feedAspect(width,min).ok,true);assert.equal(P.feedAspect(width,min-1).ok,false);
    assert.equal(P.feedAspect(width,max).ok,true);assert.equal(P.feedAspect(width,max+1).ok,false);
  }
  for(const dimensions of [[0,552],[1080,0],[1080,552.5],[NaN,552],[-1,552]])assert.throws(()=>P.feedAspect(...dimensions),/크기/);
  assert.throws(()=>P.feedAspect(1080,1080,'unsupported'),/대상/);
});
test('1080×552 receives seven background pixels at each edge without changing content or crop',()=>{
  const before=page(552),saved=structuredClone(before),after=P.prepareFeedPage(before);
  assert.equal(after.height,566);assert.equal(after.width,1080);assert.equal(after.background,before.background);
  assert.equal(after.platformPadding.top,7);assert.equal(after.platformPadding.bottom,7);
  assert.equal(after.contentBottom,before.contentBottom+7);
  assert.deepEqual(after.operations, before.operations.map(op=>({...op,y:op.y+7})));
  assert.deepEqual(before,saved,'input plan is immutable');assert.equal(P.prepareFeedPage(after),after,'padding is idempotent');
  const odd=P.prepareFeedPage(page(551));assert.equal(odd.platformPadding.top,7);assert.equal(odd.platformPadding.bottom,8);
});
test('accepted pages are unchanged; too tall pages are held rather than cropped',()=>{
  for(const height of [566,608,1080,1350,1440]){const p=page(height);assert.equal(P.prepareFeedPage(p),p);}
  assert.throws(()=>P.prepareFeedPage(page(1441)),/比率|비율|3:4/);
});
test('layout preserves page order and cover-only export leaves historical bodies untouched',()=>{
  const cover={...page(1080),role:'cover'},short=page(552,2),normal=page(1350,3),layout={pages:[cover,short,normal]};
  const result=P.prepareFeedLayout(layout);
  assert.deepEqual(result.pages.map(p=>p.number),[1,2,3]);assert.equal(result.pages[0],cover);assert.equal(result.pages[2],normal);
  assert.equal(result.pages[1].height,566);assert.equal(layout.pages[1].height,552);
  assert.equal(P.prepareFeedLayout(layout,{coverOnly:true}),layout);
  assert.throws(()=>P.prepareFeedLayout({pages:[cover,page(1441,2)]}),/비율/);
});
test('compiler pads only after pagination and never adds an empty body page',()=>{
  const make=text=>P.compileForFeed({originalTitle:'제목',segments:[{id:'body',kind:'text',selected:true,text}],comments:[],editorial:{templateId:'mint_text'}},{},measure);
  assert.throws(()=>make(''),/실제 원문 조각/,'empty source remains held; no fabricated body page');
  const short=make('짧은 본문');assert(short.pages.every(p=>P.feedAspect(p.width,p.height).ok));
  assert.equal(short.pages.find(p=>p.role==='body').height,1440);
  assert.equal(short.bodyFontSize,52);assert.equal(short.safeMargin,132);
  assert(short.pages.every(p=>p.height===1440));
  assert.deepEqual(short.pages.flatMap(p=>p.operations).filter(op=>op.role==='body').map(op=>op.text),['짧은 본문']);
  const long=make(Array.from({length:60},(_,i)=>'문단 '+i+' 원문 그대로').join('\n\n'));
  assert(long.pages.length>2);assert(long.pages.every(p=>P.feedAspect(p.width,p.height).ok));
  assert(long.pages.every(p=>p.height===1440));
  assert(long.pages.flatMap(p=>p.operations).filter(op=>op.role==='body').every(op=>op.x===132&&op.size===52));
  assert.deepEqual(long.pages.map(p=>p.number),long.pages.map((_,i)=>i+1));
  assert.equal(long.pages.flatMap(p=>p.operations).filter(op=>op.role==='body').map(op=>op.text).join('').replace(/\s/g,''),
    Array.from({length:60},(_,i)=>'문단 '+i+' 원문 그대로').join('').replace(/\s/g,''));
});
