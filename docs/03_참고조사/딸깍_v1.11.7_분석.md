# ddalkkak Threads Community v1.11.7 분석 보고

분석일: 2026-09-18 KST  
대상: `apache3563-bit/ddalkkak-threads-community` tag `v1.11.7`  
Release: https://github.com/apache3563-bit/ddalkkak-threads-community/releases/tag/v1.11.7

## 1. 결론

이 프로젝트는 **Threads 게시 자동화의 “운영 안정성”과 “로컬 개인용 배포”를 상당히 꼼꼼하게 만든 참고 사례**다.

우리 `kimjae134679/Threads`가 더 앞서 있는 부분은:
- 다중 플랫폼/커뮤니티 Discovery
- 테마 Lane, Viral/Comfort 분류
- 원문 스크린샷 기반 카드 제작
- Research/Safety/Approval 역할 분리
- Warehouse/실험/성과 학습
- Instagram/Shorts 확장 방향

반대로 ddalkkak 쪽이 더 성숙하거나 배울 가치가 큰 부분은:
- **실제 예약 발행기의 fail-closed 상태 관리**
- **프로세스 중단/중복 게시 방지**
- **DRY_RUN + 자동 발행 OFF 기본값**
- **하루 발행량 제한**
- **Threads 토큰 수명/갱신 관리**
- **미디어 publish 시 실패를 텍스트 게시로 몰래 대체하지 않는 정책**
- **로컬 서버 loopback 고정**
- **URL 가져오기 SSRF/DNS-rebinding 방어**
- **사용자 PC에 설치되는 Windows 패키지/SQLite 운영**
- **결정론적 1080×1350 카드 렌더링**
- **LLM 컨텍스트 예산과 출처별 상한**

즉 **Discovery/콘텐츠 기획을 가져올 대상은 아니고, “실제 운영기/게시기/보안/로컬 제품화” 쪽 참고 가치가 높다.**

---

## 2. 확인한 릴리스/프로젝트 사실

v1.11.7은 2026-09-08 공개된 첫 Community Release다.

Release에:
- Windows 설치파일 `DdalkkakThreadsFactory_Community_Setup_1.11.7.exe`
- SHA256SUMS
가 제공된다.

설치 EXE는 약 113.7 MB이고 Release에 SHA-256도 명시돼 있다.

기술 스택:
- TypeScript
- Node.js >= 22
- Express
- better-sqlite3
- node-cron
- rss-parser
- cheerio
- sharp
- multer

Community 소스는 **AGPL-3.0**이다.

### 라이선스 주의

우리 프로젝트에 이 저장소의 소스 구현을 그대로 복사하는 것은 피한다.

이 문서에서 채택 대상으로 적은 것은 **동작 원칙/설계 아이디어**이며, 실제 구현은 우리 코드베이스 구조에 맞춰 독립적으로 작성한다.

AGPL 코드를 직접 가져오는 것이 필요한 경우에는 별도로 라이선스 영향을 검토하기 전까지 병합하지 않는다.

---

## 3. 전체 구조

대략적인 핵심 흐름은 다음과 같다.

```text
RSS / URL / TEXT / KEYWORD
        ↓
materials(SQLite)
        ↓
후보 선별
        ↓
Claude Code CLI
        ↓
draft
        ↓
검토 / 승인
        ↓
schedule
        ↓
1분 scheduler
        ↓
Meta Threads 공식 API
        ↓
publish log
```

서버는 로컬 Express이고 데이터는 SQLite다.

주요 모듈:
- `server.ts`
- `database.ts`
- `rss.ts`
- `materialSelector.ts`
- `claude.ts`
- `scheduler.ts`
- `threads-api.ts`
- `threadsPublishDispatcher.ts`
- `threadsOAuth.ts`
- `urlSafety.ts`
- media 관련 모듈
- productRadar 하위 모듈

우리처럼 기능 폴더가 완전히 분해된 구조는 아니다. 특히 `database.ts`가 매우 크고 일부 route도 비대해서 **구조 자체는 우리가 따라갈 필요가 없다.**

---

## 4. 가장 참고할 가치가 큰 부분

### A. 실제 발행 상태기계가 안전하다

scheduler는 단순히 “시간 됐으면 POST”가 아니다.

안전장치:
1. 자동 발행 토글 기본 OFF
2. `DRY_RUN=true` 기본
3. 실제 발행은 `scheduled` 상태만
4. 예약 시간이 도달해야 함
5. 빈 본문 차단
6. 기존 publish log가 있으면 중복 차단
7. 발행 직전 `publishing`으로 원자적 claim
8. 하루 발행량 제한
9. 인증 오류는 자동 재시도 안 함
10. 미디어 영구 오류도 무의미한 반복 재시도 안 함

특히 **프로세스가 게시 도중 죽은 경우** 처리가 좋다.

`publishing`으로 남은 항목에 대해:
- 실제 성공 로그가 있으면 `published` 복구
- 성공 여부를 판단할 로그가 없으면 다시 예약하지 않음
- `failed / 결과 확인 필요`로 두고 사람이 Threads에서 먼저 확인

이 방식은 “Meta에는 올라갔는데 로컬 기록 전에 프로세스가 죽어서 다시 올리는” **중복 게시 사고를 fail-closed로 막는다.**

### 우리 반영

현재 우리 Scheduler는 **queue planning/spacing은 좋지만 publish execution state machine은 상대적으로 약하다.**

추가할 가치가 높다:
- `queued → claiming → publishing → published | failed | unknown`
- item 단위 idempotency key
- atomic claim
- publication attempt log
- 중단 복구 시 “결과 불명 = 재발행 금지”
- 수동 확인 후만 retry
- account별 daily publish cap

이건 최우선 반영 후보.

---

### B. 미디어 실패 시 텍스트로 몰래 대체하지 않는다

IMAGE/VIDEO/CAROUSEL을 요청한 글에서 미디어 처리가 실패했을 때:
- 텍스트만 올려버리는 fallback을 하지 않는다.
- 미디어까지 성공해야 published.

이 원칙은 매우 중요하다.

우리도 카드형 게시물을 예약했는데 asset URL/relay 문제 때문에 **본문만 공개 게시되는 사고**를 막아야 한다.

### 우리 반영

Official Media executor에:
- intended media contract snapshot
- required asset count
- resolved asset count
- media-type exact match
- fail closed
를 추가한다.

```text
expected CAROUSEL 6
resolved CAROUSEL 5
→ BLOCK
→ TEXT fallback 금지
```

---

### C. URL 수집 보안이 상당히 좋다

`urlSafety.ts`는 단순 URL fetch가 아니다.

확인된 방어:
- http/https만 허용
- localhost 차단
- private IPv4 차단
- IPv6 loopback/link-local/private 차단
- CGNAT 차단
- redirect 수 제한
- redirect 매 hop 재검사
- timeout
- response size 제한
- content-type 제한
- DNS lookup 후 내부 주소 판별
- 바이너리 경로에서는 DNS rebinding을 줄이기 위한 pinned address 접근

우리 프로젝트도 URL/원문/미디어를 점점 더 많이 가져오므로 이 부분은 중요하다.

### 우리 반영

`core/network/safe-fetch`를 별도 모듈로 만들고:
- source page fetch
- source screenshot media acquisition
- image normalization download
- future browser-capture helper
가 같은 보안 정책을 공유하게 하는 것이 좋다.

특히 **미디어 다운로드 경로는 DNS pinning + 최대 바이트 + 최대 픽셀**을 같이 적용하는 방향.

---

### D. Threads 미디어의 “공개 URL 문제”를 실제 운영 방식으로 해결했다

로컬 프로그램은 `127.0.0.1`에 있으므로 Meta가 local image 파일에 접근할 수 없다.

ddalkkak은 이를 두 가지로 푼다.

1. local dedicated media gateway + 사용자가 직접 HTTPS tunnel
2. self-host Cloudflare Worker relay + R2

그리고 중요한 점:
- 메인 dashboard/API 포트를 터널링하지 말라고 명시
- 미디어 전용 gateway 포트를 따로 둠
- relay credential도 분리
- Community 버전은 운영자의 공용 relay를 강제하지 않음

### 우리 반영

우리 official media publishing에서 실제 병목도 **“Meta가 접근할 수 있는 HTTPS media URL”**이므로 참고 가치가 크다.

다만 구현을 그대로 복사하지 않고:

```text
Local asset
→ staging
→ ephemeral media-publication object
→ HTTPS media provider
   - self-host object storage
   - signed/expiring public URL
→ Threads container
→ publish
→ cleanup
```

형태의 provider abstraction으로 넣는 것이 적합하다.

Buffer와 Direct Threads 둘 다 같은 staged asset identity를 사용하게 한다.

---

### E. 토큰 수명 관리

단순 환경변수 토큰 입력으로 끝나지 않고:
- long-lived token
- expiry metadata
- refresh 판단
- 만료 10일 전
- 저장 후 24시간 조건
- 실패 후 cooldown
- refresh 실패 시 기존 토큰 삭제 금지
등의 수명 주기를 관리한다.

### 우리 반영

현재 우리 Threads 연결은 실제 게시 E2E보다 구조가 먼저 만들어진 상태이므로,
실사용 들어가기 전에 반드시:

- connection profile
- token issuedAt/expiresAt
- lastValidatedAt
- lastRefreshAttemptAt
- refresh state
- credential-required / expiring / ready / invalid
를 UI에 보여줘야 한다.

특히 “토큰 있음”과 “실제로 유효함”을 같은 상태로 취급하면 안 된다.

---

### F. LLM을 로컬 CLI provider로 사용하는 방식

Claude Code CLI를:
- shell 문자열 조합 없이 `spawn(..., {shell:false})`
- prompt는 command arg가 아니라 stdin
- JSON 출력만 요청
- 파일 수정/명령 실행 권한을 주지 않음
형태로 사용한다.

장점:
- 별도 API key를 앱에 저장하지 않아도 됨
- 사용자가 이미 로그인한 CLI를 사용 가능
- CLI를 AI “작성 엔진” 하나로만 제한 가능

### 우리 반영

우리 AI Studio는 OpenAI API 중심이지만 provider abstraction을 만들 가치가 있다.

예:
```text
AI Provider
- OpenAI Responses
- Claude CLI (optional)
- future local/model provider
```

단, **Claude Code 전체 agent 권한을 콘텐츠 제작기에 넘기지 않고 text/json generation 전용 subprocess**로 제한한다.

이 기능은 우선순위 중간.

---

## 5. Discovery 쪽은 우리가 더 강하다

ddalkkak의 자료 수집은:
- RSS
- 사용자 입력 URL
- 붙여넣은 text
- keyword/topic
중심이다.

코드 주석에도 X/Threads/Instagram 등을 scrape하지 않는다고 명확히 적혀 있다.

기본 RSS feed pack은:
- Hacker News
- TechCrunch
- Verge
- MIT Technology Review
- Google AI Blog
- GeekNews
- 전자신문
- 연합뉴스
- 경향신문
- BBC
- 생활/유통
- 식품
- 패션
- 여행
- 문화
등으로 꽤 잘 구성돼 있다.

하지만 우리가 원하는:
- Blind 논란
- DC 여러 갤러리
- TheQoo
- Reddit
- X/Threads
- 커뮤니티 반응
- 댓글 재미
- 실제 바이럴 증거
- Theme Lane
- Audience Comfort
까지는 다루지 않는다.

따라서 **ddalkkak의 RSS source pack은 보조 discovery feed 아이디어로 참고하고, Discovery 시스템 자체는 우리 쪽을 유지한다.**

---

## 6. 후보 선택 로직에서 가져올 만한 것

`materialSelector.ts`의 운영 규칙:

- 최근 24시간 강한 가점
- 72시간 이내 가점
- 같은 출처 최대 3개
- 후보 pool 최대 20
- 실제 LLM 전달 최대 8개
- 자료당 excerpt 최대 2,000자
- 전체 context 최대 15,000자
- 중복 제목: exact / 포함 / 3-gram Jaccard
- 사용자가 include keyword를 주면 고정 topic 가중치를 끔

우리 Viral Finder는 훨씬 많은 변수를 사용하지만 **LLM에 넘기는 자료 예산 제어는 이 방식이 실용적**이다.

### 우리 반영

Research/Draft 생성에 별도 context budget policy:

```text
candidate source max: 8
same source max: 3
per source excerpt: 2,000 chars
whole source context: 15,000 chars
overflow: 자동 잘라 숨기지 말고 UI 표시
```

단 숫자는 초기값일 뿐 실측 후 조절.

---

## 7. 카드/미디어 렌더링에서 참고할 점

productRadar에는 `sharp` 기반 1080×1350 deterministic renderer가 있다.

특징:
- 좌표/폰트/줄바꿈 규칙을 코드가 결정
- AI에게 layout을 맡기지 않음
- 한글 폭을 보수적으로 추정
- max lines + ellipsis
- XML escape
- decompression bomb 방어
- 동일 입력 + preset이면 deterministic output
- product_focus / price_focus / recommendation_focus preset

우리 Community Card Factory는 브라우저 Canvas 기반이라 방향이 다르지만, **“최종 export는 deterministic renderer가 소유”**한다는 원칙은 유효하다.

### 우리 반영

현재 사용자가 요구한 카드 형식은:
- 1장 cover
- 2장부터 원문 스크린샷을 순서대로
이므로 ddalkkak의 상품 카드 UI를 따라 할 이유는 없다.

대신 다음만 가져온다:
- export size fixed
- deterministic crop/composition plan
- asset hash
- input → output manifest
- max input pixels
- text/XML escaping
- same input → same output

---

## 8. SQLite 운영 방식 비교

ddalkkak은 기능별 row/table 중심 SQLite이며, 우리 프로젝트는 현재 `state_records` snapshot envelope + namespace/revision 형태다.

우리 방식의 장점:
- 기존 localStorage state와 migration이 쉽다.
- snapshot backup이 편하다.

ddalkkak 방식의 장점:
- draft/publish log/material 등 query가 쉬움
- 개별 상태 이력/중복 방지가 쉬움
- scheduler transaction이 명확함

### 우리 다음 단계

전체를 당장 relational schema로 갈아엎지 않는다.

우선 **게시 관련 ledger만 relational/event 형태로 분리**하는 것이 좋다.

예:
```text
publication_attempts
- attempt_id
- candidate_id
- account_id
- provider
- intended_media_type
- state
- claimed_at
- completed_at
- external_container_id
- external_post_id
- error_code
- uncertainty_flag
```

content state snapshot은 그대로 두고 publication ledger만 transaction-safe로 만든다.

---

## 9. 로컬 제품화에서 참고할 점

ddalkkak은 “개발 프로젝트”가 아니라 사용자가 설치해서 쓸 수 있는 제품을 목표로 한다.

확인된 요소:
- Windows installer
- start/install bat
- local server
- SQLite
- launcher
- data/log folder
- Node version 검사
- CLI 존재 검사
- environment template
- loopback only
- runtime cleanup
- restart 후 recovery

우리 프로젝트도 실제로 오래 운영할 생각이면 웹 prototype 상태에서 끝내지 않고 후반에:
- Windows launcher
- state/data folder 표준화
- logs
- health page
- backup/restore
- startup recovery
를 하나의 “운영 모드”로 묶을 가치가 있다.

---

## 10. 그대로 따라가면 안 되는 부분

### 1) 코드 구조

`database.ts`가 100KB 이상이고 route도 큰 파일이 존재한다.

우리 프로젝트는 이미 기능이 훨씬 많으므로 이 형태로 가면 다시 꼬인다.

**우리의 feature-folder / model-ui-style / ownership 규칙을 유지한다.**

### 2) Discovery 범위

RSS/manual 중심이라 우리 목표에는 부족하다.

### 3) 고정 AI 주제 bias

사용자 include keyword가 없을 때 AI/자동화/생산성 계열에 기본 가점이 있다.

우리 계정은 여러 Theme Lane을 운영하므로 전역 fixed topic bias는 두지 않는다.

### 4) 문서와 Release 상태 불일치

tag의 README에는 Windows Release가 아직 준비 중이라고 적혀 있지만 실제 v1.11.7 Release에는 설치 EXE가 존재한다.

치명적 문제는 아니지만 **문서/배포 상태 동기화가 완벽하진 않다.**

### 5) AGPL 코드 직접 복사

앞서 말한 대로 clean-room 방식으로 아이디어만 반영한다.

---

## 11. 우리 프로젝트에 반영할 우선순위

### P0 — 실제 발행 안전성
1. publication attempt ledger
2. atomic claim
3. `publishing` crash recovery
4. unknown outcome → automatic retry 금지
5. duplicate/idempotency guard
6. account daily cap
7. media requested → text fallback 금지

### P1 — 외부 URL/미디어 수집 보안
1. shared safe-fetch
2. private/loopback block
3. redirect per-hop validation
4. response-size/content-type cap
5. media DNS pinning
6. max input pixels

### P1 — Threads token lifecycle
1. expiry state
2. validation timestamp
3. refresh metadata
4. pre-expiry refresh
5. failed refresh cooldown
6. 기존 token 보존

### P2 — LLM source context budget
1. max source count
2. same-source cap
3. excerpt limit
4. total context limit
5. overflow visible to user

### P2 — media URL provider
1. staged local asset
2. provider abstraction
3. expiring public HTTPS URL
4. publication cleanup
5. direct Threads/Buffer 공통 asset identity

### P3 — 선택형 local AI CLI provider
OpenAI API와 별도로 로컬 로그인 CLI 기반 generation provider를 선택적으로 지원.

---

## 12. 현재 우리 코드와 겹치는 부분

우리 repo `v0.42.1`에는 이미:
- scheduler planner
- theme/source/format spacing
- Direct Threads/Buffer target
- Official Media capability model
- SQLite persistence + revision conflict
- source package/intake
- privacy mask
- Warehouse
- vertical-video pipeline
등이 있다.

따라서 ddalkkak을 “통째로 따라 만드는 것”은 낭비다.

가장 가치 있는 차이는 다음 4개다.

```text
1. 게시 attempt transaction / crash recovery
2. safe external fetch / DNS rebinding 방어
3. token lifecycle
4. real-media publication fail-closed
```

이 네 개를 우리 구조에 맞춰 독립 구현하는 것이 효율적이다.

---

## 13. 최종 판단

ddalkkak v1.11.7은 **소재를 잘 찾는 시스템이라기보다, 준비된 콘텐츠를 Windows에서 안전하게 관리·예약·실제 Threads에 내보내는 운영 도구**에 가깝다.

우리 시스템은 반대로 Discovery/편집/카드/실험 쪽이 훨씬 넓다.

따라서 둘의 장점을 합치면 목표 구조는:

```text
우리 Discovery / Viral / Theme / Comfort
        ↓
우리 Research / Source Screenshot / Card Factory
        ↓
우리 Warehouse
        ↓
ddalkkak에서 배운 수준의 fail-closed Publisher
        ↓
Direct Threads / Buffer / future Instagram
        ↓
실제 publication ledger
        ↓
Insights / Experiment learning
```

로 가져가는 것이 적합하다.

**코드 복사는 하지 않고, 위 운영 원칙만 clean-room 구현한다.**
