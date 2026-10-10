// User-requested fresh current list. Previous state is backed up by the activation operation.
import {rejectSecrets} from './domain.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
export function replaceCurrentLayouts(state,entries,operation){
 rejectSecrets(entries);rejectSecrets(operation);
 if(!Array.isArray(entries)||!entries.length||entries.length!==state.posts.length||new Set(entries.map(e=>e.post_id)).size!==entries.length)fail('layout_scope_invalid');
 if(typeof operation?.operation_id!=='string'||!Number.isFinite(Date.parse(operation.at)))fail('layout_operation_required');
 if(state.jobs.some(j=>['running','reconciliation'].includes(j.state)))fail('layout_running_job_requires_review');
 const next=structuredClone(state);
 next.posts=entries.map(e=>{
  const previous=state.posts.find(p=>p.post_id===e.post_id);
  if(!previous||previous.output_version!==e.old_output_version||!e.new_output_version||e.new_output_version===e.old_output_version)fail('layout_version_conflict');
  if(e.content_verified!==true||!Array.isArray(e.images)||!e.images.length||e.images.length>200||e.images.some((im,i)=>im.order!==i+1||im.mime!=='image/png'||!/^[a-f0-9]{64}$/.test(im.asset_id||'')))fail('layout_images_invalid');
  const p=structuredClone(previous);p.output_version=e.new_output_version;p.images=structuredClone(e.images);p.revision++;
  p.review=null;p.final_review=null;p.review_note='';p.review_note_updated_at=null;p.production_feedback={current:null,previous:null};p.approval=null;p.publication_approval=null;
  p.source={...p.source,verified:false};p.safety={fact:'UNKNOWN',rights:'UNKNOWN',privacy:'UNKNOWN',defamation:'UNKNOWN',platform_policy:'UNKNOWN',warn_note:''};
  p.media_format='images';p.reel_video=null;p.reel_playback_reviewed=false;p.inactive_for_this_batch=false;
  delete p.layout_review_link;delete p.restored_from_output_version;
  p.current_layout={activated:true,output_version:e.new_output_version,operation_id:operation.operation_id,activated_at:operation.at,mapping_sha256:e.mapping_sha256,source_bundle_sha256:e.source_bundle_sha256,width:1080,height:1440,review_inherited:false};
  return p;
 });
 next.jobs=[];next.dry_runs=[];next.archived_posts=[];next.post_history={};next.revision++;
 return next;
}
