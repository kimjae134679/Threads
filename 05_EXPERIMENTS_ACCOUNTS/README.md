# 05 — EXPERIMENTS & ACCOUNTS / 계정 실험·성과 학습

## 목적

여러 계정/포맷/콘텐츠 축을 **실험군**으로 운영하고 실제 성과를 보고 무엇을 계속할지 결정한다.

계정 여러 개를 만드는 이유는 같은 글을 반복 노출하기 위해서가 아니라, **서로 다른 가설을 동시에 검증하기 위해서**다.

현재 계획된 계정 실험군: [`ACCOUNT_REGISTRY.md`](ACCOUNT_REGISTRY.md)

새 계정 등록 양식: [`ACCOUNT_REGISTRY_TEMPLATE.md`](ACCOUNT_REGISTRY_TEMPLATE.md)

## 입력

`04_REVIEW_PUBLISH`의 Publication Record + 플랫폼 Insights + 실제 클릭/전환/수익.

## 이 파트가 하는 일

- 계정별 포지셔닝 정의
- 계정마다 실험 가설 설정
- 플랫폼/포맷/훅/콘텐츠 축별 성과 비교
- views / engagement / clicks / conversions / revenue 기록
- LEARN / KEEP / KILL / SCALE 판정
- 잘 되는 계정/포맷에 실험량 확대
- 안 되는 전략은 중단하거나 가설을 바꿔 새 실험으로 등록
- 다음 01/02/03 단계에 성과 피드백 전달

## 하지 않는 일

- 여러 계정에 동일 콘텐츠를 복붙해서 숫자를 부풀리지 않는다.
- 플랫폼 제한/정책을 피하려고 계정을 돌려쓰는 구조로 만들지 않는다.
- 표본 1~2개만 보고 성공/실패를 확정하지 않는다.
- 성과가 좋다는 이유로 02의 검증 기준이나 04의 Safety Gate를 약화하지 않는다.

## 계정은 하나의 전략 단위

각 계정은 최소한 다음을 가진다.

```text
account_id
platform
account_name
content_axis
positioning
target_audience
format_focus
voice_style
hypothesis
primary_metric
secondary_metrics
test_window
minimum_sample
scale_rule
kill_rule
status
```

## 추천 초기 실험 방식

처음부터 계정을 지나치게 많이 만들지 않는다. 플랫폼별 2~3개 전략군 정도로 시작하고, 각 계정의 차이를 명확하게 둔다.

현재 초기 Threads 실험군은 다음 세 축으로 `planned` 등록했다.

```text
TH-A  Hot / Issue
      빠른 이슈 요약 + 왜 뜨는지 설명

TH-B  Useful / Product / Money
      AI 도구 / 앱 / 가격·기능 비교

TH-C  Internet Story / Culture
      사연 자체 복제가 아니라 쟁점·반응·교훈 중심 재구성
```

같은 주제를 A/B로 시험할 경우에도 `훅/각도/대상/포맷` 중 최소 하나를 의도적으로 다르게 하고 `hypothesis_id`를 붙인다.

## 성과 판정

현재 Experiment Lab의 기본 원칙:

```text
같은 플랫폼 성과 표본 < 5   → LEARN
상위 상대 성과              → SCALE
중간                         → KEEP
하위                         → KILL
```

초기 자동지표는 조회 백분위 + 참여율 백분위이며 클릭/전환/실수익이 쌓이면 비즈니스 성과를 별도로 우선 확인한다.

## 출력 — Experiment Result

```text
experiment_id
account_id
candidate_id
variant_id
platform
hypothesis
metrics
business_metrics
auto_decision
manual_decision
learning
next_action
collected_at
```

## 다음 루프

```text
SCALE → 같은 가설의 새 소재/변형을 더 제작
KEEP  → 유지하면서 한 변수만 바꿔 재시험
KILL  → 계정 자체를 무조건 폐기하지 말고 실패한 가설을 기록 후 다른 가설로 전환
LEARN → 표본을 더 모음
```
