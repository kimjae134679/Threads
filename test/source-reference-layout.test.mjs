import assert from 'node:assert/strict';
import '../app/source-page-plan.js';
import '../app/source-batch-image-analysis.js';
const P=globalThis.ThreadsPagePlan,A=globalThis.ThreadsImageAnalysis;
const measure=(text,size)=>Array.from(text).reduce((n,c)=>n+(/[a-z .,?!]/i.test(c)?0.52:1)*size,0);
const image={id:'s0',kind:'image',mediaName:'screen.png',selected:true,location:'source:1'};
const plan={originalTitle:'회사에서 넵 쓰지 마세요',coverTitle:'회사에서 넵 쓰지 마세요',cover:{segmentId:'s0'},segments:[image],comments:[]};
const screenshot=P.compile(plan,{'screen.png':{width:1080,height:2500,analysis:{kind:'screenshot',bounds:{x:0,y:0,width:1080,height:2500},breakRows:[{y:1150,gap:40},{y:2200,gap:30}]}}},measure);
assert.equal(screenshot.templateId,'screenshot');
assert.equal(screenshot.pages[0].operations.filter(o=>o.kind==='image').length,0);
const slices=screenshot.pages.flatMap(p=>p.operations).filter(o=>o.kind==='image');
assert.equal(slices[0].sourceY,0);assert.equal(slices[0].sourceHeight,1150);
assert.equal(slices.reduce((n,o)=>n+o.sourceHeight,0),2500);
for(let i=1;i<slices.length;i++)assert.equal(slices[i].sourceY,slices[i-1].sourceY+slices[i-1].sourceHeight);
const photo=P.compile({...plan,segments:[image,{id:'s1',kind:'image',mediaName:'meal.jpg',selected:true}]},
  {'screen.png':{width:1080,height:1000,analysis:{kind:'screenshot'}},'meal.jpg':{width:1600,height:1100,analysis:{kind:'photo',photoScore:1}}},measure);
assert.equal(photo.templateId,'photo_cover');assert.equal(photo.pages[0].operations[0].name,'meal.jpg');
const portrait=P.compile({...plan,segments:[image,{id:'s1',kind:'image',mediaName:'meal.jpg',selected:true}]},
 {'screen.png':{width:800,height:1067,analysis:{kind:'photo',photoScore:0}},'meal.jpg':{width:1600,height:600,analysis:{kind:'photo',photoScore:1}}},measure);
const portraitOps=portrait.pages.flatMap(p=>p.operations).filter(o=>o.sourceId==='s0'&&o.kind==='image');
assert.equal(portraitOps.length,1);assert.equal(portraitOps[0].sourceHeight,1067);
assert(photo.pages[0].operations.some(o=>o.kind==='gradient'));
assert(photo.omitted.some(o=>o.sourceId==='s1'&&o.reason==='already_shown_in_cover'));
const story='...첫 문장입니다. '+('앞 문장의 실제 내용을 그대로 읽습니다. '.repeat(40))+'마지막 결론을 반드시 남깁니다.';
const textPlan={...plan,segments:[{id:'s0',kind:'text',selected:true,text:story,location:'body:0'}],comments:[]};
const text=P.compile(textPlan,{},measure);
assert.equal(text.templateId,'mint_text');
const rendered=text.pages.flatMap(p=>p.operations).filter(o=>o.role==='body').map(o=>o.text).join('');
assert.equal(rendered.replace(/\s/g,''),story.replace(/\s/g,''));
const fixed=P.compile({...textPlan,style:{canvasMode:'instagram',aspectRatio:'3:4'}},{},measure);
assert(fixed.pages.every(p=>p.width===1080&&p.height===1440));
assert.equal(fixed.sourcePublishedAt,null);assert.equal(fixed.publicationAllowed,false);
const white=new Uint8ClampedArray(100*100*4).fill(255);
for(const top of [20,40,60])for(let y=top;y<top+3;y++)for(let x=10;x<80;x++){
 const i=(y*100+x)*4;white[i]=white[i+1]=white[i+2]=20;
}
const analyzed=A.analyze(white,100,100,1000,1000);
assert.equal(analyzed.kind,'screenshot');assert(analyzed.breakRows.length>=3);assert(analyzed.bounds.y>0);
const black=new Uint8ClampedArray(100*100*4);
for(let i=3;i<black.length;i+=4)black[i]=255;
for(const top of [20,40,60])for(let y=top;y<top+3;y++)for(let x=10;x<80;x++){
 const i=(y*100+x)*4;black[i]=black[i+1]=black[i+2]=240;
}
const dark=A.analyze(black,100,100,1000,1000);
assert.equal(dark.kind,'screenshot');assert.equal(dark.darkMode,true);assert(dark.bounds.x>0);
const gray=new Uint8ClampedArray(100*100*4).fill(200);
for(let i=3;i<gray.length;i+=4)gray[i]=255;
for(const top of [20,40,60])for(let y=top;y<top+3;y++)for(let x=10;x<55;x++){
 const i=(y*100+x)*4;gray[i]=gray[i+1]=gray[i+2]=20;
}
assert.equal(A.analyze(gray,100,100).kind,'screenshot');
const cropped=P.compile({...plan,editorial:{regions:{s0:{x:100,y:200,width:700,height:800}}}},
 {'screen.png':{width:1000,height:1200,analysis:{kind:'screenshot'}}},measure);
const crop=cropped.pages.flatMap(p=>p.operations).find(o=>o.kind==='image');
assert.equal(crop.sourceX,100);assert.equal(crop.sourceY,200);assert.equal(crop.sourceWidth,700);
assert.equal(plan.editorial,undefined);
const manual=P.compile({...plan,style:{manualTitleLayout:true,coverSize:64,coverLeft:120,coverTop:90,titleWeight:400}},
 {'screen.png':{width:1000,height:1000,analysis:{kind:'screenshot'}}},measure);
assert.equal(manual.pages[0].operations[0].x,120);assert.equal(manual.pages[0].operations[0].y,90);
assert.equal(manual.pages[0].operations[0].size,64);assert.equal(manual.pages[0].operations[0].weight,400);
console.log('Reference layouts: screenshot readability, complete safe splits, photo selection, exact story preservation, fixed Instagram ratio, audited crop PASS');
