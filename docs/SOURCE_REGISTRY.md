# Source Registry — Initial Baseline

기준일: **2026-09-13 KST**

이 문서는 구현 시 실제 `source_registry` 테이블의 초기값 역할을 한다. `GREEN/YELLOW/RED`는 콘텐츠 가치가 아니라 **수집·상업 활용 리스크** 기준이다.

## GREEN — 자동 후보 수집 우선

| 소스 | 방식 | 무엇을 얻나 | 저장 기본값 | 메모 |
|---|---|---|---|---|
| 정부/공공기관 공식 발표 | RSS/API/웹 공개자료 | 사건·정책 1차 사실 | URL + 제목 + 날짜 + 핵심 사실 | 보도자료 자산의 개별 저작권/공공누리 조건은 확인 |
| 기업 공식 Newsroom/IR | RSS/공개 페이지/API | 신제품·실적·발표 | URL + 발표 사실 | 마케팅 문구는 사실과 분리 |
| YouTube Data API | 공식 API | 영상/채널 메타데이터, 후보 탐색 | ID/URL/메타데이터 | 타인 영상 파일 자체를 수집 자산으로 보지 않음 |
| Meta/Threads 공식 API | 공식 API | 우리 게시/Insights 중심 | 게시 ID/성과 | 승인된 우리 콘텐츠 발행에 사용 |
| Naver Search Trend | **NAVER API HUB** | 한국 검색 관심도 변화 | 키워드 + 상대지수 | 2026-07-31 이후 신규 신청은 API HUB 사용 |
| Google Trends | 공식 서비스/허용 인터페이스 | 검색 관심 변화 | 키워드/트렌드 신호 | 비공식 대량 스크래핑에 의존하지 않음 |
| 공개 RSS/Atom | 제공 피드 | 새 글/기사 후보 | URL + 제목 + 발행시각 | 본문 복제 라이선스가 아님 |
| 직접 제작 자산 | 로컬/클라우드 | 원본 이미지·영상·음성 | 원본 파일/권리정보 | 가장 우선 |
| Public Domain / 상업 이용 허용 CC | 라이선스 소스 | 시각/음원 소재 | 파일 + 라이선스 증빙 | CC-BY 등 표시 조건 기록 |

### Naver Search Trend 현재 주의

네이버는 2026-06-25 `NAVER API HUB`를 출시했고, 2026-07-31부터 Search API / Search Trend / Shopping Insight의 **신규 신청은 API HUB에서만** 받는다. 구 개발자센터에서 2026-07-31 이전 발급받은 키는 2027-06-30까지 유예된다.

새 구현은 구 개발자센터 API를 새로 붙이지 말고 API HUB 기준으로 잡는다.

## YELLOW — 탐색/참고 가능, 게시 전 검토

| 소스 | 방식 | 허용 기본선 | 금지 기본선 |
|---|---|---|---|
| 일반 뉴스 기사 | RSS/검색/수동 링크 | 사실 확인, 제목/URL, 최소 인용, 복수 보도 종합 | 기사 전체 저장·재게시 |
| 공개 블로그 | 수동/검색 | 아이디어·사실 검증, 링크 | 문단 구조/표현 베끼기 |
| 공개 SNS 포스트 | 공식 embed/수동 링크 | 화제 발견, 반응 맥락 파악 | 이미지/영상 다운로드 후 재업로드 |
| 일반 공개 커뮤니티 | 수동 링크 + 약관 확인 | 주제 후보, 익명화 후 쟁점 요약 | 약관 미확인 대량 크롤링 |
| Reddit | 승인된 API 계약이 있을 때만 자동화 검토 | 비상업/승인 범위 내 활용 | 승인 없는 scraping, 상업 파이프라인 자동수집 |

### Reddit

2026년 Reddit 정책은 승인 없는 scraping을 금지하고, Data API/Developer Services의 상업 이용에는 별도 승인/계약이 필요할 수 있다고 명시한다. 따라서 Reddit은 인터넷에서 공개되어 있다는 이유만으로 `GREEN`에 넣지 않는다.

## RED — 자동 수집 차단

| 소스 | 이유 | 대안 |
|---|---|---|
| DCInside | 2026-07-21 약관에서 허용 범위 외 무단 크롤링 제한 | 사람이 개별 소재를 발견 → 링크 인박스 → 자체 재구성 |
| Blind | 명시적 허가 없는 자동/수동 crawling, scraping, data extraction, copying 제한 | 개별 화제의 외부 검증 가능한 사실만 별도 조사 |
| 여성시대 등 로그인/등급형 커뮤니티 | 약관·접근권한·사적 영역 리스크 | 자동수집 금지, 개별 공개 사실만 독립 검증 |
| 유료 뉴스레터/유료 기사 본문 | 접근권/저작권 | 제목/공개 요약/공식 1차 자료 탐색 |
| 방송·영화·드라마·스포츠 중계 완성 영상 | 저작권/수익화 재사용 위험 | 자체 그래픽/해설/허가 클립/공식 리믹스 |
| 출처 불명 밈/짤 모음 | 권리·초상·맥락 불명 | 웃음 포인트만 새로 제작 |

## 링크 인박스

RED 소스라도 사용자가 직접 본 개별 URL을 `소재 후보`로 넣을 수는 있다. 이때 원문을 DB 자산화하지 않고 다음만 저장한다.

```text
url
source_name
discovered_at
manual_note
why_interesting
rights_status
privacy_flags
claims_to_verify
```

게시물 생성은 원문 재작성으로 바로 연결하지 않는다. 반드시 독립 조사 후 Research Bundle을 만든다.

## 트렌드 탐지용 추천 신호 조합

한 소스만 뜬다고 트렌드로 보지 않는다.

```text
검색 증가     Naver Search Trend / Google Trends
+ 공식 발표   기업/기관 Newsroom
+ 보도량 증가 RSS/news discovery
+ 소셜 반응   공개 SNS 수동/허용 API 신호
+ 영상 반응   YouTube 메타데이터/우리 채널 성과
= topic candidate
```

### 점수 예시

```text
freshness          0~20
velocity           0~20
cross_source       0~15
audience_fit       0~15
format_fit         0~10
monetization_fit   0~10
originality_room   0~10
rights_risk        0~-30
legal_risk         0~-30
misinfo_risk       0~-30
```

## 실제 구현에 필요한 데이터 모델

```text
Source
- id
- name
- kind
- base_url
- collection_method
- terms_url
- terms_checked_at
- commercial_use
- bulk_collection
- asset_reuse
- attribution_required
- risk_level
- notes

SourceItem
- id
- source_id
- canonical_url
- title
- published_at
- discovered_at
- author_or_entity
- extracted_facts
- raw_storage_policy
- rights_status
- privacy_flags
- legal_flags
- content_hash
```

`raw_storage_policy`는 `none / metadata_only / temporary / licensed_fulltext`로 제한한다.

## 참고

- NAVER Search Trend: https://developers.naver.com/docs/serviceapi/datalab/search/search.md
- NAVER API HUB migration notice: https://developers.naver.com/notice/article/32530
- Reddit Data API Terms: https://redditinc.com/policies/data-api-terms
- Reddit Responsible Builder Policy: https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy
- DCInside terms: https://sign.dcinside.com/join/agree
- Blind terms: https://kr.teamblind.com/setting/term
