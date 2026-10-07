// No approved Internet review server exists. Ship disabled, without credentials.
export const serviceConfig=Object.freeze({approved:false,baseUrl:''});
export function serviceUrl(config,path){
 if(config.approved!==true||!config.baseUrl)throw Error('인터넷 동기화 차단: 승인된 리뷰 서버 없음');
 const base=new URL(config.baseUrl);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/')throw Error('승인된 HTTPS 서버 루트만 허용');
 const url=new URL(path,base);if(url.origin!==base.origin||!path.startsWith('/')||path.startsWith('//'))throw Error('서버 외부 경로 금지');return url.href;
}
export async function requestJson(config,path,init={}){
 const url=serviceUrl(config,path),r=await fetch(url,{...init,credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',...init.headers}});
 if(!r.ok&&r.status!==409)throw Error('서버 응답 실패 '+r.status);const text=await r.text();if(text.length>10*1024*1024)throw Error('서버 응답 크기 초과');return JSON.parse(text);
}
export async function downloadAsset(config,image){
 const r=await fetch(serviceUrl(config,image.url),{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('이미지 다운로드 실패');const bytes=await r.arrayBuffer();if(bytes.byteLength>25*1024*1024)throw Error('이미지 크기 초과');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const u=new Uint8Array(bytes);if(digest!==image.sha256||u[0]!==137||u[1]!==80||u[2]!==78||u[3]!==71)throw Error('PNG 이미지 해시·형식 불일치');return new Blob([bytes],{type:'image/png'});
}
