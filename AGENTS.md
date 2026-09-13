# AGENTS.md — Threads / AI Content Monetization Lab

이 저장소는 `많이 긁어서 많이 올리는 봇`이 아니라 **트렌드 탐지 → 검증 → 자체 콘텐츠 제작 → 사람 승인 → 공식 게시 → 실제 성과 학습** 시스템을 만든다.

## 읽는 순서

1. 현재 채팅의 사용자 최신 지시
2. `README.md`
3. `app/README.md`
4. `docs/SOURCE_POLICY.md`
5. `docs/SOURCE_REGISTRY.md`
6. `docs/RESEARCH_2026-09.md`
7. `docs/CONTENT_PIPELINE.md`
8. `docs/PLATFORM_MATRIX.md`
9. `docs/THREADS_API_SETUP.md`
10. `docs/EXPERIMENT_LAB.md`
11. `docs/EXECUTION_PLAN_30D.md`

운영 허브를 함께 쓸 때는 `kimjae134679/project-operations-hub`의 최신 Governance/User Policies도 따른다.

## 실행 / 검증

```text
npm start
http://127.0.0.1:4173/app/

npm run check
```

`npm run check`는 JavaScript 문법 + Experiment scoring 회귀 테스트를 수행한다. GitHub Actions는 여기에 실제 로컬 서버 기동, 주요 브라우저 script 로드, keyless connector fail-closed까지 smoke test한다.

## 현재 주요 파일

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
- `YOUTUBE_API_KEY` → YouTube KR `mostPopular` 메타데이터
- `NAVER_API_HUB_CLIENT_ID` + `NAVER_API_HUB_CLIENT_SECRET` → 뉴스/블로그/카페/검색트렌드 보강
- `OPENAI_API_KEY` → Responses API + web search AI 조사 / Draft Studio
- `THREADS_ACCESS_TOKEN` → Threads 공식 텍스트 게시 / Insights

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
- 판정 로직 변경 시 `test/experiment-model.test.mjs`도 갱신하고 `npm run check`를 통과한다.

## 고정 원칙

- 공개 자료라고 무조건 수집·복제·상업 재사용 가능한 것으로 보지 않는다.
- DCInside / Blind 및 약관 미확인 폐쇄형 커뮤니티는 자동 크롤링하지 않는다.
- NAVER 뉴스/블로그/카페 검색은 공식 API가 반환한 메타데이터/짧은 패시지만 저장하며 본문 재사용 권리로 보지 않는다.
- Search Trend/Google Trends/YouTube 인기 메타데이터는 발견 신호이지 사실 검증이 아니다.
- RED 소스 원문 URL은 AI 조사 입력에서 제거하고 독립 공개 출처로 조사한다.
- 원문 전체/댓글 묶음/타인 완성 영상·짤을 말투만 바꿔 게시하지 않는다.
- 자동수집 후보에 근거 없는 점수를 만들지 않는다.
- 유사 토픽 결과는 자동 merge/delete하지 않는다.
- 일반인의 개인정보·초상·범죄/불륜/갑질 등 주장은 보수적으로 다룬다.
- Safety Gate UNKNOWN/BLOCK이 있으면 게시 승인 불가.
- 승인 이후 초안/검토 상태가 바뀌면 기존 게시 승인을 무효화한다.
- 플랫폼 정책은 실제 연결/확장 전 최신 공식 문서를 다시 확인한다.

## 다음 구현 우선순위

1. 실제 Threads 계정에서 1~3건 텍스트 게시 E2E 검증
2. 실제 Insights 응답 형태와 저장 구조 검증
3. 실제 5건 이상 결과로 Experiment Lab 초기 가중치/경계 보정
4. 추가 허용 source connector 확장
5. 이미지/영상 자체 제작 파이프라인
6. Instagram/YouTube 등 공식 게시/성과 adapter
7. localStorage → 서버 DB/계정 동기화
8. 실제 성과를 trend score / angle / prompt 개선에 연결

## 완료 기준

fake success 금지.

- 키가 없으면 `미설정` / 503으로 명확히 표시한다.
- 외부 API가 실제 호출되지 않았으면 실제 게시/실제 AI 성공으로 적지 않는다.
- 구현은 GitHub Actions syntax/regression + local smoke test를 통과해야 한다.
- 실제 플랫폼 E2E는 성공 ID/응답/성과 데이터가 있어야 성공으로 기록한다.
