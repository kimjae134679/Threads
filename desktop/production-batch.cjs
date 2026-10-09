'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
async function ensureProductionBatch(work,requestSha256,number=1){
 const file=path.join(work,'production-batch.json');
 try{const batch=JSON.parse(await fs.readFile(file,'utf8'));if(batch.schemaVersion!==1||batch.requestSha256!==requestSha256||typeof batch.id!=='string'||!Number.isFinite(Date.parse(batch.startedAt)))throw Error('Production batch identity mismatch');return batch;}catch(e){if(e.code!=='ENOENT')throw e;}
 if(!Number.isSafeInteger(number)||number<1)throw Error('Production batch number required');const batch={schemaVersion:1,number,id:'production-'+crypto.randomUUID(),startedAt:new Date().toISOString(),requestSha256};await fs.writeFile(file,JSON.stringify(batch,null,2)+'\n',{flag:'wx'});return batch;
}
module.exports={ensureProductionBatch};
