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
    const isolated = session.fromPartition('capture-smoke-fixture');
    isolated.protocol.handle('https', () => new Response('<!doctype html><title>Long source fixture</title><style>body{margin:0}section{height:6000px;font:60px sans-serif}section:nth-child(2){background:#ffdd22}section:nth-child(3){background:#22ddff}</style><section>Top</section><section>Middle</section><section>Bottom</section>', { headers: { 'Content-Type': 'text/html' } }));
    fixture = new BrowserWindow({ show: true, width:1280, height:900, useContentSize:true, webPreferences:{session:isolated,nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false} });
    const long = await capturePage(fixture, 'https://example.com/long-fixture', p => console.log('Fixture:', p.message));
    assert.equal(long.assets.length, 3);
    assert.equal(long.assets.reduce((sum,a)=>sum+a.height,0), 18000);
    for (const a of long.assets) await fs.writeFile(path.join(output,a.name),Buffer.from(a.dataUrl.split(',')[1],'base64'));
    await editor.webContents.executeJavaScript(`(async () => {
      const result = ${JSON.stringify(long)}, M = window.ThreadsSourceCut, p = M.newProject();
      p.title = result.title; p.source = { url: result.url, title: result.title };
      result.assets.forEach(a => M.addAsset(p,a));
      await window.ThreadsSourceCutEditor.openProject(p);
    })()`);
    assert.equal(await editor.webContents.executeJavaScript('window.ThreadsSourceCutEditor.getProject().assets.length'), 3);
    const styled = await editor.webContents.executeJavaScript(`(async () => {
      await document.fonts.ready;
      const input = (id, value) => { const element = document.getElementById(id); element.value = value; element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', {bubbles:true})); };
      const select = document.getElementById('layoutPage'); select.selectedIndex = 1; select.dispatchEvent(new Event('change'));
      input('paddingTop', 80); input('paddingBottom', 160); input('paddingSide', 100); input('afterText', '직접 작성한 의견');
      input('fontId', 'gothic'); input('presetName', 'Smoke preset'); document.getElementById('savePreset').click();
      input('fontId', 'sans'); document.getElementById('applyPreset').click();
      input('editingReason', '문단 끝을 남기고 의견 공간 확보'); document.getElementById('recordReason').click();
      await new Promise(resolve => setTimeout(resolve, 1500));
      const p = window.ThreadsSourceCutEditor.getProject();
      const save = await window.ThreadsCutDesktop.saveReference({projectId:p.projectId,images:p.assets.map(a=>({uid:a.uid,dataUrl:a.dataUrl})),summary:window.ThreadsSourceCut.reference(p),events:p.editLog});
      return {family:p.appearance.fontId,weight:p.appearance.fontWeight,layout:p.pageLayouts[select.value],edits:p.editLog.length,referenceFolder:save.folder,presets:p.presets.length};
    })()`);
    assert.equal(styled.family,'gothic'); assert.equal(styled.weight,800); assert.equal(styled.layout.afterText,'직접 작성한 의견'); assert(styled.edits>0);
    assert((await fs.stat(path.join(styled.referenceFolder,'edits.jsonl'))).size>0);
    await fs.writeFile(path.join(output,'styled-editor.png'),(await editor.webContents.capturePage()).toPNG());
    const live = await editor.webContents.executeJavaScript("window.ThreadsCutDesktop.capture('https://example.com')");
    assert.equal(live.ok,true,live.error);
    assert(live.assets.length > 0);
    await editor.webContents.executeJavaScript('window.confirm = () => true');
    await editor.webContents.executeJavaScript("document.getElementById('captureUrl').value='https://example.com'; document.getElementById('captureUrlButton').click()");
    let ui;
    for(let i=0;i<700;i++) {
      ui=await editor.webContents.executeJavaScript("({busy:document.getElementById('captureUrlButton').disabled,message:document.getElementById('message').textContent,project:window.ThreadsSourceCutEditor.getProject().source,assets:window.ThreadsSourceCutEditor.getProject().assets.length})");
      if(!ui.busy) break;
      await wait(100);
    }
    assert.match(ui.message,/캡처 .*장을 열었습니다/);
    assert(ui.assets > 0);
    await fs.writeFile(path.join(output,'editor.png'),(await editor.webContents.capturePage()).toPNG());
    const report={ok:true,fixtureHeight:18000,fixtureParts:3,liveUrl:live.url,liveCapture:live.assets.length,stylesAndLogs:styled,uiMessage:ui.message,nodeIntegration:editor.webContents.getLastWebPreferences().nodeIntegration};
    await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));
    app.exit(0);
  } catch(error) {
    console.error(error.stack); await fs.writeFile(path.join(output,'failure.txt'),error.stack).catch(()=>{});
    if(fixture&&!fixture.isDestroyed())fixture.destroy(); app.exit(1);
  }
});
