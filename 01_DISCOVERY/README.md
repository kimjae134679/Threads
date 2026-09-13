# 01 — DISCOVERY / 소재 탐색

## 목적

좋은 콘텐츠가 될 가능성이 있는 **주제 후보를 빠르게 발견해서 넘기는 역할**이다.

입력은 두 종류다.

- 자동/반자동 탐색: Google Trends, YouTube 메타데이터, NAVER 검색/트렌드, 허용된 RSS/API
- 사용자 직접 제보: URL, 캡처 요약, 직접 작성한 내용, "이거 소재로 봐줘" 같은 메모

## 이 파트가 하는 일

- 주제 후보 발견
- 원 출처/발견 경로 기록
- 왜 눈에 띄었는지 1~3줄 메모
- 중복 후보/유사 토픽 표시
- RED/YELLOW/GREEN 소스 위험도 초벌 분류
- 발견 시각 기록

## 하지 않는 일

- 사실관계를 최종 확정하지 않는다.
- 80점, 95점 같은 최종 콘텐츠 점수를 확정하지 않는다.
- 제목/대본/영상/게시물을 완성하지 않는다.
- 실제 게시하지 않는다.
- 커뮤니티 원문 전체를 자산처럼 저장하지 않는다.

## 출력 — Candidate Packet

최소 필드:

```text
candidate_id
found_at
found_by            auto / user / manual
source_type
source_url
source_risk         green / yellow / red
topic_title
why_interesting
raw_signals         검색량/조회/발행시각 등 실제로 있는 값만
related_sources[]
notes
```

값을 모르면 `unknown/null`로 둔다. 추측해서 채우지 않는다.

## 사용자 직접 제보 처리

사용자가 글 내용을 직접 올린 경우에도 그 내용을 곧바로 사실로 확정하지 않는다.

```text
사용자 제보
→ Candidate Packet
→ 02 EDITORIAL & SCORING에서 독립 검증
```

## 완료 기준

`02_EDITORIAL_SCORING`이 바로 조사할 수 있을 정도로 **무엇이 화제인지 + 어디서 발견했는지 + 왜 볼 가치가 있는지**가 정리되어 있으면 끝이다.
