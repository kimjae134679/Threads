'use strict';
function finishQa({app,BrowserWindow,exitCode}){
 try{for(const window of BrowserWindow.getAllWindows())if(!window.isDestroyed())window.destroy();}
 finally{app.exit(exitCode);}
}
async function reportAndFinishQa({report,onReportError=error=>console.error('QA diagnostic report failed: '+error.message),...options}){
 let failure;try{await report();}catch(error){failure=error;onReportError(error);}finally{finishQa(options);}
 return failure;
}
module.exports={finishQa,reportAndFinishQa};
