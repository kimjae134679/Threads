'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { app, BrowserWindow, dialog } = require('electron');

const materialRoot = path.join(app.getPath('desktop'), 'Threads Cut Editor 자료');
const input = path.join(materialRoot, '01_후보 기록');
const output = path.join(materialRoot, '06_자동 제작 결과');
dialog.showOpenDialog = async () => ({ canceled:false, filePaths:[input] });
require('./main.cjs');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  try {
    let win;
    for (let i = 0; i < 100; i++) {
      win = BrowserWindow.getAllWindows().find(item => item.isVisible());
      if (win && !win.webContents.isLoading()) break;
      await wait(100);
    }
    assert(win && !win.webContents.isLoading());
    const first = await win.webContents.executeJavaScript('window.ThreadsCutDesktop.runFolderBatch()');
    assert.equal(first.total, 1084);
    assert.equal(first.counts.generated, 1);
    assert.equal(first.counts.needs_source, 1083);
    assert.equal(first.counts.failed, 0);
    const ready = first.entries.find(entry => entry.status === 'generated');
    assert(ready);
    const zip = await fs.readFile(path.join(output, ready.previewZip));
    assert(zip.length > 1000);
    assert.equal(ready.renderedPages, 5);
    for (const image of ready.images) assert((await fs.readFile(path.join(output, ready.id, image.name))).length > 1000);
    const second = await win.webContents.executeJavaScript('window.ThreadsCutDesktop.runFolderBatch()');
    assert.equal(second.counts.already_done, 1);
    assert.equal(second.counts.generated, 0);
    assert.equal(second.counts.needs_source, 1083);
    const report = JSON.parse(await fs.readFile(path.join(output, 'status.json'), 'utf8'));
    assert.equal(report.entries.length, 1084);
    const ui = await win.webContents.executeJavaScript('({button:!!document.getElementById("runFolderBatch"),progress:!!document.getElementById("folderBatchProgress")})');
    assert(ui.button && ui.progress);
    console.log('AUTO BATCH PASS', JSON.stringify({first:first.counts,second:second.counts,output,zipBytes:zip.length}));
    app.exit(0);
  } catch (error) {
    console.error(error.stack);
    app.exit(1);
  }
});
