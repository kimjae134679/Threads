import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{coverHtml}=require('../desktop/universal-cover.cjs');
function load(name){const module={exports:{}};vm.runInNewContext(fs.readFileSync(new URL('../app/'+name,import.meta.url),'utf8'),{module});return module.exports;}
const typography=load('source-cover-typography.js'),policy=load('source-page-plan.js');
const measure=(text,size)=>Array.from(text).reduce((n,c)=>n+(/\s/.test(c)?size*.3:size*.65),0);
test('complete cover opt-in uses the shared restrained typography renderer',()=>{
 const html=coverHtml({id:'fixture',title:'사수 없이 프로젝트 3개',variant:'paper',aspectRatio:'square',typography:true});
 assert.match(html,/ThreadsCoverTypography/);assert.match(html,/renderTypographyCover/);assert.match(html,/emphasisScale/);
});
test('color and subtle font hierarchy preserve short, long and number-free titles',()=>{
 for(const title of ['오늘 느낀 일','사수 없이 프로젝트 세 개를 맡고 도움을 요청했는데 돌아온 말 때문에 퇴사를 고민한 후기','가족여행 다신 안 간다고 벼르는 후기','일주일 만에 7000원으로 바뀐 선택']){
  const style=typography.style(title),fit=typography.fit(title,{width:912,height:780},measure,policy,style);
  assert.equal(fit.lines.join('').replace(/\s/g,''),title.replace(/\s/g,''));
  assert(fit.runs.flat().every(r=>r.size>=fit.size*.94&&r.size<=fit.size*1.08));
  assert(new Set(fit.runs.flat().map(r=>r.color)).size<=2);assert(title.includes(style.emphasis));
  assert(fit.lines.every(line=>line.split(' ').every(word=>title.includes(word))));
 }
});
test('highlight keeps a source phrase and never chops a word into a number callout',()=>{
 assert.notEqual(typography.style('4개월 다니고 퇴사한 썰',{emphasis:'4개'}).emphasis,'4개');
 assert.equal(typography.style('가족여행 다신 안 간다고 벼르는 후기',{emphasis:'다신 안'}).emphasis,'다신 안');
 assert.throws(()=>typography.style('원제',{accent:'red'}),/포인트색/);
});
test('title source label is separated while full canonical title remains unchanged',()=>{
 const info=policy.titleInfo('판} 32살. 무직. 돈 없음. 남친 없음 ( 왠지 별로 없을 것 같은 후기');
 const style=typography.style(info.displayTitle),fit=typography.fit(info.displayTitle,{width:912,height:780},measure,policy,style);
 assert.equal(info.originalTitle,'판} 32살. 무직. 돈 없음. 남친 없음 ( 왠지 별로 없을 것 같은 후기');
 assert.equal(fit.lines.join('').replace(/\s/g,''),info.displayTitle.replace(/\s/g,''));
});
test('regular complete-cover production uses colored runs and keeps body operations exact',async()=>{
 await import('../app/source-cover-typography.js');await import('../app/source-page-plan.js');await import('../app/source-batch-image-composition.js');
 const body={number:2,role:'body',operations:[{kind:'text',text:'원문 그대로',size:52}]},layout={pages:[{number:1,role:'cover'},structuredClone(body)]};
 globalThis.ThreadsImageComposition.applyComposition(layout,{completeCover:true,originalTitle:'사수 없이 프로젝트 세 개를 맡은 후기'}, {},measure,globalThis.ThreadsPagePlan);
 assert.deepEqual(layout.pages[1],body);const ops=layout.pages[0].operations;
 assert.equal(ops.map(o=>o.text).join('').replace(/\s/g,''),'사수없이프로젝트세개를맡은후기');
 assert(ops.every(o=>o.size<=124));assert(ops.some(o=>o.runs.some(r=>r.emphasized)));
});
test('package ships the shared typography script and desktop pixel renderer',()=>{
 const p=JSON.parse(fs.readFileSync(new URL('../desktop/package.json',import.meta.url),'utf8'));
 assert(p.build.extraResources.find(r=>r.to==='editor').filter.includes('source-cover-typography.js'));
 assert(p.build.files.includes('typography-cover-canvas.cjs'));
});
test('a selected phrase retains emphasis when it crosses a title line boundary',()=>{
 const title='가족여행 다신 안 간다고 벼르는 후기',style=typography.style(title,{emphasis:'다신 안'}),fit=typography.fit(title,{width:300,height:800},measure,policy,style,100,48);
 assert.equal(fit.runs.flat().filter(r=>r.emphasized).map(r=>r.text).join('').replace(/\s/g,''),'다신안');
});

test('reviewed titles emphasize the actual situation rather than a long filler word',()=>{
 for(const [title,phrase,mood] of [
  ['여직원 원룸 구한다고해서 방내어줌','방내어줌','cool'],
  ['돈 빌려줬는데 받는 방법 없을까요?..','받는 방법','warm'],
  ['롯데리아 알바 2주차 후기','알바 2주차','calm'],
  ['난 아부지 회사 썰 듣는거 좋아함','아부지 회사 썰','cool'],
  ['결벽증 새언니 썰','결벽증 새언니','warm'],
  ['군대리아 최신 근황','군대리아','calm']
 ]){const style=typography.style(title);assert.equal(style.emphasis,phrase);assert.equal(style.mood,mood);}
});

test('automatic situation phrases keep complete Korean word boundaries',()=>{
 assert.notEqual(typography.style('시방내어줌이라는 표현을 들은 후기').emphasis,'방내어줌이라는');
 assert.equal(typography.style('방내어줌이라는 표현을 들은 후기').emphasis,'방내어줌이라는');
});
