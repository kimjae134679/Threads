'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const {receiveImage}=require('./image-file-receiver.cjs');
async function main(){
 const file=process.argv[2];if(!file||!path.isAbsolute(file))throw Error('원본 수신 요청 JSON 절대 경로 필요');
 const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>64*1024)throw Error('원본 수신 요청 형식/크기');
 const result=await receiveImage(JSON.parse(await fs.readFile(file,'utf8')));
 console.log(JSON.stringify(result));process.exitCode=result.state==='held'?2:result.state==='skipped_running'?3:0;
}
if(require.main===module)main().catch(e=>{console.error(JSON.stringify({state:'held',reason:e.message,regenerationRequested:false,publicationAllowed:false}));process.exitCode=2;});
module.exports={main};
