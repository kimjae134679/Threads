'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const {editorRoot}=require('./editor-assets.cjs');
const modelModule={exports:{}};require('node:vm').runInNewContext(require('node:fs').readFileSync(path.join(editorRoot(),'universal-production-model.js'),'utf8'),{module:modelModule});
const {auditLayout,normalize}=modelModule.exports;
const {prepareImageComposition}=require('./image-composition.cjs');
function assertExactIntake(source,layout){
 const audit=auditLayout(layout);if(!audit.ok)throw Error('본문·이미지·댓글 무결성 검증 실패: '+JSON.stringify(audit.issues));
 const ops=layout.pages.flatMap(p=>p.operations||[]);
 for(const role of ['body','comment']){const expected=normalize((role==='body'?source.segments.filter(s=>s.kind==='text'):source.comments).map(s=>s.text).join(''));const actual=normalize(ops.filter(o=>o.kind==='text'&&o.role===role).map(o=>o.text).join(''));if(expected!==actual)throw Error('원문 전체 '+role+' 누락·추가·순서 검증 실패');}
 const expectedImages=source.segments.filter(s=>s.kind==='image').map(s=>s.mediaName.toLowerCase());const actualImages=audit.images.filter(s=>!s.omitted&&s.exact).map(s=>s.mediaName.toLowerCase());if(JSON.stringify(expectedImages)!==JSON.stringify(actualImages))throw Error('원문 전체 이미지 위치 검증 실패');
 return {...audit,rawBodyAndCommentsExact:true};
}
async function renderBatchInput(job,{getWindow,context={},universalCover=false,strict=false,preserveBodyPlan=null}={}) {
    if(job.imageHandoff?.generationRequests?.length)throw new Error('image generation consumer is not connected; required imagery remains pending');
    if(job.imageHandoff?.requiresCompositionSupport){
      const imageComposition=await prepareImageComposition(job.imageHandoff);
      job={...job,imageComposition};
    }
    const win=await getWindow();
    const result=await win.webContents.executeJavaScript(`(async()=>{try{
      const input=${JSON.stringify(job)},prefix='candidate/';
      const sourceBytes=input.sourceData?Uint8Array.from(atob(input.sourceData),c=>c.charCodeAt(0)):input.sourceText;
      const source=new File([sourceBytes],input.sourceName,{type:input.sourceMime||'text/plain;charset=utf-8'});
      Object.defineProperty(source,'webkitRelativePath',{value:prefix+input.sourceName});
      const all=[source];
      if(input.intakeText) {
        const intake=new File([input.intakeText],'intake-manifest.json',{type:'application/json'});
        Object.defineProperty(intake,'webkitRelativePath',{value:prefix+'intake-manifest.json'});all.push(intake);
      }
      for(const file of input.files) {
        const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));
        const image=new File([bytes],file.name,{type:file.type});
        Object.defineProperty(image,'webkitRelativePath',{value:prefix+input.imageDirectory+'/'+file.name});all.push(image);
      }
      if(input.inputKind==='html') {
        const draft=window.ThreadsSourceCuration.htmlDraft(input.sourceText,all.map(file=>file.name));
        for(const part of draft.segments) {
          const embedded=/^data:(image\\/(?:png|jpeg|webp|gif));base64,([a-z0-9+/=\\s]+)$/i.exec(part.mediaUrl||'');
          if(!embedded||all.some(file=>file.name===part.mediaName))continue;
          const image=new File([Uint8Array.from(atob(embedded[2].replace(/\\s/g,'')),c=>c.charCodeAt(0))],part.mediaName,{type:embedded[1]});
          Object.defineProperty(image,'webkitRelativePath',{value:prefix+input.imageDirectory+'/'+part.mediaName});all.push(image);
        }
      }
      const item=input.inputKind==='saved-media'?await window.ThreadsSourceBatch.loadSavedFolder(all):
        await window.ThreadsSourceBatch.prepare(source,all);
      if(input.inputKind!=='saved-media')window.ThreadsSourceBatch.review(item);
      if(${strict}){for(const part of item.plan.segments)part.selected=part.kind==='image'||!!part.text?.trim();for(const comment of item.plan.comments||[])comment.selected=true;}
      item.plan.sourceUrl=item.plan.sourceUrl||input.sourceUrl||null;
      item.plan.sourceCheckedAt=input.sourceCheckedAt||null;item.plan.sourcePublishedAt=input.sourcePublishedAt||null;item.plan.collectedAt=input.collectedAt||null;
      item.plan.editorial=input.editorial||null;
      item.plan.completeCover=${!!preserveBodyPlan||job.imageHandoff?.selection?.choice==='text'&&!job.imageHandoff.held.length};
      const emphasis=input.editorial?.titleHighlights?.[0],accent=input.editorial?.titleAccent||'#ffe34d';
      const titleStyle=input.editorial?.titleStyle||(emphasis?{emphasis,accent}:null);
      if(titleStyle)item.plan.coverTitleStyle={...titleStyle};
      if(input.imageComposition){
        item.plan.imageComposition=input.imageComposition;
        if(titleStyle)item.plan.imageComposition.titleStyle={...titleStyle};
      }
      if(input.coverAsset){
        const a=input.coverAsset,id='supplementary-cover';
        item.plan.segments.push({id,kind:'image',mediaName:a.name,selected:true,coverOnly:true,
          contentRole:'illustrative_cover',location:'supplementary:'+a.kind});
        item.plan.coverAsset=a;item.plan.cover={kind:'image',segmentId:id};
        item.plan.editorial={...item.plan.editorial,templateId:'photo_cover',coverSegmentId:id,
          selectionReason:a.relevance};
      }
      item.plan.style={...item.plan.style,allowSystemFallback:true};
      document.getElementById('batchTemplate').value=item.plan.editorial?.templateId||'auto';
      document.getElementById('batchCanvas').value=input.editorial?.aspectRatio||'threads';
      const title=item.plan.originalTitle||input.title;
      const coverTitle=input.imageComposition?window.ThreadsPagePlan.headline(title):input.editorial?.coverTitle||window.ThreadsPagePlan.headline(title);
      document.getElementById('coverTitle').value=input.editorial?.coverLines?.join('\\n')||coverTitle;
      document.getElementById('titleHighlights').value=(input.editorial?.titleHighlights||[]).join(', ');
      document.getElementById('coverTitleEvidence').value=input.editorial?.titleEvidence||title;
      document.getElementById('coverSize').value='64';
      document.getElementById('coverTop').value='48';
      document.getElementById('coverLeft').value='70';
      const {bundle}=await window.ThreadsSourceBatch.sourceZip(item);
      window.__batchFile=new File([bundle],'source-bundle.zip');
      window.__batchPlan=await window.ThreadsSourceBatch.planBundle(window.__batchFile,{preview:true,universalCover:${universalCover},preserveBodyPlan:${JSON.stringify(preserveBodyPlan)}});
      return {productionPlan:window.__batchPlan,title,sourcePlan:JSON.parse(JSON.stringify(item.plan))};
    }catch(error){return {error:error.message};}})()`);
    if(result.error)throw new Error(result.error);
    const intakeAudit=strict&&!preserveBodyPlan?assertExactIntake(result.sourcePlan,result.productionPlan):null;
    if(intakeAudit)result.productionPlan.intakeIntegrity=intakeAudit;
    if(context.folder) {
      await fs.mkdir(path.join(context.folder,'작업 정보'),{recursive:true});
      await fs.writeFile(path.join(context.folder,'작업 정보','production-plan.json'),JSON.stringify(result.productionPlan,null,2)+'\n','utf8');
      const p=result.productionPlan;
      const note=['# 제작 계획',p.originalTitle,'','기준: '+p.ruleVersion,'계획 갱신: '+p.preparedAt,'표지 형식: '+p.templateId,'선택 이유: '+p.selectionReason,
        '원문 게시: '+(p.sourcePublishedAt||'미확인'),'원문 확인: '+(p.sourceCheckedAt||'미확인'),'수집: '+(p.collectedAt||'미확인'),
        '표지 제목: '+p.coverTitle,'원문 제목: '+p.originalTitle,'검수: 미확인','게시: 확인 기록 없음',
        '','장별 구성',...p.pages.map(page=>page.number+'장 / '+page.role+' / '+page.width+'×'+page.height+' / '+page.elements.map(e=>e.sourceId+':'+e.kind).join(', ')),
        '','제외 기록',...p.omitted.map(o=>o.sourceId+' / '+o.reason),'','주의',...p.warnings];
      await fs.writeFile(path.join(context.folder,'제작 계획.md'),note.join('\n')+'\n','utf8');
    }
    const rendered=await win.webContents.executeJavaScript(`(async()=>{try{
      const preview=await window.ThreadsSourceBatch.renderBundle(window.__batchFile,{preview:true,watermark:false,productionPlan:window.__batchPlan,coverOnly:${!!preserveBodyPlan}});
      const bundle=window.__batchFile,title=${JSON.stringify(result.title)};
      const encode=bytes=>{let raw='';for(let i=0;i<bytes.length;i+=16384)raw+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(raw);};
      return {pages:preview.pages,title,zip:encode(new Uint8Array(await preview.zip.arrayBuffer())),
        sourceZip:encode(new Uint8Array(await bundle.arrayBuffer())),
        images:preview.images.map(image=>({name:image.name,data:encode(image.data)}))};
    }catch(error){return {error:error.message};}})()`);
    if(rendered.error)throw new Error(rendered.error);
    if(!rendered.pages||rendered.images?.length!==rendered.pages)throw new Error('결과 이미지 수를 확인할 수 없습니다.');
    return {title:rendered.title,productionPlan:result.productionPlan,sourcePlan:result.sourcePlan,intakeAudit,zip:Buffer.from(rendered.zip,'base64'),sourceZip:Buffer.from(rendered.sourceZip,'base64'),
      images:rendered.images.map(image=>({name:image.name,data:Buffer.from(image.data,'base64')}))};
  }

module.exports={renderBatchInput,assertExactIntake};
