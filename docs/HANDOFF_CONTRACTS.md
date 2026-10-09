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

## 수집·이미지·합성 운영 인계 — 2026-10-10 사용자 지시

운영 순서는 **자료 수집·정리 → 이미지 제작 → 실제 게시 이미지 생성 → 검토 → 게시 예약**이다. 이미지 제작과 실제 게시 이미지 생성은 `03_PRODUCTION` 안의 별도 산출물이며, 이 순서가 기존 02의 사실 검증이나 04의 권리·안전·사람 승인을 생략하지 않는다. 여기서 “실제 게시 이미지”는 게시에 사용할 합성 파일을 뜻하며 실제 게시 성공을 뜻하지 않는다.

| 담당 단계 | 소유하는 산출물과 다음 단계에 넘길 내용 |
|---|---|
| 자료 수집·정리 | 수집 담당이 정한 고정 글 ID, 보존한 원문, 정확한 출처, 권리 근거·미확인 사항, 분류를 넘긴다. 표시용 제목, 인스타 전체 문안, 쓰레드 표지 제목, 공용 해시태그와 주제별 해시태그도 수집 담당이 준비·관리한다. 준비 문안은 검증 완료·최종 초안 승인·게시 승인이 아니다. |
| 이미지 제작 | 수집 담당의 같은 고정 글 ID에 연결한 **글씨 없는 AI 원본 PNG**, 실제 프롬프트, 파일 위치·SHA-256·크기·생성 시각·선택 버전과 이전 버전 관계를 넘긴다. AI 가상 상황임을 표시하며 원문 증거·사실·권리 판단·수집 문안을 임의 변경하지 않는다. |
| 실제 게시 이미지 생성 | 후단 프로그램이 전달받은 원본과 준비 문안으로 제목 등을 합성한다. 무문자 원본은 덮어쓰지 않고 합성 결과를 별도 파일로 보존하며, 어떤 원본 파일·버전과 문안을 사용했는지 추적한다. |
| 검토 | 실제 합성 결과에서 제목이 얼굴·핵심 행동·소품을 가리는지 확인한다. 개별 품질 검토와 04의 사실·권리·안전·사람 승인을 분리하고, 변경되면 해당 버전 기준으로 다시 검토한다. |
| 게시 예약 | 04의 승인 체인과 별도의 실행 권한이 갖춰졌을 때만 진행한다. 제작·합성·검토 완료만으로 예약 또는 게시를 실행하거나 완료로 기록하지 않는다. 현재 지시는 실제 예약·게시 실행 권한이 아니다. |

표시용 제목에서는 `네이트판`·게시판명·불필요한 분류 표기를 정리하되, 원문 제목·원문 내용·출처는 별도로 그대로 보존한다. 제목 정리는 새로운 사실이나 과장을 추가할 권한이 아니다. 이미지 담당과 합성 담당이 문안 수정이 필요하다고 판단하면 수집 담당에게 되돌린다. 사실 오류는 기존 규칙대로 02로 되돌린다.

### 고정 ID와 원본 자산 연결

- 수집 담당이 확정한 ID와 기존 `candidate_id` / 앱의 `candidateId` / 폴더 입력의 `manifest.id` 사이 연결을 확인하고 이어받는다. 정확한 필드 이름과 매핑은 수집 담당의 현재 계약을 사용하며, 이미지 담당이 새 입력 schema나 별도 공식 ID를 만들지 않는다.
- 기존 코드의 `sourceId`는 발견 소스의 provider ID 또는 렌더링 조각 ID로도 쓰인다. 이를 고정 글 ID와 동일하다고 가정하지 않는다. 임시 URL 해시 ID를 공식 ID로 승격하거나 제목·파일명만으로 글을 연결하지 않는다.
- 공식 ID가 미확정이거나 매핑이 없거나 여러 건이면 **프로그램 자동 투입을 보류**한다. 기존 임시 ID·파일·해시는 보존하며 수집 담당에게 연결 확인을 요청한다. 이미지 저장 성공으로 누락 ID·원문·권리 확인을 완료 처리하지 않는다.
- 원본 자산 전달에는 기존 `threads-cover-asset-v1`을 재사용할 수 있다. 기존 위치는 해당 후보 폴더의 `작업 정보/cover-asset.json`과 `작업 정보/cover-media/<name>`이다. `kind=ai_generated`, `coverOnly=true`, `actualScene=false`와 `name`, `sha256`, `prompt`, `generator`, `relevance`, `attribution`, `license` 등 기존 필드를 유지한다. 이 입력의 출처·파일 해시 검증만으로 글 ID 매핑이나 권리·품질·게시 승인이 보장되는 것은 아니다.
- 무문자 원본의 **자산 버전**과 합성 결과의 `ruleVersion` / `outputVersion`은 다르다. 생성 기록의 `schemaVersion`도 이미지 개정 번호가 아니다. 선택한 원본 파일·SHA와 이전 버전 관계를 보존하고, 변경된 합성 결과에는 이전 평가·사람 승인·게시 승인을 옮기지 않는다.

이 절은 현재 계약과 운영 경계의 문서화다. 자동 합성·고정 ID 매핑·예약 기능의 새 구현이나 실제 자료 연결 완료를 의미하지 않는다.

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
