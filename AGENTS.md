# AGENTS.md — Threads / AI Content Monetization Lab

이 저장소는 `많이 긁어서 많이 올리는 봇`이 아니라 **트렌드 탐지 → 검증 → 자체 콘텐츠 제작 → 사람 승인 → 공식 게시 → 실제 성과 학습** 시스템을 만든다.

## 가장 먼저 읽을 것

1. 현재 채팅의 사용자 최신 지시
2. `00_START_HERE/README.md`
3. 현재 맡은 역할 폴더의 README
4. `docs/HANDOFF_CONTRACTS.md`
5. 필요한 세부 문서

운영 허브를 함께 쓸 때는 `kimjae134679/project-operations-hub`의 최신 Governance/User Policies도 따른다.

## 역할 선택 규칙

작업 시작 전 반드시 현재 일이 어느 파트인지 먼저 분류한다.

```text
01_DISCOVERY
소재 검색 / 자동 신호 / 사용자 직접 제보 정리

02_EDITORIAL_SCORING
독립 조사 / 사실 검증 / 점수 / 콘텐츠 각도 / ready·research·skip

03_PRODUCTION
Threads 글 / 영상 스크립트 / Carousel / Blog / YouTube 제작

04_REVIEW_PUBLISH
Safety Gate / 사람 승인 / 실제 플랫폼 게시

05_EXPERIMENTS_ACCOUNTS
계정 전략 / Insights / 클릭·전환·수익 / KEEP·KILL·SCALE
```

한 작업에서 여러 파트를 거칠 수는 있지만 **각 파트의 산출물을 명시적으로 완성한 뒤 다음 파트로 넘어간다.**

## 역할 소유권

- `01`이 Candidate Packet을 소유한다.
- `02`가 검증된 사실, 출처, 점수, editorial status를 소유한다.
- `03`이 표현/포맷/variant를 소유한다. 사실이나 점수는 수정하지 않는다.
- `04`가 Safety Gate와 실제 publish approval을 소유한다.
- `05`가 account hypothesis와 게시 후 performance decision을 소유한다.

뒤 단계에서 문제가 보이면 임의 수정하지 말고 `docs/HANDOFF_CONTRACTS.md`의 되돌림 규칙을 따른다.

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

## 실행 / 검증

```text
npm start
http://127.0.0.1:4173/app/

npm run check
```

`npm run check`는 JavaScript 문법과 전체 회귀 테스트를 수행한다. GitHub Actions는 실제 로컬 서버 기동, 주요 브라우저 script 로드, keyless connector fail-closed까지 smoke test한다.

## 현재 주요 코드

```text
server.mjs                   로컬 API/static server
openai.mjs                   선택적 OpenAI 조사/초안
threads.mjs                  Threads 공식 게시/프로필/quota/insights
naver.mjs                    NAVER API HUB 검색/검색트렌드

app/app.js                   Trend Inbox 핵심
app/youtube.js               YouTube 후보 수집
app/clustering.js            유사 토픽 묶기
app/research-bundle.js       Research Bundle + 사람 검토 gate
app/source-enrichment.js     NAVER 뉴스/블로그/카페/트렌드 보강
app/ai-studio.js             AI 조사 / 멀티플랫폼 Draft Studio
app/safety-gate.js           Rights/Safety Gate + 게시 승인 Queue
app/approval-integrity.js    승인 이후 변경 시 승인 무효화
app/threads-publisher.js     Threads 실제 게시 확인 UI + Insights
app/experiment-model.js      KEEP/KILL/SCALE 순수 판정 모델
app/experiment-lab.js        실제 게시 성과 대시보드/CSV

test/experiment-model.test.mjs Experiment 판정 회귀 테스트
```

브라우저 저장:

```text
localStorage: threads_trend_inbox_v1
```

## 현재 connector

기본:
- Google Trends KR Trending Now RSS
- 수동 URL / 메모

선택:
- `YOUTUBE_API_KEY`
- `NAVER_API_HUB_CLIENT_ID` + `NAVER_API_HUB_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `THREADS_ACCESS_TOKEN`

비밀키/API key/token/cookie/app secret은 GitHub에 기록하지 않는다.

## 사람 승인 체인

실제 Threads 게시 전 모두 필요:

```text
후보 ready
+ 점수 평가
+ Research Bundle reviewed
+ Draft Studio approved
+ Safety Gate complete / no BLOCK
+ WARN 대응 메모
+ 게시 승인 Queue 승인
+ 승인 이후 내용 변경 없음
+ Threads token 연결
+ 최종 문안/계정 확인
```

AI 조사 성공은 사람 검토 완료가 아니다. AI 초안 생성 성공은 사람 승인이 아니다. Queue 승인도 즉시 게시가 아니다.

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

## 고정 원칙

- 공개 자료라고 무조건 수집·복제·상업 재사용 가능한 것으로 보지 않는다.
- DCInside / Blind 및 약관 미확인 폐쇄형 커뮤니티는 자동 크롤링하지 않는다.
- NAVER 뉴스/블로그/카페 검색은 공식 API가 반환한 메타데이터/짧은 패시지만 저장하며 본문 재사용 권리로 보지 않는다.
- Search Trend/Google Trends/YouTube 인기 메타데이터는 발견 신호이지 사실 검증이 아니다.
- 사용자 직접 제보도 검증 전에는 사실로 확정하지 않는다.
- RED 소스 원문 URL은 AI 조사 입력에서 제거하고 독립 공개 출처로 조사한다.
- 원문 전체/댓글 묶음/타인 완성 영상·짤을 말투만 바꿔 게시하지 않는다.
- 자동수집 후보에 근거 없는 점수를 만들지 않는다.
- 유사 토픽 결과는 자동 merge/delete하지 않는다.
- 일반인의 개인정보·초상·범죄/불륜/갑질 등 주장은 보수적으로 다룬다.
- Safety Gate UNKNOWN/BLOCK이 있으면 게시 승인 불가.
- 승인 이후 초안/검토 상태가 바뀌면 기존 게시 승인을 무효화한다.
- 성과가 좋다는 이유로 검증/안전 기준을 낮추지 않는다.
- 플랫폼 정책은 실제 연결/확장 전 최신 공식 문서를 다시 확인한다.

## 다음 구현 우선순위

현재 작업은 사용자 검수 없이 누적된 기능의 안정화다. `docs/AUDIT_2026-09-18.md`와 `00_START_HERE/NEXT_RUN_HANDOFF.md`를 따른다.

- 런타임은 Node.js 24 이상이다. `node:sqlite`를 사용한다.
- `npm run check`는 app/scripts/test의 모든 JS 문법과 모든 `test/*.test.mjs`를 실행한다. 새 테스트를 수동 목록에 추가할 필요가 없다.
- JSON/SQLite 및 account/hypothesis/variant 필드는 이미 구현되어 있으므로 새 기능처럼 중복 구현하지 않는다.
- 다음 우선순위는 실제 브라우저 제작·복원 검수와 Source Package에서 04 검수로 이어지는 명시적 자산 전달이다.
- 임의로 후보를 추가 수집하거나 실제 계정을 게시 테스트에 사용하지 않는다. 현재 사용자의 작업 범위를 먼저 따른다.
- 테스트 더블, DOM 핸들러 테스트, 실제 브라우저 테스트, 외부 플랫폼 성공을 구분한다.

## 완료 기준

fake success 금지.

- 키가 없으면 `미설정` / 503으로 명확히 표시한다.
- 외부 API가 실제 호출되지 않았으면 실제 게시/실제 AI 성공으로 적지 않는다.
- 구현은 GitHub Actions syntax/regression + local smoke test를 통과해야 한다.
- 실제 플랫폼 E2E는 성공 ID/응답/성과 데이터가 있어야 성공으로 기록한다.
