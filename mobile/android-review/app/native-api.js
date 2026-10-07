import {createGithubAdapter} from './github-adapter.js';
export function nativeGithub(bridge=globalThis.ReviewNative){
 if(!bridge)return null;let config;try{config=JSON.parse(bridge.config());}catch{return null;}
 if(config.approved!==true||config.dedicatedReviewRepository!==true)return null;
 const api=async(path,init={})=>{
  const result=JSON.parse(bridge.api(JSON.stringify({path,method:init.method||'GET',...(init.body?{body:init.body}:{})})));
  if(!result.ok)throw Object.assign(Error('Native GitHub connection unavailable'),{status:result.status});return result.data;
 };
 return createGithubAdapter({...config,api});
}
export function openNativeConnection(bridge=globalThis.ReviewNative){if(!bridge)return false;bridge.openConnection();return true;}
