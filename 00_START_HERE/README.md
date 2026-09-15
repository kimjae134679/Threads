# 00 — START HERE / Threads 운영 관제판

> **새 작업자는 여기서 2분 안에 현재 규칙·상태·다음 일을 파악해야 한다.**  
> 실행할 때마다 채팅 기억보다 **GitHub 현재 repo tip**을 우선한다.

## 0. 매 실행 시작 순서 — 반드시 이 순서

```text
1) 00_START_HERE/NEXT_RUN_HANDOFF.md 읽기
2) 현재 main / repo tip / 최근 커밋 확인
3) project-operations-hub의
   04_COMMUNICATION/threads/T-0008-ai-content-monetization/
   최신 순차 인수인계 읽기
4) 이전 실행의 미완료 concrete task 확인
5) 관련 역할 README/계약 확인
6) 계획만 쓰지 말고 실제 작업 진행
```

**충돌 시 우선순위:** 현재 repo tip > NEXT_RUN_HANDOFF의 현재 상태 > 최신 ops note > 오래된 문서/과거 채팅.

## 1. 절대 변경 금지 운영 체인

```text
01 DISCOVERY
  ↓ Candidate Packet
02 EDITORIAL_SCORING
  ↓ Approved Content Brief
03 PRODUCTION
  ↓ Draft Package
04 REVIEW_PUBLISH      ← 실제 게시 권한은 여기만
  ↓ Publication Record
05 EXPERIMENTS_ACCOUNTS
  ↓ Experiment Result / 다음 가설
01로 피드백
```

| 역할 | 소유 | 금지 |
|---|---|---|
| `01 DISCOVERY` | 공개 후보·출처·원문 증거 수집 | 최종 승인/게시 |
| `02 EDITORIAL_SCORING` | 사실/출처 검증·Viral/Comfort·각도 | 실제 게시 |
| `03 PRODUCTION` | 실제 source-backed 콘텐츠 제작 | 새 사실 발명/게시 |
| `04 REVIEW_PUBLISH` | 권리·안전·privacy·human approval·게시 | 검수 없는 게시 |
| `05 EXPERIMENTS_ACCOUNTS` | 계정/포맷 실험·실제 성과 분석 | 승인 없는 콘텐츠 변경/게시 |

## 2. 현재 최우선 목표

**검은 배경 text-only Demo Showcase는 개발/회귀 자료일 뿐 사용자 결과물이 아니다.**

현재 순서:
1. 한국 커뮤니티 중심 고품질/고볼륨 Discovery
2. **정확한 제목 + 정확한 원문 URL** 검증
3. 실제 원문 screenshot/image/media 확보
4. screenshot intake → Source Package
5. 실제 source-backed 1080×1080 Instagram/Threads carousel 제작
6. Chrome에서 실제 결과/크기/가독성 검증
7. 같은 Source Package로 별도 1080×1920 Reels/Shorts MP4 제작
8. 이후 live provider/publisher 확장

실제 자산을 확보하지 못하면 `ASSETS_PENDING`; 생성 이미지로 빈자리를 꾸며 완료 처리하지 않는다.

## 3. 후보/콘텐츠 상태는 이름만 봐도 알아야 한다

표준 이름:

```text
YYMMDD_C{0|1|2}_A{0|1}_P{0|1}_짧은제목
예: 260916_C1_A0_P0_민원인이400만원빌려달래
```

| 코드 | 의미 |
|---|---|
| `C0` | 발견한 lead. 정확한 provenance/body/comments 등이 아직 불완전할 수 있음 |
| `C1` | 정확한 공개 URL/provenance와 필요한 관측을 실제 확인 |
| `C2` | production 후보로 선택. 단 rights/privacy/human gate는 별도로 계속 적용 |
| `A0` | 실제 source-backed 사용자용 asset 미생성 |
| `A1` | 실제 source screenshot/image 기반 사용자용 carousel/content 생성 확인 |
| `P0` | 실제 게시 안 됨 |
| `P1` | **04가 실제 게시 성공을 관측/확인한 경우만** |

Queue, dry-run, 예약, API 호출 의도, provider ready는 `P1`이 아니다. C/A/P는 파일명뿐 아니라 structured record에도 저장한다.

## 4. Discovery 기록 최소 계약

정상 후보에는 최소 다음이 있어야 한다.

- exact observed `title`
- exact canonical/public `url`
- `source`, lane/theme
- observation timestamp
- 그 시점에 **실제로 보인** 조회/좋아요/댓글만
- body 실제 읽음 여부
- comments 실제 읽음 여부
- source screenshot/image/media 존재/확보 여부
- swipe-worthy 이유 + 약점
- first-slide hook
- story progression
- acquisition state
- rights/privacy/human-review 상태
- `publicationAllowed=false` 기본값

URL 없는 제목/수치 묶음은 **C0 unverified lead**일 뿐이다. 다른 시점의 engagement를 합쳐 하나의 관측치처럼 만들지 않는다. OCR/moderation/rights/API/게시 성공도 실제 실행·확인하지 않았다면 만들지 않는다.

## 5. Discovery 취향

초기에는 좁게 고르기보다 많이 보고 강한 것을 추린다. Korean-community first: Blind, DCInside, FMKorea, TheQoo, Instiz, Ruliweb, Ppomppu, Clien, Inven, Arca, NAVER/Daum cafe 등을 우선하고 Threads/X/Instagram/Reddit/YouTube/news로 확장한다.

선호: 황당/웃긴 실화, 직장 갈등, 연애·결혼·가족 논쟁, 돈·빚·복권·선물, 민망한 오해, 강한 반전, 누구나 한마디 하고 싶은 생활 갈등. **주식/코인은 평범한 종목·시장·금리 뉴스보다 투자 때문에 인생에 큰 일이 난 사람 이야기**(큰 손실/수익, 레버리지·빚 사고, 황당한 실수, 가족·연애·직장 갈등, 강한 반전)를 우선한다.

DCInside/Blind 등 제한 소스는 bulk crawler, 로그인/anti-bot 우회 금지. 공개 검색/index, 허용된 공개 페이지, 사용자 URL/screenshot, 수동 capture 경로만 쓴다.

## 6. 실제 사용자용 카드 규칙

- Slide 1: 첫 **실제 source image** full-bleed + 강한 blur/darken + 짧은 curiosity hook
- Slide 2: 첫 source image/post screenshot을 읽을 수 있게 원본 증거로 제시
- Slide 3+: 실제 continuation/image/comment/reaction을 story order로
- 마지막: 짧고 자연스러운 질문/CTA
- 중요한 원문을 억지 crop하지 말고 contain + blurred-background filler 사용
- `CONTEXT`, `CHECK`, `특히 볼 것` 같은 개발식 텍스트 카드로 실제 이야기를 대체하지 않음

## 7. 안전/권리 fail-closed

심한 gore/corpse/severe injury, 동물학대, 노골적 성적 콘텐츠, 심한 혐오/모욕, doxxing/private-person exposure는 강하게 배제한다. 논란성이 safety/privacy/defamation/rights보다 우선하지 않는다. `A10 Unknown rights` 등 권리 미확인 자산은 실제 게시하지 않는다. 비밀값은 plaintext로 저장하지 않는다.

## 8. 현재 상태를 어디서 보는가

- **지금 상태/다음 할 일:** [`NEXT_RUN_HANDOFF.md`](./NEXT_RUN_HANDOFF.md)
- **역할별 상세:** `01_DISCOVERY/` → `05_EXPERIMENTS_ACCOUNTS/`
- **제작 포맷:** [`../03_PRODUCTION/FORMAT_PLAYBOOK.md`](../03_PRODUCTION/FORMAT_PLAYBOOK.md)
- **실험:** [`../05_EXPERIMENTS_ACCOUNTS/EXPERIMENT_MATRIX.md`](../05_EXPERIMENTS_ACCOUNTS/EXPERIMENT_MATRIX.md)
- **상세 인수인계 계약:** [`../docs/HANDOFF_CONTRACTS.md`](../docs/HANDOFF_CONTRACTS.md)
- **순차 작업 기록:** project-operations-hub `04_COMMUNICATION/threads/T-0008-ai-content-monetization/`

현재 앱:
```text
npm start
http://127.0.0.1:4173/app/
```

## 9. 기존 데이터 해석 규칙

과거 데이터는 새 규칙을 소급해 **거짓으로 승격하지 않는다.**

- exact URL이 있고 provenance가 추적되는 과거 후보 → 현재 C 규칙으로 mapping 가능
- URL이 없거나 body/comments/metrics 근거가 추적되지 않는 과거 후보 → `C0_A0_P0` / quarantine
- text-only demo → `A1` 아님
- 실제 게시 증거가 없는 과거 queue/draft/provider record → `P0`
- 기존 값이 사실인지 거짓인지 모르면 삭제/단정하지 말고 `unverified legacy observation`으로 보존

특히 `kr-high-volume-2026-09-16-0128` 35건은 exact URL이 없어 현재 quarantine 상태다. 수치와 BODY_READ/COMMENTS_READ 표시는 재검증 전 canonical evidence가 아니다.

## 10. 매 실행 종료 계약

의미 있는 작업이면 반드시:

```text
1) 실제 repo 변경
2) 관련 targeted test
3) 필요 시 npm run check / server smoke
4) user-visible 변경이면 가능한 경우 실제 browser E2E
5) commit/push
6) 임시 probe/cache 정리
7) NEXT_RUN_HANDOFF.md 갱신
8) ops-hub에 다음 순차 note 생성
```

인수인계에는 baseline/result SHA, changed files/features, raw/retained candidate 수, **retained 후보의 정확한 제목+URL**, 실제 실행한 tests/results, 실제 browser 검증, 실제 확보 asset, ASSETS_PENDING, blocker, 다음 concrete priority, C/A/P 변경을 적는다. 하지 않은 테스트/CI/OCR/moderation/게시/asset acquisition을 했다고 쓰지 않는다.
