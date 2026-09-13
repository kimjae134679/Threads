# Threads — AI Content Monetization Lab

AI로 **소재 발견 → 검증·점수 → 콘텐츠 제작 → 검수·게시 → 계정별 성과 실험**을 반복하는 콘텐츠 수익화 프로젝트입니다.

> 처음 들어왔다면 **[`00_START_HERE/`](00_START_HERE/)** 부터 읽습니다.

## 역할별 작업 구역

```text
00_START_HERE                 전체 구조 / 어디서 시작할지
01_DISCOVERY                  소재 검색 / 사용자 제보 정리
02_EDITORIAL_SCORING          조사 / 사실 검증 / 정리 / 점수 / 각도
03_PRODUCTION                 게시글 / 영상 / 블로그 등 실제 콘텐츠 제작
04_REVIEW_PUBLISH             권리·안전 검수 / 사람 승인 / 실제 게시
05_EXPERIMENTS_ACCOUNTS       여러 계정 실험 / Insights / KEEP·KILL·SCALE
```

| 역할 | 핵심 질문 | 최종 산출물 |
|---|---|---|
| [01 DISCOVERY](01_DISCOVERY/) | 지금 볼 만한 소재가 무엇인가? | Candidate Packet |
| [02 EDITORIAL & SCORING](02_EDITORIAL_SCORING/) | 사실인가, 만들 가치가 있는가, 어떤 각도가 좋은가? | Approved Content Brief |
| [03 PRODUCTION](03_PRODUCTION/) | 이걸 플랫폼에 맞는 콘텐츠로 어떻게 만들까? | Draft Package |
| [04 REVIEW & PUBLISH](04_REVIEW_PUBLISH/) | 안전하고 정확하며 실제 게시해도 되는가? | Publication Record |
| [05 EXPERIMENTS & ACCOUNTS](05_EXPERIMENTS_ACCOUNTS/) | 어떤 계정/주제/포맷이 실제로 잘 되는가? | Experiment Result |

파트 사이의 필드/되돌림 규칙은 [`docs/HANDOFF_CONTRACTS.md`](docs/HANDOFF_CONTRACTS.md)에 고정합니다.

## 여러 계정 운영 원칙

계정 여러 개를 두는 방향은 맞습니다. 다만 **같은 콘텐츠를 여러 계정에 복붙하는 구조가 아니라, 서로 다른 전략을 동시에 시험하는 구조**로 운영합니다.

예:

```text
TH-A  Hot / Issue
      빠른 이슈 + 왜 뜨는지 설명

TH-B  Useful / Product / Money
      AI 도구 / 앱 / 제품 비교

TH-C  Internet Story / Culture
      인터넷 사연을 검증·익명화·재구성
```

각 계정은 `account_id + positioning + target_audience + hypothesis + primary_metric + test_window + scale/kill rule`을 가집니다.

계정 등록 템플릿: [`05_EXPERIMENTS_ACCOUNTS/ACCOUNT_REGISTRY_TEMPLATE.md`](05_EXPERIMENTS_ACCOUNTS/ACCOUNT_REGISTRY_TEMPLATE.md)

핵심은:

```text
여러 계정으로 서로 다른 가설을 시험
→ 실제 게시 데이터 축적
→ 잘 되는 가설 SCALE
→ 애매한 것은 KEEP/재시험
→ 안 되는 가설 KILL/변형
→ 학습을 다시 소재·평가·제작에 반영
```

계정 추가는 플랫폼 정책 회피용으로 사용하지 않습니다.

---

## 현재 실행형 MVP

현재 Trend Inbox 앱에서 다음이 연결되어 있습니다.

- Google Trends KR Trending Now RSS
- YouTube Data API KR 인기 메타데이터
- NAVER API HUB 뉴스 / 블로그 / 카페글 검색
- NAVER Search Trend 상대지수
- 직접 URL / 사용자 메모 입력
- GREEN / YELLOW / RED 소스 위험도
- 유사 토픽 묶기
- 사람 평가 / 제작 우선순위 점수
- 구조화 Research Bundle
- 선택적 OpenAI 웹 검색 조사
- Draft Studio: Threads / Shorts·Reels·TikTok / Instagram Carousel / Blog / YouTube Long
- Rights / Safety Gate
- 사람 게시 승인 Queue
- 선택적 Threads 공식 API 게시
- Threads Insights 회수
- Experiment Lab: 클릭 / 전환 / 실수익 + LEARN / KEEP / KILL / SCALE
- JSON 백업/복원 + Experiment CSV
- 회귀 테스트 + GitHub Actions 서버 smoke test

## 바로 실행

Node.js 18 이상:

```bash
npm start
```

브라우저:

```text
http://127.0.0.1:4173/app/
```

검사:

```bash
npm run check
```

별도 `npm install`은 필요하지 않습니다.

## 선택적 연결

```text
YOUTUBE_API_KEY
NAVER_API_HUB_CLIENT_ID
NAVER_API_HUB_CLIENT_SECRET
OPENAI_API_KEY
THREADS_ACCESS_TOKEN
```

API key / token / cookie / app secret은 GitHub에 커밋하지 않습니다.

Threads 게시 권한:

```text
threads_basic
threads_content_publish
threads_manage_insights   # Insights 사용 시
```

설정: [`docs/THREADS_API_SETUP.md`](docs/THREADS_API_SETUP.md)

## 전체 데이터 흐름

```text
[01 DISCOVERY]
Google Trends / YouTube / NAVER / 직접 URL / 사용자 제보
        ↓ Candidate Packet

[02 EDITORIAL & SCORING]
독립 조사 / 사실 확인 / 위험 메모 / 점수 / 콘텐츠 각도
        ↓ Approved Content Brief

[03 PRODUCTION]
Threads / Short Video / Carousel / Blog / YouTube 제작
        ↓ Draft Package

[04 REVIEW & PUBLISH]
Facts / Rights / Privacy / Defamation / Platform Policy
사람 승인 → 공식 API 게시
        ↓ Publication Record

[05 EXPERIMENTS & ACCOUNTS]
Insights + 클릭 + 전환 + 실수익
LEARN / KEEP / KILL / SCALE
        ↓
다음 소재·각도·포맷·계정 가설에 피드백
```

## 역할 충돌 방지 규칙

- `01`은 소재를 찾지만 최종 점수를 확정하지 않습니다.
- `02`가 사실/출처/점수의 소유자입니다.
- `03`은 검증된 사실의 **표현과 포맷만** 바꾸며 새 사실을 추가하지 않습니다.
- `04`만 실제 게시 승인을 내립니다.
- `05`만 게시 후 성과와 계정 전략을 판정합니다.
- 뒤 파트에서 오류를 발견하면 조용히 수정하지 않고 소유 파트로 되돌립니다.

## 게시 안전장치

실제 Threads 게시 전:

1. 후보 `ready`
2. 점수 평가 완료
3. Research Bundle 사람 검토 완료
4. Draft Studio 사람 승인
5. Safety Gate 전 항목 검토
6. BLOCK 없음
7. WARN 대응 메모
8. 게시 승인 Queue 사람 승인
9. 승인 이후 변경 없음
10. 실제 계정/최종 문안 재확인
11. 실제 공개 게시 체크 + 마지막 확인

## Experiment Lab

게시 전 점수와 게시 후 성과는 분리합니다.

현재 초기 자동판정:

```text
같은 플랫폼에서 views > 0 표본 < 5  → LEARN

5건 이상:
performance_index
= 조회 백분위 * 0.55
+ 참여율 백분위 * 0.45

상위 25% → SCALE
하위 25% → KILL
나머지   → KEEP
```

이는 초기 상대 비교 규칙입니다. 실제 클릭·전환·수익이 쌓이면 비즈니스 지표를 별도로 우선 확인합니다.

상세: [`docs/EXPERIMENT_LAB.md`](docs/EXPERIMENT_LAB.md)

## 소스/원본성 원칙

- 공개 자료라고 자동 수집·복제·상업 재사용 가능하다고 보지 않습니다.
- DCInside / Blind 및 약관 미확인 폐쇄형 커뮤니티는 자동 크롤링하지 않습니다.
- 뉴스/블로그/카페 검색은 사실 탐색용이며 원문 재사용 권리를 의미하지 않습니다.
- 사용자 직접 제보도 02에서 독립 검증합니다.
- 남의 글/영상/짤을 조금 수정해서 재업로드하는 것을 기본 전략으로 사용하지 않습니다.
- 여러 계정을 정책 회피/제재 회피 수단으로 사용하지 않습니다.

## 주요 문서

- [`00_START_HERE/`](00_START_HERE/) — 가장 먼저 볼 운영 관제판
- [`docs/HANDOFF_CONTRACTS.md`](docs/HANDOFF_CONTRACTS.md) — 역할 간 입력/출력 계약
- [`docs/SOURCE_POLICY.md`](docs/SOURCE_POLICY.md) — 소스 사용 기준
- [`docs/SOURCE_REGISTRY.md`](docs/SOURCE_REGISTRY.md) — 실제 connector / 위험도
- [`docs/RESEARCH_2026-09.md`](docs/RESEARCH_2026-09.md) — 시장/플랫폼 조사
- [`docs/PLATFORM_MATRIX.md`](docs/PLATFORM_MATRIX.md) — 플랫폼 역할/정책
- [`docs/CONTENT_PIPELINE.md`](docs/CONTENT_PIPELINE.md) — 제작 파이프라인
- [`docs/THREADS_API_SETUP.md`](docs/THREADS_API_SETUP.md) — Threads API
- [`docs/EXPERIMENT_LAB.md`](docs/EXPERIMENT_LAB.md) — 성과 모델
- [`AGENTS.md`](AGENTS.md) — AI/Codex 작업 규칙

## 지금부터의 우선순위

1. 실제 계정들을 `05` Registry에 등록
2. 계정별 서로 다른 가설/콘텐츠 축 확정
3. 실제 Threads 계정 1~3개로 소량 E2E 게시
4. 계정별 최소 표본을 쌓고 Experiment Lab 검증
5. 잘 되는 전략만 SCALE
6. 이미지/영상 자체 제작 파이프라인 강화
7. Instagram / YouTube 등 공식 게시·성과 adapter 확장
8. localStorage → 서버 DB/다계정 동기화
