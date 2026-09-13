(() => {
  const themes = [
    {
      id: "work_career",
      label: "직장 / 커리어",
      description: "회사생활, 상사·동료, 취업·이직, 알바, 연봉·회식 등",
      keywords: ["직장", "회사", "사원", "상사", "부장", "팀장", "동료", "퇴사", "이직", "취업", "면접", "알바", "연봉", "월급", "회식", "사원증", "인턴", "출근", "퇴근", "회사원"],
    },
    {
      id: "dating_relationships",
      label: "연애 / 인간관계",
      description: "연애, 결혼, 썸, 소개팅, 친구·가족 관계 갈등",
      keywords: ["연애", "남친", "여친", "남자친구", "여자친구", "소개팅", "결혼", "이혼", "썸", "데이트", "남편", "아내", "커플", "헤어", "친구", "가족", "장모", "시댁", "처가"],
    },
    {
      id: "money_consumption",
      label: "돈 / 소비 / 재테크",
      description: "가격, 월급, 소비, 투자, 주식, 주거비, 구매·환불",
      keywords: ["돈", "가격", "소비", "카드값", "대출", "투자", "주식", "코인", "월세", "전세", "집값", "쇼핑", "구매", "환불", "중고", "재테크", "저축", "수익", "부동산", "할인"],
    },
    {
      id: "military_school",
      label: "군대 / 학교",
      description: "군생활, 예비군, 학교·대학, 학생, 기숙사, 시험",
      keywords: ["군대", "군인", "예비군", "훈련소", "병장", "상병", "부대", "학교", "대학", "학생", "교사", "교수", "기숙사", "수능", "학점", "시험", "과제", "졸업"],
    },
    {
      id: "internet_humor",
      label: "인터넷 / 유머 / 밈",
      description: "커뮤니티 밈, 댓글, 드립, 인터넷 문화 자체가 소재인 콘텐츠",
      keywords: ["밈", "유머", "웃김", "웃긴", "싱글벙글", "댓글", "베댓", "드립", "인터넷", "커뮤", "커뮤니티", "레딧", "reddit", "짤", "개념글", "추천글"],
    },
    {
      id: "weird_true_story",
      label: "황당 / 실화 / 반전",
      description: "기묘하거나 황당한 실화, 반전, 이유가 궁금한 사건",
      keywords: ["실화", "황당", "기묘", "반전", "이유", "미스터리", "사건", "목격", "충격", "뜻밖", "알고보니", "알고 보니", "진짜", "왜", "정체"],
    },
    {
      id: "tech_ai_games",
      label: "AI / IT / 게임",
      description: "AI, 소프트웨어, 앱, 기기, 게임, 개발·인터넷 서비스",
      keywords: ["ai", "gpt", "인공지능", "챗지피티", "앱", "게임", "스팀", "닌텐도", "플스", "플레이스테이션", "아이폰", "갤럭시", "로봇", "개발자", "소프트웨어", "서비스", "업데이트", "버그", "유튜브"],
    },
    {
      id: "life_debate",
      label: "생활 / 공감 / 논쟁",
      description: "일상 예절, 민폐, 생활습관, A/B 의견이 갈리는 주제",
      keywords: ["이상함", "이상한", "민폐", "논란", "맞다", "아니다", "괜찮", "예의", "생활", "룸메이트", "이웃", "습관", "어떻게 생각", "너라면", "정상", "비정상", "매너", "공감"],
    },
    {
      id: "entertainment_celeb",
      label: "연예 / 방송 / 영화",
      description: "연예인, 배우, 아이돌, 방송, 드라마, 영화, 음악",
      keywords: ["연예인", "배우", "아이돌", "방송", "드라마", "영화", "가수", "예능", "콘서트", "앨범", "팬", "무대", "넷플릭스"],
    },
    {
      id: "animals_nature",
      label: "동물 / 자연",
      description: "반려동물, 야생동물, 자연 현상. 불쾌·학대 여부는 Comfort가 별도 판단",
      keywords: ["고양이", "강아지", "개", "동물", "반려동물", "야생", "새", "물고기", "자연", "동물원", "펫", "냥", "댕댕"],
    },
    {
      id: "society_news",
      label: "사회 / 사건 / 시사",
      description: "사회 사건, 정책, 법, 교통, 의료, 공공 이슈",
      keywords: ["사회", "정책", "법", "사건", "사고", "교통", "의료", "병원", "경찰", "법원", "정부", "지자체", "재판", "범죄", "뉴스", "공공", "규제"],
    },
    {
      id: "sports",
      label: "스포츠 / e스포츠",
      description: "스포츠 경기, 선수, 리그, e스포츠",
      keywords: ["야구", "축구", "농구", "배구", "선수", "경기", "리그", "월드컵", "올림픽", "e스포츠", "이스포츠", "프로게이머", "감독", "팀"],
    },
    {
      id: "food_travel",
      label: "음식 / 여행 / 장소",
      description: "음식, 요리, 맛집, 카페, 여행, 호텔, 관광지",
      keywords: ["맛집", "음식", "요리", "먹방", "카페", "여행", "호텔", "관광", "식당", "메뉴", "레시피", "항공", "공항", "숙소"],
    },
    {
      id: "general_viral",
      label: "기타 바이럴",
      description: "다른 테마에 뚜렷하게 걸리지 않는 일반 바이럴 소재",
      keywords: [],
    },
  ];

  const aliases = {
    work: "work_career",
    career: "work_career",
    dating: "dating_relationships",
    relationship: "dating_relationships",
    money: "money_consumption",
    military: "military_school",
    school: "military_school",
    humor: "internet_humor",
    meme: "internet_humor",
    weird: "weird_true_story",
    tech: "tech_ai_games",
    ai: "tech_ai_games",
    game: "tech_ai_games",
    debate: "life_debate",
    entertainment: "entertainment_celeb",
    animal: "animals_nature",
    society: "society_news",
    sport: "sports",
    food: "food_travel",
    travel: "food_travel",
    general: "general_viral",
  };

  window.ThreadsThemeTaxonomy = Object.freeze({
    version: 1,
    themes: Object.freeze(themes.map((theme) => Object.freeze({ ...theme, keywords: Object.freeze([...theme.keywords]) }))),
    aliases: Object.freeze({ ...aliases }),
  });
})();
