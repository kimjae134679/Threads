'use strict';
const path=require('node:path'),{loadBatchInput}=require('./batch-input.cjs'),{assertExactIntake}=require('./batch-render.cjs'),{createReferenceStore}=require('./reference-store.cjs');
function createNativeToolAdapter({owned,projectRoot,readOnly=false}){
 let references;const deny=()=>{if(readOnly)throw Error('read_only_inspection');};
 return{
  url:owned.url,readOnlyInspection:readOnly,
  async resolveToolSource(selection){
   const context=await owned.resolveToolSource(selection);context.readOnly=readOnly;
   if(context.sourceFolder){try{const job=await loadBatchInput(context.sourceFolder,context.inputMetadata);if(job)context.source={kind:'job',job};}catch(e){if(e.message!=='unified_material_not_verbatim')throw e;context.source=null;context.sourceReason='원문 전문이 아닌 보존 기록입니다.';}}
   context.savedSelection=await owned.loadToolSelection?.(context)||null;return context;
  },
  async generateToolSource(context,webContents){deny();const result=await webContents.executeJavaScript('window.ThreadsStudioToolView.render()');assertExactIntake(result.sourcePlan,result.productionPlan);return owned.saveToolProduction(context,result);},
  async handoffToolSource(context,version){deny();return owned.handoffToolSource(context,version);},
  async saveToolSelection(context,plan){deny();return owned.saveToolSelection(context,plan);},
  async saveToolProject(context,project){deny();return owned.saveToolProject(context,project);},
  async saveToolReference(context,payload){deny();if(payload?.summary?.source?.candidateId!==context.postId)throw Error('studio_editor_source_changed');references??=createReferenceStore(path.join(projectRoot,'local-private/editor-references'));return references.save(payload);}
 };
}
module.exports={createNativeToolAdapter};
