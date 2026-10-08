'use strict';
const path=require('node:path');
function editorRoot(){
 const packaged=!!process.versions.electron&&require('electron').app.isPackaged;
 if(packaged){if(!process.resourcesPath)throw Error('설치 리소스 경로 없음');return path.join(process.resourcesPath,'editor');}
 return path.join(__dirname,'..','app');
}
module.exports={editorRoot};
