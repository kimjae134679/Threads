import {createHash} from 'node:crypto';
import {cleanDisplayTitle} from './title-normalization.mjs';
import {rejectSecrets} from './domain.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code,status:400});};
export const CAPTION_SCHEMA='threads-publish-captions-v1';
export function validateProductionCaptions(data,row,version){
 rejectSecrets(data);
 if(!data||data.schema!==CAPTION_SCHEMA||data.postId!==row.id||data.outputVersion!==version||data.sourceFingerprint!==row.sourceFingerprint||data.originalTitle!==row.title||data.sourceUrl!==(row.sourceUrl||''))fail('production_caption_identity_changed');
 const title=cleanDisplayTitle(data.publicationTitle);
 if(!title||title!==data.publicationTitle||title.length>300)fail('production_caption_title_invalid');
 const captions=data.platformCaptions;
 if(!captions||Object.keys(captions).some(k=>!['instagram','threads'].includes(k))||['instagram','threads'].some(k=>typeof captions[k]!=='string'||!captions[k].trim()||captions[k].length>100000))fail('production_captions_invalid');
 const paragraphs=captions.instagram.replaceAll('\r\n','\n').split(/\n\s*\n/).filter(p=>p.trim());
 if(paragraphs[0]!== '[ '+title+' ]'||paragraphs.length<4||paragraphs.length>6)fail('production_instagram_structure_invalid');
 return {caption:captions.instagram,platform_captions:{...captions},publication_title:title,production_caption_version:createHash('sha256').update(JSON.stringify([version,title,captions.instagram,captions.threads])).digest('hex'),production_caption_status:'authored'};
}
export function legacyProductionCaptions(plan){
 const caption=typeof plan.publishCaption==='string'?plan.publishCaption:typeof plan.caption==='string'?plan.caption:'';
 return {caption,platform_captions:{instagram:caption,threads:caption},publication_title:'',production_caption_version:null,production_caption_status:caption?'legacy-common':'awaiting-authored-captions'};
}
