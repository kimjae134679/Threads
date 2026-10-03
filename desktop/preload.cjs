'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ThreadsCutDesktop', Object.freeze({
  capture: (url) => ipcRenderer.invoke('source-cut:capture', url),
  saveReference: (payload) => ipcRenderer.invoke('source-cut:save-reference', payload),
  openReferences: () => ipcRenderer.invoke('source-cut:open-references'),
  openSourceBundle: () => ipcRenderer.invoke('source-cut:open-bundle'),
  openSavedMaterials: () => ipcRenderer.invoke('source-cut:open-saved-materials'),
  runFolderBatch: (options) => ipcRenderer.invoke('source-cut:run-folder-batch', options),
  batchReport: () => ipcRenderer.invoke('source-cut:batch-report'),
  openBatchEntry: (id,kind) => ipcRenderer.invoke('source-cut:open-batch-entry',id,kind),
  batchPreview: (id) => ipcRenderer.invoke('source-cut:batch-preview',id),
  cancelFolderBatch: () => ipcRenderer.invoke('source-cut:cancel-folder-batch'),
  openBatchResults: () => ipcRenderer.invoke('source-cut:open-batch-results'),
  onBatchProgress: (handler) => {
    const listener = (_event, value) => handler(value);
    ipcRenderer.on('source-cut:batch-progress', listener);
    return () => ipcRenderer.removeListener('source-cut:batch-progress', listener);
  },
  cancel: () => ipcRenderer.invoke('source-cut:cancel'),
  onProgress: (handler) => {
    const listener = (_event, value) => handler(value);
    ipcRenderer.on('source-cut:progress', listener);
    return () => ipcRenderer.removeListener('source-cut:progress', listener);
  },
}));
