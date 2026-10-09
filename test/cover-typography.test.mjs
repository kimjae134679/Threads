import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{coverHtml}=require('../desktop/universal-cover.cjs');
function load(name){const module={exports:{}};vm.runInNewContext(fs.readFileSync(new URL('../app/'+name,import.meta.url),'utf8'),{module});return module.exports;}
const typography=load('source-cover-typography.js'),policy=load('source-page-plan.js');
const {fingerprintFor}=require('../desktop/folder-batch.cjs');
const measure=(text,size)=>Array.from(text).reduce((n,c)=>n+(/\s/.test(c)?size*.3:size*.65),0);

test('a nested title size change invalidates the production cache',()=>{
 const job={id:'fixture',title:'돈 안 내는 여친',editorial:{titleStyle:{emphasis:'돈 안 내는',sizeEmphasis:'안 내는',sizeScale:1.06}}};
 const changed=structuredClone(job);changed.editorial.titleStyle.sizeEmphasis='';
 assert.notEqual(fingerprintFor(job),fingerprintFor(changed));
 const recolored=structuredClone(job);recolored.editorial.titleStyle.accent='#315a92';
 assert.notEqual(fingerprintFor(job),fingerprintFor(recolored));
});
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

test('explicit color phrase accepts a Korean particle suffix without coloring the particle',()=>{
 const title='결혼 정보회사에 다녀온 썰.txt',style=typography.style(title,{emphasis:'결혼 정보회사',sizeEmphasis:'',explicitEmphasis:true});
 const fit=typography.fit(title,{width:912,height:780},measure,policy,style);
 assert.equal(fit.runs.flat().filter(r=>r.emphasized).map(r=>r.text).join('').replace(/\s/g,''),'결혼정보회사');
 assert(fit.runs.flat().filter(r=>r.emphasized).every(r=>r.size===fit.size));
 assert.equal(fit.lines.join('').replace(/\s/g,''),title.replace(/\s/g,''));
});

test('nested size phrase is independent of the full color phrase across title lines',()=>{
 for(const [title,emphasis,sizeEmphasis]of [['내 방 달라는 딸 대처법.jpg','내 방 달라는 딸','달라는'],['돈 안 내는 여친','돈 안 내는','안 내는']]){
  const style=typography.style(title,{emphasis,sizeEmphasis,explicitEmphasis:true}),fit=typography.fit(title,{width:300,height:800},measure,policy,style,100,48),runs=fit.runs.flat();
  assert.equal(runs.filter(r=>r.emphasized).map(r=>r.text).join('').replace(/\s/g,''),emphasis.replace(/\s/g,''));
  assert.equal(runs.filter(r=>r.sizeEmphasized).map(r=>r.text).join('').replace(/\s/g,''),sizeEmphasis.replace(/\s/g,''));
  assert(runs.filter(r=>r.sizeEmphasized).every(r=>r.emphasized&&r.size===Math.round(fit.size*1.03)));
  assert(runs.filter(r=>!r.sizeEmphasized).every(r=>r.size===fit.size));
  assert.equal(runs.map(r=>r.text).join('').replace(/\s/g,''),title.replace(/\s/g,''));
 }
});

test('explicit ranges fail closed instead of silently selecting another word',()=>{
 assert.throws(()=>typography.style('돈 안 내는 여친',{emphasis:'없는 구절',explicitEmphasis:true}),/강조/);
 assert.throws(()=>typography.style('돈 안 내는 여친',{emphasis:'돈 안 내는',sizeEmphasis:'여친',explicitEmphasis:true}),/크기/);
 assert.throws(()=>typography.style('돈 안 내는 여친',{emphasis:'돈 안 내는',sizeEmphasis:'안 내는',sizeScale:1.5,explicitEmphasis:true}),/크기/);
});

test('regular composition consumes full color range and nested size range from input',()=>{
 const title='내 방 달라는 딸 대처법.jpg',body={number:2,role:'body',operations:[{kind:'text',text:'본문 유지'}]},layout={pages:[{},structuredClone(body)]};
 globalThis.ThreadsCoverTypography=typography;globalThis.ThreadsImageComposition.applyComposition(layout,{completeCover:true,originalTitle:title,coverTitleStyle:{emphasis:'내 방 달라는 딸',sizeEmphasis:'달라는'}},{},measure,policy);
 const runs=layout.pages[0].operations.flatMap(o=>o.runs);
 assert.equal(runs.filter(r=>r.emphasized).map(r=>r.text).join('').replace(/\s/g,''),'내방달라는딸');
 assert.equal(runs.filter(r=>r.sizeEmphasized).map(r=>r.text).join('').replace(/\s/g,''),'달라는');
 assert.deepEqual(layout.pages[1],body);
});
