// Deterministic synthetic collection. Never reads original posts, user reviews,
// credentials, or a live repository. Small valid PNGs get unique trailing IDs.
import {createHash} from 'node:crypto';
const base=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN5sAAAAASUVORK5CYII=','base64');
const hash=(algorithm,b)=>createHash(algorithm).update(b).digest('hex');
export const gitBlobSha=bytes=>hash('sha1',Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes]));
export function createScaleFixture({posts=365,pages=3073,targetBytes=1806272,largePngBytes=0}={}){
 if(!Number.isSafeInteger(posts)||posts<1||!Number.isSafeInteger(pages)||pages<posts||pages>posts*500)throw Error('Invalid synthetic collection size');
 const buffers=new Map(),assets={},entries=[];let page=0;
 for(let i=0;i<posts;i++){
  const count=Math.floor(pages/posts)+(i<pages%posts?1:0),images=[];
  for(let p=0;p<count;p++){
   const suffix=Buffer.alloc(8);suffix.writeUInt32BE(page,0);suffix.writeUInt32BE(i,4);let bytes=Buffer.concat([base,suffix]);
   if(page===0&&largePngBytes>bytes.length){const extra=Buffer.alloc(largePngBytes-bytes.length,42);bytes=Buffer.concat([bytes,extra]);}
   const sha256=hash('sha256',bytes),url='/v1/review/assets/'+sha256+'.png';buffers.set(sha256,bytes);assets[url]={sha256,blobSha:gitBlobSha(bytes)};
   images.push({url,sha256,label:`합성 페이지 ${p+1} · 원본·사용자 자료 아님`});page++;
  }
  entries.push({id:'scale-post-'+String(i).padStart(3,'0'),title:`합성 규모 검증 ${i+1} · 365글 전체 목록`,topic:i%2?'work':'life',topicLabel:i%2?'직장·일':'일상·유머',category:'synthetic',outputVersion:hash('sha256',Buffer.from('scale-version-'+i)),reviewRound:'synthetic-scale-round',revision:0,review:null,images});
 }
 const state={githubReviewSchema:1,manifest:{schemaVersion:1,reviewRound:'synthetic-scale-round',criteria:{version:'scale-criteria',items:[{id:'readable',label:'합성 기준점 확인'}]},entries},assets,operations:{},history:[]};
 let stateBytes=Buffer.from(JSON.stringify(state));if(targetBytes>stateBytes.length){state.fixturePadding='';stateBytes=Buffer.from(JSON.stringify(state));state.fixturePadding='x'.repeat(Math.max(0,targetBytes-stateBytes.length));stateBytes=Buffer.from(JSON.stringify(state));}
 const stateBlobSha=gitBlobSha(stateBytes),head='a'.repeat(40),tree='b'.repeat(40),repository={owner:'synthetic-owner',repo:'private-scale-fixture',repositoryId:765,private:true,dedicatedReviewRepository:true,branch:'mobile-review/data',excludedRepositories:['synthetic-owner/bridge-fixture']};
 const calls=[],prefix='/repos/'+repository.owner+'/'+repository.repo,byBlob=new Map([...buffers].map(([h,b])=>[gitBlobSha(b),b]));
 async function api(route){calls.push(route);if(route===prefix)return {id:repository.repositoryId,private:true,owner:{login:repository.owner},name:repository.repo,default_branch:'main'};if(route===prefix+'/git/ref/heads/'+repository.branch)return {object:{sha:head}};if(route===prefix+'/git/commits/'+head)return {sha:head,tree:{sha:tree}};if(route===prefix+'/contents/mobile-review/state.json?ref='+head)return {sha:stateBlobSha,size:stateBytes.length,encoding:stateBytes.length>1000000?'none':'base64',content:stateBytes.length>1000000?'':stateBytes.toString('base64')};if(route===prefix+'/git/blobs/'+stateBlobSha)return {sha:stateBlobSha,size:stateBytes.length,encoding:'base64',content:stateBytes.toString('base64')};const bytes=byBlob.get(route.split('/').at(-1));if(bytes)return {sha:gitBlobSha(bytes),size:bytes.length,encoding:'base64',content:bytes.toString('base64')};throw Error('Unsupported synthetic route');}
 return {state,manifest:state.manifest,stateBytes,stateBlobSha,repository,calls,api,assetBytes:sha256=>buffers.get(sha256),images:page,uniqueAssets:buffers.size};
}
