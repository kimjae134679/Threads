import fs from 'node:fs';
import crypto from 'node:crypto';
const file=process.argv[2]; if(!file) throw new Error('usage: node webp-intake-prototype.mjs <webp>');
const b=fs.readFileSync(file); if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP') throw new Error('not webp');
const kind=b.toString('ascii',12,16); let width,height;
if(kind==='VP8X'){ width=1+b.readUIntLE(24,3); height=1+b.readUIntLE(27,3); }
else if(kind==='VP8 '){ if(b[23]!==0x9d||b[24]!==0x01||b[25]!==0x2a) throw new Error('VP8 frame header missing'); width=b.readUInt16LE(26)&0x3fff; height=b.readUInt16LE(28)&0x3fff; }
else if(kind==='VP8L'){ if(b[20]!==0x2f) throw new Error('VP8L signature missing'); const bits=b.readUInt32LE(21); width=1+(bits&0x3fff); height=1+((bits>>14)&0x3fff); }
else throw new Error(`unsupported WEBP chunk ${kind}`);
const out={temporaryTestOnly:true,publicationAllowed:false,type:'TEMP_TEST_ONLY_WEBP_INTAKE_PROTOTYPE',file,byteLength:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),webpChunk:kind,width,height,provenancePreserved:true,conversionPerformed:false,note:'Prototype only. Demonstrates native WebP dimension intake without converting or mutating source bytes. Does not imply rights/privacy/moderation/A1/P1.'};
console.log(JSON.stringify(out,null,2));
