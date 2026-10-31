'use strict';
const fs=require('node:fs/promises');
const {randomUUID}=require('node:crypto');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function writeAtomic(file,data,{io=fs,pause=wait,attempts=8}={}) {
  const temp=file+'.'+process.pid+'.'+randomUUID()+'.tmp';
  try {
    await io.writeFile(temp,data,'utf8');
    for(let attempt=0;attempt<attempts;attempt++) {
      try {await io.rename(temp,file);return;}
      catch(error) {
        if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt===attempts-1)throw error;
        await pause(Math.min(50*2**attempt,800));
      }
    }
  } finally {
    await io.rm(temp,{force:true}).catch(()=>{});
  }
}
module.exports={writeAtomic};
