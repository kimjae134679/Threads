// In-memory GitHub REST fixture. No network, credentials, or real user materials.
import {createHash} from 'node:crypto';
export const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN5sAAAAASUVORK5CYII=','base64');
export const imageHash=createHash('sha256').update(png).digest('hex');
export const imageBlob='b'.repeat(40);
export const fixtureState=()=>({githubReviewSchema:1,manifest:{schemaVersion:1,reviewRound:'fixture-round',criteria:{version:'criteria-1',items:[{id:'readable',label:'Readable'}]},entries:[{id:'synthetic-post',title:'Synthetic fixture',outputVersion:'a'.repeat(64),reviewRound:'fixture-round',revision:0,review:null,images:[{url:'/v1/review/assets/'+imageHash+'.png',sha256:imageHash}]}]},assets:{['/v1/review/assets/'+imageHash+'.png']:{blobSha:imageBlob,sha256:imageHash}},operations:{}});
export const operation=(overrides={})=>({operationId:'fixture-operation',id:'synthetic-post',outputVersion:'a'.repeat(64),reviewRound:'fixture-round',baseRevision:0,criteriaVersion:'criteria-1',kind:'review',payload:{score:8,note:'Synthetic note',checks:{readable:true},decision:'held'},deviceId:'fixture-device',createdAt:'2026-10-08T00:00:00.000Z',...overrides});
export function mockGithub(){
 const prefix='/repos/fixture-owner/private-review-fixture';let n=1;
 const sha=()=>(n++).toString(16).padStart(40,'0');
 const root=sha(),head=sha(),states=new Map([[head,fixtureState()]]),commits=new Map([[head,{tree:{sha:root},parents:[]}]]),blobs=new Map(),trees=new Map();
 const mock={head,states,calls:[],private:true,repositoryId:123,defaultBranch:'main',writeCount:0,beforePatch:null,loseAck:false,failStatus:null};
 mock.advance=transform=>{const next=sha();states.set(next,transform(structuredClone(states.get(mock.head))));commits.set(next,{tree:{sha:root},parents:[mock.head]});mock.head=next;};
 mock.api=async(path,init={})=>{
  const method=init.method||'GET',body=init.body;mock.calls.push({path,method,body});
  if(mock.failStatus)throw Object.assign(Error('fixture API denied'),{status:mock.failStatus});
  if(path===prefix)return {id:mock.repositoryId,private:mock.private,owner:{login:'fixture-owner'},name:'private-review-fixture',default_branch:mock.defaultBranch};
  const p=path.slice(prefix.length);
  if(p==='/git/ref/heads/mobile-review/data')return {object:{sha:mock.head}};
  if(p.startsWith('/git/commits/')&&method==='GET')return commits.get(p.split('/').at(-1));
  if(p.startsWith('/contents/mobile-review/state.json?ref=')){const ref=p.split('ref=')[1],content=Buffer.from(JSON.stringify(states.get(ref)));return {encoding:'base64',size:content.length,content:content.toString('base64')};}
  if(p==='/git/blobs/'+imageBlob)return {encoding:'base64',size:png.length,content:png.toString('base64'),sha:imageBlob};
  if(p==='/git/blobs'&&method==='POST'){const id=sha();blobs.set(id,JSON.parse(body.content));return {sha:id};}
  if(p==='/git/trees'&&method==='POST'){const id=sha();trees.set(id,blobs.get(body.tree[0].sha));return {sha:id};}
  if(p==='/git/commits'&&method==='POST'){const id=sha();states.set(id,trees.get(body.tree));commits.set(id,{tree:{sha:body.tree},parents:body.parents});return {sha:id};}
  if(p==='/git/refs/heads/mobile-review/data'&&method==='PATCH'){
   if(mock.beforePatch){const hook=mock.beforePatch;mock.beforePatch=null;hook();}
   if(body.force!==false)throw Error('fixture requires non-force');
   if(commits.get(body.sha).parents[0]!==mock.head)throw Object.assign(Error('non-fast-forward'),{status:422});
   mock.head=body.sha;mock.writeCount++;
   if(mock.loseAck){mock.loseAck=false;throw Error('lost response after update');}return {object:{sha:body.sha}};
  }
  throw Error('Unexpected fixture path '+method+' '+path);
 };
 mock.state=()=>states.get(mock.head);return mock;
}
