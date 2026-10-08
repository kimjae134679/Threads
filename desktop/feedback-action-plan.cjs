'use strict';
function feedbackAction(e){
 const note=String(e.note||''),actions=[];
 if(/뉴스/.test(note))return {disposition:'rejected',reasonCode:'material_unsuitable',actions:['원문 기사 전재 제외; 다시 다룰 경우 독립 원출처 검증부터 진행']};
 if(/잘렸|잘림|덩그러|한줄|한\s*줄|마지막\s*(?:문단|문장|줄)/.test(note))return {disposition:'held',reasonCode:'production_error',actions:['마지막 이미지·문장 완전성과 최소 연결 문단 확인']};
 if(/짧|내용이\s*없/.test(note))return {disposition:'held',reasonCode:'source_insufficient',actions:['실제 본문·이미지 원본 보완 또는 보류; 누락 본문 대체 금지']};
 if(/이미지가\s*너무\s*과/.test(note))return {disposition:'held',reasonCode:'production_error',actions:['과한 이미지 사용을 줄이고 관련 원본 우선 검토']};
 if(/원문댓글|작성자답글|작성자 답글/.test(note))actions.push('실제 반응 보존, 댓글·글쓴이 표시를 자연스럽게 정리');
 if(/네이트판|출처 쓰레드/.test(note))actions.push('사이트 접두어·출처 장식 제거, 원출처 메타데이터 보존');
 if(/초록색|색상/.test(note))actions.push('고득점 후반 구성 유지, 반복 초록색 대신 제한된 색상 후보 비교');
 return {disposition:null,reasonCode:null,actions};
}module.exports={feedbackAction};
