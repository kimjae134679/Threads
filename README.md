# Threads — AI Content Monetization Lab

AI를 이용해 **화제 탐지 → 조사 → 자체 해설/재구성 → 멀티플랫폼 초안 → 권리/안전 검토 → 사람 승인 → 게시 → 성과 측정**을 반복하는 콘텐츠 수익화 프로젝트입니다.

단순 복사·재업로드 공장이 아니라, 같은 조사 재료를 각 플랫폼에 맞는 **원본성 있는 콘텐츠**로 바꾸는 시스템을 목표로 합니다.

## 현재 상태

조사 문서 단계가 아니라 실행형 **Trend Inbox MVP**가 있으며, Threads 텍스트 게시까지 전체 흐름이 코드로 연결되어 있습니다.

현재 구현:

- Google Trends KR `Trending Now` RSS 후보 수집
- 선택적 YouTube Data API `mostPopular` KR 메타데이터 수집
- 직접 URL / 메모 입력
- DCInside / Blind 자동수집 차단 판정
- GREEN / YELLOW / RED 소스 위험도
- 사람 평가 후 초기 점수 계산
- canonical URL / 관련 출처 / 제목 유사도 기반 유사 토픽 묶기
- 구조화 Research Bundle 저장
- 선택적 OpenAI Responses API + web search 기반 AI 조사
- AI 조사 결과는 자동 승인하지 않고 `조사 중`으로 저장
- 사람 검토 완료 전 제작 후보 승격 차단
- Draft Studio: Threads / Shorts·Reels·TikTok / Instagram Carousel / Blog / YouTube Long
- 초안 편집 저장 + 사람 승인
- Rights / Safety Gate: 사실·권리·개인정보·명예훼손·플랫폼 정책
- 게시 승인 Queue
- 승인 이후 내용 변경 시 게시 승인 무효화
- 선택적 Threads 공식 API 텍스트 게시
- 게시 후 Threads Insights 회수
- localStorage 저장 + JSON 백업/복원
- GitHub Actions 문법 검사 + 로컬 서버 smoke test

실행 화면과 상세 사용법은 [`app/README.md`](app/README.md)에 있습니다.

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

### YouTube 인기 메타데이터

```powershell
$env:YOUTUBE_API_KEY="YOUR_KEY"
```

### OpenAI AI 조사 / 초안

```powershell
$env:OPENAI_API_KEY="YOUR_KEY"
```

기본 모델은 비용을 낮추기 위해 `gpt-5.6-luna`이며 `OPENAI_MODEL`, `OPENAI_RESEARCH_MODEL`, `OPENAI_DRAFT_MODEL`로 변경 가능합니다.

### Threads 공식 게시

```powershell
$env:THREADS_ACCESS_TOKEN="YOUR_THREADS_USER_ACCESS_TOKEN"
```

필요 권한:

```text
threads_basic
threads_content_publish
```

Insights까지 쓰려면:

```text
threads_manage_insights
```

상세 설정은 [`docs/THREADS_API_SETUP.md`](docs/THREADS_API_SETUP.md)를 봅니다.

**API key / token / cookie / app secret은 GitHub에 커밋하지 않습니다.**

## 현재 데이터 흐름

```text
Google Trends RSS ─┐
YouTube API ───────┼─> Trend Inbox
직접 URL / 메모 ──┘       ↓
                      소스 위험 판정
                           ↓
                 유사 후보 / 토픽 묶기
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
```

Google Trends와 YouTube 인기 메타데이터는 **소재 발견 신호**이지 사실관계나 자산 사용권을 증명하는 자료가 아닙니다.

## 게시 안전장치

Threads 실제 게시 버튼이 나오기 전 다음을 모두 통과해야 합니다.

1. 후보 상태 `ready`
2. 점수 평가 완료
3. Research Bundle 사람 검토 완료
4. Draft Studio 사람 승인
5. Safety Gate의 모든 항목 검토 완료
6. `BLOCK` 없음
7. `WARN` 대응 메모 존재
8. 게시 승인 Queue에서 사람 승인
9. 승인 이후 초안/상태 변경 없음
10. Threads access token 연결

실제 게시 시에도 다시 대상 `@username`과 읽기 전용 최종 문안을 보여주고 체크박스 + 마지막 확인을 거칩니다.

프로젝트는 Threads API의 `auto_publish_text`를 사용하지 않고 **컨테이너 생성 → 명시적 publish** 2단계를 사용합니다.

## 핵심 원칙

1. **원본성 우선** — 남의 글/영상에 자막만 붙이거나 속도만 바꾸는 식의 저가치 재사용은 기본 전략에서 제외합니다.
2. **소스와 결과물을 분리** — 소스는 참고·검증용으로 저장하고, 게시물은 자체 문장·해설·구조·시각물로 새로 만듭니다.
3. **허용된 수집 방식만 사용** — 공식 API, RSS, 공개 피드, 직접 입력한 링크 등 허용된 경로를 우선합니다.
4. **사람 승인 단계 유지** — AI 조사/초안이 성공해도 자동으로 검토 완료나 게시 승인 상태가 되지 않습니다.
5. **한 번 조사하고 여러 번 활용** — 한 주제를 Threads 글, 블로그, Shorts/Reels/TikTok 스크립트, 장문 영상으로 변환합니다.
6. **성과 기반 실험** — 조회수뿐 아니라 저장/공유/댓글/팔로우/클릭/광고/제휴/협찬/전환을 추적합니다.

## 문서

- [`docs/RESEARCH_2026-09.md`](docs/RESEARCH_2026-09.md) — 2026-09 시장/플랫폼 조사
- [`docs/PLATFORM_MATRIX.md`](docs/PLATFORM_MATRIX.md) — 플랫폼별 역할·수익·자동화·정책 차이
- [`docs/SOURCE_POLICY.md`](docs/SOURCE_POLICY.md) — 커뮤니티/뉴스/영상 소스 사용 기준
- [`docs/SOURCE_REGISTRY.md`](docs/SOURCE_REGISTRY.md) — GREEN/YELLOW/RED 수집 레지스트리
- [`docs/CONTENT_PIPELINE.md`](docs/CONTENT_PIPELINE.md) — 제작·자동화 파이프라인
- [`docs/EXECUTION_PLAN_30D.md`](docs/EXECUTION_PLAN_30D.md) — 30일 검증 계획
- [`docs/THREADS_API_SETUP.md`](docs/THREADS_API_SETUP.md) — Threads 공식 게시/Insights 연결
- [`AGENTS.md`](AGENTS.md) — AI/Codex 작업 규칙

## 다음 구현 우선순위

1. 실제 운영할 뉴스/RSS/API 소스 2~4개 추가
2. 게시 결과/Insights를 플랫폼·포맷별 실험 데이터로 정규화
3. `KEEP / KILL / SCALE` 대시보드
4. Threads 실제 계정으로 소량 E2E 검증
5. 검증 후 Instagram/YouTube 등 다른 공식 게시/성과 API 확대
6. 서버 DB/계정 동기화 — localStorage 단일 PC 한계를 제거

## 추천 초기 콘텐츠 축

- **Hot / Issue** — 오늘의 화제, AI/신제품/인터넷 이슈, 왜 뜨는지 설명
- **Internet Story / Culture** — 커뮤니티·인터넷 사연을 원문 복제가 아니라 익명화·검증·재구성
- **Useful / Product / Money** — 앱/서비스/AI 도구/가격·기능 비교처럼 제휴·검색 수익으로 이어지기 쉬운 콘텐츠

수집 엔진은 공유하되 서로 너무 다른 주제를 한 계정에 전부 섞지 않습니다.

## 중요한 전제

이 프로젝트의 경쟁력은 `얼마나 많이 긁어오느냐`가 아니라 **얼마나 빨리 좋은 소재를 발견해서 검증하고, 각 플랫폼에서 살아남는 원본 콘텐츠로 바꾸고, 실제 성과를 학습하느냐**에 둡니다.
