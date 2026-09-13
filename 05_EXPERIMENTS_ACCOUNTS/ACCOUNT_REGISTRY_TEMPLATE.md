# Account Registry Template

계정은 단순 로그인 목록이 아니라 **실험 전략 단위**로 등록한다.

## 계정 등록 템플릿

```yaml
account_id: TH-A
platform: threads
account_name: ""
status: planned        # planned / warming / active / paused / killed / scaled

content_axis: Hot / Issue
positioning: ""
target_audience: ""
format_focus:
  - text
voice_style: ""

hypothesis: ""
primary_metric: engagement_rate
secondary_metrics:
  - views
  - replies
  - shares
  - clicks
  - conversions
  - revenue

test_window:
  start: null
  end: null
minimum_sample: 10

scale_rule: ""
kill_rule: ""

posting_constraints:
  max_frequency: ""
  duplicate_content: forbidden
  cross_account_copy_paste: forbidden

notes: ""
```

## 실험 예시

### TH-A — 빠른 이슈 설명

```yaml
account_id: TH-A
platform: threads
content_axis: Hot / Issue
positioning: "지금 뜨는 이슈를 짧게 설명하고 왜 중요한지 한 줄로 정리"
target_audience: "빠르게 인터넷/테크 이슈를 파악하려는 사람"
hypothesis: "단순 속보보다 '왜 뜨는지'가 포함된 글의 답글·공유율이 높다"
primary_metric: engagement_rate
minimum_sample: 10
```

### TH-B — 실용/제품

```yaml
account_id: TH-B
platform: threads
content_axis: Useful / Product / Money
positioning: "AI 도구·앱·서비스를 직접 비교해서 쓸모를 빠르게 판단"
target_audience: "AI/앱/생산성 도구에 관심 있는 사람"
hypothesis: "단순 신제품 소개보다 실제 선택 기준이 있는 비교형 콘텐츠가 클릭/전환이 높다"
primary_metric: clicks
minimum_sample: 10
```

## 계정 비교 시 지켜야 할 것

- 서로 다른 계정에 같은 게시물을 그대로 올려 비교하지 않는다.
- 한 번의 실험에서는 가급적 한두 변수만 다르게 한다.
- 계정 생성일/팔로워 규모가 크게 다르면 절대 조회수만으로 직접 비교하지 않는다.
- 계정별 성과와 콘텐츠 자체 성과를 구분한다.
- 정책 위반·제재 회피를 목적으로 계정을 추가하지 않는다.
