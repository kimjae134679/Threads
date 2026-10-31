function shuffled(values,random){
 const result=values.slice();
 for(let i=result.length-1;i>0;i--){
  const value=random();
  if(!Number.isFinite(value)||value<0||value>=1)throw new TypeError('random must return a number in [0, 1)');
  const j=Math.floor(value*(i+1));[result[i],result[j]]=[result[j],result[i]];
 }
 return result;
}

export class StableReviewOrder{
 constructor(random=Math.random){this.random=random;this.ids=null;}
 reconcile(posts){
  const byId=new Map(posts.filter(post=>typeof post?.post_id==='string').map(post=>[post.post_id,post]));
  const ids=[...byId.keys()];
  if(this.ids===null)this.ids=shuffled(ids,this.random);
  else{
   const active=new Set(ids),known=new Set(this.ids),retained=this.ids.filter(id=>active.has(id));
   this.ids=[...retained,...shuffled(ids.filter(id=>!known.has(id)),this.random)];
  }
  return this.ids.map(id=>byId.get(id)).filter(Boolean);
 }
}
