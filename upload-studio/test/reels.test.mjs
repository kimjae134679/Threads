import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {renderReel,LocalVideoAssets,inspectVideoContainer,buildReelDryRun,runLocalProcess} from '../reels.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
const jpeg=Buffer.from([255,216,255,0,0,0]);
const webp=Buffer.from('RIFF0000WEBPfixture');
function box(name,body){const h=Buffer.alloc(8);h.writeUInt32BE(body.length+8);h.write(name,4,'ascii');return Buffer.concat([h,body]);}
// Structural fixture only: it is deliberately not a playable/decoded video.
function movie({seconds=6,width=1080,height=1920,brand='isom',codec='avc1'}={}){
 const mvhd=Buffer.alloc(100);mvhd.writeUInt32BE(1000,12);mvhd.writeUInt32BE(seconds*1000,16);
 const hdlr=Buffer.alloc(24);hdlr.write('vide',8,'ascii');
 const sample=Buffer.alloc(78);sample.writeUInt16BE(width,24);sample.writeUInt16BE(height,26);
 const stsd=Buffer.alloc(8);stsd.writeUInt32BE(1,4);
 const trak=box('trak',box('mdia',Buffer.concat([box('hdlr',hdlr),box('minf',box('stbl',box('stsd',Buffer.concat([stsd,box(codec,sample)]))))])));
 return Buffer.concat([box('ftyp',Buffer.concat([Buffer.from(brand),Buffer.alloc(4),Buffer.from(brand)])),box('moov',Buffer.concat([box('mvhd',mvhd),trak])),box('mdat',Buffer.from([1,2,3,4]))]);
}
async function sandbox(t){
 const parent=await fs.realpath(os.tmpdir()),root=await fs.mkdtemp(path.join(parent,'upload-studio-reels-test-'));
 t.after(async()=>{const rel=path.relative(parent,root);assert.ok(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel));await fs.rm(root,{recursive:true,force:true});});
 return root;
}
function sourceAssets(items=[{bytes:jpeg,mime:'image/jpeg'},{bytes:webp,mime:'image/webp'}]){
 const values=new Map(items.map(v=>[sha(v.bytes),{asset:{asset_id:sha(v.bytes),mime:v.mime},bytes:v.bytes}]));
 return {images:items.map((v,i)=>({asset_id:sha(v.bytes),mime:v.mime,order:i+1})),assets:{async read(id){const v=values.get(id);if(!v)throw new Error('missing');return v;}}};
}
function fakeEncoder(seconds=6,requests=[]){
 return async(command,args,options)=>{
  assert.equal(options.shell,false);assert.equal(options.env.CODEX_TEST_SECRET,undefined);
  const output=path.resolve(options.cwd,args.at(-1));requests.push({command,args,options});
  if(output.endsWith('.png'))await fs.writeFile(output,png);
  else await fs.writeFile(output,movie({seconds}));
  return {code:0};
 };
}

test('mixed stored images become ordered silent MP4 without changing source bytes',async t=>{
 const root=await sandbox(t),sources=sourceAssets(),before=sources.images.map(x=>x.asset_id),requests=[];
 const result=await renderReel({post:{images:sources.images},assets:sources.assets,root,runProcess:fakeEncoder(6,requests)});
 assert.equal(result.mime,'video/mp4');assert.equal(result.externalCalls,0);
 assert.equal(result.metadata.duration_seconds,6);assert.equal(result.metadata.width,1080);assert.equal(result.metadata.height,1920);
 assert.equal(result.metadata.requested_fps,30);assert.equal(result.metadata.needs_playback_review,true);
 assert.deepEqual(result.metadata.source_images,before);
 assert.deepEqual(sources.images.map(x=>x.asset_id),before);
 for(const frame of requests.slice(0,-1)){assert.equal(frame.args[frame.args.indexOf('-pix_fmt')+1],'rgb24');assert.match(frame.args[frame.args.indexOf('-vf')+1],/pad=1080:1920/);}
 const final=requests.at(-1);
 assert.equal(final.args[final.args.indexOf('-c:v')+1],'libx264');
 assert.ok(final.args.includes('-an'));assert.ok(final.args.includes('file,pipe'));
 assert.equal(final.args[final.args.indexOf('-fs')+1],'314572801');
 assert.equal(final.options.cwd,requests[0].options.cwd);
 const stored=await new LocalVideoAssets(root).read(result.asset.asset_id);
 assert.deepEqual(stored.bytes,result.bytes);
 assert.equal((await fs.readdir(path.join(root,'reel-staging'))).length,0);
});
test('source hash/order/mime errors stop before starting ffmpeg',async t=>{
 const root=await sandbox(t),source=sourceAssets([{bytes:png,mime:'image/png'}]);
 await assert.rejects(renderReel({post:{images:[{...source.images[0],order:2}]},assets:source.assets,root,runProcess:()=>assert.fail('must not run')}),{code:'reel_images_invalid'});
 await assert.rejects(renderReel({post:{images:source.images},assets:{read:async()=>({asset:{mime:'image/png'},bytes:jpeg})},root,runProcess:()=>assert.fail('must not run')}),{code:'reel_source_changed'});
});
test('more than 15 minutes and absent images cannot become a reel',async t=>{
 const root=await sandbox(t),source=sourceAssets([{bytes:png,mime:'image/png'}]);
 await assert.rejects(renderReel({post:{images:[]},assets:source.assets,root}),{code:'reel_images_required'});
 const images=Array.from({length:301},(_,i)=>({...source.images[0],order:i+1}));
 await assert.rejects(renderReel({post:{images},assets:source.assets,root}),{code:'reel_duration_invalid'});
});
test('cancellation is propagated and removes incomplete staging without publishing a video',async t=>{
 const root=await sandbox(t),source=sourceAssets(),controller=new AbortController();
 await assert.rejects(renderReel({post:{images:source.images},assets:source.assets,root,signal:controller.signal,runProcess:async(_cmd,_args,options)=>{
  assert.equal(options.signal,controller.signal);controller.abort();return {code:0};
 }}),{code:'reel_cancelled'});
 assert.equal((await fs.readdir(path.join(root,'reel-staging'))).length,0);
 await assert.rejects(fs.stat(path.join(root,'video-assets')),{code:'ENOENT'});
});
test('pre-aborted render never reads images or starts a process',async t=>{
 const root=await sandbox(t),controller=new AbortController();controller.abort();
 await assert.rejects(renderReel({post:{images:[{asset_id:'a'.repeat(64),order:1,mime:'image/png'}]},assets:{read:()=>assert.fail('must not read')},root,signal:controller.signal}),{code:'reel_cancelled'});
});
test('invalid/oversized encoder output is rejected without final assets',async t=>{
 const root=await sandbox(t),source=sourceAssets();
 await assert.rejects(renderReel({post:{images:source.images},assets:source.assets,root,runProcess:async(_c,args,options)=>{
  const output=path.resolve(options.cwd,args.at(-1));
  await fs.writeFile(output,output.endsWith('.png')?png:Buffer.from('not mp4'));return {code:0};
 }}),{code:'video_container_invalid'});
 await assert.rejects(renderReel({post:{images:source.images},assets:source.assets,root,runProcess:async(_c,args,options)=>{
  const output=path.resolve(options.cwd,args.at(-1));
  if(output.endsWith('.png'))await fs.writeFile(output,png);
  else {const f=await fs.open(output,'w');try{await f.truncate(300*1024*1024+1);}finally{await f.close();}}
  return {code:0};
 }}),{code:'video_size_limit'});
});
test('video store verifies content hashes and rejects tampering and image placeholders',async t=>{
 const root=await sandbox(t),videos=new LocalVideoAssets(root),bytes=movie({seconds:3});
 const asset=await videos.add({bytes,mime:'video/mp4',name:'reel.mp4'});
 assert.equal((await videos.verify(asset)).asset_id,sha(bytes));
 await assert.rejects(videos.add({bytes:png,mime:'video/mp4'}),{code:'video_container_invalid'});
 await fs.writeFile(path.join(root,'video-assets',asset.asset_id,'video'),movie({seconds:4}));
 await assert.rejects(videos.read(asset.asset_id),{code:'video_hash_mismatch'});
 await assert.rejects(videos.read('../outside'),{code:'video_asset_not_found'});
});
test('video metadata bounds and MOV container are validated without claiming codec decoding',()=>{
 const info=inspectVideoContainer(movie({seconds:3,brand:'qt  '}),'video/quicktime');
 assert.equal(info.container,'mov');assert.equal(info.validation,'container-metadata-only');
 assert.equal(info.needs_playback_review,true);assert.equal(info.codec_decoded,false);
 assert.throws(()=>inspectVideoContainer(movie({seconds:2}),'video/mp4'),{code:'video_duration_invalid'});
 assert.throws(()=>inspectVideoContainer(movie({seconds:901}),'video/mp4'),{code:'video_duration_invalid'});
 assert.throws(()=>inspectVideoContainer(movie({width:1921}),'video/mp4'),{code:'video_dimensions_invalid'});
});
test('stream input is capped while reading and publishes complete hash-owned assets',async t=>{
 const root=await sandbox(t),videos=new LocalVideoAssets(root),bytes=movie();
 async function* valid(){yield bytes.subarray(0,20);yield bytes.subarray(20);}
 assert.equal((await videos.add({stream:valid(),mime:'video/mp4'})).asset_id,sha(bytes));
 async function* huge(){for(let i=0;i<301;i++)yield Buffer.alloc(1024*1024);}
 await assert.rejects(videos.add({stream:huge(),mime:'video/mp4'}),{code:'video_size_limit'});
});
test('existing staging symlink cannot redirect renderer outside its owned root',async t=>{
 const root=await sandbox(t),source=sourceAssets(),outside=await fs.mkdtemp(path.join(root,'other-'));
 try{await fs.symlink(outside,path.join(root,'reel-staging'),process.platform==='win32'?'junction':'dir');}catch(e){if(['EPERM','EACCES','ENOTSUP'].includes(e.code)){t.skip('symlink privilege unavailable');return;}throw e;}
 await assert.rejects(renderReel({post:{images:source.images},assets:source.assets,root,runProcess:()=>assert.fail('must not run')}),{code:'reel_path_invalid'});
 assert.deepEqual(await fs.readdir(outside),[]);
});
test('missing ffmpeg is a clear local error without install or network fallback',async t=>{
 const root=await sandbox(t);
 await assert.rejects(runLocalProcess(path.join(root,'missing-ffmpeg-executable'),[],{cwd:root}),{code:'ffmpeg_not_installed'});
});
test('dry-run requires a video object and FINISHED before publish and makes no request',()=>{
 assert.throws(()=>buildReelDryRun({caption:'text',videoUrl:'https://media.invalid/reel.mp4'}),{code:'reel_video_required'});
 const video={asset_id:'a'.repeat(64),mime:'video/mp4',metadata:{duration_seconds:3,width:1080,height:1920,needs_playback_review:true}};
 const plan=buildReelDryRun({caption:'[ 제목 ]\n\n본문',videoUrl:'https://media.invalid/reel.mp4',video});
 assert.equal(plan.dryRun,true);assert.equal(plan.externalCalls,0);assert.equal(plan.steps[0].params.media_type,'REELS');
 assert.equal(plan.steps[1].required_status,'FINISHED');assert.equal(plan.steps[2].requires,'FINISHED');
 assert.throws(()=>buildReelDryRun({caption:'text',videoUrl:'file:///video.mp4',video}),{code:'reel_public_video_required'});
 assert.throws(()=>buildReelDryRun({caption:'x'.repeat(2201),videoUrl:'https://media.invalid/reel.mp4',video}),{code:'reel_caption_limit'});
});

test('video byte input rejects array-like allocations before copying and requires a single input',async t=>{
 const root=await sandbox(t),videos=new LocalVideoAssets(root);
 await assert.rejects(videos.add({bytes:{length:0x7fffffff}}),{code:'video_input_invalid'});
 await assert.rejects(videos.add(null),{code:'video_input_invalid'});
 async function* empty(){}
 await assert.rejects(videos.add({bytes:movie(),stream:empty()}),{code:'video_input_invalid'});
});
