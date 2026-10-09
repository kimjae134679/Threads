# 전체 표지 타이포 개선 — 2026-10-09

최신 후속: [남은 358개 동일 회차 반영](REMAINING_COVER_DELIVERY_2026-10-09.md). 아래 전체 납품 수·검토 250은 최초 01:34 UTC 시점 기록이다. 이후 사용자 열람 6글과 승인받은 나머지 358개에 `.2`를 적용·검증해 총 364개가 충족하며, AI 원본 대기 1개는 그대로다. 기본 안 본 검토 대상은 244개다. 358개 중 실제 픽셀 변경은 123개, 같은 픽셀 검증은 235개다. [최초 이의 추적](COVER_REVIEW_TRACE_2026-10-09.md)은 6개 수정 당시 기록을 보존한다.

역할: 03_PRODUCTION. 대상은 기존 완료 365글의 표지이며 본문·댓글·점수·리뷰 UI·설치 파일은 변경하지 않았다. 입력 목록 1,084건 중 출력 없는 719건은 기존 상태 그대로다. 이번 결과는 공개 게시 승인이 아니다.

## 실제 납품

|항목|확인 수|
|---|---:|
|출력 있는 글|365|
|개선 완료 표지|364|
|글씨형 / 이미지형|354 / 10|
|AI 원본 대기, 기존 표지 보존|1|
|최종 실패|0|
|바이트 그대로 재사용한 본문·댓글 PNG|2,708|
|새 회차 전체 PNG|3,073|
|과거 평가 원본 보관|47|
|이미 본 글 기본 제외|114|
|안 본 글 중 기본 검토 대상|250|

실제 결과: `D:\A_KJ\AI\Projects\Threads\자료\06_자동 제작 결과\현재 결과`.
활성 회차: `review-20261009-title-typography`.
이전 결과·평가·진행·회차 포인터: `자료\05_이전 작업\리뷰 과거\before-review-20261009-title-typography`.
새 점수와 평가 메모는 비어 있다. 기존 열람 이력은 역사 기록에서 읽어 기본 목록에서 제외한다. 실제 사용자의 보류·탈락 결정이 있으면 해당 결정만 새 outputVersion에 연결하며 점수를 옮기지 않는다. 이번 연결 시 이월할 결정은 0건이었다.

## 공통 제작 규칙

- `app/source-cover-typography.js`는 원문 제목의 구절만 강조하고 제목 색을 최대 2개로 제한한다. 강조 크기 1.06, 마지막 줄 0.97의 작은 차이를 사용한다. 숫자만 자동으로 크게 떼어내지 않는다.
- 전체 원문 제목을 보존하고 출처 접두어만 분리한다. 기존 한글 단어 경계·고아줄 정책을 사용하며 맞지 않으면 생략하지 않고 보류한다.
- 글씨형은 제목 맥락에 따라 크림·청색·녹색 계열과 포인트색을 선택한다. 이미지형은 얼굴과 행동을 별도 이미지 영역에 모두 담고 제목 영역을 분리한다. 이번 364개 실제 제목 기본 크기는 74~124px, 안전 여백은 최소 72px다.
- 신입사원 글은 사용자가 승인한 task-10 원본 A를 사용한다. 다른 기존 적격 사진 9개도 유지한다. 원본 SHA·장면 근거·실제 생성 프롬프트는 내부 plan에 남고 표지에 AI 문구를 노출하지 않는다.
- `source-batch.html` → `source-batch-image-composition.js` → `source-batch.js`에서도 같은 색·강조·크기 run을 소비한다. 이미지 소비 fingerprint rendererVersion은 `2026-10-09.1`이다. 기본 레거시 제작은 명시적 completeCover/이미지 계약 없이 변경하지 않는다.
- 패키지는 shared JS와 desktop canvas를 포함하며 로컬 protocol에서 허용한다. 리뷰 UI 파일은 변경하지 않았다. 설치된 0.3.26 바이너리는 유지했으므로 향후 일반 제작에 새 코드를 설치하는 통합은 별도 조율이 필요하다. 이번 전체 출력은 새 소스 코드로 실제 생성했다.

## 실행 및 증거

공통 명령은 기존 로컬 Electron으로 `desktop/reflow-review-covers-run.cjs <config.json>` 실행이다. 설정은 `sourceRoot`, 새 `destination`, `qaRoot`, 고유 `reviewRound`, `renderer: "title-typography"`, `aspectRatio: "square"`, `pendingImageIds`, 승인된 `coverAssets`를 지정한다. 파일 경로·SHA·출처·프롬프트·권리 상태를 자산에 기록한다. 원본·평가의 frozen snapshot과 recipe SHA가 다르면 중단한다.

이번 재현 설정과 증거는 `C:\Users\user\Documents\Codex\2026-10-08\task-16`에 있다.

- `full-typography-config-v2-20261009.json`: 실제 실행 설정과 17,584개 원본 보존 snapshot.
- `typography-refresh-20261009-v2\cover-refresh-proof.json`, `intake-complete.json`: 완료 수와 원본 PNG·ZIP hash 보존.
- `full-typography-layout-proof-20261009.json`: 모든 개선 표지의 제목 문자, 여백, 색 수, 사진 가림 검증.
- `typography-release-ready-20261009.json`: 365글/3,073 PNG의 해시·1080px·장수·복사 바이트 검증.
- `typography-release-activation-proof-20261009.json`: 실제 D자료 활성 연결, 과거 평가 47건 보존, seen114·기본250 및 리뷰 store 이미지 hash 일치.
- `installed-typography-review-20261009\installed-review.json` / `.png`: 설치된 0.3.26 실행, 새 회차·365출력·250표시의 실제 화면. 읽기 전용 검수로 실제 평가와 진행 바이트가 유지됐다. 새 회차에 가짜 사용자 점수를 쓰지 않았다.

핵심 테스트 `cover-typography`, `image-composition`, `packaged-image-composition`, `reflow-review-covers-run`, `universal-cover`: 22/22 통과. 패키징 독립 리뷰의 누락 P2를 수정했고 최종 남은 P1/P2는 없었다.

v1은 구버전 축약 제목의 강조 구절이 원문에 없는 사례에서 28글 후 중단한 실패 시도이며 납품 대상이 아니다. 원문에 없는 강조를 제외하고 새 v2 폴더에서 전체를 완성했다. 실패 시도는 보존한다.

## 확인하지 못한 자료

사용자 첨부 Library PNG 3개는 공식 materialize 준비까지 성공했지만 공식 파일 전송에서 각각 HTTP 403이었다. 실제 픽셀을 읽지 못했으므로 그 이미지를 보고 반영했다고 주장하지 않는다. 실제 평가 9점·8점 기존 표지와 승인된 신입사원 원본 및 생성한 결과 화면은 읽고 확인했다. Library signed URL·실패 전송 응답은 Git에 포함하지 않는다.

`source-be8fbf58dc2254`의 새 AI 원본은 아직 지원된 로컬 파일로 전달되지 않아 보류다. AI 생성/전송 진단은 별도 담당에게 넘겼으며 이번 작업은 큐·브릿지·계정·키·결제·보안 권한을 수정하지 않았다.

## 예약 담당자에게 넘길 작업 계약

이번 작업에서 예약을 만들거나 기존 예약을 변경하지 않았다. 한 번에 한 글만 처리하며 ready gate와 체크포인트를 사용한다.

1. 작업명은 `표지 이미지 계획 확인 — <글ID>`. 최신 회차·원문 제목·현재 outputVersion·이미 본 여부·현재 보류 상태를 먼저 읽는다.
2. 원문 관련 이미지 → 권리 검토된 외부 관련 이미지 → 원문 근거 AI 장면 계획 → 이미지 불필요 시 완성 글씨형 순서로 판단한다. 모든 글에 생성 이미지를 강제하지 않는다.
3. ready gate: 원문 근거, 이미지 필요 여부, 권리 상태, 지원된 실제 로컬 원본+SHA, 글별 배치/크롭, 소비 renderer가 모두 확인되어야 렌더한다. 생성 대기는 완료가 아니다.
4. 기존 canonical writer와 제작 잠금을 사용한다. 중복 키는 글ID+sourceFingerprint+소비 자산 SHA+rendererVersion이며 완료 체크포인트가 같으면 재작업하지 않는다. 전체 큐를 새로 쓰지 않는다.
5. 완료 체크포인트는 글ID·회차·fingerprint·소비 자산 SHA·실제 cover SHA·본문 동일 여부·완료 시각을 남긴다. 실패는 `held`, `reasonCode`, `missingEvidence`, `lastAttemptAt`, `nextAction`으로 기록하고 기존 결과를 보존한다.
6. 한 글 출력만으로 전체 버전을 교체하지 않는다. 현재 회차 변경은 별도 전체 납품 계약과 fresh hash를 확인해야 한다. 이미 본 글을 새 기본 검토 소재로 다시 공급하지 않는다.

일반 제작 코드의 설치·원격 통합 범위는 부모 작업에서 조율한다. 현재 설치 프로그램/바로가기는 변경하지 않았다.
