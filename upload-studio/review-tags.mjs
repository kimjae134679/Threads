// Conservative metadata suggestions. This module never edits caption text or marks review complete.
import {COMMON_TAG_CANDIDATES} from './tags.mjs';

const copy=value=>Array.isArray(value)?value.map(copy):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,copy(item)])):value;
const nonempty=value=>Array.isArray(value)&&value.length>0;
const text=value=>typeof value==='string'?value:'';
const hashtags=/#([\p{L}\p{N}_]+)/u;

// Topic pairs are categories directly supported by the listed words, never new source facts.
const TOPIC_RULES=[
  [/고양이|냥이|집사/u,['고양이','반려동물']],
  [/강아지|반려견|댕댕/u,['강아지','반려동물']],
  [/반려동물|반려묘/u,['반려동물','동물이야기']],
  [/임신|출산|산후/u,['임신출산','가족이야기']],
  [/육아|아기|아이들|어린이|자녀/u,['육아','가족이야기']],
  [/결혼|신혼|부부|남편|아내/u,['부부이야기','결혼생활']],
  [/부모|엄마|아빠|어머니|아버지|가족/u,['가족','가족이야기']],
  [/연애|이별|남자친구|여자친구/u,['연애','관계이야기']],
  [/친구|우정/u,['우정','관계이야기']],
  [/직장|회사|상사|직원|퇴사|취업|면접/u,['직장생활','일이야기']],
  [/학교|학생|공부|시험|교육|선생님/u,['학교생활','교육이야기']],
  [/여행|관광|휴가|호텔|공항/u,['여행','여행이야기']],
  [/커피|카페/u,['커피','카페이야기']],
  [/요리|음식|식당|식사|레시피/u,['음식','음식이야기']],
  [/운동|헬스|달리기|마라톤|축구|야구/u,['운동','스포츠']],
  [/독서|소설|도서관|(?:^|[\s"'“‘])책(?:[\s"'”’]|[은을이와의에]|$)/u,['독서','책이야기']],
  [/영화|드라마|배우|방송/u,['문화','영화방송']],
  [/음악|노래|가수|공연/u,['음악','문화이야기']],
  [/환경|기후|재활용|플라스틱/u,['환경','환경이야기']],
  [/우주|천문|별자리|행성/u,['우주','과학이야기']],
  [/인공지능|(?:^|[^\p{L}])AI(?:$|[^\p{L}])|로봇/u,['인공지능','기술이야기']],
  [/컴퓨터|스마트폰|인터넷|소프트웨어|기술/u,['기술','기술이야기']],
  [/경제|주식|투자|은행|금리|부동산/u,['경제','경제이야기']],
  [/건강|병원|의사|질병|치료/u,['건강','건강이야기']],
  [/법원|판결|재판|소송|변호사/u,['법률','사회이야기']]
];
const TITLE_STOP_WORDS=new Set([
  '이것','그것','저것','이런','그런','저런','이렇게','그렇게','저렇게','누구','무엇','왜','어떻게',
  '이유','방법','사람','사람들','이야기','하루','오늘','어제','정말','진짜','있는','없는','하는','되는',
  '충격','실화','대박','놀라운','꼭','반드시','비밀','결국','조회수','화제','인기','추천','필독',
  'the','this','that','and','with','from','what','why','how','story'
]);
function titleText(post){
  const source=post.source||{};
  return [post.publication_title,source.cover_title,source.display_title,source.label,source.original_title]
    .map(text).find(value=>value.trim())||'';
}
function contentText(post){
  const source=post.source||{};
  return [titleText(post),source.label,source.display_title,source.original_title,
    post.caption,post.platform_captions?.instagram,post.platform_captions?.threads]
    .map(text).join('\n');
}
function existingHashtags(post){
  return text(post.tags).trim()!==''||[post.caption,...Object.values(post.platform_captions||{})]
    .some(value=>hashtags.test(text(value)));
}
function inferTopics(post){
  const content=contentText(post);
  for(const [pattern,tags] of TOPIC_RULES)if(pattern.test(content))return {tags:[...tags],reason:'content_keywords'};
  const words=[...titleText(post).matchAll(/[\p{L}_]+/gu)].map(match=>match[0])
    .filter(word=>[...word].length>=2&&[...word].length<=30&&!TITLE_STOP_WORDS.has(word.toLowerCase()));
  const unique=[...new Set(words)];
  // Require two meaningful title words rather than manufacturing a second topic.
  return unique.length>=2?{tags:unique.slice(0,2),reason:'title_terms'}:{tags:[],reason:'ambiguous_content'};
}

export function suggestReviewTags(post){
  const common=nonempty(post.common_tags)?copy(post.common_tags):[...COMMON_TAG_CANDIDATES];
  const topics=Array.isArray(post.topic_tags)?copy(post.topic_tags):[];
  const thread=text(post.threads_topic_tag);
  if(post.topic_tags_edited===true)return {common_tags:common,topic_tags:topics,threads_topic_tag:thread,reason:'user_topic_edit_preserved'};
  if(nonempty(topics))return {common_tags:common,topic_tags:topics,threads_topic_tag:thread||topics[0],reason:'existing_topics'};
  if(existingHashtags(post))return {common_tags:common,topic_tags:topics,threads_topic_tag:thread,reason:'existing_hashtags_preserved'};
  const inferred=inferTopics(post);
  return {common_tags:common,topic_tags:inferred.tags,threads_topic_tag:thread||inferred.tags[0]||'',reason:inferred.reason};
}

function invalidateJobs(state,postId){
  for(const job of state.jobs||[]){
    if(job.post_id!==postId||['cancelled','dry_run_complete'].includes(job.state))continue;
    job.stale=true;
    if(!['running','reconciliation'].includes(job.state))job.state='waiting';
  }
}

export function seedReviewTags(state){
  const next=copy(state);let changed=false;
  // Existing post common choices are evidence of user preferences; do not replace them with defaults.
  if(!nonempty(next.common_tags)&&!(next.posts||[]).some(post=>nonempty(post.common_tags))){
    next.common_tags=[...COMMON_TAG_CANDIDATES];changed=true;
  }
  for(const post of next.posts||[]){
    const suggested=suggestReviewTags(post);let postChanged=false;
    if(!nonempty(post.common_tags)&&nonempty(next.common_tags)){
      post.common_tags=copy(next.common_tags);postChanged=true;
    }
    if(post.topic_tags_edited!==true){
      if(!nonempty(post.topic_tags)&&nonempty(suggested.topic_tags)){
        post.topic_tags=copy(suggested.topic_tags);postChanged=true;
      }
      if(!text(post.threads_topic_tag)&&suggested.threads_topic_tag){
        post.threads_topic_tag=suggested.threads_topic_tag;postChanged=true;
      }
    }
    if(!postChanged)continue;
    post.revision=(post.revision||0)+1;
    for(const key of ['review','final_review','approval','publication_approval']){
      if(Object.prototype.hasOwnProperty.call(post,key))post[key]=null;
    }
    invalidateJobs(next,post.post_id);changed=true;
  }
  if(changed)next.revision=(next.revision||0)+1;
  return next;
}
