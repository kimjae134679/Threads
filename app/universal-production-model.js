(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ThreadsUniversalProductionModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const normalize=text=>String(text??'').replace(/[\s\u200b\ufeff]/gu,'');
  const cleanTitle=text=>String(text??'').replace(/^(?:\s*(?:\[\s*(?:네이트\s*판|판|더쿠|인스티즈|블라인드|루리웹)\s*\]|\(\s*(?:네이트\s*판|판|더쿠|인스티즈|블라인드|루리웹)\s*\))\s*)+/u,'').replace(/(?:\s*(?:\[\s*(?:네이트\s*판|판|더쿠|인스티즈|블라인드|루리웹)\s*\]|\(\s*(?:네이트\s*판|판|더쿠|인스티즈|블라인드|루리웹)\s*\))\s*)+$/u,'').trim();
  function preparePlan(rawPlan) {
    const plan=JSON.parse(JSON.stringify(rawPlan));
    plan.editorial={...(plan.editorial||{}),templateId:'mint_text'};
    plan.style={...(plan.style||{}),manualTitleLayout:false};
    const title=cleanTitle(plan.originalTitle||plan.editorial.coverTitle||plan.coverTitle);
    plan.coverTitle=title;
    if(Object.hasOwn(plan.editorial,'coverTitle'))plan.editorial.coverTitle=title;
    if(Array.isArray(plan.editorial.titleHighlights))plan.editorial.titleHighlights=plan.editorial.titleHighlights.filter(word=>title.includes(word));
    if(plan.editorial.coverLines&&plan.editorial.coverLines.join(' ').replace(/\s+/g,' ').trim()!==title.replace(/\s+/g,' ').trim())delete plan.editorial.coverLines;
    return plan;
  }
  const wholeOmissions=new Set(['isolated_filler_reaction','duplicate_text','duplicate_image','empty_or_url_only',
    'empty_bullets','separator','editorial_preface','duplicate_or_link_comment','explicit_editorial_exclusion',
    'verified_image_transcription','supplementary_cover_only']);
  function auditLayout(layout) {
    const issues=[],body=[],comments=[],images=[],omissions=[],pages=layout?.pages||[];
    const omitted=layout?.omitted||[],units=(layout?.sourceUnits||[]).filter(unit=>!unit.coverOnly);
    const selectedComments=layout?.selectedComments||[],safeMargin=Number(layout?.safeMargin??layout?.typography?.safeMargin??0);
    const records=[],seenSourceIds=new Set();
    const fail=(code,details)=>issues.push({code,...details});
    const reasons=id=>omitted.filter(item=>item.sourceId===id&&typeof item.reason==='string'&&item.reason.trim());
    const canOmit=id=>reasons(id).some(item=>wholeOmissions.has(item.reason));
    const originalId=unit=>unit.location?.originalSourceId||unit.id;
    for(const [index,page] of pages.entries()) {
      if(!Number.isFinite(page.width)||page.width<=0||!Number.isFinite(page.height)||page.height<=0)fail('invalid_page_bounds',{page:index+1});
      for(const op of page.operations||[]) {
        if(op.kind==='text'&&['body','comment'].includes(op.role)||op.kind==='image'&&page.role!=='cover') {
          records.push({op,page:index+1});
          const height=op.kind==='text'?(op.lineHeight||op.size):op.height;
          const bottom=page.height-(op.kind==='text'?safeMargin:0);
          if(![op.x,op.y,height].every(Number.isFinite)||height<=0||op.x<-.5||op.x>page.width+.5||op.y<-.5||op.y+height>bottom+2||
            op.kind==='image'&&(!Number.isFinite(op.width)||op.width<=0||op.x+op.width>page.width+.5))
            fail('operation_outside_page',{page:index+1,sourceId:op.sourceId,role:op.role||'image'});
        }
      }
    }
    const checkText=(unit,role,result)=>{
      const rendered=records.filter(record=>record.op.kind==='text'&&record.op.role===role&&record.op.sourceId===unit.id);
      let expectedText=String(unit.text??'');
      if(role==='comment')for(const omission of reasons(unit.id)) {
        if(['display_metadata','display_news_byline'].includes(omission.reason)&&omission.text)expectedText=expectedText.replace(omission.text,'');
        if(omission.reason==='source_urls_in_metadata')for(const url of omission.urls||[])expectedText=expectedText.replaceAll(url,'');
      }
      const expected=normalize(expectedText),actual=normalize(rendered.map(record=>record.op.text).join(''));
      const excluded=!rendered.length&&canOmit(unit.id);
      const row={sourceId:unit.id,originalSourceId:originalId(unit),expectedCharacters:Array.from(expected).length,
        renderedCharacters:Array.from(actual).length,operationCount:rendered.length,exact:excluded||expected===actual,
        omitted:excluded,omissionReasons:excluded?reasons(unit.id).map(item=>item.reason):[]};
      result.push(row);if(excluded)omissions.push({sourceId:unit.id,reasons:row.omissionReasons});
      if(!row.exact)fail(actual.length>expected.length?'duplicated_or_added_text':!actual?'missing_text':'changed_or_missing_text',{sourceId:unit.id,role,
        expectedCharacters:row.expectedCharacters,renderedCharacters:row.renderedCharacters});
    };
    for(const unit of units) {
      if(seenSourceIds.has(unit.id))fail('duplicate_source_id',{sourceId:unit.id});
      seenSourceIds.add(unit.id);
      if(unit.kind==='text')checkText(unit,'body',body);
      else if(unit.kind==='image') {
        const ops=records.filter(record=>record.op.kind==='image'&&record.op.sourceId===unit.id).map(record=>record.op);
        const excluded=!ops.length&&canOmit(unit.id),row={sourceId:unit.id,originalSourceId:originalId(unit),
          mediaName:unit.mediaName,operationCount:ops.length,exact:excluded||ops.length>0,omitted:excluded};
        images.push(row);if(excluded)omissions.push({sourceId:unit.id,reasons:reasons(unit.id).map(item=>item.reason)});
        if(!row.exact)fail('missing_body_image',{sourceId:unit.id,mediaName:unit.mediaName});
        if(ops.some(op=>String(op.name).toLowerCase()!==String(unit.mediaName).toLowerCase()))fail('changed_body_image',{sourceId:unit.id});
        const region=layout.imageRegions?.[unit.id];
        if(region&&ops.length) {
          const slices=ops.map(op=>({x:op.sourceX??0,y:op.sourceY??0,width:op.sourceWidth??region.width,height:op.sourceHeight??region.height})).sort((a,b)=>a.y-b.y);
          let end=region.y;
          for(const slice of slices) {
            if(Math.abs(slice.x-region.x)>1||Math.abs(slice.width-region.width)>1||Math.abs(slice.y-end)>1||slice.height<=0)
              fail('lost_or_duplicated_image_region',{sourceId:unit.id});
            end=slice.y+slice.height;
          }
          if(Math.abs(end-region.y-region.height)>1)fail('lost_or_duplicated_image_region',{sourceId:unit.id});
        }
      }
    }
    for(const comment of selectedComments)checkText(comment,'comment',comments);
    const checkOrder=(expected,actual,kind)=>{
      const order=new Map(expected.map((unit,index)=>[unit.id,index]));let previous=-1;
      for(const record of actual) {
        const id=record.op.sourceId,index=order.get(id);
        if(index===undefined){fail('unknown_rendered_source',{sourceId:id,role:kind});continue;}
        if(index<previous)fail('source_order_changed',{sourceId:id,role:kind,page:record.page});
        previous=index;
      }
    };
    checkOrder(units,records.filter(record=>record.op.kind==='image'||record.op.role==='body'),'body');
    checkOrder(selectedComments,records.filter(record=>record.op.role==='comment'),'comment');
    return {ok:issues.length===0,issues,body,comments,images,omissions,
      bodyCharacters:body.reduce((sum,row)=>sum+row.renderedCharacters,0),commentCharacters:comments.reduce((sum,row)=>sum+row.renderedCharacters,0)};
  }
  return Object.freeze({preparePlan,auditLayout,normalize});
});
