# Content Pipeline

이 문서는 Threads 프로젝트가 실제 프로그램으로 발전할 때의 기본 파이프라인입니다.

목표는 `많이 긁기`가 아니라 **좋은 소재를 빨리 발견 → 검증 → 자체 콘텐츠로 변환 → 여러 채널에 배포 → 결과를 학습**하는 것입니다.

---

## 전체 흐름

```text
[허용된 소스]
    ↓
[수집 / 링크 인박스]
    ↓
[정규화 + 중복 제거]
    ↓
[트렌드 점수화]
    ↓
[리서치 번들 생성]
    ↓
[각도/포맷 후보 생성]
    ↓
[플랫폼별 원본 콘텐츠 생성]
    ↓
[사실/권리/개인정보/명예훼손/정책 검사]
    ↓
[사람 승인 또는 저위험 자동 승인]
    ↓
[공식 API/허용된 방식으로 발행]
    ↓
[성과/수익 회수]
    ↓
[다음 제작에 반영]
```

---

## 1. Source Registry

모든 소스는 먼저 등록합니다.

최소 필드:

```text
source_id
name
kind                 # official / news / rss / social / community / manual / licensed
base_url
collection_method    # api / rss / manual_url / browser_review / licensed_feed
terms_checked_at
commercial_use       # allowed / limited / unknown / prohibited
bulk_collection      # allowed / unknown / prohibited
attribution_required
asset_reuse          # allowed / limited / prohibited / unknown
risk_level           # low / medium / high / blocked
notes
```

`unknown`은 `allowed`가 아닙니다. 자동수집 전에 반드시 확인합니다.

---

## 2. Ingest

### 자동수집에 우선할 것

- 공식 API
- RSS/Atom
- 공개 보도자료/기관 발표
- 공식 트렌드/검색 데이터
- 라이선스가 명확한 데이터 피드
- 우리가 직접 만든 데이터

### 반자동

- 사용자가 직접 넣은 URL
- 운영자가 브라우저에서 발견한 공개 글
- 뉴스 기사 링크
- 공개 SNS 게시물 링크

반자동 소스는 본문 전체를 영구 복제하기보다 **URL + 핵심 메모 + 필요한 최소 인용 + 추출된 사실**을 저장하는 방식이 기본입니다.

### 금지/차단

`SOURCE_POLICY.md`의 RED 항목은 수집 단계에서 차단합니다.

---

## 3. 정규화 / 중복 제거

같은 사건이 여러 곳에서 올라오는 경우 하나의 `topic`으로 묶습니다.

예:

```text
Topic: A사 신제품 발표
 ├─ 회사 공식 발표
 ├─ 언론 기사 1
 ├─ 언론 기사 2
 ├─ 사용자 반응 링크
 └─ 관련 영상
```

중복 판정은 제목 문자열만 보지 않고:

- 핵심 인물/회사/제품
- 발생 시각
- 핵심 주장
- URL canonicalization
- 임베딩 유사도

을 함께 봅니다.

---

## 4. 트렌드 점수

각 후보에 0~100 점수를 줍니다.

추천 요소:

```text
trend_score =
  velocity              # 얼마나 빠르게 언급이 늘어나는가
+ cross_source_signal   # 서로 다른 소스에서 동시에 뜨는가
+ freshness             # 지금 올릴 가치가 있는가
+ audience_fit          # 우리 채널 독자와 맞는가
+ format_fit            # Threads/Shorts/Blog 등에 잘 맞는가
+ monetization_fit      # 광고/제휴/협찬과 연결 가능한가
+ originality_room      # 우리가 새 가치를 보탤 여지가 큰가
- rights_risk
- legal_risk
- misinformation_risk
- saturation            # 이미 너무 많은 계정이 똑같이 다루는가
```

점수는 처음부터 정답으로 만들지 않습니다. 실제 성과 데이터가 쌓이면 가중치를 다시 학습합니다.

---

## 5. Research Bundle

게시물 생성 전에 AI가 하나의 `research bundle`을 만듭니다.

```text
topic_id
headline
why_now
verified_facts[]
claims_needing_confirmation[]
sources[]
source_quality[]
short_quotes[]
visual_asset_options[]
rights_notes
people_or_entities[]
privacy_flags[]
defamation_flags[]
platform_risk_flags[]
possible_angles[]
```

핵심은 **생성 모델이 원문 하나만 보고 바로 게시물을 쓰게 하지 않는 것**입니다.

사실과 의견을 분리하고, 출처가 여러 개면 서로 교차검증합니다.

---

## 6. Angle Generator

같은 소재라도 여러 방향으로 만들 수 있습니다.

예:

- `무슨 일이 있었나` — 사실 요약
- `왜 갑자기 뜨나` — 배경 설명
- `3분이면 이해` — 핵심 정리
- `사람들이 갈리는 이유` — 쟁점 정리
- `직접 비교` — 전/후, A/B, 가격/기능
- `실제로 써보면` — 체험/검증이 있는 경우
- `댓글에서 제일 많이 나온 질문` — 반응을 질문 단위로 재구성
- `다음에 벌어질 일` — 근거가 있는 전망과 불확실성 표시

단순히 원문 문장을 AI 말투로 바꾸는 것은 Angle 생성으로 취급하지 않습니다.

---

## 7. 플랫폼별 변환

### Threads

- 첫 문장 훅
- 1개 주장/쟁점 중심
- 짧은 문단
- 필요하면 연속 스레드
- 댓글을 부르는 실제 질문
- 링크는 필요할 때 출처/후속 콘텐츠용

목적: **주제 테스트 + 대화 + 팔로워 확보**

### Shorts / Reels / TikTok

기본 30~60초 실험:

```text
0~2초     훅
2~10초    상황 설명
10~40초   핵심 2~3개
40~55초   의미/반전/결론
55~60초   질문 또는 다음 콘텐츠 연결
```

- 직접 만든 영상/그래픽/AI 생성 자산/허가된 자산 우선
- 화면만 바꾸고 남의 음성/영상을 재업로드하는 방식은 제외

### YouTube Long-form

짧은 콘텐츠에서 반응이 검증된 주제만 확장합니다.

- 5~10분 설명형부터 시작
- 근거/비교/시각자료 추가
- 검색형 제목 + 썸네일 실험
- Shorts와 서로 연결

### Blog

- 검색 의도에 맞는 제목
- 1차 자료/공식 자료 우선
- 단순 뉴스 재서술보다 배경/비교/사용자에게 필요한 답 추가
- 표/체크리스트/계산/경험/이미지 등 `추가 가치` 포함

### Instagram Feed / Carousel

- 한 주제를 5~10장 카드로 재구성
- 이미지 자체가 원본 정보 구조를 가져야 함
- Reels와 캐러셀 중 어느 쪽이 더 반응이 좋은지 분리 추적

### X

2026-09 Original Content Rewards 정책상 자동 생성/자동 게시 콘텐츠가 수익 대상에서 제외될 수 있으므로 **사람 승인 + 직접 게시를 기본값**으로 둡니다.

---

## 8. Safety / Rights Gate

발행 전에 자동 체크:

### 사실
- 숫자/날짜/인용 출처 있음?
- 단일 익명 주장만 사실처럼 쓰지 않았나?
- 오래된 사건을 오늘 일처럼 쓰지 않았나?

### 저작권
- 남의 본문/댓글을 과도하게 복제하지 않았나?
- 영상/사진/음원의 상업 이용 권리가 있는가?
- 플랫폼 리믹스 기능을 쓸 경우 그 범위 안에서만 쓰는가?

### 개인정보
- 실명/전화/주소/직장/얼굴/차량번호/ID 등 식별정보가 필요한가?
- 일반인의 신상정보는 기본적으로 제거

### 명예훼손/사건사고
- 범죄/불륜/갑질/사기 같은 주장을 검증 없이 단정하지 않았나?
- 익명 커뮤니티 주장만 근거로 특정 개인을 지목하지 않나?

### 플랫폼
- 재사용 콘텐츠 판정 가능성
- 스팸/대량반복
- 광고/제휴 고지 필요 여부
- 민감 콘텐츠 제한

---

## 9. 승인 레벨

### LOW — 자동 발행 후보

예:
- 우리가 직접 만든 상식/설명 콘텐츠
- 공식 자료 기반 제품 기능 정리
- 저작권 문제가 없는 자체 그래픽
- 민감한 개인/정치/사건 주장이 없는 evergreen

자동 발행은 플랫폼 API 정책이 허용하는 곳에서만 적용합니다.

### MEDIUM — 사람 승인

- 뉴스 이슈
- 기업/제품 비판
- 공개 SNS 반응 요약
- 커뮤니티 사연 재구성
- 제휴 링크 포함

### HIGH — 사람 승인 + 추가 검증

- 개인 폭로
- 범죄/사기/성적 문제
- 건강/재정/법률처럼 잘못된 정보의 피해가 큰 주제
- 정치/선거
- 미성년자
- 사망/사고/재난

### BLOCKED

- 출처 약관상 자동수집 금지
- 권리 없는 영상/영화/방송 클립의 단순 재업로드
- 개인정보 폭로
- 조작된 인용/가짜 증거
- 원본을 거의 대체하는 복제

---

## 10. 게시 및 성과 회수

게시 가능한 공식 API를 우선합니다.

저장할 성과:

```text
publish_id
platform
account
format
published_at
impressions
views
watch_time
completion_rate
likes
comments
shares
saves
reposts
profile_visits
followers_gained
link_clicks
affiliate_clicks
revenue
revenue_type
```

`조회수` 하나만 최적화하지 않습니다.

---

## 11. Content Record

한 소재가 여러 플랫폼으로 갈 때 하나의 계보를 유지합니다.

```text
content_id
parent_topic_id
source_bundle_id
angle_id
platform
format
version
script_or_copy
asset_ids[]
risk_level
approval_status
approved_by
publish_id
metrics
revenue
```

이 구조가 있어야 어떤 원재료/훅/포맷이 돈이 되었는지 역추적할 수 있습니다.

---

## 12. 초기 MVP 순서

### Phase 0 — 조사/정책

- 플랫폼 정책
- 소스 약관
- 수익 조건
- 콘텐츠 축 결정

현재 단계.

### Phase 1 — 사람 중심 반자동

- URL/트렌드 후보를 모음
- AI가 점수/리서치/초안 생성
- 사람이 골라서 수정/게시
- 성과 수동 또는 API 회수

**가장 먼저 만들 MVP.**

### Phase 2 — Threads + Blog 변환 자동화

- 하나의 research bundle에서 Threads 여러 버전 + 블로그 초안 생성
- 공식 API 연결이 가능한 범위에서 게시 예약
- 승인 큐 제공

### Phase 3 — 영상 제작 보조

- Shorts/Reels 스크립트
- 장면 구성
- 음성/자막/그래픽 템플릿
- 직접/AI 생성 자산 중심 렌더링

### Phase 4 — 자동 학습

- 포맷/훅/주제 성과 비교
- 실패 패턴 제거
- 점수 가중치 조정
- 반응이 검증된 주제를 장문/상업 콘텐츠로 승격

---

## 초기 운영 원칙

처음 2~4주는 `완전 자동 게시량`보다 **실험 로그의 품질**이 중요합니다.

어떤 소재가 뜨는지, 어떤 훅이 먹히는지, 어떤 플랫폼에서 팔로우/클릭/수익으로 이어지는지를 먼저 알아낸 뒤 그 부분만 자동화합니다.
