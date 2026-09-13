# AGENTS.md — Threads / AI Content Monetization Lab

이 저장소는 `많이 긁어서 많이 올리는 봇`이 아니라 **트렌드 탐지 → 검증 → 자체 콘텐츠 제작 → 사람 승인 → 공식 게시 → 성과 학습** 시스템을 만든다.

## 읽는 순서

1. 현재 채팅의 사용자 최신 지시
2. `README.md`
3. `app/README.md`
4. `docs/SOURCE_POLICY.md`
5. `docs/RESEARCH_2026-09.md`
6. `docs/CONTENT_PIPELINE.md`
7. `docs/PLATFORM_MATRIX.md`
8. `docs/THREADS_API_SETUP.md`
9. `docs/EXECUTION_PLAN_30D.md`

운영 허브를 함께 쓸 때는 `kimjae134679/project-operations-hub`의 최신 Governance/User Policies도 따른다.

## 현재 실행형 MVP

실행:

```text
npm start
http://127.0.0.1:4173/app/
```

검사:

```text
npm run check
```

GitHub Actions는 문법뿐 아니라 로컬 서버를 실제 기동해 health/connectors/static app/키 없는 API fail-closed를 smoke test한다.

### 주요 파일

```text
server.mjs                   로컬 API/static server
openai.mjs                   선택적 OpenAI AI 조사/초안
threads.mjs                  Threads 공식 게시/프로필/quota/insights
app/app.js                   Trend Inbox 핵심
app/youtube.js               YouTube 후보 수집
app/clustering.js            유사 토픽 묶기
app/research-bundle.js       조사 결과 저장 + 사람 검토 gate
app/ai-studio.js             AI 조사 / 멀티플랫폼 Draft Studio
app/safety-gate.js           Rights/Safety Gate + 게시 승인 Queue
app/approval-integrity.js    승인 이후 변경 시 게시 승인 무효화
app/threads-publisher.js     Threads 실제 게시 확인 UI + Insights
```

브라우저 저장:

```text
localStorage: threads_trend_inbox_v1
```

## 현재 연결

기본:
- Google Trends KR Trending Now RSS
- 수동 URL / 메모

선택:
- `YOUTUBE_API_KEY` → YouTube KR `mostPopular` 메타데이터
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
```

AI 조사 성공은 사람 검토 완료가 아니다.
AI 초안 생성 성공은 사람 승인이 아니다.
Queue 승인도 즉시 게시가 아니다.
실제 게시 버튼은 읽기 전용 최종 문안 + 대상 @username + 체크박스 + 마지막 확인을 거친다.

Threads 게시 구현은 `auto_publish_text`를 사용하지 않고 컨테이너 생성 → `threads_publish` 명시적 2단계를 쓴다.

## 고정 원칙

- 공개 자료라고 무조건 수집·복제·상업 재사용 가능한 것으로 보지 않는다.
- DCInside / Blind 및 약관 미확인 폐쇄형 커뮤니티는 자동 크롤링하지 않는다.
- RED 소스 원문 URL은 AI 웹 조사 입력에서 제거하고 독립 공개 출처로 조사한다.
- 원문 전체/댓글 묶음/타인 완성 영상·짤을 말투만 바꿔 게시하지 않는다.
- Google Trends/YouTube 인기 메타데이터는 발견 신호이지 사실 검증이 아니다.
- 자동수집 후보에 근거 없는 점수를 만들지 않는다.
- 유사 토픽 결과는 자동 merge/delete하지 않는다.
- 일반인의 개인정보·초상·범죄/불륜/갑질 등 주장은 보수적으로 다룬다.
- `reviewed` Research Bundle은 최소 whyNow + verified fact 1개 + source 1개를 요구한다.
- Safety Gate UNKNOWN/BLOCK이 있으면 게시 승인 불가.
- 승인 이후 초안/검토 상태가 바뀌면 기존 게시 승인을 무효화한다.
- X 수익 프로그램은 자동 생성/자동 게시 콘텐츠 제약을 고려해 사람 직접 게시 중심으로 둔다.
- 플랫폼 정책은 바뀔 수 있으므로 실제 확장 전 최신 공식 문서를 다시 확인한다.

## 다음 구현 우선순위

1. 실제 운영할 뉴스/RSS/API source 2~4개 추가
2. publication / insight 데이터를 공통 Experiment 레코드로 정규화
3. `KEEP / KILL / SCALE` 성과 대시보드
4. Threads 실제 계정으로 소량 E2E 검증
5. Threads 게시 오류/토큰 만료/권한 부족 UX 강화
6. 이후 Instagram/YouTube 등 공식 게시/성과 API 확장
7. localStorage를 서버 DB/계정 동기화로 교체
8. 실제 성과 기반 trend score / angle / prompt 개선

## 완료 기준

fake success 금지.

- 키가 없으면 `미설정` / 503으로 명확히 표시한다.
- 외부 API가 실제 호출되지 않았으면 실제 게시/실제 AI 성공으로 적지 않는다.
- 구현은 최소한 GitHub Actions syntax + local smoke test를 통과해야 한다.
- 실제 플랫폼 연결은 성공 ID/응답/성과 데이터가 있어야 E2E 성공으로 기록한다.
