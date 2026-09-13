# Threads — AI Content Monetization Lab

AI를 이용해 **화제 탐지 → 조사 → 자체 해설/재구성 → 멀티플랫폼 발행 → 성과 측정 → 개선**을 반복하는 콘텐츠 수익화 프로젝트입니다.

단순 복사·재업로드 공장이 아니라, 같은 조사 재료를 각 플랫폼에 맞는 **원본성 있는 콘텐츠**로 바꾸는 시스템을 목표로 합니다.

## 현재 상태

조사 문서 단계에서 끝나지 않고 첫 실행형 MVP인 **Trend Inbox**가 들어가 있습니다.

현재 실제 동작:

- Google Trends KR `Trending Now` RSS 후보 수집
- 선택적 YouTube Data API `mostPopular` KR 메타데이터 수집
- 직접 URL / 메모 입력
- DCInside / Blind 자동수집 차단 판정
- GREEN / YELLOW / RED 소스 위험도
- 사람 평가 후 초기 점수 계산
- 미평가 자동수집 후보의 제작 승격 차단
- 플랫폼 추천
- Research Bundle용 AI 프롬프트 생성
- 조사 대기 / 제작 후보 / 패스 관리
- localStorage 저장 + JSON 백업/복원

실행 화면은 [`app/`](app/)에 있습니다.

## 바로 실행

Node.js 18 이상:

```bash
npm start
```

브라우저:

```text
http://127.0.0.1:4173/app/
```

별도 `npm install`은 필요하지 않습니다.

문법 검사:

```bash
npm run check
```

YouTube 연결은 선택 사항입니다. API 키를 저장소에 기록하지 않고 실행 환경에서만 넣습니다.

PowerShell:

```powershell
$env:YOUTUBE_API_KEY="YOUR_KEY"
npm start
```

자세한 실행법은 [`app/README.md`](app/README.md)를 봅니다.

## 목표

- Threads / Instagram / Reels / YouTube / Shorts / Blog / X 등 여러 채널을 하나의 콘텐츠 파이프라인으로 운영
- 최신 이슈, 트렌드, 커뮤니티 화제, 유머, 실용 정보 등 여러 포맷을 빠르게 실험
- AI는 조사·요약·각색·스크립트·제목·썸네일 문안·포맷 변환·성과 분석을 담당
- 게시 전 사실확인·저작권·개인정보·명예훼손·플랫폼 정책 위험을 자동/수동으로 검사
- 조회수만이 아니라 광고수익, 제휴, 협찬, 유입, 전환을 함께 추적

## 핵심 원칙

1. **원본성 우선** — 남의 글/영상에 자막만 붙이거나 속도만 바꾸는 식의 저가치 재사용은 기본 전략에서 제외합니다.
2. **소스와 결과물을 분리** — 소스는 참고·검증용으로 저장하고, 게시물은 자체 문장·해설·구조·시각물로 새로 만듭니다.
3. **허용된 수집 방식만 사용** — 공식 API, RSS, 공개 피드, 직접 입력한 링크 등 허용된 경로를 우선합니다.
4. **사람 승인 단계 유지** — 정치·사건사고·개인 폭로·커뮤니티 사연처럼 위험도가 높은 주제는 자동 발행하지 않습니다.
5. **한 번 조사하고 여러 번 활용** — 한 주제를 Threads 글, 블로그, Shorts/Reels 스크립트, 장문 영상으로 변환합니다.
6. **성과 기반 실험** — 주제/훅/길이/포맷/게시 시간별 성과를 저장해 다음 제작에 반영합니다.

## 조사/정책 문서

- [`docs/RESEARCH_2026-09.md`](docs/RESEARCH_2026-09.md) — 2026-09 기준 시장/플랫폼 조사
- [`docs/PLATFORM_MATRIX.md`](docs/PLATFORM_MATRIX.md) — 플랫폼별 역할·수익·자동화·정책 차이
- [`docs/SOURCE_POLICY.md`](docs/SOURCE_POLICY.md) — 커뮤니티/뉴스/영상 등 소스 사용 기준
- [`docs/SOURCE_REGISTRY.md`](docs/SOURCE_REGISTRY.md) — 실제 수집 후보와 GREEN/YELLOW/RED 초기 레지스트리
- [`docs/CONTENT_PIPELINE.md`](docs/CONTENT_PIPELINE.md) — 제작·자동화 파이프라인
- [`docs/EXECUTION_PLAN_30D.md`](docs/EXECUTION_PLAN_30D.md) — 30일 검증 계획
- [`AGENTS.md`](AGENTS.md) — AI/Codex 작업 규칙

## 현재 데이터 흐름

```text
Google Trends RSS ─┐
YouTube API ───────┼─> Trend Inbox
직접 URL / 메모 ──┘       ↓
                      소스 위험 판정
                           ↓
                      사람 신호 평가
                           ↓
                      초기 점수 계산
                           ↓
                      Research Bundle
                           ↓
                      조사 대기 / 제작 후보 / 패스
```

Google Trends와 YouTube 인기 메타데이터는 **소재 발견 신호**이지 사실관계나 자산 사용권을 증명하는 자료가 아닙니다.

## 다음 구현 우선순위

1. 허용된 뉴스/RSS/API 소스 추가
2. 여러 소스를 하나의 Topic으로 묶는 중복/클러스터링
3. Research Bundle 실제 AI 조사 연결
4. Draft Studio — Threads / Shorts / Reels / Blog 등 플랫폼별 서로 다른 초안
5. Human Approval Queue
6. Threads 공식 API 게시/Insights
7. 성과/수익 회수
8. 실제 데이터 기반 `KEEP / KILL / SCALE`

## 추천 초기 콘텐츠 축

- **Hot / Issue** — 오늘의 화제, AI/신제품/인터넷 이슈, 왜 뜨는지 설명
- **Internet Story / Culture** — 커뮤니티·인터넷 사연을 원문 복제가 아니라 익명화·검증·재구성
- **Useful / Product / Money** — 앱/서비스/AI 도구/가격·기능 비교처럼 제휴·검색 수익으로 이어지기 쉬운 콘텐츠

수집 엔진은 공유하되 서로 너무 다른 주제를 한 계정에 전부 섞지 않습니다.

## 중요한 전제

이 프로젝트의 경쟁력은 `얼마나 많이 긁어오느냐`가 아니라 **얼마나 빨리 좋은 소재를 발견해서 신뢰할 수 있고 재미있는 원본 콘텐츠로 바꾸느냐**에 둡니다.
