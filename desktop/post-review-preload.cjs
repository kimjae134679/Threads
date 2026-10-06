'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ThreadsPostReview',Object.freeze({
 list:()=>ipcRenderer.invoke('post-review:list'),
 image:(id,page,version)=>ipcRenderer.invoke('post-review:image',id,page,version),
 save:payload=>ipcRenderer.invoke('post-review:save',payload),
 openFolder:()=>ipcRenderer.invoke('post-review:open-folder'),
 onSelect:handler=>{const listener=(_e,id)=>handler(id);ipcRenderer.on('post-review:select',listener);return ()=>ipcRenderer.removeListener('post-review:select',listener);}
}));
