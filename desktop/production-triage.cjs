'use strict';
const labels={priority:'먼저 검토',improve:'제목·이미지 보완',long:'장문 흐름 검토',sensitive:'표현·사실 검토',hold:'자료 보완'};
function assess(row,plan={}){
 if(!row.outputFolder)return {id:row.id,category:'hold',categoryLabel:labels.hold,reason:row.reason||'원문·이미지가 필요합니다.',rank:9000,reviewed:false};
 const body=(plan.sourceUnits||[]).filter(u=>u.kind==='text').map(u=>u.text||'').join('\n');
 const flags=[];
 if(/자살|자해|성폭행|강간|살인|사기|고소|세금|4대보험|정신과|우울증|불륜/.test(body))flags.push('표현·사실을 별도 확인');
 if(row.images?.length>10)flags.push('장 사이 흐름·읽기 부담 확인');
 if((plan.warnings||[]).length)flags.push('제작 경고 확인');
 if(!body&&row.templateId!=='screenshot')flags.push('본문 내용 확인');
 let category=flags.includes('표현·사실을 별도 확인')?'sensitive':row.images?.length>10?'long':
  !body||plan.titleEvidenceStatus!=='matched_source'||(plan.warnings||[]).length||['mint_text','white_title'].includes(row.templateId)?'improve':'priority';
 return {id:row.id,category,categoryLabel:labels[category],reason:flags.join(' · ')||(category==='improve'?'제목의 상황·강조·적합한 이미지 검토':'표지부터 결말까지 직접 검토'),rank:{priority:1000,improve:3000,long:5000,sensitive:7000}[category]+(row.images?.length||0),reviewed:false,analysis:'원문 단위·장수·근거·경고 기반 자동 분류. 의미·시각 품질 승인 아님.'};
}
module.exports={assess,labels};
