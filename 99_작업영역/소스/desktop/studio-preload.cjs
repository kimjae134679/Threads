'use strict';
const {contextBridge,ipcRenderer}=require('electron');
let externalClick=null;
document.addEventListener('click',event=>{
 externalClick=null;
 if(!event.isTrusted||event.button!==0)return;
 const anchor=event.target?.closest?.('a[data-external-link]');
 if(anchor)externalClick={url:anchor.href,at:Date.now()};
},true);
contextBridge.exposeInMainWorld('ThreadsStudioShell',Object.freeze({
 openTool:value=>ipcRenderer.invoke('studio:tool:open',value),
 openExternal:value=>{
  const click=externalClick;externalClick=null;
  if(navigator.userActivation?.isActive!==true||!click||Date.now()-click.at>1000||click.url!==value)return Promise.reject(Error('external_activation_required'));
  return ipcRenderer.invoke('studio:external:open',value);
 }
}));
