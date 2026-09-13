# 04 — REVIEW & PUBLISH / 검수·승인·게시

## 목적

03에서 만든 Draft Package를 **사실·권리·개인정보·명예훼손·플랫폼 정책 기준으로 최종 검수하고 실제 게시 여부를 결정**하는 역할이다.

## 입력

`03_PRODUCTION`의 Draft Package + `02_EDITORIAL_SCORING`의 Approved Content Brief.

## 이 파트가 하는 일

- 사실 일치 여부 확인
- 저작권 / 자산 권리 확인
- 개인정보 / 초상 / 일반인 식별 위험 확인
- 명예훼손 / 단정적 주장 확인
- 플랫폼 원본성 / AI / 재사용 정책 확인
- PASS / WARN / BLOCK 판정
- WARN 대응 메모 확인
- 사람 게시 승인
- 실제 플랫폼 게시
- 게시 ID / 게시 시각 / 최종 문안 / 계정 ID 기록

## 하지 않는 일

- 조회수를 높이기 위해 사실을 새로 추가하지 않는다.
- 소재 점수를 다시 매기지 않는다.
- 성과를 보고 전략을 평가하지 않는다. 그것은 05 역할이다.
- 승인된 초안을 몰래 수정해 게시하지 않는다. 수정되면 다시 승인한다.

## Safety Gate

```text
fact
rights
privacy
defamation
platform_policy
```

상태:

```text
PASS
WARN
BLOCK
UNKNOWN
```

`BLOCK` 또는 `UNKNOWN`이 있으면 게시하지 않는다. `WARN`은 대응 메모가 있어야 한다.

## 출력 — Publication Record

```text
candidate_id
account_id
platform
variant_id
publication_id
final_text_or_asset_ref
published_at
approval_revision
review_result
reply_or_comment_policy
initial_status
```

## 완료 기준

실제 게시되었다면 플랫폼이 반환한 ID가 있어야 한다. API/토큰이 없거나 실제 게시 응답이 없으면 `published`라고 기록하지 않는다.
