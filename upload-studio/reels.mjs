// Offline-only image-to-video preparation. No HTTP, OAuth, installation or audio download.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
export const REEL_LIMITS=Object.freeze({max_bytes:300*1024*1024,min_seconds:3,max_seconds:900,width:1080,height:1920,fps:30,seconds_per_image:3});
const fail=code=>{throw Object.assign(new Error(code),{code,status:400});};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const validId=id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id);
const cancelled=signal=>{if(signal?.aborted)fail('reel_cancelled');};
const allowedImage=new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp']]);
function imageHeader(bytes,mime){
 return mime==='image/jpeg'?bytes.subarray(0,3).equals(Buffer.from([255,216,255])):
 mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
 mime==='image/webp'?bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP':false;
}
function inside(root,file){const rel=path.relative(root,file);if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))fail('reel_path_invalid');return file;}
async function ownedFolder(root,name){
 await fs.mkdir(path.resolve(root),{recursive:true,mode:0o700});
 const base=await fs.realpath(path.resolve(root)),folder=inside(base,path.join(base,name));
 try{await fs.mkdir(folder,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw e;}
 const stat=await fs.lstat(folder);
 if(stat.isSymbolicLink()||!stat.isDirectory()||await fs.realpath(folder)!==folder)fail('reel_path_invalid');
 return folder;
}
async function regularFile(file,limit){
 const stat=await fs.lstat(file);
 if(!stat.isFile()||stat.isSymbolicLink())fail('reel_path_invalid');
 if(!stat.size||stat.size>limit)fail('video_size_limit');
 return fs.readFile(file);
}
async function durableWrite(file,bytes){
 const handle=await fs.open(file,'wx',0o600);
 try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}
}
async function removeStage(base,stage){inside(base,stage);await fs.rm(stage,{recursive:true,force:true});}
function boxes(bytes,start=0,end=bytes.length){
 const result=[];
 for(let at=start;at<end;){
  if(end-at<8)fail('video_container_invalid');
  let size=bytes.readUInt32BE(at),header=8;
  if(size===1){if(end-at<16)fail('video_container_invalid');const big=bytes.readBigUInt64BE(at+8);if(big>BigInt(Number.MAX_SAFE_INTEGER))fail('video_container_invalid');size=Number(big);header=16;}
  else if(size===0)size=end-at;
  if(size<header||at+size>end)fail('video_container_invalid');
  result.push({type:bytes.toString('ascii',at+4,at+8),start:at,data:at+header,end:at+size});
  at+=size;
 }
 return result;
}
function child(bytes,parent,type){return boxes(bytes,parent.data,parent.end).find(b=>b.type===type);}
function duration(bytes,mvhd){
 if(!mvhd||mvhd.end-mvhd.data<20)fail('video_container_invalid');
 const v=bytes[mvhd.data],scaleAt=mvhd.data+(v===1?20:12),durationAt=scaleAt+4;
 if(![0,1].includes(v)||durationAt+(v===1?8:4)>mvhd.end)fail('video_container_invalid');
 const scale=bytes.readUInt32BE(scaleAt),ticks=v===1?Number(bytes.readBigUInt64BE(durationAt)):bytes.readUInt32BE(durationAt);
 if(!scale||!Number.isSafeInteger(ticks))fail('video_container_invalid');
 return ticks/scale;
}
export function inspectVideoContainer(value,mime='video/mp4'){
 const bytes=Buffer.isBuffer(value)?value:Buffer.from(value||[]);
 if(!bytes.length||bytes.length>REEL_LIMITS.max_bytes)fail('video_size_limit');
 if(!['video/mp4','video/quicktime'].includes(mime))fail('video_format_invalid');
 const top=boxes(bytes),ftyp=top.find(b=>b.type==='ftyp'),moov=top.find(b=>b.type==='moov'),mdat=top.find(b=>b.type==='mdat');
 if(!ftyp||ftyp.end-ftyp.data<8||!moov||!mdat||mdat.end===mdat.data)fail('video_container_invalid');
 const brand=bytes.toString('ascii',ftyp.data,ftyp.data+4),container=brand==='qt  '?'mov':'mp4';
 if(container==='mp4'&&!/^(?:isom|iso[2-9]|mp4[12]|avc1|M4V |dash)$/.test(brand)||container==='mov'&&mime!=='video/quicktime'||container==='mp4'&&mime!=='video/mp4')fail('video_format_invalid');
 const seconds=duration(bytes,child(bytes,moov,'mvhd'));
 if(!Number.isFinite(seconds)||seconds<3||seconds>900)fail('video_duration_invalid');
 let video=null;const audio=[];
 for(const trak of boxes(bytes,moov.data,moov.end).filter(b=>b.type==='trak')){
  const mdia=child(bytes,trak,'mdia');if(!mdia)continue;
  const hdlr=child(bytes,mdia,'hdlr');if(!hdlr||hdlr.end-hdlr.data<12)fail('video_container_invalid');
  const kind=bytes.toString('ascii',hdlr.data+8,hdlr.data+12),minf=child(bytes,mdia,'minf'),stbl=minf&&child(bytes,minf,'stbl'),stsd=stbl&&child(bytes,stbl,'stsd');
  if(!stsd||stsd.end-stsd.data<8)fail('video_container_invalid');
  const entries=boxes(bytes,stsd.data+8,stsd.end);
  if(bytes.readUInt32BE(stsd.data+4)!==entries.length||entries.length!==1)fail('video_container_invalid');
  const entry=entries[0];
  if(kind==='vide'){
   if(video||entry.end-entry.start<36||!['avc1','avc3','hvc1','hev1'].includes(entry.type))fail('video_codec_metadata_invalid');
   video={width:bytes.readUInt16BE(entry.start+32),height:bytes.readUInt16BE(entry.start+34),video_codec:entry.type};
  }else if(kind==='soun'){if(entry.type!=='mp4a')fail('video_codec_metadata_invalid');audio.push(entry.type);}
 }
 if(!video)fail('video_track_required');
 if(!video.width||!video.height||video.width>1920||video.width/video.height<0.01||video.width/video.height>10)fail('video_dimensions_invalid');
 return {container,duration_seconds:seconds,...video,audio_codecs:audio,validation:'container-metadata-only',codec_decoded:false,needs_playback_review:true,rights_review_required:true};
}
function processEnv(){
 const env={};
 // Read only runtime keys. Credentials and arbitrary inherited variables are never copied.
 for(const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL'])if(typeof process.env[key]==='string')env[key]=process.env[key];
 return env;
}
export function runLocalProcess(command,args,{cwd,signal,env=processEnv()}={}){
 cancelled(signal);
 return new Promise((resolve,reject)=>{
  let childProcess,aborted=false,forceTimer=null;
  const abort=()=>{aborted=true;childProcess?.kill('SIGTERM');forceTimer=setTimeout(()=>childProcess?.kill('SIGKILL'),2000);forceTimer.unref?.();};
  const cleanup=()=>{signal?.removeEventListener('abort',abort);if(forceTimer)clearTimeout(forceTimer);};
  try{childProcess=spawn(command,args,{cwd,env,shell:false,windowsHide:true,stdio:['ignore','ignore','ignore']});}catch(e){cleanup();reject(Object.assign(new Error(e.code==='ENOENT'?'ffmpeg_not_installed':'ffmpeg_failed'),{code:e.code==='ENOENT'?'ffmpeg_not_installed':'ffmpeg_failed'}));return;}
  childProcess.once('error',e=>{cleanup();const code=aborted?'reel_cancelled':e.code==='ENOENT'?'ffmpeg_not_installed':'ffmpeg_failed';reject(Object.assign(new Error(code),{code,status:400}));});
  childProcess.once('close',code=>{cleanup();if(aborted||signal?.aborted)reject(Object.assign(new Error('reel_cancelled'),{code:'reel_cancelled',status:400}));else if(code!==0)reject(Object.assign(new Error('ffmpeg_failed'),{code:'ffmpeg_failed',status:400}));else resolve({code:0});});
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 });
}
async function videoBytes({bytes,stream},signal){
 if((bytes!==undefined)===(stream!==undefined))fail('video_input_invalid');
 if(bytes!==undefined){if(!(bytes instanceof Uint8Array))fail('video_input_invalid');if(!bytes.byteLength||bytes.byteLength>REEL_LIMITS.max_bytes)fail('video_size_limit');cancelled(signal);return Buffer.from(bytes);}
 if(!stream||typeof stream[Symbol.asyncIterator]!=='function')fail('video_input_invalid');
 let size=0;const chunks=[];
 for await(const part of stream){cancelled(signal);if(!(part instanceof Uint8Array))fail('video_input_invalid');size+=part.length;if(size>REEL_LIMITS.max_bytes)fail('video_size_limit');chunks.push(Buffer.from(part));}
 if(!size)fail('video_size_limit');cancelled(signal);return Buffer.concat(chunks,size);
}
export class LocalVideoAssets {
 constructor(root){this.root=path.resolve(root);}
 async add(input){
  if(!input||typeof input!=='object')fail('video_input_invalid');
  const bytes=await videoBytes(input,input.signal),mime=input.mime||'video/mp4',metadata=inspectVideoContainer(bytes,mime),asset_id=hash(bytes);
  const asset={asset_id,mime,bytes:bytes.length,name:String(input.name||'video').replace(/[\\/\0]/g,'_').slice(0,200),metadata};
  const base=await ownedFolder(this.root,'video-assets'),stage=await fs.mkdtemp(path.join(base,'.candidate-')),target=inside(base,path.join(base,asset_id));
  try{
   await durableWrite(path.join(stage,'video'),bytes);await durableWrite(path.join(stage,'metadata.json'),JSON.stringify(asset));cancelled(input.signal);
   try{await fs.rename(stage,target);}catch(e){if(!['EEXIST','ENOTEMPTY','EPERM'].includes(e.code))throw e;const existing=await this.read(asset_id);if(!existing.bytes.equals(bytes))fail('video_hash_mismatch');return existing.asset;}
   return asset;
  }finally{await removeStage(base,stage);}
 }
 async read(assetId){
  if(!validId(assetId))fail('video_asset_not_found');
  const base=await ownedFolder(this.root,'video-assets'),folder=inside(base,path.join(base,assetId));
  let stat;try{stat=await fs.lstat(folder);}catch(e){if(e.code==='ENOENT')fail('video_asset_not_found');throw e;}
  if(stat.isSymbolicLink()||!stat.isDirectory()||await fs.realpath(folder)!==folder)fail('reel_path_invalid');
  const bytes=await regularFile(path.join(folder,'video'),REEL_LIMITS.max_bytes);
  if(hash(bytes)!==assetId)fail('video_hash_mismatch');
  let asset;try{asset=JSON.parse((await regularFile(path.join(folder,'metadata.json'),65536)).toString('utf8'));}catch(e){if(e.code)throw e;fail('video_metadata_invalid');}
  if(!['video/mp4','video/quicktime'].includes(asset.mime))fail('video_metadata_invalid');
  const metadata=inspectVideoContainer(bytes,asset.mime);
  if(asset.asset_id!==assetId||asset.bytes!==bytes.length||JSON.stringify(asset.metadata)!==JSON.stringify(metadata))fail('video_metadata_invalid');
  return {asset,bytes};
 }
 async verify(video){if(!video||!validId(video.asset_id)||!['video/mp4','video/quicktime'].includes(video.mime))fail('reel_video_required');const {asset}=await this.read(video.asset_id);if(asset.mime!==video.mime)fail('video_mime_mismatch');return asset;}
}
export async function renderReel({post,assets,root,signal,ffmpeg='ffmpeg',runProcess=runLocalProcess}){
 cancelled(signal);
 const images=post?.images;
 if(!Array.isArray(images)||!images.length)fail('reel_images_required');
 const seconds=images.length*3;if(seconds>900)fail('reel_duration_invalid');
 if(images.some((image,i)=>!validId(image.asset_id)||image.order!==i+1||!allowedImage.has(image.mime)))fail('reel_images_invalid');
 if(!assets||typeof assets.read!=='function'||typeof root!=='string'||!root||typeof ffmpeg!=='string'||!ffmpeg||typeof runProcess!=='function')fail('reel_input_invalid');
 const base=await ownedFolder(root,'reel-staging'),stage=await fs.mkdtemp(path.join(base,'render-')),options={cwd:stage,env:processEnv(),signal,shell:false};
 const execute=async args=>{cancelled(signal);try{const result=await runProcess(ffmpeg,args,options);cancelled(signal);if(result?.code!==undefined&&result.code!==0)fail('ffmpeg_failed');}catch(e){if(signal?.aborted)fail('reel_cancelled');if(e.code==='ENOENT')fail('ffmpeg_not_installed');throw e;}};
 try{
  // Copy/verify all originals before any process. Keep one image in memory at a time.
  const sources=[];
  for(let i=0;i<images.length;i++){
   cancelled(signal);const image=images[i],value=await assets.read(image.asset_id),bytes=Buffer.from(value.bytes||[]);
   if(!bytes.length||bytes.length>25*1024*1024||hash(bytes)!==image.asset_id||value.asset?.mime!==image.mime||!imageHeader(bytes,image.mime))fail('reel_source_changed');
   const stem='slide-'+String(i+1).padStart(4,'0'),copied='source-'+stem+'.'+allowedImage.get(image.mime),output=stem+'.png';
   await durableWrite(path.join(stage,copied),bytes);sources.push({copied,output});
  }
  const frames=[];
  for(const {copied,output} of sources){
   await execute(['-nostdin','-hide_banner','-loglevel','error','-y','-protocol_whitelist','file,pipe','-i',copied,'-frames:v','1','-vf','scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1','-c:v','png','-pix_fmt','rgb24','-f','image2','-update','1','-protocol_whitelist','file,pipe',output]);
   const frame=await regularFile(path.join(stage,output),25*1024*1024);if(!imageHeader(frame,'image/png'))fail('reel_frame_invalid');frames.push(output);
  }
  const manifest='ffconcat version 1.0\n'+frames.map(name=>"file '"+name+"'\nduration 3\n").join('')+"file '"+frames.at(-1)+"'\n";
  await durableWrite(path.join(stage,'slides.ffconcat'),manifest);
  await execute(['-nostdin','-hide_banner','-loglevel','error','-y','-f','concat','-safe','1','-protocol_whitelist','file,pipe','-i','slides.ffconcat','-vf','fps=30,setsar=1','-r','30','-c:v','libx264','-pix_fmt','yuv420p','-an','-t',String(seconds),'-fs',String(REEL_LIMITS.max_bytes+1),'-movflags','+faststart','-f','mp4','-protocol_whitelist','file,pipe','reel.mp4']);
  const bytes=await regularFile(path.join(stage,'reel.mp4'),REEL_LIMITS.max_bytes),metadata=inspectVideoContainer(bytes,'video/mp4');
  if(metadata.width!==1080||metadata.height!==1920||Math.abs(metadata.duration_seconds-seconds)>1/30+0.001||metadata.audio_codecs.length||!['avc1','avc3'].includes(metadata.video_codec))fail('reel_output_invalid');
  cancelled(signal);const asset=await new LocalVideoAssets(root).add({bytes,mime:'video/mp4',name:'reel.mp4',signal});
  return {asset,bytes,mime:'video/mp4',metadata:{...metadata,requested_fps:30,source_images:images.map(image=>image.asset_id)},externalCalls:0};
 }finally{await removeStage(base,stage);}
}
export function buildReelDryRun({caption,videoUrl,video}){
 if(!video||!validId(video.asset_id)||!['video/mp4','video/quicktime'].includes(video.mime)||!video.metadata||!Number.isFinite(video.metadata.duration_seconds)||video.metadata.duration_seconds<3||video.metadata.duration_seconds>900||!video.metadata.width||!video.metadata.height)fail('reel_video_required');
 if(typeof caption!=='string'||[...caption].length>2200)fail('reel_caption_limit');
 let url;try{url=new URL(videoUrl);}catch{fail('reel_public_video_required');}
 if(url.protocol!=='https:'||url.username||url.password)fail('reel_public_video_required');
 return {dryRun:true,externalCalls:0,kind:'instagram-reel',blocked_by:['account_unconnected','rights_review_required','playback_review_required'],steps:[
  {method:'POST',path:'/<IG_USER_ID>/media',params:{media_type:'REELS',video_url:url.href,caption},executed:false},
  {method:'GET',path:'/<IG_CONTAINER_ID>',params:{fields:'status_code'},required_status:'FINISHED',executed:false},
  {method:'POST',path:'/<IG_USER_ID>/media_publish',params:{creation_id:'<IG_CONTAINER_ID>'},requires:'FINISHED',executed:false}
 ]};
}
