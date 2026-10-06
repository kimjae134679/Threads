'use strict';
const path=require('node:path');
const MATERIAL_ROOT='D:\\A_KJ\\AI\\Projects\\Threads\\자료';
function getMaterialRoot(app){
 const test=process.env.THREADS_TEST_MATERIAL_ROOT;
 if(!app.isPackaged&&test){if(!path.isAbsolute(test))throw Error('Test material root must be absolute.');return path.resolve(test);}
 return MATERIAL_ROOT;
}
module.exports={MATERIAL_ROOT,getMaterialRoot};
