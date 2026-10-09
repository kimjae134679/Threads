'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const HANDLE='@aftertalk2026',SCHEMA='threads-ending-card-v1';
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);return n>>>0;});
function crc32(data){let n=0xffffffff;for(const b of data)n=(n>>>8)^crcTable[(n^b)&255];return (n^0xffffffff)>>>0;}
function portraitPng(data){
 if(!Buffer.isBuffer(data)||data.length<33||data.length>8*1024*1024||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||data.readUInt32BE(8)!==13||data.toString('ascii',12,16)!=='IHDR'||data.readUInt32BE(16)!==1080||data.readUInt32BE(20)!==1440)throw Error('Ending-card PNG must be 1080x1440 portrait and at most 8MiB');
 if(data[24]!==8||![2,6].includes(data[25])||data[26]!==0||data[27]!==0||data[28]!==0)throw Error('Ending-card PNG requires noninterlaced 8-bit RGB or RGBA');
 const chunks=[];let offset=8,started=false,ended=false,complete=false;
 while(offset<data.length){
  if(offset+12>data.length)throw Error('Ending-card PNG truncated chunk');
  const length=data.readUInt32BE(offset),end=offset+12+length;
  if(end>data.length)throw Error('Ending-card PNG truncated chunk data');
  const type=data.toString('ascii',offset+4,offset+8),bytes=data.subarray(offset+8,end-4);
  if(!/^[A-Za-z]{4}$/.test(type)||crc32(data.subarray(offset+4,end-4))!==data.readUInt32BE(end-4))throw Error('Ending-card PNG CRC validation failed');
  if(type==='IHDR'&&(offset!==8||length!==13))throw Error('Ending-card PNG duplicate IHDR');
  if(type==='IDAT'){if(ended)throw Error('Ending-card PNG noncontiguous IDAT');started=true;chunks.push(bytes);}
  else if(started)ended=true;
  if(type==='PLTE'&&(length===0||length>768||length%3))throw Error('Ending-card PNG invalid palette');
  if(type==='IEND'){if(length||!started||end!==data.length)throw Error('Ending-card PNG invalid IEND');complete=true;break;}
  if(/^[A-Z]/.test(type)&&!['IHDR','PLTE','IDAT'].includes(type))throw Error('Ending-card PNG unsupported critical chunk');
  offset=end;
 }
 if(!complete)throw Error('Ending-card PNG missing IDAT or IEND');
 const channels=data[25]===6?4:3,stride=1080*channels,expected=(stride+1)*1440;let scan;
 try{scan=require('node:zlib').inflateSync(Buffer.concat(chunks),{maxOutputLength:expected});}catch{throw Error('Ending-card PNG decode failed');}
 if(scan.length!==expected)throw Error('Ending-card PNG decoded row size mismatch');
 let previous=Buffer.alloc(stride);
 for(let y=0;y<1440;y++){
  const start=y*(stride+1),filter=scan[start],row=Buffer.allocUnsafe(stride);
  if(filter>4)throw Error('Ending-card PNG invalid row filter');
  for(let x=0;x<stride;x++){
   const left=x>=channels?row[x-channels]:0,up=previous[x],corner=x>=channels?previous[x-channels]:0;
   let prediction=0;if(filter===1)prediction=left;else if(filter===2)prediction=up;else if(filter===3)prediction=Math.floor((left+up)/2);else if(filter===4){const p=left+up-corner,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-corner);prediction=a<=b&&a<=c?left:b<=c?up:corner;}
   row[x]=(scan[start+1+x]+prediction)&255;
  }
  previous=row;
 }
}
async function loadEndingCard(config){
 if(config==null||config.enabled===false)return null;
 const a=config.asset;
 if(config.enabled!==true||!a||a.approved!==true||a.handle!==HANDLE||!path.isAbsolute(a.file||'')||!/^([a-f0-9]{64})$/.test(a.sha256||''))throw Error('Approved ending-card asset required: absolute file, sha256, approved=true, handle='+HANDLE);
 for(let p=path.resolve(a.file);;p=path.dirname(p)){if((await fs.lstat(p)).isSymbolicLink())throw Error('Linked ending-card asset refused');if(path.dirname(p)===p)break;}
 const stat=await fs.lstat(a.file);if(!stat.isFile()||stat.size>8*1024*1024)throw Error('Regular ending-card PNG asset required');
 const data=await fs.readFile(a.file);if(hash(data)!==a.sha256)throw Error('Ending-card asset hash changed');portraitPng(data);
 return {schema:SCHEMA,sha256:a.sha256,handle:HANDLE,width:1080,height:1440,approved:true,data};
}
async function appendEndingCard(output,config){
 const asset=await loadEndingCard(config);if(!asset)return output;
 const plan=output.productionPlan,pages=plan?.pages,images=output.images;
 if(!Array.isArray(pages)||!Array.isArray(images)||!images.length||images.length!==pages.length||pages.length>=999)throw Error('Ending-card requires a complete ordered portrait output');
 for(const [i,image]of images.entries()){
  if(pages[i].number!==i+1||pages[i].width!==1080||pages[i].height!==1440||image.name!=='rendered/slide-'+String(i+1).padStart(3,'0')+'.png')throw Error('Ending-card requires complete portrait page order');
  portraitPng(image.data);
 }
 const endingPages=pages.filter(p=>p.role==='ending-card');
 if(plan.endingCard||endingPages.length){
  if(plan.endingCard?.schema!==SCHEMA||plan.endingCard.sha256!==asset.sha256||plan.endingCard.handle!==HANDLE||endingPages.length!==1||pages.at(-1).role!=='ending-card'||hash(images.at(-1).data)!==asset.sha256)throw Error('Ending-card already present but asset or final page differs');
  return output;
 }
 const number=pages.length+1,name='rendered/slide-'+String(number).padStart(3,'0')+'.png';
 const {data,...metadata}=asset;
 const endingCard={...metadata,page:number,name};
 const page={number,role:'ending-card',width:1080,height:1440,operations:[{kind:'image',role:'ending-card',name,x:0,y:0,width:1080,height:1440}],sourceIds:[]};
 const productionPlan={...plan,pages:[...pages,page],endingCard},result={...output,productionPlan,images:[...images,{name,data}]};
 if(!Buffer.isBuffer(output.zip))throw Error('Ending-card requires the original output ZIP');
 const zip=await require('./reflow-review-covers-run.cjs').createZipTools(),entries=await zip.read(output.zip);
 if(!entries.has('manifest.json'))throw Error('Ending-card output manifest required');
 const manifest=JSON.parse(Buffer.from(entries.get('manifest.json')).toString('utf8'));
 manifest.productionPlan=productionPlan;manifest.renderedPages=result.images.length;manifest.endingCard=endingCard;
 entries.set('manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
 const wanted=new Set(result.images.map(i=>i.name));
 for(const n of entries.keys())if(/^rendered\/slide-\d+\.png$/.test(n)&&!wanted.has(n))entries.delete(n);
 for(const image of result.images)entries.set(image.name,image.data);
 result.zip=await zip.zip([...entries].map(([name,data])=>({name,data})));
 return result;
}
module.exports={loadEndingCard,appendEndingCard};
