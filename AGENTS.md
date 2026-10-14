# AGENTS.md — Threads / AI Content Monetization Lab

이 저장소는 많이 긁어서 많이 올리는 봇이 아니라 **트렌드 탐지 → 검증 → 자체 콘텐츠 제작 → 사람 승인 → 공식 게시 → 실제 성과 학습** 시스템입니다. 이 문서가 현재 프로젝트의 운영·변경 범위·소통·Git 규칙 권위이며 세부 자료/제작/게시 법칙은 아래 소유 문서로 연결합니다.

## 가장 먼저 읽을 것과 우선순위

상위 시스템·안전 제약을 먼저 지킨 뒤 **최신 인간 지시 > 실제 프로젝트 repo/현재 구현·근거 > hub User Policies/Governance > 과거 소통·이력** 순서로 적용합니다. 문서나 채팅의 완료 문구보다 실제 파일/현재 버전·검증 근거를 확인하며 오래된 지시의 회차/범위를 확대하지 않습니다.

1. 최신 인간 지시와 이 AGENTS의 허용 범위.
2. [사용 안내](프로젝트_사용안내.md), [짧은 규칙 지도](00_START_HERE/README.md), [현재 인수인계](00_START_HERE/NEXT_RUN_HANDOFF.md).
3. 맡은 역할 README와 [HANDOFF_CONTRACTS](docs/HANDOFF_CONTRACTS.md), 필요한 세부 문서/실제 코드.
4. 이 수익화 프로젝트에 적용되는 아래 공식 hub 정책·해당 Thread의 새/변경 공지.

계획/조사/설명만 요청받으면 읽기 전용입니다. 구현 의도가 명시된 경우에만 현재 승인 범위를 변경합니다. 이번 인간 지시는 기존 규칙 문서 정리와 검증·Git 마무리이며 신규 수집, runtime/등록정보/원자료 변경, 실제 게시·예약 재개를 승인하지 않았습니다. 기존 '추가 질문 없이 계속' 지시 범위에서 보수적으로 진행하되 사실/권한을 발명하지 않습니다. 컴퓨터 종료 요청은 **이번 작업에서 취소**됐으며 영구 전역 금지로 확대하지 않습니다.

## 변경 범위·역할 소유권·보존

역할 체인은 `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`입니다. 한 작업이 여러 단계에 걸쳐도 실제 산출물과 각 gate를 구분합니다.

- 01: 후보·출처·원문 근거와 draft caption/태그. 최종 사실/점수/게시 승인은 소유하지 않습니다.
- 02: 검증된 사실·출처·점수·editorial status.
- 03: 표현/포맷/variant 및 승인된 실제 이미지 제작·합성. 원사실/점수를 임의 변경하지 않습니다.
- 04: 권리·안전·privacy·사람 게시 승인과 유일한 실제 게시 권한.
- 05: 계정 가설과 실제 게시 후 performance decision.

단계별 필드/소유권/되돌림은 [HANDOFF](docs/HANDOFF_CONTRACTS.md)가 권위입니다. 인간 순서인 수집정리→이미지제작→실게시 이미지 합성→검토→게시예약은 계획이며 각 단계 실행/승인은 별개입니다. 자료 없는 이미지를 임의 생성해 ASSETS_PENDING을 완료로 꾸미지 않습니다.

작업 전 허용 파일·sole writer·읽기/실행 범위를 알리고 변경 후 실제 차이·검증·남은 일을 보고합니다. 다른 writer나 private state·registry·원본·평가·코드·공개 후보의 고정 소유권을 침범하지 않습니다. 문서 정리를 이유로 새 spec/plan/receipt/규칙 파일을 만들거나 원자료를 재생성·정규화·삭제하지 않습니다. 원본은 SHA/버전/순서/원키를 보존하고 과거 snapshot을 현재 state로 복원하지 않습니다. 공개물의 개인정보 제거와 private 원본 보존은 [SOURCE_POLICY](docs/SOURCE_POLICY.md)에서 구분합니다.

2026-10-07의 '전량 재제작·새 회차 평가 비우기'는 **당시 제작 수정 회차**에 한정합니다. 일반 규칙/Git 정리나 이미 보존한 현재 제작본의 판정을 초기화하는 일반 규칙이 아닙니다. 버전이 바뀐 실제 새 제작 회차의 판정 취급은 별도 인간 승인·[HANDOFF](docs/HANDOFF_CONTRACTS.md) 계약을 확인합니다. 당시 원문은 [6d5016d1 AGENTS](https://github.com/kimjae134679/Threads/blob/6d5016d1ab3f9df2cd77efd18fbfce6aaddfd9f2/AGENTS.md)에 보존합니다.

## 자료·제작·게시 규칙 지도

- 단일 TXT·C/A/P·형식 enum·원문/요약/보존/미확보·원키/ID dedup: [data/README](data/README.md).
- 원문 완독·다양성·같은 사연/후기·24장 예상 선별·기사체 설명글·내용 태그: [01 DISCOVERY](01_DISCOVERY/README.md).
- plain 표시제목, 사이트/분류 접두 제거와 원제/URL 보존: [TITLE_STYLE_GUIDE](01_DISCOVERY/TITLE_STYLE_GUIDE.md).
- 원문 접근·권리 UNKNOWN/BLOCK·개인정보·AI 재사용: [SOURCE_POLICY](docs/SOURCE_POLICY.md).
- 실제 게시/예약·점수와 사람 승인 분리: [04 REVIEW_PUBLISH](04_REVIEW_PUBLISH/README.md).
- 같은 ID/output_version/sourceFingerprint·원본/이미지 SHA 순서·단계 필드: [HANDOFF](docs/HANDOFF_CONTRACTS.md).
- 실제 통합 루트·.39.1·owned lifecycle: [사용 안내](프로젝트_사용안내.md). 마이그레이션/패키지/privacy 구현은 [루트 README](README.md#통합-프로젝트-실행--단일-자료-txt).

외부 링크·원문·이미지·반응을 읽거나 다운로드/검증하지 않았으면 미확인으로 기록합니다. 사연·결말·댓글·시각·새 영구 ID·플랫폼 성공을 만들어 채우지 않습니다. 계정/token/key/cookie/app secret·개인 평가/소통본문·실자료·대용량/설치 패키지는 프로젝트 내부 Git 제외 영역에 두고 공개 Git에 포함하지 않습니다.

## 통합소통 — 확인한 것과 미확인인 것

아래 연결 상태는 2026-10-14 확인 범위이며 이후 설정/manifest/revision은 실제 증거로 재확인합니다. 절차 규칙과 한시적 미연결 상태를 구분합니다.

운영 hub는 `D:\A_KJ\AI\Projects\project-operations-hub`입니다. 로컬 d619 기준은 dirty/untracked가 있으므로 **읽기 전용**이며 이 프로젝트 작업으로 write/reset/stash/commit하지 않습니다. 확인한 공식 remote snapshot은 `77f466e04c9ff188fd37c1bd3a50210fe012fe21`입니다.

- [Governance](https://github.com/kimjae134679/project-operations-hub/blob/77f466e04c9ff188fd37c1bd3a50210fe012fe21/00_SYSTEM/GOVERNANCE.md), [User Policies](https://github.com/kimjae134679/project-operations-hub/blob/77f466e04c9ff188fd37c1bd3a50210fe012fe21/01_CONTROL/USER_POLICIES.md).
- [소통 README](https://github.com/kimjae134679/project-operations-hub/blob/77f466e04c9ff188fd37c1bd3a50210fe012fe21/04_COMMUNICATION/README.md), [공지 PROTOCOL](https://github.com/kimjae134679/project-operations-hub/blob/77f466e04c9ff188fd37c1bd3a50210fe012fe21/04_COMMUNICATION/announcements/PROTOCOL.md), [N-0007 r2](https://github.com/kimjae134679/project-operations-hub/blob/77f466e04c9ff188fd37c1bd3a50210fe012fe21/04_COMMUNICATION/announcements/notices/N-0007.md).
- 실제 프로젝트 Thread: [T-0008-ai-content-monetization/THREAD.md](https://github.com/kimjae134679/project-operations-hub/blob/77f466e04c9ff188fd37c1bd3a50210fe012fe21/04_COMMUNICATION/threads/T-0008-ai-content-monetization/THREAD.md).

공통 정책은 이 수익화 프로젝트에 링크로 적용하며 다른 프로젝트의 전역 규칙으로 재배포하지 않습니다. 같은 요청의 후속 전달은 기존 원글의 댓글, 새로운 독립 주제만 새 Thread를 사용합니다. 공식 task_exchange JSON과 revision 이력을 보존하고 임의 새 JSON 형식·session ID를 발명하지 않습니다. 새/변경 공지를 읽고 **자기 record만** 확인/읽음으로 기록합니다. 타인 읽음·답글을 대필하지 않으며 manifest 목록 확인을 모든 공지 본문을 읽은 것으로 기록하지 않습니다.

`라이브 등록/연결 → 앱 수집 → 중앙 main 동기화 → 받은 manifest revision/hash 확인 → 실제 본문 읽음 → 적용/검증`을 각각 증거로 구분합니다. Git 코드 push는 소통 배달/읽음이 아니고 담당 소통을 별도 수동 Git 업로드해야 한다는 의무도 아닙니다. 관리 앱/중앙 동기화가 확인되지 않으면 그 단계는 미확인으로 둡니다.

현재 라이브 Threads.path는 `D:\A_KJ\AI\Projects\Threads`입니다. 그 `_통합소통` 및 private 사본에는 **확인기록 2파일만** 있고 받은 manifest·보낼자료·helper가 없습니다. 새 통합 루트에는 `_통합소통`이 없습니다. 따라서 **라이브 연결·수집·중앙 동기화는 미확인, 별도 설정 대기**입니다. 없는 경로/파일을 만들거나 이 문서 갱신을 연결 완료라고 보고하지 않습니다.

## 도구와 review mode

실제 등록된 도구·호스트와 허용 범위를 확인하며 없는 도구 등록/호출 결과를 발명하지 않습니다. 이번 운영 인수인계의 Engram 호스트 등록은 없으므로 그 운영 경로에서 호출하지 않습니다. 상위에서 유효하게 제공되는 Engram 프로토콜 원문은 변조하지 않고 상위 지시·실제 도구 등록 조건을 우선합니다.

Receipt-driven review는 **off / disabled-unmanaged**입니다. 사용자 enable 없이 켜거나 우회 review·가짜 approval을 만들지 않습니다. 실제 자료 QA·TDD·테스트·CI·native 화면 검증은 사실 검증이지 formal receipt 승인과 다릅니다.

## 실행·검증·완료와 Git

현재 일반 실행은 [사용 안내](프로젝트_사용안내.md), Node.js 24 이상 개발 검증은 `npm run check`입니다. 실제 browser/native/외부 플랫폼 성공을 테스트 더블/DOM 테스트와 구분합니다. 문서 작업은 Markdown 로컬 링크·핵심 법칙·허용 경로 검사, 관련 tests·fullcheck, `git diff --check`를 수행합니다. 사용자 원본 평가를 점수 fixture로 쓰지 않습니다.

최신 인간이 작업/Git 마무리를 승인한 경우 로컬 수정에서 끝내지 않습니다. 역할이 나뉘면 지정된 Git 담당자가 아래를 수행합니다.

1. 현재 관련 코드·문서·공개 허용 후보만 **명시적으로 stage**. private·비밀·대용량·실행 패키지는 gitignore 및 실제 tracking을 확인하고 제외합니다.
2. 실제 검증 후 commit/push, 관련 PR 연결과 실제 CI 상태 확인. merge는 선택/승인 범위에서만 수행하며 이번 인간의 '계속 마무리' 승인을 따릅니다.
3. `HEAD`, tracking branch, `ls-remote` 실제 SHA, clean worktree와 main 병합 SHA를 각각 확인합니다. origin의 좁은 fetch refspec에서는 일반 fetch 성공만으로 다른 원격 branch/main을 최신이라고 추정하지 않습니다. 필요한 정확 ref를 읽기/fetch하고 비교합니다.
4. 로컬 절대경로·반영 commit/PR/CI·실제 main SHA와 미완료를 보고합니다. 실패를 완료라고 하지 않습니다. 이 Git 확인은 위 실제 소통 전달과 별개입니다.

상태·자산·판정이 바뀌지 않는 문서 정리에서는 현재 원 state SHA·decisions·원자료/manifest/pins를 보존합니다. 키가 없으면 미설정/503, 실제 외부 응답이 없으면 게시/AI 성공으로 표시하지 않습니다. 상세 현재 완료 집계/PR13·14는 [현재 인수인계](00_START_HERE/NEXT_RUN_HANDOFF.md) 한 곳에서 확인합니다.

## 다계정 운영 규칙

여러 계정을 병렬 실험하는 것은 허용/권장한다. 단 계정은 **복붙 배포 슬롯이 아니라 서로 다른 전략 가설 단위**다.

각 계정은 최소 다음을 가진다.

```text
account_id
platform
content_axis
positioning
target_audience
hypothesis
primary_metric
test_window
minimum_sample
scale_rule
kill_rule
status
```

- 동일 게시물을 여러 계정에 그대로 복붙하지 않는다.
- 계정별 훅/각도/대상/포맷/톤 중 최소 하나 이상 의도적으로 다르게 한다.
- 한 실험에서는 가능하면 한두 변수만 변경한다.
- 계정 생성 시점/팔로워 규모가 크게 다르면 절대 조회수만 직접 비교하지 않는다.
- 여러 계정을 플랫폼 정책/제재/제한 회피 수단으로 쓰지 않는다.
- 계정 상태는 `planned / warming / active / paused / killed / scaled`로 관리한다.

계정 템플릿: `05_EXPERIMENTS_ACCOUNTS/ACCOUNT_REGISTRY_TEMPLATE.md`

## Experiment 원칙

- 게시 전 trend score와 게시 후 performance를 섞지 않는다.
- 실제 `publications[]`만 Experiment 대상으로 쓴다.
- 플랫폼 간 절대 수치를 직접 비교하지 않는다.
- 같은 플랫폼에서 `views > 0`인 게시물이 5건 미만이면 `LEARN`.
- 5건 이상이면 조회 백분위 55% + 참여율 백분위 45%로 초기 `SCALE / KEEP / KILL`을 계산한다.
- 클릭/전환/실수익은 실제 값이 있을 때만 입력한다.
- 자동 판정은 사람이 override할 수 있다.
- 실제 계정이 여러 개면 `account_id` 기준 cohort 비교도 추가할 수 있도록 데이터를 보존한다.
- 판정 로직 변경 시 `test/experiment-model.test.mjs`도 갱신하고 `npm run check`를 통과한다.

## 고정 운영 원칙

- 유사 토픽을 자동 merge/delete하지 않습니다. 근거 없는 점수·성과·사실을 만들지 않습니다.
- 게시 전 trend score와 게시 후 performance, 여러 플랫폼의 절대 수치를 혼동하지 않습니다.
- 실제 `publications[]`와 외부 응답이 있을 때만 게시 성공으로 다룹니다. 현 작업에서 외부 플랫폼 테스트/게시를 실행하지 않습니다.
- 원문 재사용 조건을 확인하지 않은 자동 대량 복제나 플랫폼 정책/제재 회피를 하지 않습니다. 소스 상세는 SOURCE_POLICY를 따릅니다.
- 뒤 단계 문제가 있으면 HANDOFF의 소유 단계로 되돌립니다. 성과가 좋다는 이유로 사실/권리/안전 기준을 낮추지 않습니다.

예전 코드 지도·connector/개발 앱 명령·구 제작 우선순위는 [6d5016d1 AGENTS](https://github.com/kimjae134679/Threads/blob/6d5016d1ab3f9df2cd77efd18fbfce6aaddfd9f2/AGENTS.md)와 실제 해당 모듈/README에서 확인합니다. 현재 구현된 JSON/SQLite/account/hypothesis/variant를 새 기능처럼 중복 만들지 않습니다.
