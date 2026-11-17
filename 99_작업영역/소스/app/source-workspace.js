(function(){
 'use strict';const api=window.ThreadsStudioTool;if(!api)return;
 const production=location.pathname.endsWith('/source-batch.html'),$=id=>document.getElementById(id);let context=null,dirty=false,busy=false,navigating=false,result=null;
 document.body.dataset.workspace='true';
 const bar=document.createElement('section');bar.className='workspace-tool-heading';bar.innerHTML='<div><p class="workspace-tool-type"></p><h1 id="workspace-title">선택한 자료를 읽는 중…</h1></div><div class="workspace-tool-actions"><button id="workspace-back">돌아가기</button>'+(production?'<button id="workspace-editor">이미지 컷 편집</button><button id="workspace-save-selection">선별 저장</button><button id="workspace-generate">새 버전 만들기</button><button id="workspace-handoff" disabled>검토로 보내기</button>':'<button id="workspace-production">원문 선별</button><button id="workspace-save">편집 저장</button>')+'</div><p id="workspace-status" role="status" aria-live="polite"></p>';document.body.prepend(bar);
 const status=(text,error=false)=>{$('workspace-status').textContent=text;$('workspace-status').dataset.error=String(error);};
 const action=(fn,navigation=false)=>async()=>{if(busy||navigating)return;const main=document.querySelector('main'),wasInert=main?.inert;if(navigation){navigating=true;if(main)main.inert=true;}else busy=true;try{return await fn();}catch(e){status(e.message||'작업을 마치지 못했습니다.',true);}finally{if(navigation){navigating=false;if(main)main.inert=wasInert;}else busy=false;}};
 $('workspace-back').onclick=action(()=>api.back(),true);
 if(production){
  $('workspace-save-selection').onclick=action(async()=>{await api.saveSelection(window.ThreadsSourceBatch.snapshotWorkspaceSelection());dirty=false;status('선별 내용을 같은 원본의 PC 초안으로 저장했습니다.');});
  $('workspace-editor').onclick=action(()=>api.switchTool('editor'),true);
  $('workspace-generate').onclick=action(async()=>{status('원문과 이미지 검증 후 새 버전을 만드는 중…');result=await api.generate();dirty=false;$('workspace-handoff').disabled=false;status(result.pages+'장 저장 · 검토 전 새 버전'+(result.instagramCarouselExceeded?' · Instagram 캐러셀 20장 초과':''));});
  $('workspace-handoff').onclick=action(async()=>{if(!result)throw Error('먼저 새 버전을 만들어 주세요.');await api.handoff(result.outputVersion);dirty=false;},true);
  const main=document.querySelector('main');for(const child of [...main.children])if(!['curation'].includes(child.id)&&child.getAttribute('aria-label')!=='제작 이미지 확인')child.hidden=true;
  for(const id of ['previewCurrent','renderCurrent','saveBundle','applySuggestion'])$(id).hidden=true;
 }else{
  $('workspace-production').onclick=action(()=>api.switchTool('production'),true);
  $('workspace-save').onclick=action(async()=>{await window.ThreadsSourceCutEditor.saveWorkspace();status('편집을 같은 글·버전의 PC 기록으로 저장했습니다.');});
  document.querySelector('.topbar').hidden=true;
 }
 document.addEventListener('input',()=>{if(context&&!busy)dirty=true;});document.addEventListener('change',()=>{if(context&&!busy)dirty=true;});
 const bytes=data=>Uint8Array.from(atob(data),c=>c.charCodeAt(0));
 function initialWorkspaceTemplate(value){
  const plan=value?.source?.kind==='archive'?value.source.plan:null;
  if(value?.savedSelection||!plan||Object.hasOwn(plan.style||{},'templateId'))return null;
  if(Object.hasOwn(plan.editorial||{},'templateId'))return plan.editorial.templateId;
  if(plan.cover?.kind!=='text')return null;
  return plan.segments?.some(part=>part.kind==='image'&&part.selected===true&&part.coverOnly!==true)?'mint_text':'white_title';
 }
 // END_WORKSPACE_TEMPLATE
 async function open(value){
  if(!await canLeave())throw Error('먼저 현재 편집을 저장해 주세요.');busy=true;try{
   context=value;result=null;dirty=false;$('workspace-title').textContent=value.title||'선택한 자료';document.querySelector('.workspace-tool-type').textContent=production?'원문 선별 · 새 이미지 버전':'현재 제작 이미지 컷 편집';
   if(production){
    $('workspace-handoff').disabled=true;
    if(value.source?.kind==='archive'){const data=bytes(value.source.data),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(v=>v.toString(16).padStart(2,'0')).join('');if(digest!==value.source.sha256)throw Error('보존 원문 ZIP이 연결 정보와 다릅니다.');await window.ThreadsSourceBatch.openWorkspaceArchive(new File([data],'source-bundle.zip',{type:'application/zip'}));}
    else if(value.source?.kind==='job')await window.ThreadsSourceBatch.openWorkspaceInput(value.source.job);
    else {$('curation').hidden=true;$('workspace-save-selection').disabled=true;$('workspace-generate').disabled=true;status(value.bodyKind==='summary'?'수집 요약만 있습니다. 제작할 원문은 아직 확보되지 않았습니다.':'제작 원문을 확인할 수 없습니다.');return true;}
    if(value.savedSelection)window.ThreadsSourceBatch.applyWorkspaceSelection(value.savedSelection);
    else{const template=initialWorkspaceTemplate(value);if(template)$('batchTemplate').value=template;}
    $('workspace-save-selection').disabled=value.readOnly===true;$('workspace-generate').disabled=value.readOnly===true;document.querySelector('main').inert=value.readOnly===true;$('originalTitle').readOnly=true;status(value.readOnly?'읽기 전용 · 저장과 새 버전 생성은 잠겨 있습니다.':'원문·이미지·댓글을 대조한 뒤 새 버전을 만드세요.');
   }else{
    const main=$('source-cut-editor');if(!value.editorFiles?.length){main.hidden=true;$('workspace-save').disabled=true;status('이 선택에는 컷 편집할 이미지가 없거나 기존 편집기 한도를 넘었습니다.');return true;}
    const files=value.editorFiles.map(im=>new File([bytes(im.data)],im.name,{type:im.type}));
    await window.ThreadsSourceCutEditor.openWorkspaceImages(files,{title:value.title,source:{candidateId:value.postId,title:value.title,url:value.sourceUrl||'',inputMode:'images',extraction:{reviewRequired:true,kind:'existing-production-images',outputVersion:value.outputVersion}}});
    main.hidden=false;main.inert=value.readOnly===true;$('workspace-save').disabled=value.readOnly===true;status('기존 제작 이미지를 편집합니다. 원문 전문 확인이나 게시 승인이 아닙니다.');
   }
   dirty=false;return true;
  }finally{busy=false;}
 }
 async function canLeave(){if(busy||production&&dirty)return false;return production||window.ThreadsSourceCutEditor?.canLeave?.()===true;}
 window.ThreadsStudioToolView=Object.freeze({open,canLeave,render:async()=>{if(!production||!context?.source)throw Error('제작 원문을 확인할 수 없습니다.');const value=await window.ThreadsSourceBatch.renderWorkspaceSelection();return value;},markSaved:()=>{dirty=false;}});
})();
