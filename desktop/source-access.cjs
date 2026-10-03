'use strict';
function sourceAccess(input) {
  let url;
  try { url=new URL(input); } catch { return {site:'미확인',mode:'needs_exact_url',automatic:false,nextAction:'정확한 개별 게시글 주소 또는 저장 원문을 추가하세요.'}; }
  const host=url.hostname.toLowerCase(), is=name=>host===name||host.endsWith('.'+name);
  if(url.protocol!=='https:' || url.username || url.password) return {site:host,mode:'needs_exact_url',automatic:false,nextAction:'공개 HTTPS 개별 게시글 주소를 확인하세요.'};
  if(is('teamblind.com')) return {site:'블라인드',mode:'needs_access',automatic:false,blockAutomatic:true,
    nextAction:'공개 웹에서 글 존재 여부를 확인하세요. 자동 수집은 허용하지 않습니다. 권한을 가진 원문 파일 또는 제공 가능한 작성자 자료를 가져오세요.',
    evidence:'https://us.teamblind.com/setting/term?lang=en&date=20260518'};
  if(is('dcinside.com')||is('dcinside.co.kr')) return {site:'디씨',mode:'needs_access',automatic:false,blockAutomatic:true,
    nextAction:'공개 글은 일반 브라우저에서 읽을 수 있습니다. 현재 프로젝트는 자동 수집을 제한합니다. 제공 가능한 저장 HTML·이미지·원문 JSON을 가져오세요.',
    evidence:'https://nstatic.dcinside.com/dc/w/policy/policy_20260721.html'};
  if(is('cafe.daum.net')||is('cafe.naver.com')) return {site:is('cafe.daum.net')?'다음 카페·여시':'네이버 카페',mode:'needs_access',automatic:false,blockAutomatic:true,
    nextAction:'검색 공개 글과 회원 전용 글을 구분하세요. 회원 전용 글은 본인 계정의 정상 가입·등급 권한이 필요합니다. 읽을 권한과 제공 권한을 가진 저장 자료를 가져오세요.',
    evidence:'https://cs.daum.net/faq/service/36/category/6029/detail/6693'};
  for(const [domain,site] of [['theqoo.net','더쿠'],['inven.co.kr','인벤'],['pann.nate.com','네이트판']])
    if(is(domain)) return {site,mode:'public_fetch',automatic:true,nextAction:'기존 주소의 공개 본문을 보완합니다. 삭제·로그인·누락은 별도 표시합니다.'};
  return {site:host,mode:'needs_source',automatic:false,nextAction:'저장 HTML·원문 source.txt/source.json과 실제 이미지를 후보 폴더에 추가하세요. 요약 content.txt는 원문 입력으로 사용하지 않습니다.'};
}
module.exports={sourceAccess};
