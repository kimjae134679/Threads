'use strict';
// Offline rework preserves the acquired source, its order and historical ratings.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
require('../app/source-page-plan.js');const P=globalThis.ThreadsPagePlan;
const output=path.resolve(process.argv[5]||path.resolve(__dirname,'../data/runtime/feedback-rework/replanned'));
const sourceRoot=path.resolve(process.argv[3]||path.resolve(__dirname,'../data/runtime/feedback-rework/inputs'));
const oldRoot=process.argv[2];if(!oldRoot)throw Error('Specify previous output folder.');
const status=JSON.parse(fs.readFileSync(path.join(oldRoot,'status.json')));
const feedback=JSON.parse(fs.readFileSync(process.argv[4]||path.resolve(__dirname,'../data/runtime/feedback-rework/user-feedback-original.json')));
const overridePath=process.argv[6]&&!process.argv[6].startsWith('--')?process.argv[6]:null;
const overrides=overridePath?JSON.parse(fs.readFileSync(overridePath,'utf8')):{};
const planOnly=process.argv.includes('--plan-only');
const edits={
 'source-b92a4114494690':{s0:'사용자가 지적한 미방 이미지 제외'},
 'source-68991bdbe3eeef':{s0:'사용자가 지적한 미방 이미지 제외'},
 'source-ed420158856958':{s0:'사용자가 지적한 본문과 무관한 여성 이미지 제외'},
 'source-010abe357e9105':{s0:'사용자가 지적한 본문과 무관한 여성 이미지 제외'},
 'source-c17d392921074a':{s0:'사용자가 지적한 잘못된 첫 이미지 제외'}
};
const missing=new Set(['source-aa03605099bb64','source-cd60dcc8790a64','source-2a9823cc067575','source-1b38d44a793e89','source-c17a46580b99ba','source-bc60230dca7c95','source-a107c5a09023ce','source-44c1b22549b0aa']);
const xml=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const metric=(text,size,weight)=>[...text].reduce((n,c)=>n+size*(/[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af]/u.test(c)?1:/[ilI.,'!:;\s]/.test(c)?0.3:/[MW@]/.test(c)?0.88:0.6),0);
fs.mkdirSync(output,{recursive:true});const rows=[];
for(const row of status.entries){
 const evaluations=feedback.evaluations.filter(e=>e.id===row.id);
 if(!row.outputFolder){rows.push({...row,reworkStatus:'blocked',evaluations});continue;}
 try{
  const old=JSON.parse(fs.readFileSync(path.join(oldRoot,row.outputFolder,'production-plan.json')));
  const exclusions={};for(const [id,reason] of Object.entries(edits[row.id]||{}))if(old.sourceUnits.some(u=>u.id===id&&u.kind==='image'))exclusions[id]=reason;
  const regions=Object.fromEntries(old.omitted.filter(o=>o.reason==='explicit_editorial_crop').map(o=>[o.sourceId,o.region]));
  const coverImage=old.pages[0].operations.find(o=>o.kind==='image'&&o.sourceId);
  const plan={originalTitle:old.originalTitle,coverTitle:old.coverTitle,sourceUrl:old.sourceUrl,sourceCheckedAt:old.sourceCheckedAt,sourcePublishedAt:old.sourcePublishedAt,collectedAt:old.collectedAt,
   segments:old.sourceUnits.map(u=>({...u,selected:true})),comments:[],style:{},
   editorial:{coverTitle:P.headline(old.coverTitle),templateId:coverImage&&!exclusions[coverImage.sourceId]?'auto':old.templateId==='photo_cover'?'auto':old.templateId,coverSegmentId:exclusions[coverImage?.sourceId]?undefined:coverImage?.sourceId,exclusions,regions,titleEvidence:old.titleEvidence,
   titleHighlights:[...new Set(old.pages[0].operations.filter(o=>o.role==='title').flatMap(o=>o.highlights||[]))]}};
  if(row.id==='source-dfea21ce25ea8f')plan.editorial.regions.s0={x:31,y:284,width:730,height:429};
  if(row.id==='source-aa03605099bb64')plan.editorial.regions.s0={x:12,y:420,width:773,height:70};
  if(['source-b92a4114494690','source-2b2b603a2d502c'].includes(row.id))for(const unit of plan.segments.filter(s=>s.kind==='image'&&!exclusions[s.id])){
   const d=old.imageAnalysis[unit.mediaName.toLowerCase()];plan.editorial.regions[unit.id]={x:0,y:0,width:d.width,height:d.height};
  }
  if(row.id==='source-5f2f5c55e6e80d')plan.editorial.annotations=[{kind:'explanation',text:'이니는 인벤 사이트에서 쓰는 활동 포인트다.',evidenceUrl:'https://imart.inven.co.kr/faq/?faqType=1'}];
  if(row.id==='source-dc43bfc5a51ea7'){
   plan.editorial.annotations=[{kind:'commentary',text:'솔로 입장에서는 이런 이유로 늦는다는 게 더 얄밉게 느껴질 수도 있겠다.'}];
  }
  if(overrides[row.id]){
   const revision=overrides[row.id];
   plan.editorial={...plan.editorial,...revision.editorial,
    exclusions:{...plan.editorial.exclusions,...revision.editorial?.exclusions},regions:{...plan.editorial.regions,...revision.editorial?.regions}};
   plan.style={...plan.style,...revision.style};
  }
  const compiled=P.compile(plan,old.imageAnalysis,metric);compiled.imageAnalysis=old.imageAnalysis;
  compiled.proofOnly=true;compiled.typographyVerification='approximate_metrics_visual_review_pending';
  if(row.id==='source-5f2f5c55e6e80d')compiled.editorialSources=[{purpose:'이니 용어 설명',url:'https://imart.inven.co.kr/faq/?faqType=1',checkedAt:'2026-10-06'}];
  const folder=path.join(output,row.id);fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'production-plan.json'),JSON.stringify(compiled,null,2));
  // Only the isolated working input receives these instructions. Original files remain untouched.
  const work=path.join(sourceRoot,row.relativePath,'작업 정보');fs.mkdirSync(work,{recursive:true});
  fs.writeFileSync(path.join(work,'feedback-revision-plan.json'),JSON.stringify({schema:'threads-feedback-revision-v1',id:row.id,priorVersions:evaluations.map(e=>e.outputVersion),editorial:plan.editorial,segments:plan.segments,appliedToInstalledApp:false},null,2));
  // SVG proofs are a separate review artifact, never advertised as the installed PNG output.
  for(const page of planOnly?[]:compiled.pages){
   let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="'+page.height+'" viewBox="0 0 1080 '+page.height+'"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111" stop-opacity="0"/><stop offset="1" stop-color="#111" stop-opacity=".85"/></linearGradient></defs><rect width="1080" height="'+page.height+'" fill="'+page.background+'"/>';
   for(const op of page.operations){
    if(op.kind==='image'){
     let source=path.join(sourceRoot,row.relativePath,'source','media',op.name);
     if(!fs.existsSync(source)){const base=path.join(sourceRoot,row.relativePath);const search=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isFile()&&entry.name.toLowerCase()===op.name.toLowerCase())return file;if(entry.isDirectory()){const found=search(file);if(found)return found;}}};source=search(base)||source;}
     const data=fs.readFileSync(source),ext=path.extname(op.name).slice(1).replace('jpg','jpeg');const d=old.imageAnalysis[op.name];
     if(d.sha256&&crypto.createHash('sha256').update(data).digest('hex')!==d.sha256)throw Error('원본 이미지 해시 불일치: '+op.name);
     const sx=op.sourceX||0,sy=op.sourceY||0,sw=op.sourceWidth||d.width,sh=op.sourceHeight||d.height;
     svg+='<svg x="'+op.x+'" y="'+op.y+'" width="'+op.width+'" height="'+op.height+'" viewBox="'+[sx,sy,sw,sh].join(' ')+'"><image width="'+d.width+'" height="'+d.height+'" href="data:image/'+ext+';base64,'+data.toString('base64')+'"/></svg>';
    }else if(op.kind==='rect'||op.kind==='gradient')svg+='<rect x="'+op.x+'" y="'+op.y+'" width="'+op.width+'" height="'+op.height+'" fill="'+(op.kind==='gradient'?'url(#g)':op.color)+'"/>';
    else if(op.kind==='text'){
     let runs='',i=0;while(i<op.text.length){const hit=(op.highlights||[]).find(h=>op.text.startsWith(h,i));if(hit){runs+='<tspan fill="'+op.highlightColor+'">'+xml(hit)+'</tspan>';i+=hit.length;}else {runs+=xml(op.text[i]);i++;}}
     svg+='<text x="'+op.x+'" y="'+(op.y+op.size)+'" font-family="Malgun Gothic, sans-serif" font-size="'+op.size+'" font-weight="'+op.weight+'" fill="'+op.color+'" text-anchor="'+(op.align==='center'?'middle':'start')+'"'+(op.stroke?' stroke="'+op.stroke+'" stroke-width="'+op.strokeWidth+'" paint-order="stroke"':'')+'>'+runs+'</text>';
    }
   }
   fs.writeFileSync(path.join(folder,'slide-'+String(page.number).padStart(3,'0')+'.svg'),svg+'</svg>');
  }
  const html='<meta charset="utf-8"><title>'+xml(row.title)+'</title><style>body{background:#eee;margin:24px}img{display:block;max-width:100%;width:720px;margin:16px auto}h1,p{text-align:center}</style><h1>'+xml(row.title)+'</h1><p>재편집 SVG 검토본 · 실제 앱 PNG 재제작·최종 검수 대기</p>'+compiled.pages.map(p=>'<img src="slide-'+String(p.number).padStart(3,'0')+'.svg">').join('');
  if(!planOnly)fs.writeFileSync(path.join(folder,'review.html'),html.replace('실제 앱 PNG 재제작·최종 검수 대기','이전 PNG 버전 평가를 반영한 검토본. 실제 앱 PNG 재제작·최종 검수 대기'));
  const follow=[];if(missing.has(row.id))follow.push('본문·후속 내용 추가 확보 필요');if(evaluations.some(e=>e.score!==null&&e.score<=3))follow.push('소재와 마무리 재선정 필요');if(evaluations.some(e=>e.note))follow.push('사용자 메모 개별 시각 검수 필요');if(compiled.pages.length>10)follow.push('긴 글: 사건 흐름 유지하며 압축 여부 검토');
  rows.push({...row,reworkStatus:planOnly?'production_plan_created':'svg_proof_created',newRuleVersion:P.VERSION,newPages:compiled.pages.length,proofFolder:planOnly?null:row.id,planFolder:row.id,followUp:follow,evaluations,omitted:compiled.omitted,editorialHold:overrides[row.id]?.hold||null});
 }catch(e){rows.push({...row,reworkStatus:'blocked',reworkError:e.message,evaluations});}
}
const summary={createdAt:new Date().toISOString(),oldOutputUntouched:true,installed:false,publicationAllowed:false,total:rows.length,productionPlans:rows.filter(r=>r.planFolder).length,plannedPages:rows.reduce((n,r)=>n+(r.newPages||0),0),svgProofs:rows.filter(r=>r.reworkStatus==='svg_proof_created').length,svgPages:rows.filter(r=>r.reworkStatus==='svg_proof_created').reduce((n,r)=>n+(r.newPages||0),0),feedbackEntries:feedback.evaluations.length,entries:rows};
fs.writeFileSync(path.join(output,'status.json'),JSON.stringify(summary,null,2));
fs.writeFileSync(path.join(output,'index.html'),'<meta charset="utf-8"><title>평가 반영 재검토</title><style>body{font:18px sans-serif;padding:30px}li{margin:18px}</style><h1>평가 반영 재검토</h1><p>SVG 검토본 '+summary.svgProofs+'건. 설치 앱 PNG 결과와 구분됩니다. 아래 점수·메모는 이전 PNG 제작 버전의 평가이며 새 검토본의 평가가 아닙니다.</p><ul>'+rows.filter(r=>r.proofFolder).sort((a,b)=>Number(!!b.evaluations.length)-Number(!!a.evaluations.length)).map(r=>'<li><a href="'+r.proofFolder+'/review.html">'+xml(r.title)+'</a> ('+r.newPages+'장) '+r.evaluations.map(e=>xml(e.score+'점 '+e.note)).join(' / ')+'<br>'+xml(r.followUp.join(' / '))+'</li>').join('')+'</ul>');
console.log(JSON.stringify({total:summary.total,productionPlans:summary.productionPlans,plannedPages:summary.plannedPages,svgProofs:summary.svgProofs,svgPages:summary.svgPages,feedbackEntries:summary.feedbackEntries,blockedOutputs:rows.filter(r=>r.outputFolder&&r.reworkStatus==='blocked').map(r=>({id:r.id,error:r.reworkError}))},null,2));
