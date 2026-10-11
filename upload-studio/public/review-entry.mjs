import {isActivePost,finalReviewStatus} from '../domain.mjs';
// An explicit Hub shortcut wins over this tab's earlier viewer filter.
export function reviewEntry(posts,search){
 const filter=new URLSearchParams(search).get('review');
 if(!['all','hold','discard'].includes(filter))return null;
 const post=posts.find(p=>isActivePost(p)&&(filter==='all'||finalReviewStatus(p).decision===filter));
 return {filter,postId:post?.post_id||null,search:''};
}
