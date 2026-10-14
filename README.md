# Threads — AI Content Monetization Lab

AI로 **소재 발견 → 검증·점수 → 콘텐츠 제작 → 검수·게시 → 계정별 성과 실험**을 반복하는 콘텐츠 수익화 프로젝트입니다.

> 처음 들어왔다면 **[`00_START_HERE/`](00_START_HERE/)** 부터 읽습니다.

## 운영 규칙 지도

현재 법칙은 [AGENTS](AGENTS.md), 짧은 분야별 지도는 [00_START_HERE](00_START_HERE/README.md), 실행/경로는 [사용 안내](프로젝트_사용안내.md), 실제 완료 집계·미확인 소통은 [현재 인수인계](00_START_HERE/NEXT_RUN_HANDOFF.md)를 따릅니다. 세부 규칙을 여기 다시 복제하지 않습니다. 아래 구현 기능 설명은 신규 수집·계정/게시·예약 실행 권한이 아닙니다. 컴퓨터 종료 요청은 이번 작업에서 취소됐으며 영구 전역 금지로 일반화하지 않습니다.

## 통합 프로젝트 실행 · 단일 자료 TXT

이 통합 작업의 코드와 공개 가능한 후보는 Git에, 원자료·이미지·운영/평가/provider 기록·설치 사본은 같은 루트의 `local-private/`에 둡니다. 해당 폴더와 `upload-studio/.local/`은 Git에서 제외합니다. 원본 파일을 삭제하거나 과거 승인/예약을 새로 활성화하지 않습니다.

이관 원본의 전수 SHA/CAS 확인과 대상 검증이 끝난 뒤 프로젝트 루트에서 실행합니다:
```powershell
powershell -NoProfile -File upload-studio/START.ps1
# 브라우저를 열지 않고 서버만 확인: START.ps1 -CheckOnly
# 로컬 서버만 중단: powershell -NoProfile -File upload-studio/STOP.ps1
```
또는 `node upload-studio/server.mjs --project-root .`입니다. 단일 서버의 검토 화면(`/`), 자료 전체 목록(`/materials/`), 같은 버전의 이미지 전체 보기(`/viewer/`)를 사용합니다. 점수·메모·읽은 장은 글 ID/제작 버전/검토 회차로 묶이며 게시 최종 판정과 별도입니다. 다른 버전 기록은 과거 영역으로 표시합니다. 저장 실패/버전 변경 때 현재 편집 화면을 보존합니다. 실제 게시·외부 예약은 차단되고, 과거 pending 작업/자동 제작 연결은 시작 시 재개하지 않습니다. **완료 뒤 결과만 보고하며 컴퓨터 종료/종료 예약을 하지 않습니다.**

사람이 읽는 `자료.txt` 한 파일에는 `원문링크 -`, 표시 `제목 -`, `내용 -`, 양쪽 플랫폼 전체 `게시문안 -`과 해시태그를 함께 넣습니다. 별도 줄의 `==============================` 및 `프로그램용 데이터들` 뒤 JSON에는 원제·정확 ID/버전·원문/댓글·이미지 순서/해시·권리/판정·unknown 필드를 보존합니다. 명시 요약/보존 기록/본문 미확보는 전문 입력으로 승격하지 않습니다. BOM/CRLF/본문 속 헤더는 보존하고 손상 자료는 중단합니다. 기존 분리 입력은 호환 읽기/원본 이력으로 남기고 신규 출력은 한 TXT를 사용합니다. 현재 제작본의 원문은 같은 ID·버전·현재 사진 구성과 원 ZIP SHA가 일치하는 보존 source-bundle만 연결합니다. 앞 내용은 원 ZIP의 선별 기록임을 표시하고 원 HTML·댓글·매체 전체 바이트/순서는 뒤에 보존하며, 16MiB를 넘는 TXT는 본문을 자르지 않고 정확한 루트 내부 archive 경로·SHA·크기·entry 순서와 한계 사유를 남깁니다. 다른 버전의 원문·승인·사진은 대신 연결하지 않습니다. 보존 ZIP의 HTML canonical과 og:url이 모두 원 URL과 일치할 때만 알려진 인벤 스킨/더쿠 표시·분류 query 관계를 좁게 확인하며, 두 원 URL은 그대로 남깁니다. 알 수 없는 query·중복 metadata·다른 게시물은 거부합니다.

이관은 `node scripts/unified-migration.mjs plan --project-root .`의 비공개 `local-private/migration-manifest.json`을 먼저 검토합니다. `apply`/`verify`에는 그 파일의 정확 `--manifest-sha`가 필요합니다. 단순 보존 사본과 형식 변환/활성화는 다른 단계이며, 경로는 검증된 old-root→새 상대경로 맵으로만 해석합니다. 모든 JSON 문자열의 일괄 치환/출처 삭제/판정 승계는 하지 않습니다.

실제 .38 설치 소스의 원본 바이트는 Git `b277085` 및 `desktop/installed-source-provenance.json`에 핀 고정했습니다. `legacy-source/operations/`는 공개 감사된 과거 운영·복구 스크립트와 delivery helper/계약 원본입니다. 실행/롤백/현재 상태 복원에 자동 등록하지 않습니다.

`desktop/production/`, `desktop/production-editor/`, `desktop/pc-review/`는 삭제가 도구 정책에서 거부되어 남겨 둔 **비활성 설치 원점 snapshot**입니다. 원본 110개는 Git 원점 바이트로 복원·검증하며, 실행·소비·패키지는 표준 `desktop/`, `app/`, `mobile/android-review/`만 사용합니다. 남은 snapshot을 최신 활성 프로그램이나 제거 완료라고 부르지 않습니다.

자료 이관은 `node scripts/unified-migration.mjs plan --project-root <프로젝트>`로 원본 전수 SHA와 복사/생성 범위를 한 비공개 manifest에 고정한 뒤, 같은 manifest SHA의 `apply`/`verify`로만 진행합니다. 생성기 보완 시 `refresh-generated --manifest-sha <기존 SHA>`는 기존 복사 바이트·경로·원본 핀을 바꾸지 않고 생성 TXT의 대상 핀만 갱신합니다. 실제 기존 2,168 프로그램 폴더 중 862개의 저장 HTML은 원바이트·인코딩·이미지 상대경로를 typed sourceDocument로 보존해 기존 HTML reader로 읽습니다. 나머지 1,306 참고 기록은 원문 전문으로 승격하지 않습니다. 수동 업로드 문안은 원문 미확보 상태로 양쪽 문안 중 실제 저장된 플랫폼만 기록하고, 기존 글·버전·사진 binding을 보존하되 새 게시 승인을 부여하지 않습니다.

Windows 패키지 준비는 `cd desktop; npm ci --no-audit --no-fund; node node_modules/electron/install.js; npm run pack:win`입니다. Electron 44.4.3의 이 lock은 `npm ci`만으로 바이너리를 설치하지 않아 명시 설치 단계가 필요합니다. 게시 기능 활성화가 아닌 `--publish never` 패키징입니다.

빌드 전용 `desktop/after-pack.cjs`는 실제 `app.asar`의 활성 root CJS 전부와 상대 require 의존성/원소스 바이트를 검사한 후 canonical helper9개만 두 물리 resource 경로에 복사·SHA 검증합니다. 같은 desktop 디렉터리를 `extraResources.from='.'`로 지정하면 electron-builder가 해당 파일을 ASAR 앱 코드에서 제외하므로 그 방식은 쓰지 않습니다. hook 자체와 inert 설치 snapshot은 실행 ASAR에서 제외합니다. 누락·오래된 코드·경로탈출·링크는 빌드를 실패시키며 코드 검증을 위해 private 자료 루트를 순회하지 않습니다.

프로젝트 루트의 변환·검증 전에는 `npm ci --ignore-scripts --no-audit --no-fund`를 실행합니다. 읽기용 HTML 본문은 기존 `source-curation.htmlDraft` 본문/광고/댓글 분리 로직을 VM 격리해 재사용하고, Node DOMParser만 [LinkeDOM 0.18.13](https://github.com/WebReflection/linkedom)으로 고정합니다([ISC 라이선스](https://github.com/WebReflection/linkedom/blob/main/LICENSE), 정확 의존성/무결성은 package-lock). DOM-like 구현이므로 지원 selector와 실제 코퍼스 검증 범위를 따릅니다. script·외부 리소스를 실행하지 않으며, 지원되지 않는 HTML은 본문 선택 미확인으로 표시합니다. TXT 앞부분에 실제 선택한 본문과 원순서 이미지 위치를 읽기용으로 넣되 `preserved`/원검토 상태를 유지하고, 원HTML 전체 바이트·SHA와 참고노트는 뒤 metadata에 보존합니다. 읽기 추출이 원문 완독·OCR·권리·제작/게시 승인이 되지는 않습니다. 일반 제작의 400 segment 제한은 그대로이며 읽기 전용 full mode만 별도 bounded 범위를 사용합니다.

통합 native 실행은 `Threads Cut Editor.exe --project-root <이 프로젝트 절대경로>` 또는 같은 `THREADS_PROJECT_ROOT` 환경변수입니다. 평가·숫자 품질·자료·게시 준비가 같은 Electron 창의 동일 offline 서버에서 열립니다. 패키지는 실제 uploader 서버/UI 및 상대 module 의존성만 포함하며 project 전체나 private 자료를 순회해 패키징하지 않습니다. `upload-studio/START.ps1`와 `Control.ps1 start/open/stop/status`, 평가·자료 바로가기는 같은 lifecycle을 씁니다. 현재 버전 native 설치(`local-private/programs/ThreadsProduction/<desktop package version>/Threads Cut Editor.exe`) 또는 `desktop/dist/win-unpacked`가 있으면 같은 native 창을 사용하며, 없을 때만 명시적으로 소유한 Node 서버로 fallback합니다. start는 기존 소유 Node 서버만 정상 전환할 수 있습니다. 프로젝트·실행파일·PID·포트·health identity가 다른 프로세스는 가져오거나 종료하지 않습니다. native stop은 정상 창 닫기만 요청하므로 미저장 편집이 거부하면 실패 상태로 남고 강제 종료하지 않습니다. 같은 창 이동 역시 문안·품질 저장 barrier를 통과해야 합니다. Electron의 second-instance argv 재정렬을 피하려고 추가 실행의 정확한 프로젝트/이동 경로는 `requestSingleInstanceLock`의 JSON `additionalData`로 전달하고, 같은 절대 루트와 허용 경로만 검증합니다. 잘못된 요청은 현재 창·초안을 보존하며 비동기 오류 안내로 표시해 서버 응답을 막지 않습니다. 외부 URL/권한/새 창은 차단하며 창을 정상 닫은 뒤 자신이 만든 서버와 PID 기록만 정리합니다. `--editor`, `--pc-review-run`, `--review-audit=...`는 기존 원문 편집·strict 평가/읽기전용 감사 경로를 유지합니다. 실제 게시·예약·과거 작업 자동 재개는 여전히 금지됩니다.

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

## 과거 제작·설치 기록

2026-10-08 디자인/평가 및 Windows .3.7/399글 구 설치 안내는 [6d5016d1 README](https://github.com/kimjae134679/Threads/blob/6d5016d1ab3f9df2cd77efd18fbfce6aaddfd9f2/README.md)에 보존합니다. 현재 .39.1 통합 실행/199 제작본과 구분하며 당시 재제작 요청을 일반 문서 정리/현재 평가 초기화에 적용하지 않습니다. 원본 private 자료·코드·데이터를 삭제하지 않습니다.

## Trend Inbox 개발 기능

별도 개발용 Trend Inbox에 구현된 기능입니다. 실제 credential 연결·외부 수집/게시 결과와 현재 통합 native 실행을 혼동하지 않습니다.

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

## 별도 개발용 Trend Inbox 진입

Node.js 24 이상:

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

새 환경/마이그레이션 의존성·Electron 설치는 위 통합 기술 섹션의 정확한 준비 명령을 따릅니다. 이 개발용 주소는 현재 native 기본 실행 경로가 아닙니다.

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

## 현재 작업과 향후 변경

현재 규칙 문서 정리/Git 마무리 및 실제 상태는 [인수인계](00_START_HERE/NEXT_RUN_HANDOFF.md)를 따릅니다. 과거 2026-09-18 개발 우선순위·게시 실험 순서는 [6d5016d1 README](https://github.com/kimjae134679/Threads/blob/6d5016d1ab3f9df2cd77efd18fbfce6aaddfd9f2/README.md)의 당시 계획이며 현재 외부 실행 승인이 아닙니다. 이후 변경은 최신 인간 승인·단계별 gate와 실제 코드/자료를 확인한 범위에서만 진행합니다.

서버 JSON/SQLite 저장과 계정별 범위 백업은 구현되어 있습니다. 서버 저장은 명시적 백업/복원이며 자동 동기화가 아닙니다. 이미지 원본 바이트는 상태 JSON에 저장되지 않습니다.

게시 요청 기록은 상태 파일 옆 `publication-journal/`에 저장됩니다. 같은 계정 자격증명·후보·승인 버전의 재요청은 확인된 응답을 재사용하며, 결과가 불명확하면 실제 플랫폼 확인 전 재전송하지 않습니다. 이 서버는 인증된 다중 사용자 서비스가 아니므로 로컬에서 실행합니다.

원문에서 직접 범위를 정하려면 **컷 편집기 열기**를 사용합니다. 긴 캡처 스크롤·수동 분할·굵은 제목 테두리·단어 색상 강조·편집 저장·PNG ZIP 출력을 지원합니다. [사용법](docs/SOURCE_CUT_EDITOR.md).

링크에서 원문을 캡처하는 Windows 앱: [컷 편집기 데스크톱 안내](docs/SOURCE_CUT_DESKTOP.md).
