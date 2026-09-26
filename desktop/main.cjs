'use strict';
const { app, BrowserWindow, dialog, ipcMain, protocol, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const dns = require('node:dns/promises');
const { captureUrl, capturePage, WIDTH } = require('./capture.cjs');
const { publicAddress } = require('./network.cjs');
const { createReferenceStore } = require('./reference-store.cjs');
protocol.registerSchemesAsPrivileged([{ scheme: 'cut-editor', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
let editor, bundleWindow, activeCapture = null;
const editorUrl = 'cut-editor://app/source-cut-editor.html';
const bundleUrl = 'cut-editor://app/source-batch.html';
const preferences = { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, allowRunningInsecureContent: false };
function trusted(event) {
  if (!editor || event.sender !== editor.webContents || event.senderFrame !== editor.webContents.mainFrame || event.senderFrame.url !== editorUrl) throw new Error('허용되지 않은 요청입니다.');
}
function denyPermissions(ses) {
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
}
async function start() {
  const root = app.isPackaged ? path.join(process.resourcesPath, 'editor') : path.join(__dirname, '..', 'app');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff' };
  const allowed = new Set(['source-cut-editor.html', 'source-cut-editor.css', 'source-cut-editor.js', 'source-community-template.js', 'source-cut-model.js', 'source-cut-composition.js', 'source-cut-history.js', 'source-cut-zip.js', 'source-batch.html', 'source-batch.css', 'source-batch.js', 'source-batch-core.js', 'source-curation.js', 'source-bundle-zip.js', 'source-workflow.js', 'viral-model.js', 'fonts/CarouselSansKR-Regular.woff', 'fonts/CarouselSansKR-Black.woff', 'fonts/CutGothic-ExtraBold.woff']);
  protocol.handle('cut-editor', async (request) => {
    const url = new URL(request.url), name = url.pathname.slice(1);
    if (url.host !== 'app' || !allowed.has(name) || request.method !== 'GET') return new Response('Not found', { status: 404 });
    return new Response(await fs.readFile(path.join(root, name)), { headers: {
      'Content-Type': mime[path.extname(name)],
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' https://cdn.jsdelivr.net; img-src data: blob:; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'",
    } });
  });
  denyPermissions(session.defaultSession);
  session.defaultSession.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ title: '편집 결과 저장', defaultPath: path.join(app.getPath('downloads'), path.basename(item.getFilename())) });
  });
  editor = new BrowserWindow({ width: 1450, height: 960, minWidth: 760, minHeight: 650, title: '원문 컷 편집기', autoHideMenuBar: true,
    webPreferences: { ...preferences, preload: path.join(__dirname, 'preload.cjs') } });
  editor.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  editor.webContents.on('will-navigate', (event) => event.preventDefault());
  editor.webContents.on('will-prevent-unload', (event) => {
    if (dialog.showMessageBoxSync(editor, { type: 'question', buttons: ['편집 계속', '편집 파일 저장 없이 닫기'], defaultId: 0, cancelId: 0, message: '편집 파일을 저장하지 않고 닫을까요? 레퍼런스 기록은 PC에 남깁니다.' }) === 1) {
      const closing = editor;
      closing.webContents.executeJavaScript('window.ThreadsSourceCutEditor.flushHistory()').then(() => { if (!closing.isDestroyed()) closing.destroy(); }).catch(error => dialog.showErrorBox('기록 저장 확인', error.message));
    }
  });
  editor.on('closed', () => { editor = null; if (activeCapture && !activeCapture.isDestroyed()) activeCapture.destroy(); });
  const referenceStore = createReferenceStore(path.join(app.getPath('userData'), 'references'));
  ipcMain.handle('source-cut:save-reference', (event, payload) => { trusted(event); return referenceStore.save(payload); });
  ipcMain.handle('source-cut:open-references', async (event) => { trusted(event); await fs.mkdir(referenceStore.root, { recursive: true }); const error = await shell.openPath(referenceStore.root); if(error) throw new Error(error); });
  ipcMain.handle('source-cut:open-bundle', async event => {
    trusted(event);
    if(bundleWindow && !bundleWindow.isDestroyed()) {bundleWindow.focus();return;}
    bundleWindow=new BrowserWindow({width:1350,height:950,minWidth:760,minHeight:650,title:'원문 ZIP 제작',autoHideMenuBar:true,
      webPreferences:{...preferences}});
    bundleWindow.webContents.setWindowOpenHandler(() => ({action:'deny'}));
    bundleWindow.webContents.on('will-navigate', navigation => navigation.preventDefault());
    bundleWindow.on('closed',()=>{bundleWindow=null;});
    await bundleWindow.loadURL(bundleUrl);
  });
  ipcMain.handle('source-cut:cancel', (event) => { trusted(event); if (activeCapture && !activeCapture.isDestroyed()) activeCapture.destroy(); });
  ipcMain.handle('source-cut:capture', async (event, input) => {
    trusted(event);
    if (activeCapture) return { ok: false, error: '진행 중인 캡처를 기다려주세요.' };
    let captureSession;
    try {
      const url = captureUrl(input);
      captureSession = session.fromPartition('source-capture-' + Date.now(), { cache: false });
      denyPermissions(captureSession);
      captureSession.on('will-download', (downloadEvent) => downloadEvent.preventDefault());
      const hosts = new Map();
      captureSession.webRequest.onBeforeRequest((details, callback) => {
        if (/^(data:|blob:)/.test(details.url)) return callback({ cancel: details.resourceType === 'mainFrame' });
        Promise.resolve().then(async () => {
          const checked = new URL(captureUrl(details.url));
          if (!hosts.has(checked.hostname)) hosts.set(checked.hostname, dns.lookup(checked.hostname, { all: true }).then((records) => records.length > 0 && records.every((r) => publicAddress(r.address))));
          callback({ cancel: !(await hosts.get(checked.hostname)) });
        }).catch(() => callback({ cancel: true }));
      });
      captureSession.webRequest.onHeadersReceived((details, callback) => callback({ cancel: details.resourceType === 'mainFrame' && details.statusCode >= 400 }));
      const win = new BrowserWindow({ show: true, width: WIDTH, height: 900, useContentSize: true,
        webPreferences: { ...preferences, session: captureSession, backgroundThrottling: false } });
      activeCapture = win;
      win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      win.webContents.setAudioMuted(true);
      const result = await capturePage(win, url, (value) => {
        if (editor && !editor.isDestroyed()) editor.webContents.send('source-cut:progress', value);
      });
      return { ok: true, ...result };
    } catch (error) {
      return { ok: false, error: /ERR_|destroyed|disposed|closed|cancel/i.test(error.message)
        ? '캡처가 취소됐거나 페이지를 열 수 없습니다. 링크·인터넷 연결·접근 제한을 확인하세요.' : error.message };
    } finally {
      if (activeCapture && !activeCapture.isDestroyed()) activeCapture.destroy();
      activeCapture = null;
      if (captureSession) await captureSession.clearStorageData().catch(() => {});
    }
  });
  await editor.loadURL(editorUrl);
}
app.whenReady().then(start).catch((error) => { dialog.showErrorBox('컷 편집기 실행 실패', error.message); app.quit(); });
app.on('window-all-closed', () => app.quit());
