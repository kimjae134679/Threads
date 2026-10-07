'use strict';
const path=require('node:path'),fs=require('node:fs');
const MATERIAL_ROOT='D:\\A_KJ\\AI\\Projects\\Threads\\자료';
function getMaterialRoot(app){
 const test=process.env.THREADS_TEST_MATERIAL_ROOT;
 if(!app.isPackaged&&test){if(!path.isAbsolute(test))throw Error('Test material root must be absolute.');return path.resolve(test);}
 if(app.isPackaged&&typeof app.getPath==='function'){
  const config=path.join(path.dirname(app.getPath('exe')),'Threads-Cut-Editor.materials.json');
  if(fs.existsSync(config)){
   const data=JSON.parse(fs.readFileSync(config,'utf8'));
   if(typeof data.materialRoot!=='string'||!path.isAbsolute(data.materialRoot)||!fs.existsSync(data.materialRoot)||!fs.statSync(data.materialRoot).isDirectory())throw Error('검수 자료 폴더가 없거나 경로가 올바르지 않습니다.');
   return path.resolve(data.materialRoot);
  }
 }
 return MATERIAL_ROOT;
}
module.exports={MATERIAL_ROOT,getMaterialRoot};
