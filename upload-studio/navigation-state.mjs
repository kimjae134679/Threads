// Same-tab navigation evidence is UI state, never a review or publishing approval.
const images=p=>(p?.images||[]).map(i=>i.asset_id||i.sha256);
export function captureOrigin(post,view={}){
 if(!post?.post_id||!post?.output_version)throw Error('navigation_version_missing');
 return{schema:2,post_id:post.post_id,output_version:post.output_version,image_order:images(post),search:String(view.search||''),filter:['all','unreviewed','revise','discard','hold','passed'].includes(view.filter)?view.filter:'all',platform:['instagram','threads'].includes(view.platform)?view.platform:'instagram',slide:Math.max(0,Math.min(Number.isInteger(view.slide)?view.slide:0,Math.max(0,post.images.length-1))),scroll:Math.max(0,Number.isFinite(view.scroll)?view.scroll:0)};
}
export function matchingOrigin(origin,post){
 return origin?.schema===2&&origin.post_id===post?.post_id&&origin.output_version===post.output_version&&JSON.stringify(origin.image_order)===JSON.stringify(images(post))?origin:null;
}
export function committedVisit(origin,post,display){
 if(!matchingOrigin(origin,post)||!Number.isInteger(display?.slide)||display.slide<0||display.slide>=post.images.length||display.postId!==post.post_id||display.outputVersion!==post.output_version||display.assetId!==images(post)[display.slide])return null;
 return{post_id:post.post_id,output_version:post.output_version,page:display.slide+1};
}
export async function prepareNavigation({getPost,save,refresh,view={},allowEmpty=false}){
 const post=getPost(),original=!post&&allowEmpty?null:captureOrigin(post,view);await save();await refresh();
 if(original?!matchingOrigin(original,getPost()):!!getPost())throw Object.assign(Error('navigation_version_changed'),{code:'navigation_version_changed'});return original;
}
