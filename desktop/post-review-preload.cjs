'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ThreadsPostReview',Object.freeze({
 list:()=>ipcRenderer.invoke('post-review:list'),
 image:(id,page,version)=>ipcRenderer.invoke('post-review:image',id,page,version),
 save:payload=>ipcRenderer.invoke('post-review:save',payload),
 visit:payload=>ipcRenderer.invoke('post-review:visit',payload),
 decide:payload=>ipcRenderer.invoke('post-review:decide',payload),
 random:payload=>ipcRenderer.invoke('post-review:random',payload),
 openFolder:()=>ipcRenderer.invoke('post-review:open-folder'),
 openHistory:()=>ipcRenderer.invoke('post-review:open-history'),
 onFilter:handler=>{const listener=(_e,value)=>handler(value);ipcRenderer.on('post-review:filter',listener);return ()=>ipcRenderer.removeListener('post-review:filter',listener);},
 onSelect:handler=>{const listener=(_e,id)=>handler(id);ipcRenderer.on('post-review:select',listener);return ()=>ipcRenderer.removeListener('post-review:select',listener);}
}));
