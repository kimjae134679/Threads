'use strict';
function sourceAccess(input) {
  let url;
  try { url=new URL(input); } catch { return {site:'미확인',mode:'needs_exact_url',automatic:false,nextAction:'정확한 개별 게시글 주소 또는 저장 원문을 추가하세요.'}; }
  const host=url.hostname.toLowerCase(), is=name=>host===name||host.endsWith('.'+name);
  if(url.protocol!=='https:' || url.username || url.password) return {site:host,mode:'needs_exact_url',automatic:false,nextAction:'공개 HTTPS 개별 게시글 주소를 확인하세요.'};
  if(is('teamblind.com')) return {site:'블라인드',mode:'needs_access',automatic:false,blockAutomatic:true,
    nextAction:'저장한 웹 글 가져오기에서 읽을 권한이 있는 원문 HTML·이미지·원문 파일을 불러오세요. 로그인이나 접근 제한은 우회하지 않습니다.',
    evidence:'https://us.teamblind.com/setting/term?lang=en&date=20260518'};
  if(is('dcinside.com')||is('dcinside.co.kr')) return {site:'디씨',mode:'needs_access',automatic:false,blockAutomatic:true,
    nextAction:'디시의 수집 제한으로 자동 요청을 보내지 않습니다. 저장한 웹 글 가져오기에서 HTML과 첨부 이미지를 불러오세요.',
    evidence:'https://nstatic.dcinside.com/dc/w/policy/policy_20260721.html'};
  if(is('cafe.daum.net')||is('cafe.naver.com')) return {site:is('cafe.daum.net')?'다음 카페·여시':'네이버 카페',mode:'needs_access',automatic:false,blockAutomatic:true,
    nextAction:'검색 공개 글과 회원 전용 글을 구분하세요. 회원 전용 글은 본인 계정의 정상 가입·등급 권한이 필요합니다. 읽을 권한과 제공 권한을 가진 저장 자료를 가져오세요.',
    evidence:'https://cs.daum.net/faq/service/36/category/6029/detail/6693'};
  if(['www.ppomppu.co.kr','ppomppu.co.kr'].includes(host)) {
    const board=url.searchParams.get('id')||'',number=url.searchParams.get('no')||'';
    if(url.pathname==='/zboard/view.php'&&/^[a-zA-Z0-9_]+$/.test(board)&&!/^my/i.test(board)&&/^\d+$/.test(number))
      return {site:'뽐뿌',mode:'public_fetch',automatic:true,nextAction:'공개 게시글의 제목·본문·실제 이미지를 가져옵니다. 로그인·삭제·접근 제한은 보류합니다.',evidence:'https://www.ppomppu.co.kr/robots.txt'};
    return {site:'뽐뿌',mode:'needs_exact_url',automatic:false,blockAutomatic:true,nextAction:'공개 개별 글의 view.php?id=게시판&no=글번호 주소 또는 저장 HTML을 가져오세요.'};
  }
  for(const [domain,site] of [['theqoo.net','더쿠'],['inven.co.kr','인벤'],['pann.nate.com','네이트판']])
    if(is(domain)) return {site,mode:'public_fetch',automatic:true,nextAction:'기존 주소의 공개 본문을 보완합니다. 삭제·로그인·누락은 별도 표시합니다.'};
  return {site:host,mode:'needs_source',automatic:false,nextAction:'저장 HTML·원문 source.txt/source.json과 실제 이미지를 후보 폴더에 추가하세요. 요약 content.txt는 원문 입력으로 사용하지 않습니다.'};
}
module.exports={sourceAccess};
