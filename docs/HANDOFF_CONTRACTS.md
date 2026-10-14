# Role Handoff Contracts

운영 우선순위·권한·Git/소통은 [AGENTS](../AGENTS.md), 실행·원자료/단일 TXT 기술은 [루트 README](../README.md#통합-프로젝트-실행--단일-자료-txt)를 따릅니다. 이 문서는 단계 식별자·소유권·같은 버전 인수인계와 되돌림의 단일 권위입니다. 아래 기존 필드 계약은 새 schema를 발명하지 않고 유지합니다.

역할을 여러 사람/AI가 나눠 맡아도 데이터가 뒤섞이지 않도록 **각 단계의 입력/출력 계약을 고정**한다.

## 같은 글·버전·승인의 경계

- 기존 글 ID/output_version과 각 단계의 실제 sourceFingerprint, 원본 버전 연결·reviewRound·이미지 순서/SHA를 보존한다. 제목이나 임시 연구 순번을 새 영구 ID로 만들지 않는다.
- sourceFingerprint는 원문·표지/스타일 recipe 단계에 따라 다를 수 있다. 실제 현재 197건의 current/producer 값이 달라도 두 실값을 각각 보존한다. 일치시키려고 fingerprint나 ID를 재할당하지 않는다. 연결은 기존 ID/version/current images 순서 SHA·sourceZipSha256·sourceZipPreserved와 정확 source/경로·canonical 근거의 실제 binding 계약으로 확인한다.
- 원문 확인·HTML/TXT 변환·파일 보존·새 이미지 생성·실게시 이미지 합성·품질 점수/읽은 장·통과·예약 전달·실제 게시 성공은 서로 다른 단계다. 이전 회차/버전의 평가·통과를 현재 버전으로 자동 승계하거나 현재 199 판정을 일괄 비우지 않는다.
- 현재 197 원문 ZIP 연결은 같은 ID/버전/현재 이미지 SHA·preserved ZIP 핀을 확인한 경우만 허용한다. 다른 버전 원문/사진으로 대체하지 않으며 기존 2건은 미연결 보류다. 원 ZIP·raw HTML/댓글/이미지 byte/order와 requested/canonical 원 URL을 모두 보존하고 권리/완독/OCR 상태는 승격하지 않는다.
- 이후 인간이 승인한 이미지 제작만 같은 ID에 무자막 생성 원본·프롬프트/해시/생성 기록·실제 사건 사진 아님·버전 근거를 남긴다. 필요한 source가 없는 자리를 임의 생성 이미지로 대체하지 않는다.
- 인간 순서 `수집 정리 → 이미지 제작 → 실게시 이미지 합성 → 검토 → 게시 예약`은 계획/각 gate의 순서이지 한 번의 승인으로 자동 실행하는 계약이 아니다. 실제 게시/예약은 [04](../04_REVIEW_PUBLISH/README.md)의 별도 권한이다.

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

01이 실제 원문 근거로 쓴 draft caption/tags·표시제목·중간 작성 의견은 [Discovery 계약](../01_DISCOVERY/README.md)에 따라 후보에 포함할 수 있다. 아래 `final_draft` 금지는 이를 최종 게시 확정본이나 `publish_approval`로 표시하지 말라는 뜻이며 초안 작성을 금지하지 않는다.

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
