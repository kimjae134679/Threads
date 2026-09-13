# Threads — AI Content Monetization Lab

AI로 **화제 탐지 → 한국/글로벌 자료 보강 → 조사 → 원본성 있는 멀티플랫폼 초안 → 권리/안전 검토 → 사람 승인 → 게시 → 성과 학습**을 반복하는 콘텐츠 수익화 프로젝트입니다.

남의 인기글을 대량 복사하는 봇이 아니라, 빠르게 좋은 소재를 발견하고 검증한 뒤 각 플랫폼에 맞는 자체 콘텐츠로 바꾸고 실제 성과로 다음 판단을 개선하는 시스템을 목표로 합니다.

## 현재 상태

실행형 `Trend Inbox MVP`가 있으며 Threads 텍스트 게시와 성과 실험까지 연결되어 있습니다.

현재 구현:

- Google Trends KR Trending Now RSS
- YouTube Data API KR 인기 메타데이터
- NAVER API HUB 뉴스 / 블로그 / 카페글 검색
- NAVER Search Trend 30일 상대지수
- 직접 URL / 메모 입력
- DCInside / Blind 자동수집 차단
- GREEN / YELLOW / RED 소스 위험도
- 사람 신호 평가와 초기 점수
- canonical URL / 관련 URL / 제목 유사도 기반 유사 토픽 묶기
- 구조화 Research Bundle
- 선택적 OpenAI Responses API + web search 기반 AI 조사
- AI 조사 후에도 사람 검토 완료 필수
- Draft Studio: Threads / Shorts·Reels·TikTok / Instagram Carousel / Blog / YouTube Long
- Rights / Safety Gate: 사실·권리·개인정보·명예훼손·플랫폼 정책
- 게시 승인 Queue
- 승인 후 내용 변경 시 승인 자동 무효화
- 선택적 Threads 공식 API 텍스트 게시
- Threads Insights 회수
- Experiment Lab: 클릭/전환/실수익 수동 기록 + `LEARN / SCALE / KEEP / KILL`
- Experiment CSV 내보내기
- localStorage + 전체 JSON 백업/복원
- GitHub Actions 문법 검사 + 실제 로컬 서버 smoke test

상세 사용법은 [`app/README.md`](app/README.md)에 있습니다.

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

검사:

```bash
npm run check
```

## 선택적 연결

### YouTube

```powershell
$env:YOUTUBE_API_KEY="YOUR_KEY"
```

### NAVER API HUB

2026-07-31 이후 신규 신청은 NAVER API HUB 기준입니다.

```powershell
$env:NAVER_API_HUB_CLIENT_ID="YOUR_CLIENT_ID"
$env:NAVER_API_HUB_CLIENT_SECRET="YOUR_CLIENT_SECRET"
```

사용 endpoint:

```text
/search/v1/news
/search/v1/blog
/search/v1/cafearticle
/search-trend/v1/search
```

뉴스/블로그/카페 검색 결과는 제목·링크·짧은 검색 패시지만 저장합니다. 원문 재사용 권리가 생긴 것으로 취급하지 않습니다.

### OpenAI 조사 / 초안

```powershell
$env:OPENAI_API_KEY="YOUR_KEY"
```

기본 모델은 `gpt-5.6-luna`이며 필요하면 `OPENAI_MODEL`, `OPENAI_RESEARCH_MODEL`, `OPENAI_DRAFT_MODEL`로 변경합니다.

### Threads 공식 게시

```powershell
$env:THREADS_ACCESS_TOKEN="YOUR_THREADS_USER_ACCESS_TOKEN"
```

게시 권한:

```text
threads_basic
threads_content_publish
```

Insights:

```text
threads_manage_insights
```

설정: [`docs/THREADS_API_SETUP.md`](docs/THREADS_API_SETUP.md)

**API key / token / cookie / app secret은 GitHub에 커밋하지 않습니다.**

## 현재 데이터 흐름

```text
Google Trends ─────┐
YouTube API ───────┼─> Trend Inbox
직접 URL / 메모 ──┘       ↓
                      소스 위험 판정
                           ↓
                 유사 후보 / 토픽 묶기
                           ↓
          NAVER 뉴스·블로그·카페·트렌드 보강
                           ↓
                      사람 신호 평가
                           ↓
              AI 조사 또는 수동 조사
                           ↓
                    Research Bundle
                           ↓
                    사람 검토 완료
                           ↓
                    Draft Studio
                           ↓
                     사람 승인
                           ↓
                 Rights / Safety Gate
                           ↓
                    게시 승인 Queue
                           ↓
          [선택] Threads 공식 API 실제 게시
                           ↓
                    Threads Insights
                           ↓
                    Experiment Lab
                 LEARN / SCALE / KEEP / KILL
```

## 게시 안전장치

Threads 실제 게시 전 다음을 모두 요구합니다.

1. 후보 상태 `ready`
2. 점수 평가 완료
3. Research Bundle 사람 검토 완료
4. Draft Studio 사람 승인
5. Safety Gate 전 항목 검토 완료
6. `BLOCK` 없음
7. `WARN` 대응 메모 존재
8. 게시 승인 Queue 사람 승인
9. 승인 이후 초안/상태 변경 없음
10. Threads access token 연결
11. 실제 공개 게시 체크박스 + 마지막 확인

프로젝트는 Threads API의 자동 게시 지름길 대신 **컨테이너 생성 → 명시적 publish** 흐름을 사용합니다.

## Experiment Lab

게시 전 점수와 게시 후 성과를 분리합니다.

Threads 현재 지표:

```text
views
likes
replies
reposts
quotes
shares
```

파생 참여율:

```text
engagements = likes + replies + reposts + quotes + shares
engagement_rate = engagements / views
```

같은 플랫폼에서 성과가 있는 게시물이 5개 미만이면 `LEARN`으로 두고 자동 성공/실패 판정을 하지 않습니다.

5개 이상부터:

```text
performance_index = 조회수 백분위 * 0.55 + 참여율 백분위 * 0.45

상위 25%   SCALE
하위 25%   KILL
그 사이    KEEP
```

클릭/전환/실수익은 실제 값이 있을 때만 사람이 입력하고, 자동 판정은 수동 override할 수 있습니다.

상세: [`docs/EXPERIMENT_LAB.md`](docs/EXPERIMENT_LAB.md)

## 핵심 원칙

1. **원본성 우선** — 자막·크롭·속도 변경 수준의 저가치 재사용을 기본 전략에서 제외합니다.
2. **소스와 결과물 분리** — 소스는 검증용, 게시물은 자체 문장·해설·구조·시각물로 새로 만듭니다.
3. **허용된 수집만** — 공식 API/RSS/직접 링크/라이선스 자료를 우선합니다.
4. **사람 승인 유지** — AI 조사나 초안이 성공해도 자동 게시하지 않습니다.
5. **한 번 조사하고 여러 포맷으로** — 같은 Research Bundle을 플랫폼별로 다르게 변환합니다.
6. **실제 성과로 학습** — 조회뿐 아니라 참여·클릭·전환·수익까지 기록합니다.

## 문서

- [`docs/RESEARCH_2026-09.md`](docs/RESEARCH_2026-09.md) — 시장/플랫폼 조사
- [`docs/PLATFORM_MATRIX.md`](docs/PLATFORM_MATRIX.md) — 플랫폼 역할·수익·정책 차이
- [`docs/SOURCE_POLICY.md`](docs/SOURCE_POLICY.md) — 소스 사용 기준
- [`docs/SOURCE_REGISTRY.md`](docs/SOURCE_REGISTRY.md) — 실제 connector / GREEN·YELLOW·RED 기준
- [`docs/CONTENT_PIPELINE.md`](docs/CONTENT_PIPELINE.md) — 제작 파이프라인
- [`docs/EXECUTION_PLAN_30D.md`](docs/EXECUTION_PLAN_30D.md) — 초기 검증 계획
- [`docs/THREADS_API_SETUP.md`](docs/THREADS_API_SETUP.md) — Threads 게시/Insights
- [`docs/EXPERIMENT_LAB.md`](docs/EXPERIMENT_LAB.md) — 성과 판정 모델
- [`AGENTS.md`](AGENTS.md) — AI/Codex 작업 규칙

## 다음 우선순위

1. 실제 Threads 계정에서 1~3건 텍스트 게시 E2E 검증
2. 실제 Insights 응답 형태 검증
3. 최소 5건 이상 실험 후 Experiment Lab 초기 가중치/경계 보정
4. 추가 허용 source connector 확장
5. 이미지/영상 자체 제작 파이프라인
6. Instagram / YouTube 등 다른 공식 게시·성과 adapter
7. localStorage를 넘어 계정/서버 DB 동기화

## 추천 초기 콘텐츠 축

- **Hot / Issue** — 오늘의 화제, AI/신제품/인터넷 이슈, 왜 뜨는지 설명
- **Internet Story / Culture** — 커뮤니티·인터넷 사연을 원문 복제가 아니라 익명화·독립 검증·재구성
- **Useful / Product / Money** — 앱/서비스/AI 도구/가격·기능 비교 등 검색·제휴 수익과 연결하기 쉬운 콘텐츠

수집 엔진은 공유하되 서로 너무 다른 주제를 한 계정에 무작정 섞지 않습니다.
