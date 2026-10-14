// Prepare official OAuth parameters locally. No consent navigation, exchange, credentials or requests.
export const CONNECTION_PROVIDERS=Object.freeze({
 instagram:{label:'Instagram 로그인',endpoint:'https://www.instagram.com/oauth/authorize',scopes:['instagram_business_basic','instagram_business_content_publish'],professional_required:true,page_required:false,docs:'https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login'},
 threads:{label:'Threads 로그인',endpoint:'https://threads.com/oauth/authorize',scopes:['threads_basic','threads_content_publish'],professional_required:false,page_required:false,docs:'https://developers.facebook.com/documentation/threads/get-started/get-access-tokens-and-permissions'}
});
const fail=code=>{throw Object.assign(new Error(code),{code,status:400});};
export class OfflineConnectionPreparation {
 constructor({now=()=>Date.now(),nonce=()=>crypto.randomUUID()}={}){this.now=now;this.nonce=nonce;this.pending=new Map();}
 prepare({platform,public_client_id,redirect_uri,account_label=''}){
  const p=CONNECTION_PROVIDERS[platform];if(!p||!/^\d{1,40}$/.test(public_client_id||''))fail('connection_public_config_required');
  let url;try{url=new URL(redirect_uri);}catch{fail('connection_redirect_invalid');}
  if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||url.hostname==='localhost'||url.hostname==='127.0.0.1')fail('connection_redirect_invalid');
  if(typeof account_label!=='string'||account_label.length>100)fail('connection_public_config_required');
  const state=this.nonce(),expires_at=this.now()+600000;if(typeof state!=='string'||state.length<16||this.pending.has(state))fail('connection_state_invalid');
  this.pending.set(state,{platform,redirect_uri:url.href,expires_at});
  const authorize=new URL(p.endpoint);for(const [k,v]of Object.entries({client_id:public_client_id,redirect_uri:url.href,scope:p.scopes.join(','),response_type:'code',state}))authorize.searchParams.set(k,v);
  return {platform,account_label,status:'prepared_only',connected:false,externalCalls:0,expires_at,authorize_url:authorize.href,scopes:[...p.scopes],professional_required:p.professional_required,page_required:p.page_required,requires_user_permission:true,docs:p.docs};
 }
 inspectCallback({state,platform,redirect_uri}){
  const expected=this.pending.get(state);if(!expected)fail('connection_state_invalid');if(expected.expires_at<=this.now()){this.pending.delete(state);fail('connection_state_expired');}
  if(expected.platform!==platform||expected.redirect_uri!==redirect_uri)fail('connection_callback_mismatch');
  this.pending.delete(state);return {status:'validated_only',connected:false,externalCalls:0,next_step:'explicit_permission_before_consent_and_exchange'};
 }
}
