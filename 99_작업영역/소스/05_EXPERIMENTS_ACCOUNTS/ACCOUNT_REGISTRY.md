# Account Registry

실제 계정이 생성/연결되기 전에는 절대 `active`로 표시하지 않는다. 아래는 현재 **실험 설계 초안(planned)** 이다.

| account_id | platform | status | content_axis | positioning | primary metric |
|---|---|---|---|---|---|
| TH-A | Threads | planned | Hot / Issue | 지금 뜨는 이슈를 빠르게 정리하고 왜 중요한지 설명 | engagement rate |
| TH-B | Threads | planned | Useful / Product / Money | AI 도구·앱·제품을 비교하고 실제 선택 기준 제공 | clicks / conversions |
| TH-C | Threads | planned | Internet Story / Culture | 인터넷 사연을 검증·익명화해 쟁점/교훈 중심으로 재구성 | replies / shares |

## TH-A — Hot / Issue

```yaml
account_id: TH-A
platform: threads
status: planned
content_axis: Hot / Issue
positioning: "오늘 뜨는 이슈를 빠르게 파악 + 왜 뜨는지 한 단계 더 설명"
target_audience: "빠르게 인터넷/테크/대중 이슈를 파악하려는 사용자"
hypothesis: "단순 속보보다 원인/맥락 한 줄이 붙은 글이 참여율이 높다"
primary_metric: engagement_rate
minimum_sample: 10
```

## TH-B — Useful / Product / Money

```yaml
account_id: TH-B
platform: threads
status: planned
content_axis: Useful / Product / Money
positioning: "AI 도구·앱·서비스·제품을 실제 선택 관점으로 비교"
target_audience: "AI/앱/생산성/소비 선택에 관심 있는 사용자"
hypothesis: "기능 나열보다 누구에게 어떤 선택이 맞는지 제시하면 클릭/전환이 높다"
primary_metric: clicks
secondary_metrics: [conversions, revenue, saves]
minimum_sample: 10
```

## TH-C — Internet Story / Culture

```yaml
account_id: TH-C
platform: threads
status: planned
content_axis: Internet Story / Culture
positioning: "인터넷 사연 자체를 복제하지 않고 사건의 쟁점·반응·교훈을 재구성"
target_audience: "인터넷 문화/사람 사는 이야기/논쟁에 관심 있는 사용자"
hypothesis: "단순 사연 요약보다 질문과 쟁점이 명확한 재구성이 답글/공유를 늘린다"
primary_metric: replies
secondary_metrics: [shares, engagement_rate]
minimum_sample: 10
```

## 운영 원칙

- 아직 실제 계정이 없으면 account_name/handle/token을 적지 않는다.
- 실제 계정 생성 후에도 토큰/비밀번호/쿠키는 이 파일에 적지 않는다.
- 같은 후보를 여러 계정에 시험할 때는 `hypothesis_id`와 `variant_id`를 별도로 둔다.
- 성과가 좋은 계정에 게시량을 늘리되 안전/검증 기준은 동일하게 유지한다.
- 계정 하나가 부진해도 콘텐츠 축 전체를 바로 폐기하지 않는다. 최소 표본과 가설 단위로 판단한다.
