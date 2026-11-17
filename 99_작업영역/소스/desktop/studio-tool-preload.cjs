'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ThreadsStudioTool',Object.freeze({
 context:()=>ipcRenderer.invoke('studio:tool:context'),
 generate:()=>ipcRenderer.invoke('studio:tool:generate'),
 handoff:version=>ipcRenderer.invoke('studio:tool:handoff',version),
 saveSelection:plan=>ipcRenderer.invoke('studio:tool:save-selection',plan),
 saveProject:project=>ipcRenderer.invoke('studio:tool:save-project',project),
 switchTool:tool=>ipcRenderer.invoke('studio:tool:switch',tool),
 back:()=>ipcRenderer.invoke('studio:tool:back')
}));
contextBridge.exposeInMainWorld('ThreadsCutDesktop',Object.freeze({
 saveReference:payload=>ipcRenderer.invoke('studio:tool:save-reference',payload),
 openSourceBundle:()=>ipcRenderer.invoke('studio:tool:switch','production'),
 openPostReview:()=>ipcRenderer.invoke('studio:tool:back')
}));
