(() => {
  const sources = [
    { id: "google_trends", label: "Google Trends", family: "trend", hosts: ["trends.google.com"], adapter: "connected", mode: "rss", autoDiscovery: true, bulkBodyCollection: false, manualCapture: false, note: "급상승 관심 신호. 원문이 아니라 왜 뜨는지 별도 확인." },
    { id: "naver_news", discoveryPriority: "secondary-korean", label: "NAVER 뉴스", family: "news", hosts: ["news.naver.com", "n.news.naver.com"], adapter: "connected-when-credentialed", mode: "official-search-api", autoDiscovery: true, bulkBodyCollection: false, manualCapture: false, note: "NAVER 검색 API 메타데이터/링크 기반. 기사 본문·사진 재사용 권리는 별도." },
    { id: "naver_blog", discoveryPriority: "secondary-korean", label: "NAVER 블로그", family: "blog", hosts: ["blog.naver.com"], adapter: "connected-when-credentialed", mode: "official-search-api", autoDiscovery: true, bulkBodyCollection: false, manualCapture: true, note: "NAVER 검색 API로 발견. 본문/이미지 자동 복제 안 함." },
    { id: "naver_cafe", discoveryPriority: "primary-korean", label: "NAVER 카페", family: "community", hosts: ["cafe.naver.com"], adapter: "connected-when-credentialed", mode: "official-search-api-metadata", autoDiscovery: true, bulkBodyCollection: false, manualCapture: true, note: "카페글 검색 API 메타데이터/URL 후보. 실제 원문은 접근권한·약관 확인 후 수동 캡처." },
    { id: "daum_cafe", discoveryPriority: "primary-korean", label: "Daum 카페", family: "community", hosts: ["cafe.daum.net"], adapter: "planned", mode: "public-index-or-manual", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "검색 인덱스/사용자 제공 URL 중심. 대량 본문 수집 안 함." },
    { id: "youtube", label: "YouTube", family: "video", hosts: ["youtube.com", "youtu.be"], adapter: "connected-when-credentialed", mode: "official-api", autoDiscovery: true, bulkBodyCollection: false, manualCapture: true, note: "공식 API의 인기/검색 메타데이터 사용. 영상 자체 재업로드 금지." },
    { id: "reddit", label: "Reddit", family: "community", hosts: ["reddit.com", "www.reddit.com"], adapter: "planned", mode: "official-api-or-public-index", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "공개 반응 메타데이터/인덱스 우선. 원문/미디어 권리 별도 검토." },
    { id: "x", label: "X / Twitter", family: "social", hosts: ["x.com", "twitter.com"], adapter: "planned", mode: "official-api-or-public-index", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "실시간 이슈·짤 발견용. 직접 대량 스크래핑 대신 공식 API/공개 인덱스/수동 반입." },
    { id: "threads", label: "Threads", family: "social", hosts: ["threads.net"], adapter: "planned-discovery", mode: "official-api-or-public-index", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "현재 게시 API는 연결 가능하지만 타 계정 대량 탐색 adapter는 별도 구현 필요." },
    { id: "instagram", label: "Instagram", family: "social", hosts: ["instagram.com"], adapter: "planned", mode: "official-api-or-public-index", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "릴스/카드 트렌드 발견용. 공개 인덱스/공식 API/수동 캡처 중심." },
    { id: "dcinside", discoveryPriority: "primary-korean", label: "DCInside", family: "community", hosts: ["dcinside.com", "gall.dcinside.com"], adapter: "manual-only", mode: "public-index-metadata-plus-manual", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "개념글/갤 인기 소재는 검색 노출 메타데이터와 사용자 제공 URL·스크린샷으로 반입. 자동 대량 크롤링 안 함." },
    { id: "blind", discoveryPriority: "primary-korean", label: "Blind", family: "community", hosts: ["teamblind.com", "blind.com"], adapter: "manual-only", mode: "public-index-metadata-plus-manual", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "직장 논란/사연 발견용. 자동 scraping 대신 검색 노출/사용자 제공 캡처." },
    { id: "fmkorea", discoveryPriority: "primary-korean", label: "FMKorea", family: "community", hosts: ["fmkorea.com"], adapter: "planned", mode: "public-index-or-manual", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "축구·게임·유머·사회 반응 탐색. 사이트별 이용조건 확인 후 adapter 결정." },
    { id: "theqoo", discoveryPriority: "primary-korean", label: "더쿠", family: "community", hosts: ["theqoo.net"], adapter: "planned", mode: "public-index-or-manual", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "연예·생활·이슈 반응 발견. 원문 자동 복제하지 않음." },
    { id: "instiz", discoveryPriority: "primary-korean", label: "인스티즈", family: "community", hosts: ["instiz.net"], adapter: "planned", mode: "public-index-or-manual", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "연예·생활·관계 이슈 후보 발견용." },
    { id: "clien", discoveryPriority: "primary-korean", label: "클리앙", family: "community", hosts: ["clien.net"], adapter: "planned", mode: "public-index-or-manual", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "IT·생활·소비 이슈 탐색. 자동수집 전 이용조건 확인." },
    { id: "ruliweb", discoveryPriority: "primary-korean", label: "루리웹", family: "community", hosts: ["ruliweb.com"], adapter: "planned", mode: "public-index-or-manual", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "게임·유머·취미 반응 탐색." },
    { id: "inven", discoveryPriority: "primary-korean", label: "인벤", family: "community", hosts: ["inven.co.kr"], adapter: "planned", mode: "public-index-or-manual", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "게임·e스포츠 특화 탐색." },
    { id: "ppomppu", discoveryPriority: "primary-korean", label: "뽐뿌", family: "community", hosts: ["ppomppu.co.kr"], adapter: "planned", mode: "public-index-or-manual", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "소비·가격·생활 논쟁 탐색." },
    { id: "arca", discoveryPriority: "primary-korean", label: "아카라이브", family: "community", hosts: ["arca.live"], adapter: "planned", mode: "public-index-or-manual", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "취미·게임·밈 후보 발견. 채널별 성격 차이가 커 Comfort 필터 우선." },
    { id: "tistory", discoveryPriority: "secondary-korean", label: "Tistory / 공개 블로그", family: "blog", hosts: ["tistory.com"], adapter: "planned", mode: "rss-or-public-index", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "RSS/검색 노출 중심. 글 전문 복제 대신 링크·요약 메타데이터." },
    { id: "generic_news", label: "기타 뉴스/언론", family: "news", hosts: [], adapter: "planned", mode: "rss-search-index", autoDiscovery: false, bulkBodyCollection: false, manualCapture: false, note: "공식 RSS/검색 결과를 우선하고 기사 전문은 저장하지 않음." },
    { id: "other_public", label: "기타 공개 웹", family: "web", hosts: [], adapter: "manual-or-index", mode: "public-index-or-manual", autoDiscovery: false, bulkBodyCollection: false, manualCapture: true, note: "출처별 이용조건 확인 전에는 자동 본문수집 금지." },
  ];

  const lanes = [
    { id: "funny_memes", label: "웃긴 짤 / 밈", themes: ["internet_humor", "weird_true_story"], sources: ["x", "reddit", "dcinside", "fmkorea", "theqoo", "ruliweb", "arca", "youtube"], note: "짤 자체 복제보다 상황 설명·반응·맥락을 붙이는 카드화 우선." },
    { id: "community_debate", label: "커뮤니티 논란 / 의견갈림", themes: ["life_debate", "work_career", "dating_relationships", "money_consumption"], sources: ["blind", "dcinside", "naver_cafe", "daum_cafe", "x", "reddit", "fmkorea", "instiz", "theqoo", "clien", "ppomppu"], note: "A/B로 의견 갈리는 소재. 일반인 신상·명예훼손 위험 확인." },
    { id: "news_issues", label: "소식 / 이슈 / 지금 뜨는 것", themes: ["society_news", "tech_ai_games", "entertainment_celeb", "sports"], sources: ["google_trends", "naver_news", "x", "threads", "youtube", "reddit", "generic_news"], note: "속도보다 사실 확인 우선. 오래된 사건 재활용 방지." },
    { id: "work_career", label: "직장 / 취업 / 회사썰", themes: ["work_career"], sources: ["blind", "naver_cafe", "dcinside", "reddit", "x"], note: "회사생활·사원증·상사·이직·취업·알바." },
    { id: "relationships", label: "연애 / 인간관계", themes: ["dating_relationships"], sources: ["blind", "dcinside", "instiz", "theqoo", "reddit", "naver_cafe", "x"], note: "연애·결혼·친구·가족 갈등. 과도한 성적/사생활 폭로 제외." },
    { id: "money_consumption", label: "돈 / 소비 / 재테크", themes: ["money_consumption"], sources: ["ppomppu", "clien", "naver_cafe", "reddit", "x", "naver_blog", "naver_news"], note: "가격 논쟁·구매후기·월급·투자·집값. 금융정보는 사실성 강화." },
    { id: "military_school", label: "군대 / 학교", themes: ["military_school"], sources: ["dcinside", "fmkorea", "naver_cafe", "reddit", "x"], note: "군생활·예비군·학교·기숙사·시험·대학썰." },
    { id: "weird_true_story", label: "황당 / 실화 / 반전", themes: ["weird_true_story"], sources: ["reddit", "x", "dcinside", "ruliweb", "youtube", "naver_news", "generic_news"], note: "'왜 저래?'에서 이유·반전으로 이어지는 카드 친화 소재." },
    { id: "tech_games", label: "AI / IT / 게임", themes: ["tech_ai_games"], sources: ["x", "threads", "reddit", "clien", "ruliweb", "inven", "youtube", "naver_news", "naver_blog"], note: "AI 도구·앱·기기·게임·업데이트·버그·사용자 반응." },
    { id: "entertainment", label: "연예 / 방송 / 문화", themes: ["entertainment_celeb"], sources: ["x", "theqoo", "instiz", "dcinside", "youtube", "naver_news", "instagram"], note: "연예·방송 화제. 루머는 별도 검증 전 단정 금지." },
    { id: "sports_esports", label: "스포츠 / e스포츠", themes: ["sports"], sources: ["fmkorea", "dcinside", "inven", "x", "youtube", "naver_news", "reddit"], note: "경기 결과·선수·팬 반응·밈." },
    { id: "food_travel", label: "음식 / 여행 / 장소", themes: ["food_travel"], sources: ["naver_blog", "naver_cafe", "instagram", "youtube", "x", "reddit"], note: "맛집·여행·신기한 장소·가격/후기 논쟁." },
    { id: "animals_nature", label: "동물 / 자연", themes: ["animals_nature"], sources: ["reddit", "x", "instagram", "youtube", "naver_cafe"], note: "귀엽거나 신기한 소재만 우선. 학대·불쾌·위험 장면은 Comfort에서 강하게 제외." },
  ];

  window.ThreadsDiscoveryRegistry = Object.freeze({
    version: 1,
    sources: Object.freeze(sources.map((entry) => Object.freeze({ ...entry, hosts: Object.freeze([...entry.hosts]) }))),
    lanes: Object.freeze(lanes.map((entry) => Object.freeze({ ...entry, themes: Object.freeze([...entry.themes]), sources: Object.freeze([...entry.sources]) }))),
  });
})();
