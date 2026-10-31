import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {execFileSync} from 'node:child_process';import {DOMParser} from 'linkedom';import '../app/source-page-plan.js';
const load=()=>import('../scripts/readable-source-html.mjs');
test('human HTML content reuses authoritative article walk, excludes page shell/comments and retains image order',async()=>{
 const {readableSourceHtml}=await load();
 for(const selector of ['articleContent','xe_content']){
  const html=`<html><head><meta property="og:title" content="원제"><script>throw Error('never execute')</script></head><body><nav>껍데기</nav><div class="${selector}"><p>시작 &amp; 첫 행동</p><div class="ad">광고 제외</div><p hidden>숨김</p><p aria-hidden="true">숨김2</p><img src="media/1.jpg"><p>중간<br>둘째 행동</p><div class="comment">타인 댓글</div><img data-src="https://example.invalid/2.jpg"><p>실제 결말</p></div><footer>페이지 끝</footer></body></html>`;
  const result=readableSourceHtml(Buffer.from(html));assert.equal(result.supported,true);assert.match(result.body,/시작 & 첫 행동/);assert.match(result.body,/중간\n둘째 행동/);assert.match(result.body,/실제 결말/);assert.doesNotMatch(result.body,/껍데기|광고 제외|타인 댓글|페이지 끝|숨김|never execute/);assert.ok(result.body.indexOf('media/1.jpg')<result.body.indexOf('중간'));assert.ok(result.body.indexOf('https://example.invalid/2.jpg')<result.body.indexOf('실제 결말'));assert.equal(result.images,2);
 }
});
test('unsupported or ambiguous HTML never exposes body shell as verified story',async()=>{
 const {readableSourceHtml}=await load();for(const html of ['<html><body><header>제목</header><p>껍데기</p></body></html>','<div class="xe_content">첫글</div><div class="xe_content">다른글</div>']){const result=readableSourceHtml(Buffer.from(html));assert.equal(result.supported,false);assert.match(result.body,/본문 선택 미확인/);assert.doesNotMatch(result.body,/껍데기|첫글|다른글/);}
});
test('damaged HTML text encoding stays unconfirmed rather than displaying replacement text as story',async()=>{
 const {readableSourceHtml}=await load(),raw=Buffer.concat([Buffer.from('<html><meta property="og:title" content="원제"><div class="xe_content">'),Buffer.from([0xc3,0x28]),Buffer.from('</div></html>')]);assert.equal(readableSourceHtml(raw).supported,false);
});
test('damaged page-shell encoding does not hide clean selected story, but damaged image URLs stay unconfirmed',async()=>{
 const {readableSourceHtml}=await load(),raw=Buffer.concat([Buffer.from('<html><meta property="og:title" content="원제"><script>'),Buffer.from([0xc3,0x28]),Buffer.from('</script><nav>껍데기 �</nav><div class="xe_content"><p>실제 시작</p><img src="https://example.invalid/1.jpg"><p>실제 끝</p></div></html>')]),result=readableSourceHtml(raw);assert.equal(result.supported,true);assert.match(result.body,/실제 시작/);assert.match(result.body,/실제 끝/);assert.doesNotMatch(result.body,/�|껍데기/);
 for(const image of ['<img src="https://example.invalid/�.jpg">','[img=https://example.invalid/�.jpg]'])assert.equal(readableSourceHtml(Buffer.from('<html><meta property="og:title" content="원제"><div class="xe_content"><p>본문</p>'+image+'</div></html>')).supported,false);
});
test('human readable mode preserves full long article beyond production cap, without new verification claims',async()=>{
 const {readableSourceHtml}=await load(),html='<html><meta property="og:title" content="원제"><div class="xe_content">'+Array.from({length:450},(_,i)=>'<p>실제본문 '+i+'</p>').join('')+'</div></html>',result=readableSourceHtml(Buffer.from(html));assert.equal(result.supported,true);assert.match(result.body,/실제본문 449/);assert.equal(result.textSegments,450);assert.match(result.body,/읽기용/);
});
test('existing production default retains exact pinned parser plan and 400 cap while readable mode is separate',()=>{
 const provenance=JSON.parse(fs.readFileSync(new URL('../desktop/installed-source-provenance.json',import.meta.url),'utf8')),member=provenance.resources.find(row=>row.activePath==='app/source-curation.js');assert.ok(member);
 const original=execFileSync('git',['show',provenance.originGitCommit+':'+member.path],{encoding:'utf8'}),current=fs.readFileSync(new URL('../app/source-curation.js',import.meta.url),'utf8'),run=(code,options)=>{const context=vm.createContext({DOMParser,URL,ThreadsPagePlan:globalThis.ThreadsPagePlan});vm.runInContext(code,context);return context.ThreadsSourceCuration.htmlDraft('<html><meta property="og:title" content="[후기] 원제"><div class="xe_content">'+Array.from({length:450},(_,i)=>'<p>원래본문 '+i+'</p>').join('')+'</div></html>',[],options);};
 const before=run(original),after=run(current);assert.equal(after.segments.length,400);assert.equal(JSON.stringify(after),JSON.stringify(before),'existing default plan/fingerprint preimage unchanged');assert.equal(Object.hasOwn(after,'readableBody'),false);assert.equal(run(current,{readable:true}).segments.length,450);
});
