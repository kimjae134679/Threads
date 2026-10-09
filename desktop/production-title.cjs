'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{editorRoot}=require('./editor-assets.cjs');let cached;
function scripts(){if(!cached){const load=name=>{const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(editorRoot(),name),'utf8'),{module});return module.exports;};cached={policy:load('source-page-plan.js'),typography:load('source-cover-typography.js')};}return cached;}
function titleInfo(original){return scripts().policy.titleInfo(original);}
function normalizeCoverInput(originalTitle,titleStyle=null,emphasis=''){
 const {policy,typography}=scripts(),info=policy.titleInfo(originalTitle);if(!info.displayTitle)throw Error('출처 꼬리표를 제외한 실제 제목이 없습니다.');
 const normalizedStyle=typography.cleanStyle(info.displayTitle,titleStyle,policy,originalTitle),phrase=policy.titleInfo(emphasis).displayTitle;
 return{originalTitle:info.originalTitle,title:info.displayTitle,sourceLabels:info.sourceLabels,captionInputTitle:info.displayTitle,titleStyle:normalizedStyle,emphasis:phrase&&info.displayTitle.includes(phrase)?phrase:''};
}
function validatePreparedTitle(record,originalTitle,sourceUrl){
 const info=titleInfo(originalTitle);if(record?.schema!=='threads-title-input-v1'||record.originalTitle!==info.originalTitle||record.displayTitle!==info.displayTitle||record.captionInputTitle!==info.displayTitle||record.sourceUrl!==(sourceUrl||''))throw Error('정리된 제목 입력이 원문·출처와 달라 제작을 보류합니다.');
 return record;
}
module.exports={titleInfo,normalizeCoverInput,validatePreparedTitle};
