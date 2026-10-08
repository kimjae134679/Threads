import {maxReviewStateBytes,maxReviewTotalAssetBytes} from '../app/review-limits.js';
// Callable preparation only. No token acquisition, vault, timers or entry point.
import {createHash} from 'node:crypto';
import {dedicatedRepositoryMetadata,requestHash} from './exchange.mjs';
import {validateManifest} from '../app/core.js';
const sha=/^[a-f0-9]{40}$/,hash=/^[a-f0-9]{64}$/;
const maxResponse=36*1024*1024,maxState=maxReviewStateBytes;
const gitBlob=bytes=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
export class PcGithubError extends Error{constructor(code,status=0){super('PC GitHub '+code);this.code=code;this.status=status;}}
function fail(code,status){throw new PcGithubError(code,status);}
function config(repository){const m=dedicatedRepositoryMetadata(repository);return {...m,prefix:'/repos/'+m.owner+'/'+m.repo};}
function validRoute(m,route,method,body){
 if(typeof route!=='string'||!route.startsWith(m.prefix))return false;
 const p=route.slice(m.prefix.length),ref='heads/'+m.branch;
 if(method==='GET')return p===''||p==='/git/ref/'+ref||/^\/git\/(commits|blobs|trees)\/[a-f0-9]{40}$/.test(p)||/^\/contents\/mobile-review\/state\.json\?ref=[a-f0-9]{40}$/.test(p)||/^\/compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40}$/.test(p);
 if(!plain(body))return false;
 if(method==='PATCH')return p==='/git/refs/'+ref&&body.force===false&&sha.test(body.sha)&&Object.keys(body).length===2;
 if(method!=='POST')return false;
 if(p==='/git/blobs')return ['base64','utf-8'].includes(body.encoding)&&typeof body.content==='string'&&Object.keys(body).length===2;
 if(p==='/git/trees')return sha.test(body.base_tree)&&Array.isArray(body.tree)&&body.tree.length>0&&body.tree.length<=5001&&new Set(body.tree.map(e=>e.path)).size===body.tree.length&&body.tree.every(e=>plain(e)&&Object.keys(e).length===4&&e.mode==='100644'&&e.type==='blob'&&sha.test(e.sha)&&(e.path==='mobile-review/state.json'||/^mobile-review\/assets\/[a-f0-9]{64}\.png$/.test(e.path)));
 if(p==='/git/commits')return typeof body.message==='string'&&body.message.length<=200&&sha.test(body.tree)&&Array.isArray(body.parents)&&body.parents.length===1&&sha.test(body.parents[0])&&Object.keys(body).length===3;
 return false;
}
async function responseJson(response){
 const length=Number(response.headers.get('content-length'));if(Number.isFinite(length)&&length>maxResponse)fail('response_size_limit');
 if(!response.body)fail('invalid_response');const reader=response.body.getReader(),chunks=[];let count=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>maxResponse){await reader.cancel();fail('response_size_limit');}chunks.push(Buffer.from(value));}}
 finally{reader.releaseLock();}
 try{const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));if(!plain(result))fail('invalid_response');return result;}catch(error){if(error instanceof PcGithubError)throw error;fail('invalid_response');}
}
export function createPcGithubTransport({enabled=false,repository,getAccessToken,fetchImpl=globalThis.fetch,now=Date.now,timeoutMs=20000}={}){
 let cooldown=0;
 return async function api(route,init={}){
  if(enabled!==true)fail('disabled');const m=config(repository),method=init.method||'GET';
  // Capture and validate the exact JSON bytes before credential lookup yields.
  // No caller mutation, accessor or toJSON can change the transmitted request.
  let body,wire;
  if(init.body!==undefined){try{body=JSON.stringify(init.body);wire=JSON.parse(body);}catch{fail('invalid_request');}if(Buffer.byteLength(body)>maxResponse)fail('request_size_limit');}
  if(method==='GET'&&body!==undefined||!validRoute(m,route,method,wire))fail('route_not_allowed');
  if(typeof getAccessToken!=='function'||typeof fetchImpl!=='function')fail('approved_credential_provider_required');
  if(now()<cooldown)fail('rate_limit_cooldown',429);
  let token;try{token=await getAccessToken();}catch{fail('credential_unavailable');}
  if(typeof token!=='string'||!token.length||token.length>4096||/[\s\r\n]/.test(token))fail('credential_unavailable');
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)fail('invalid_timeout');
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeoutMs);
  try{
   let response;try{response=await fetchImpl('https://api.github.com'+route,{method,redirect:'manual',signal:abort.signal,headers:{Accept:'application/vnd.github+json','User-Agent':'Threads-Review-PC','X-GitHub-Api-Version':'2026-03-10',Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body}:{})});}catch{fail('transport_unconfirmed');}
   if(!response||!Number.isInteger(response.status)||!response.headers)fail('invalid_response');
   if([403,429].includes(response.status)||response.headers.get('x-ratelimit-remaining')==='0'){
    cooldown=now()+60000;const retry=Number(response.headers.get('retry-after')),reset=Number(response.headers.get('x-ratelimit-reset'));
    if(Number.isFinite(retry)&&retry>0)cooldown=Math.max(cooldown,now()+retry*1000);
    if(response.headers.get('x-ratelimit-remaining')==='0'&&Number.isFinite(reset)&&reset>0)cooldown=Math.max(cooldown,reset*1000);
   }
   if(response.status<200||response.status>=300){await response.body?.cancel().catch(()=>{});fail('request_denied',response.status);}
   return await responseJson(response);
  }catch(error){if(error instanceof PcGithubError)throw error;fail('transport_unconfirmed');}finally{token=null;clearTimeout(timer);}
 };
}
function validateRemoteState(state){
 if(!plain(state)||state.githubReviewSchema!==1||!plain(state.assets)||!plain(state.operations))fail('invalid_state');
 try{validateManifest(state.manifest);}catch{fail('invalid_manifest');}
 if(state.manifest.entries.some(e=>!Number.isSafeInteger(e.revision)||e.revision<0))fail('invalid_revision');
 for(const [url,a] of Object.entries(state.assets))if(!plain(a)||!hash.test(a.sha256)||!sha.test(a.blobSha)||url!=='/v1/review/assets/'+a.sha256+'.png')fail('invalid_asset');
 for(const e of state.manifest.entries)for(const i of e.images)if(state.assets[i.url]?.sha256!==i.sha256)fail('missing_asset');
 for(const [id,r] of Object.entries(state.operations))if(!id||!plain(r)||!hash.test(r.requestHash)||!plain(r.result)||r.result.operationId!==id||!['applied','conflict','stale'].includes(r.result.status)||!Number.isSafeInteger(r.result.revision)||r.result.revision<0||r.request!==undefined&&(r.request.operationId!==id||requestHash(r.request)!==r.requestHash))fail('invalid_ledger');
 return state;
}
export async function readPinnedReviewState({enabled=false,repository,api,expectedHead=null,allowAbsent=false}={}){
 if(enabled!==true)fail('disabled');const m=config(repository);if(typeof api!=='function')fail('transport_required');
 const r=await api(m.prefix);if(r?.private!==true||r.id!==m.repositoryId||r.owner?.login?.toLowerCase()!==m.owner.toLowerCase()||r.name?.toLowerCase()!==m.repo.toLowerCase()||!r.default_branch||r.default_branch===m.branch)fail('repository_identity_or_visibility');
 const head=(await api(m.prefix+'/git/ref/heads/'+m.branch)).object?.sha;if(!sha.test(head)||expectedHead!==null&&head!==expectedHead)fail('expected_head_mismatch');
 const c=await api(m.prefix+'/git/commits/'+head);if(c?.sha!==head||!sha.test(c.tree?.sha))fail('commit_identity_mismatch');
 let f;try{f=await api(m.prefix+'/contents/mobile-review/state.json?ref='+head);}catch(error){if(error?.status===404&&allowAbsent===true)return {head,tree:c.tree.sha,state:null,blobSha:null};throw error;}
 const bytes=await readReviewStateBlob({api,prefix:m.prefix,response:f});
 let state;try{state=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('invalid_state_json');}
 return {head,tree:c.tree.sha,state:validateRemoteState(state),blobSha:gitBlob(bytes)};
}

// Contents metadata remains pinned to the requested commit. Larger ledgers are
// fetched by that exact immutable blob SHA, never a moving branch or download URL.
export async function readReviewStateBlob({api,prefix,response:f}){
 if(!plain(f)||!Number.isSafeInteger(f.size)||f.size<1||f.size>maxState||!sha.test(f.sha))fail('invalid_state_response');
 const identity={sha:f.sha,size:f.size};
 if(f.encoding==='none'){
  if(f.size<=1000000||f.content!=='')fail('invalid_state_response');
  f=await api(prefix+'/git/blobs/'+identity.sha);
 }
 const encodedLimit=Math.ceil(maxState/3)*4;
 // Formatting has a separate bounded allowance; decoded capacity is unchanged.
 if(!plain(f)||f.encoding!=='base64'||f.sha!==identity.sha||f.size!==identity.size||typeof f.content!=='string'||f.content.length>2*encodedLimit+1000)fail('invalid_state_response');
 const content=f.content.replace(/\s/g,'');if(content.length>encodedLimit||content.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(content))fail('invalid_state_response');
 const bytes=Buffer.from(content,'base64');if(bytes.length!==identity.size||gitBlob(bytes)!==identity.sha)fail('state_blob_hash_mismatch');
 return bytes;
}
