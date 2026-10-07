// In-memory synthetic GitHub subset; never fetches or obtains credentials.
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex').slice(0,40);
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
export function mockReviewGithub(repository){
 const prefix='/repos/'+repository.owner+'/'+repository.repo,initial='a'.repeat(40),initialTree='b'.repeat(40);
 const m={head:initial,calls:[],loseNextRef:false,commits:new Map([[initial,{sha:initial,tree:{sha:initialTree},parents:[]}]]),trees:new Map([[initialTree,[]]]),blobs:new Map()};
 m.api=async(route,init={})=>{
  const method=init.method||'GET',body=init.body;m.calls.push({route,method,body});const p=route.slice(prefix.length);
  if(route===prefix&&method==='GET')return {id:repository.repositoryId,private:true,owner:{login:repository.owner},name:repository.repo,default_branch:'main'};
  if(p==='/git/ref/heads/'+repository.branch&&method==='GET')return {object:{sha:m.head}};
  if(p.startsWith('/git/commits/')&&method==='GET'){const c=m.commits.get(p.split('/').at(-1));if(c)return structuredClone(c);}
  if(p.startsWith('/contents/mobile-review/state.json?ref=')&&method==='GET'){
   const c=m.commits.get(p.split('=').at(-1)),t=m.trees.get(c?.tree.sha),e=t?.find(x=>x.path==='mobile-review/state.json'),b=m.blobs.get(e?.sha);if(b)return {encoding:'base64',size:b.length,content:b.toString('base64'),sha:blob(b)};
  }
  if(p.startsWith('/git/blobs/')&&method==='GET'){const b=m.blobs.get(p.split('/').at(-1));if(b)return {encoding:'base64',size:b.length,content:b.toString('base64'),sha:blob(b)};}
  if(p==='/git/blobs'&&method==='POST'){const b=Buffer.from(body.content,body.encoding==='base64'?'base64':'utf8'),sha=blob(b);m.blobs.set(sha,b);return {sha};}
  if(p==='/git/trees'&&method==='POST'){const entries=new Map((m.trees.get(body.base_tree)||[]).map(e=>[e.path,e]));for(const e of body.tree)entries.set(e.path,structuredClone(e));const tree=[...entries.values()],sha=hash(Buffer.from(JSON.stringify(tree)));m.trees.set(sha,tree);return {sha};}
  if(p==='/git/commits'&&method==='POST'){const sha=hash(Buffer.from(JSON.stringify(body))),c={sha,tree:{sha:body.tree},parents:body.parents.map(sha=>({sha}))};m.commits.set(sha,c);return structuredClone(c);}
  if(p==='/git/refs/heads/'+repository.branch&&method==='PATCH'){
   if(body.force!==false||m.commits.get(body.sha)?.parents[0]?.sha!==m.head)throw Object.assign(Error('Synthetic non-fast-forward'),{status:409});m.head=body.sha;
   if(m.loseNextRef){m.loseNextRef=false;throw Object.assign(Error('Synthetic lost ref response'),{status:599});}return {object:{sha:m.head}};
  }
  if(/^\/compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40}$/.test(p)&&method==='GET'){
   const [base,head]=p.slice('/compare/'.length).split('...');let c=head,found=false;for(let i=0;i<100;i++){if(c===base){found=true;break;}c=m.commits.get(c)?.parents[0]?.sha;if(!c)break;}
   return {status:found?'ahead':'diverged',merge_base_commit:{sha:found?base:initial},head_commit:{sha:head}};
  }
  throw Object.assign(Error('Synthetic missing route'),{status:404});
 };
 m.fetch=async(url,init)=>{
  if(!url.startsWith('https://api.github.com'+prefix))throw Error('Synthetic wrong host');
  try{return new Response(JSON.stringify(await m.api(url.slice('https://api.github.com'.length),{method:init.method,...(init.body?{body:JSON.parse(init.body)}:{})})),{status:200});}
  catch(e){if(e.status===599)throw e;return new Response('Synthetic response body omitted',{status:e.status||500});}
 };
 return m;
}
