'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ThreadsCutDesktop', Object.freeze({
  capture: (url) => ipcRenderer.invoke('source-cut:capture', url),
  cancel: () => ipcRenderer.invoke('source-cut:cancel'),
  onProgress: (handler) => {
    const listener = (_event, value) => handler(value);
    ipcRenderer.on('source-cut:progress', listener);
    return () => ipcRenderer.removeListener('source-cut:progress', listener);
  },
}));
