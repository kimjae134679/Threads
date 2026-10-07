'use strict';
const TOPICS=[['family','가족·관계',/부부|남편|아내|결혼|시댁|친정|부모|엄마|아빠|아이|자녀|연애|여친|남친/],['work','직장·일',/회사|직장|동료|상사|신입|퇴사|입사|업무|연봉/],['money','돈·소비',/돈|재산|월급|대출|투자|로또|금액|중고|가격|만원/],['health','건강·운동',/건강|병원|운동|달리기|러닝|다이어트/],['travel','여행·이동',/여행|호텔|숙소|항공|기차|KTX|홍콩|에어비앤비/]];
function classifyTopic(row,plan){const title=String(row.title||plan.coverTitle||'');const body=(plan.sourceUnits||[]).map(u=>u.text||'').join(' ');for(const text of [title,body])for(const [topic,label,re] of TOPICS)if(re.test(text))return {topic,topicLabel:label};return {topic:'life',topicLabel:'일상·유머'};}
function hasOutput(row){return !!(row.outputFolder&&Array.isArray(row.images)&&row.images.length);}
function initialDisposition(row){if(hasOutput(row))return 'eligible';return /excluded|rejected|skip/.test(row.status||'')?'rejected':'held';}
module.exports={classifyTopic,hasOutput,initialDisposition};
