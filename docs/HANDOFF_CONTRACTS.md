# Role Handoff Contracts

역할을 여러 사람/AI가 나눠 맡아도 데이터가 뒤섞이지 않도록 **각 단계의 입력/출력 계약을 고정**한다.

## 공통 식별자

모든 단계에서 가능하면 아래 식별자를 유지한다.

```text
candidate_id      최초 소재 후보 ID
account_id        게시 전략 계정 ID
variant_id        제작 변형 ID
hypothesis_id     실험 가설 ID
publication_id    실제 플랫폼 게시 ID
experiment_id     성과 실험 ID
```

앞 단계 ID를 새로 만들지 말고 이어받는다.

---

## 01 → 02 : Candidate Packet

소유자: `01_DISCOVERY`

필수:

```text
candidate_id
found_at
found_by
source_type
source_url
source_risk
topic_title
why_interesting
notes
```

선택:

```text
raw_signals
related_sources[]
cluster_id
```

금지:

```text
final_score
verified_as_fact
final_draft
publish_approval
```

---

## 02 → 03 : Approved Content Brief

소유자: `02_EDITORIAL_SCORING`

필수:

```text
candidate_id
editorial_status
score
why_now
verified_facts[]
sources[]
recommended_angles[]
recommended_platforms[]
content_promise
must_not_claim[]
reviewed_at
```

권장:

```text
claims_to_verify[]
risk_notes
asset_rules[]
target_audience
recommended_formats[]
```

`editorial_status != ready`이면 03으로 넘기지 않는다.

---

## 03 → 04 : Draft Package

소유자: `03_PRODUCTION`

필수:

```text
candidate_id
account_id
platform
format
variant_id
hypothesis_id
body_or_script
source_boundaries
draft_status
```

선택:

```text
hook
cta
asset_plan
fact_warnings[]
rights_warnings[]
manual_edits
```

금지:

```text
verified_facts 수정
score 수정
publish_approval 생성
publication_id 생성
```

---

## 04 → 05 : Publication Record

소유자: `04_REVIEW_PUBLISH`

필수:

```text
candidate_id
account_id
platform
variant_id
publication_id
published_at
approval_revision
review_result
```

실제 플랫폼 응답이 없으면 `publication_id`를 가짜로 만들지 않는다.

---

## 05 → 다음 루프 : Experiment Result

소유자: `05_EXPERIMENTS_ACCOUNTS`

필수:

```text
experiment_id
account_id
candidate_id
variant_id
platform
hypothesis
metrics
auto_decision
learning
next_action
collected_at
```

선택:

```text
business_metrics
manual_decision
```

### 다음 단계 전달 규칙

- 소재 선택 학습 → 01에 전달
- 평가 기준/각도 학습 → 02에 전달
- 훅/길이/포맷 학습 → 03에 전달
- 게시 시간/댓글 정책/플랫폼 오류 학습 → 04에 전달
- 계정 포지셔닝 변경 → 05 내부에서 새 hypothesis로 등록

---

## 되돌림 규칙

문제가 발견되면 뒤 단계가 조용히 고치지 않고 소유 단계로 되돌린다.

```text
사실 오류        03/04 → 02
소스 위험        02/03/04 → 01 또는 02
표현/훅 수정     04 → 03
권리 BLOCK       04 → 03 또는 폐기
게시 오류        05 → 04
성과 부진        05 → 새 가설 생성 후 01/02/03 중 필요한 곳으로 피드백
```

이 규칙의 목적은 책임 추적과 재현성을 유지하는 것이다.
