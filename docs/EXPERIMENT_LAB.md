# Experiment Lab — KEEP / KILL / SCALE

기준일: **2026-09-13 KST**

Experiment Lab은 게시 전 점수가 아니라 **실제로 게시한 콘텐츠의 결과**를 비교하는 영역이다.

## 원칙

- 조회수 몇 회 이상이면 성공 같은 임의 절대 기준을 기본값으로 두지 않는다.
- 서로 다른 플랫폼의 숫자를 그대로 비교하지 않는다.
- 같은 플랫폼에서 성과 데이터가 있는 게시물끼리만 상대 비교한다.
- 비교군이 작을 때 성급하게 KILL/SCALE 판정을 내리지 않는다.
- API가 제공하지 않는 클릭/전환/실수익은 실제 값이 있을 때만 사람이 입력한다.
- 자동 판정은 참고값이다. 사람이 `SCALE / KEEP / KILL`로 override할 수 있으며 그 선택은 게시물별 기록에 남는다.

## 현재 Experiment 단위

현재는 `Publication` 하나를 Experiment 하나로 본다.

```text
experiment_id = platform + publication_id

topic_id
content_axis
platform
publication_id
published_at
platform_metrics
business_metrics
manual_decision
```

콘텐츠 축:

```text
Hot / Issue
Internet Story / Culture
Useful / Product / Money
```

## Threads 성과

현재 공식 Threads Insights에서 사용하는 값:

```text
views
likes
replies
reposts
quotes
shares
```

파생값:

```text
engagements = likes + replies + reposts + quotes + shares
engagement_rate = engagements / views
```

조회가 0 또는 미수집이면 engagement rate도 판정 근거로 쓰지 않는다.

## 자동 판정

같은 플랫폼에서 `views > 0`인 Experiment가 **5개 이상** 쌓인 뒤에만 자동 판정을 시작한다.

각 Experiment마다:

```text
reach_percentile      = 같은 플랫폼 내 views 백분위
engagement_percentile = 같은 플랫폼 내 engagement_rate 백분위

performance_index =
  reach_percentile * 0.55
  + engagement_percentile * 0.45
```

판정:

```text
performance_index >= 0.75  -> SCALE
performance_index <= 0.25  -> KILL
그 사이                     -> KEEP
비교군 < 5 또는 조회 없음    -> LEARN
```

이 기준은 초기 실험용이다. 실제 계정 데이터가 쌓이면 팔로우 전환, 링크 클릭, 수익 등 계정 목표에 맞춰 재보정한다.

## 비즈니스 지표

현재 사람이 입력할 수 있는 값:

```text
clicks
conversions
revenue (KRW)
```

Threads API 조회/참여 성과와 비즈니스 성과를 억지로 하나의 점수로 합치지 않는다. 초기 단계에서는 둘을 나란히 보고 판단한다.

예를 들어 조회·참여가 높아도 클릭/전환이 전혀 없다면 `화제성 콘텐츠`로는 SCALE 가능하지만 `수익형 콘텐츠`로는 별도 개선 대상일 수 있다.

## CSV

대시보드의 `실험 CSV 내보내기`는 다음을 한 행에 저장한다.

```text
experiment_id
topic_id
title
axis
platform
publication_id
published_at
views
likes
replies
reposts
quotes
shares
engagement_rate
clicks
conversions
revenue_krw
decision
```

외부 스프레드시트/분석 도구로 넘길 때 기준 데이터로 사용한다.

## 다음 확장

1. 게시 시간대 / 요일
2. 훅 유형
3. 포맷 길이
4. 콘텐츠 축
5. CTA 유형
6. 이미지/텍스트/영상 형태
7. 팔로우 증가
8. 링크 클릭 / 제휴 전환 / 광고수익
9. 플랫폼별 retention / watch time
10. 주제 재활용 시 후속편 성과

최종적으로는 `주제 축 × 포맷 × 플랫폼 × 훅 × 게시시각`별로 반복 가능한 패턴을 찾아내는 것이 목적이다.
