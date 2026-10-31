# Account Experiment Tracking

## 목적

콘텐츠 후보가 실제 게시된 뒤 **어느 계정 전략 / 어느 가설 / 어느 버전의 결과인지** 잃어버리지 않도록 추적한다.

## 후보 단계

후보 상세의 `계정 / 실험 배정`에서 다음을 저장한다.

```text
experimentAssignment.accountId
experimentAssignment.hypothesisId
experimentAssignment.variantId
experimentAssignment.goal
experimentAssignment.updatedAt
```

초기 Registry:

```text
TH-A  Hot / Issue
TH-B  Useful / Product / Money
TH-C  Internet Story / Culture
```

실제 계정이 아직 연결되지 않았으므로 Registry 상태는 `planned`다.

## 승인 무결성

계정/가설/버전/실험 목표가 바뀌면 후보 `updatedAt`도 변경한다.

따라서 이미 게시 승인을 받은 뒤 실험 배정을 바꾸면 기존 `publishApproval.basisUpdatedAt`과 달라져 재승인이 필요하다.

## 게시 단계

Threads 실제 게시 전 `accountId` 배정이 필요하다.

게시 성공 시 후보의 현재 배정값을 `publication.experiment`에 복사한다.

```text
publication.experiment.accountId
publication.experiment.hypothesisId
publication.experiment.variantId
publication.experiment.goal
publication.experiment.assignmentUpdatedAt
publication.platformAccount.username
```

이 값은 **게시 시점 스냅샷**이다. 나중에 후보의 실험 배정을 바꾸더라도 과거 Publication의 귀속은 바뀌지 않는다.

## Experiment Lab

Experiment Lab은 Publication의 스냅샷을 우선 사용한다.

과거 데이터처럼 `publication.experiment`가 없는 경우에만 현재 후보의 `experimentAssignment`를 fallback으로 본다.

지원 기능:

- 실험 계정별 필터
- 카드에 account / hypothesis / variant 표시
- 실제 연결된 Threads username 표시
- 실험 목표 표시
- 기존 Insights / 클릭 / 전환 / 실수익 / KEEP·KILL·SCALE 유지
- CSV에 다음 열 추가

```text
account_id
hypothesis_id
variant_id
platform_username
experiment_goal
```

## 운영 원칙

- 같은 글을 여러 계정에 복붙하기 위한 식별자가 아니다.
- 계정마다 콘텐츠 축/타깃/가설 차이를 둔다.
- 실제 계정을 만들기 전에는 Registry를 `active`로 바꾸지 않는다.
- token/password/cookie는 Registry나 Publication 데이터에 기록하지 않는다.
- `platformAccount.username`은 성과 귀속 확인용 공개 계정명이며 비밀정보가 아니다.

## 다음 단계

1. 실제 Threads 계정 1개 연결
2. 후보 하나에 TH-A/B/C 중 적절한 전략 배정
3. 승인 체인을 통과한 테스트 글 1건 게시
4. Publication에 experiment snapshot + 실제 username 저장 확인
5. Insights 회수 확인
6. 이후 실제 계정이 늘면 Registry의 `planned` 항목을 실제 handle과 연결하는 별도 Account Manager 구현
