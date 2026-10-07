'use strict';
const crypto=require('node:crypto');
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
function buildManifest(report,inventory,audit){
 const rows=report.entries.filter(r=>r.outputFolder&&r.images?.length),ids=new Set();
 const byId=new Map(inventory.rows.map(r=>[r.id,r])),findings=new Map(audit.findings.map(r=>[r.id,r])),jobs=[],decisions=[];
 for(const row of rows){
  if(ids.has(row.id))throw Error('제작 글 ID 중복: '+row.id);ids.add(row.id);
  const input=byId.get(row.id);if(!input)throw Error('원본 감사 대상 누락: '+row.id);
  const finding=findings.get(row.id);
  let disposition=input.disposition,reasonCode=input.reasonCode||null,reason=input.note||'',repair=false,evidence=[];
  if(row.id==='source-b0ada7acfec56a'){disposition='held';reasonCode='production_error';reason='마지막 덩그러니 짧은 문단 연결 수정';}
  if(disposition==='held'&&reasonCode==='production_error'){repair=true;disposition='eligible';}
  if(finding){
   evidence=finding.evidence||[];
   if(finding.reasonCode==='production_error'){repair=true;disposition='eligible';reasonCode='production_error';reason=finding.reason;}
   else{disposition=finding.recommendation==='reject'?'rejected':'held';reasonCode=finding.recommendation==='reject'?'material_unsuitable':finding.reasonCode==='source_insufficient'?'source_insufficient':'source_insufficient';reason=finding.reason;repair=false;}
  }
  const decision={id:row.id,title:row.title,disposition,reasonCode,reason,repair,evidence,previousOutputFolder:row.outputFolder};
  decisions.push(decision);if(disposition==='eligible')jobs.push({...row,repair,sourceZipSha256:input.sourceZipSha256});
 }
 return {jobs,decisions,previousPosts:rows.length,plannedPosts:jobs.length,counts:decisions.reduce((a,r)=>(a[r.disposition]=(a[r.disposition]||0)+1,a),{})};
}
function pngSize(b){if(b.length<24||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('PNG 손상');const width=b.readUInt32BE(16),height=b.readUInt32BE(20);if(width!==1080||height<240||height>5000)throw Error('PNG 크기 범위 오류');return {width,height};}
function assertCoverGeometry(g){if(!g||g.lines.join('').replace(/\s/g,'')!==g.title.replace(/\s/g,''))throw Error('표지 제목 손실');if(g.size<64||g.box.x<100||g.box.y<120||g.box.x+g.box.width>980||g.box.y+g.box.height>1810)throw Error('표지 제목 범위 초과');}
function isInfrastructureFailure(error,{rendererDestroyed=false,rendererGone=false}={}){return rendererDestroyed||rendererGone||/^(?:EACCES|EPERM|EIO|ENOSPC|EROFS|EBUSY|ENOENT)$/.test(error.code||'')||/Object has been destroyed|render.process.gone|render process|webContents|context.*released/i.test(error.message||'');}
module.exports={buildManifest,sha256,pngSize,assertCoverGeometry,isInfrastructureFailure};

