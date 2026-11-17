'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ThreadsStudioShell',Object.freeze({openTool:value=>ipcRenderer.invoke('studio:tool:open',value)}));
