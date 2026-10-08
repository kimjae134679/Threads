'use strict';
const path=require('node:path'),{pathToFileURL}=require('node:url');
async function runPcReviewEntry({app,args=process.argv}={}){
 const root=app?.isPackaged?path.join(process.resourcesPath,'pc-review'):path.join(__dirname,'..');
 const {runPcReviewCommand}=await import(pathToFileURL(path.join(root,'mobile/android-review/pc/pc-review-runner.mjs')).href);
 const result=await runPcReviewCommand(args);
 console.log(JSON.stringify({status:result.status,...(result.reason?{reason:result.reason}:{}),...(result.reportFile?{reportFile:result.reportFile}:{})}));
 return result;
}
module.exports={runPcReviewEntry};
