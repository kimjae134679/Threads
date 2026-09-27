'use strict';
const { app, BrowserWindow, session } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { capturePage } = require('./capture.cjs');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const output = path.join(__dirname, 'dist', 'smoke');
require('node:fs').mkdirSync(path.join(__dirname, 'dist', 'smoke-profile'), { recursive: true });
app.setPath('userData', path.join(__dirname, 'dist', 'smoke-profile'));
require('./main.cjs');
app.whenReady().then(async () => {
  let fixture;
  try {
    await fs.mkdir(output, { recursive: true });
    let editor;
    for (let i = 0; i < 100; i++) {
      editor = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().startsWith('cut-editor:'));
      if (editor && await editor.webContents.executeJavaScript('Boolean(window.ThreadsSourceCutEditor && window.ThreadsCutDesktop)').catch(() => false)) break;
      await wait(100);
    }
    assert(editor, 'Editor window opened');
    assert(await editor.webContents.executeJavaScript('Boolean(window.ThreadsSourceCutEditor && window.ThreadsCutDesktop)'), 'Editor and secure bridge loaded');
    await editor.webContents.executeJavaScript("document.getElementById('openBundleTool').click()");
    let bundleWindow;
    for(let i=0;i<60;i++) {
      bundleWindow=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()==='cut-editor://app/source-batch.html');
      if(bundleWindow && await bundleWindow.webContents.executeJavaScript('Boolean(window.ThreadsSourceBatch && window.ThreadsSourceCuration)').catch(()=>false))break;
      await wait(100);
    }
    assert(bundleWindow,'Curated source ZIP window opened');
    assert(await bundleWindow.webContents.executeJavaScript('Boolean(window.ThreadsSourceBatch && window.ThreadsSourceCuration)'),
      'Source ZIP editor and curation code loaded in Electron');
    bundleWindow.destroy();
    const isolated = session.fromPartition('capture-smoke-fixture');
    isolated.protocol.handle('https', () => new Response('<!doctype html><meta charset="utf-8"><title>웹진 인벤 : 테스트 원문 - 오픈이슈갤러리</title><style>body{margin:0}section{height:6000px;font:32px sans-serif}.article-content{padding:40px;width:900px}.comment-list{padding:40px}.nickname,time{font-size:14px}section:nth-child(2){background:#ffdd22}section:nth-child(3){background:#22ddff}</style><section><article class="article-content"><h1>웹진 인벤 : 테스트 원문 - 오픈이슈갤러리</h1><p>첫 문단입니다.</p><img width="320" height="180" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22180%22%3E%3Crect width=%22320%22 height=%22180%22 fill=%22%23ddd%22/%3E%3C/svg%3E"><p>둘째 문단입니다.</p></article><ul class="comment-list"><li><span class="nickname">닉네임</span><div class="comment-text">실제 댓글 하나</div><time>오늘</time></li></ul></section><section>Middle</section><section>Bottom</section>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
    fixture = new BrowserWindow({ show: true, width:1280, height:900, useContentSize:true, webPreferences:{session:isolated,nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false} });
    const long = await capturePage(fixture, 'https://example.com/long-fixture', p => console.log('Fixture:', p.message));
    assert.equal(long.assets.length, 3);
    assert.equal(long.assets.reduce((sum,a)=>sum+a.height,0), 18000);
    assert.equal(long.title, '테스트 원문');
    assert.match(long.extracted.bodyText, /첫 문단입니다/);
    assert.equal(long.extracted.commentCount, 1);
    assert.match(long.extracted.commentsText, /실제 댓글 하나/);
    assert.equal(long.extracted.bodyMedia.length, 1);
    for (const a of long.assets) await fs.writeFile(path.join(output,a.name),Buffer.from(a.dataUrl.split(',')[1],'base64'));
    await editor.webContents.executeJavaScript(`(async () => {
      const result = ${JSON.stringify(long)}, M = window.ThreadsSourceCut, p = M.newProject();
      p.title = result.title; p.source = { url: result.url, title: result.title };
      result.assets.forEach(a => M.addAsset(p,a));
      await window.ThreadsSourceCutEditor.openProject(p);
    })()`);
    assert.equal(await editor.webContents.executeJavaScript('window.ThreadsSourceCutEditor.getProject().assets.length'), 3);
    const screenshotMode = await editor.webContents.executeJavaScript(`(() => {
      const p=window.ThreadsSourceCutEditor.getProject(), slides=window.ThreadsSourceCut.slides(p);
      return {bodyMode:p.community.bodyMode, body:slides.filter(s=>s.sourceKind==='body').length, kinds:slides.map(s=>s.type)};
    })()`);
    assert.equal(screenshotMode.bodyMode,'screenshot');
    assert(screenshotMode.body > 0, 'selected screenshot body must render even when no extracted text exists');
    const community = await editor.webContents.executeJavaScript(`(async () => {
      await document.fonts.ready;
      const set = (id, value) => {
        const el = document.getElementById(id);
        if (el.type === 'checkbox') el.checked = value; else el.value = value;
        el.dispatchEvent(new Event(el.type === 'checkbox' ? 'change' : 'input', {bubbles:true}));
      };
      set('communityEnabled', true);
      set('bodyMode', 'text');
      set('commentMode', 'text');
      set('communityTitle', '웹진 인벤 : 원문 제목 그대로 - 오픈이슈갤러리');
      set('communityBody', '첫 문단입니다.\\n둘째 문단도 원문 그대로입니다.');
      set('communityComments', '실제 댓글 하나\\n실제 댓글 둘');
      set('commentPaddingTop', 140);
      set('commentPaddingBottom', 160);
      await new Promise(resolve => setTimeout(resolve, 350));
      const p = window.ThreadsSourceCutEditor.getProject();
      const slides = window.ThreadsSourceCut.slides(p);
      document.querySelector('[data-step-target="3"]').click();
      await new Promise(resolve => setTimeout(resolve, 450));
      const complete=document.getElementById('complete');
      complete.checked=true;
      complete.dispatchEvent(new Event('change',{bubbles:true}));
      document.querySelector('[data-step-target="4"]').click();
      await new Promise(resolve => setTimeout(resolve, 100));
      const latest=window.ThreadsSourceCutEditor.getProject();
      return {
        enabled:latest.community.enabled, title:latest.community.title, body:latest.community.body, comments:latest.community.comments,
        kinds:window.ThreadsSourceCut.slides(latest).map(s=>s.type),
        commentKinds:window.ThreadsSourceCut.slides(latest).map(s=>s.communityPage?.kind).filter(Boolean),
        step4:document.querySelector('[data-step="4"]').classList.contains('active'),
        previewError:document.getElementById('previewError').textContent,
        previewCanvases:document.querySelectorAll('#coverPreview canvas,#bodyPreview canvas').length,
        exportDisabled:document.getElementById('exportZip').disabled,
        exportReason:document.getElementById('exportReason').textContent
      };
    })()`);
    console.log('COMMUNITY_STATE', JSON.stringify(community));
    assert.equal(community.enabled,true);
    assert.equal(community.title,'원문 제목 그대로');
    assert.equal(community.comments,'실제 댓글 하나\n실제 댓글 둘');
    assert(community.kinds.includes('community'));
    assert(community.commentKinds.includes('comments'));
    assert.equal(community.step4,true);
    assert.equal(community.previewError,'');
    assert(community.previewCanvases >= 3);
    assert.equal(community.exportDisabled,false,community.exportReason);
    assert.match(community.exportReason,/준비 완료/);
    console.log('SMOKE screenshot fallback, text reconstruction, preview and ZIP enablement PASS');
    console.log('SMOKE editor state verified; screenshot capture skipped on this Electron build');
    console.log('SMOKE live capture start');
    const live = await editor.webContents.executeJavaScript("window.ThreadsCutDesktop.capture('https://example.com')");
    assert.equal(live.ok,true,live.error);
    assert(live.assets.length > 0);
    await editor.webContents.executeJavaScript('window.confirm = () => true; undefined');
    await editor.webContents.executeJavaScript("document.getElementById('captureUrl').value='https://example.com'; document.getElementById('captureUrlButton').click()");
    let ui;
    for(let i=0;i<700;i++) {
      ui=await editor.webContents.executeJavaScript("({busy:document.getElementById('captureUrlButton').disabled,message:document.getElementById('message').textContent,project:window.ThreadsSourceCutEditor.getProject().source,assets:window.ThreadsSourceCutEditor.getProject().assets.length})");
      if(!ui.busy) break;
      await wait(100);
    }
    assert.match(ui.message,/캡처 .*열었습니다/);
    assert(ui.assets > 0);

    const report={ok:true,fixtureHeight:18000,fixtureParts:3,liveUrl:live.url,liveCapture:live.assets.length,community,uiMessage:ui.message,nodeIntegration:editor.webContents.getLastWebPreferences().nodeIntegration};
    await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));
    app.exit(0);
  } catch(error) {
    console.error(error.stack); await fs.writeFile(path.join(output,'failure.txt'),error.stack).catch(()=>{});
    if(fixture&&!fixture.isDestroyed())fixture.destroy(); app.exit(1);
  }
});
