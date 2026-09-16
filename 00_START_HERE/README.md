# 00 — START HERE / Threads 운영 관제판

> 새 작업자는 여기서 **2분 안에 규칙·현재상태·다음 일**을 파악해야 한다. 채팅 기억보다 GitHub 현재 repo tip이 우선이다.

## 0. 매 실행 시작 순서

```text
1) 00_START_HERE/NEXT_RUN_HANDOFF.md
2) 현재 main / repo tip / 최근 커밋
3) project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/ 최신 순차 note
4) 이전 실행의 미완료 concrete task
5) 관련 역할 README/계약
6) Discovery 작업이면 data/README.md + data/candidates/README.md
7) 계획만 쓰지 말고 실제 작업
```

**충돌 우선순위:** 현재 repo tip > NEXT_RUN_HANDOFF > 최신 ops note > 오래된 문서/과거 채팅.

## 1. 절대 역할 체인

`01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`

- `01`: 후보·출처·원문 증거 수집
- `02`: 사실/출처 검증, Viral/Audience Comfort, 각도
- `03`: 실제 source-backed 콘텐츠 제작
- `04`: 권리·안전·privacy·human approval + **유일한 실제 게시 권한**
- `05`: 계정/포맷 실험과 실제 성과 분석

앞 단계의 사실을 뒤 단계가 임의로 새로 만들지 않는다. 비밀값은 plaintext로 저장하지 않는다.

## 2. 현재 최우선 목표

검은 배경 text-only Demo Showcase는 개발/회귀 자료일 뿐 사용자 결과물이 아니다.

1. 한국 커뮤니티 중심 고볼륨 Discovery
2. 정확한 제목 + 정확한 원문 URL 검증
3. 실제 source screenshot/image/media 확보
4. screenshot intake → Source Package
5. source-backed 1080×1080 Instagram/Threads carousel
6. Chrome에서 실제 파일/크기/가독성 검증
7. 같은 Source Package로 별도 1080×1920 Reels/Shorts MP4
8. 이후 live provider/publisher

실제 자산이 없으면 `ASSETS_PENDING`; 생성 이미지로 빈자리를 꾸며 완료 처리하지 않는다.

## 3. 후보 저장 구조 — 사람이 보는 곳과 기계 기록을 분리

```text
data/
├─ README.md
├─ candidates/          ← 사람이 보는 실제 후보. 후보 한 건 = Markdown 파일 하나
├─ _raw_batches/        ← 과거 묶음 JSON/수집 스냅샷. 감사·재검증용
├─ _system/             ← migration/quarantine/backlog 등 운영 메타
└─ demo/field-test 계열 ← 앱 개발용 데이터. 후보 목록으로 보지 않음
```

**새 Discovery 후보를 `data/` 루트에 묶음 JSON으로 만들지 않는다.**

후보 파일명:

`YYMMDD_C{0|1|2}_A{0|1}_P{0|1}_짧은제목.md`

- `C0`: 제목/인덱스 lead. 정확한 개별 URL/provenance가 부족함
- `C1`: 정확한 공개 원문 URL/provenance와 필요한 관측을 확인함
- `C2`: production 후보로 선정. rights/privacy/human gate는 별도 유지
- `A0`: 실제 source-backed 사용자용 asset 미생성
- `A1`: 실제 source screenshot/image 기반 사용자용 결과물 생성 확인
- `P0`: 미게시
- `P1`: **04_REVIEW_PUBLISH가 실제 게시 성공을 확인한 경우만**

Queue, 예약, dry-run, provider-ready, API 호출 의도는 P1이 아니다.

## 4. 후보 파일 내용 — 코드처럼 쓰지 않는다

`data/candidates/` 파일은 JSON/schema/program state dump가 아니라 사람이 읽는 Markdown이다.

기본 순서:

```text
제목
글 내용
정확한 링크
조회수 / 좋아요 / 댓글 등 같은 관측시점의 실제 수치
평가
이미지·자산 / 제작·게시 상태
```

- 공개 제3자 글 전문을 장문 복제하지 않고, **실제로 읽은 전체 내용을 충실하게 요약**한다.
- 본문을 실제로 읽지 않았으면 `본문 미확인`이라고 쓴다. 내용을 만들어 채우지 않는다.
- exact individual URL이 없고 index/list만 있으면 C0다.
- 서로 다른 시점·재게시처의 수치를 합쳐 하나의 engagement처럼 만들지 않는다.
- URL, 반응수치, rights, OCR/moderation, credential, asset capture, delivery, publication success를 추측하지 않는다.

## 5. Discovery 취향

초기에는 많이 보고 강한 것을 추린다. Korean-community first: Blind, DCInside, FMKorea, TheQoo, Instiz, Ruliweb, Ppomppu, Clien, Inven, Arca, NAVER/Daum cafe → Threads/X/Instagram/Reddit/YouTube/news.

선호: 황당/웃긴 실화, 직장 갈등, 연애·결혼·가족 논쟁, 돈·빚·복권·선물, 민망한 오해, 강한 반전, 누구나 한마디 하고 싶은 생활 갈등.

**주식/코인은 평범한 종목·시장·금리 뉴스보다 투자 때문에 인생에 큰 일이 난 사람 이야기**를 우선한다: 큰 손실/수익, 몰빵·레버리지·빚 사고, 황당한 실수, 계좌 인증이 붙은 극적 결과, 가족·연애·직장 갈등, 강한 반전.

DCInside/Blind 등 제한 소스는 bulk crawl, 로그인/anti-bot 우회 금지. 공개 search/index, 허용된 공개 페이지, 사용자 URL/screenshot, 수동 capture만 쓴다.

## 6. 실제 사용자용 카드 규칙

- Slide 1: 첫 실제 source image full-bleed + 강한 blur/darken + 짧은 hook
- Slide 2: 첫 원본 image/post screenshot을 읽을 수 있게 제시
- Slide 3+: 실제 continuation/image/comment/reaction을 story order로
- 마지막: 짧고 자연스러운 질문/CTA
- 원문을 억지 crop하지 말고 contain + blurred-background filler
- `CONTEXT`, `CHECK`, `특히 볼 것` 같은 개발식 text-only 카드로 이야기를 대체하지 않는다.

## 7. 안전/권리 기준

- 심한 gore/corpse/severe injury, 동물학대, 노골적 성적 콘텐츠, doxxing/private-person exposure는 강하게 배제한다.
- **단순 성별 비꼼·성별 일반화·거친 표현이 있다는 이유만으로 후보를 자동 폐기하지 않는다.** 이야기성과 맥락을 본다.
- 다만 심한 비인간화, 위협, 표적 괴롭힘, 신상노출, 명예훼손 위험은 별도 safety/privacy/defamation 검토한다.
- 논란성이 rights/privacy보다 우선하지 않는다. 권리 미확인 자산은 실제 게시하지 않는다.

## 8. 과거 데이터 해석

과거 값을 새 규칙에 맞추려고 지어내지 않는다.

- URL/provenance 있는 과거 후보 → 실제 증거 범위에서 C1 mapping 가능
- URL 없는 과거 lead → C0_A0_P0
- `ASSETS_PENDING` / text-only demo → A0
- queue/draft/dry-run/provider-ready → P0
- 실제 04 게시 증거가 있을 때만 P1
- grouped/raw 역사자료는 `_raw_batches/`에 보존하고 사람용 후보는 `candidates/`로 한 건씩 풀어 쓴다.

## 9. 어디를 보면 되는가

- 현재 상태/다음 일: [`NEXT_RUN_HANDOFF.md`](./NEXT_RUN_HANDOFF.md)
- 후보 목록: [`../data/candidates/`](../data/candidates/)
- 후보 저장 규칙: [`../data/README.md`](../data/README.md)
- 역할 상세: `01_DISCOVERY/` → `05_EXPERIMENTS_ACCOUNTS/`
- 제작 포맷: `03_PRODUCTION/FORMAT_PLAYBOOK.md`
- 순차 기록: ops-hub `04_COMMUNICATION/threads/T-0008-ai-content-monetization/`

앱: `npm start` → `http://127.0.0.1:4173/app/`

## 10. 매 실행 종료

의미 있는 작업이면 실제 repo 변경 → 관련 test → 필요 시 `npm run check`/server smoke → user-visible 변경이면 가능한 경우 browser E2E → commit/push → 임시파일 정리 → `NEXT_RUN_HANDOFF.md` 갱신 → 다음 순차 ops note 작성.

인수인계에는 baseline/result SHA, changed files, raw/retained 후보 수, retained exact title+URL, 실제 실행한 tests/results, browser E2E, 실제 확보 asset, `ASSETS_PENDING`, blocker, 다음 concrete priority, 실제 C/A/P 변화를 적는다. 하지 않은 테스트/CI/OCR/moderation/게시/asset acquisition을 했다고 쓰지 않는다.
