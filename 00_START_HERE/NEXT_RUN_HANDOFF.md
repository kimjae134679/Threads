# 2026-09-27 — 기존 후보 프로그램 입력 정리 및 AAA 레퍼런스 구성

- 기존 작업 대기열 1,583건을 원문 URL 기준으로 1,084개 프로그램 입력 폴더로 정규화했다. 1,081개는 기존 후보 URL/개별 기록, 3개는 기존 번들에만 있던 기록이다. 56개 후보는 정확한 개별 공개 URL을 찾지 못해 별도 미확인 상태로 남겼다.
- 출력: `data/runtime/program_inputs/` (로컬 전용, Git 미추적). Desktop의 `Threads Cut Editor 자료/02_프로그램 입력`은 해당 폴더를 가리킨다. 각 건은 `candidate.md` + `content.txt` + `comments.txt` + `manifest.json`로 구성되고, 확인된 실제 원본 미디어만 `media/`에 둔다.
- 기존 Jev 평가 953건, 기존 정리 번들 21개를 출처/해시와 함께 연결했다. TheQoo 원본 이미지 8장은 원래 패키지의 SHA-256·바이트 수와 대조한 뒤 복사했다. AAA 스타일 레퍼런스 22장은 Desktop 자료 폴더에 원본 ZIP·원본 이미지·목록 CSV·한눈에보기·분석 노트로 정리했다. 같은 이미지 22장이 든 중복 ZIP은 삭제하지 않고 `99_중복 원본`에 보관했다.
- 모든 매니페스트의 `publicationAllowed=false`. 기존 요약/JeV 결과는 원문 본문이나 댓글로 승격하지 않았다. `content.txt`는 프로그램의 원문 가져오기 파일이 아니다. 앱에서 한 건씩 수집한 뒤 실제 원문을 대조해야 한다.
- 확인: 생성 폴더 1,084개와 이미지 해시 8개 검증, `npm run check`에서 문법 검사 171개 및 전체 56 테스트 suite 통과. UI 변경은 없으며 프로그램 입력 정리 스크립트와 안내를 저장소 변경으로 준비했다.

---

# 2026-09-27 — 원문 선별 프로그램 0.2.4 실사용 흐름

- 작업 기준: PR #4 `codex/rebuild-source-curation-20260927`, 구현 커밋 `f82485a`. 무관한 `Threads` 메인 작업 폴더의 미커밋 변경은 건드리지 않고 별도 worktree에서 수정했다.
- 자동 초안: 신뢰 가능한 게시글 본문 영역의 연속 글자를 문단으로 묶고, 원문 내 이미지 순서와 미확보 파일을 표시한다. BEST/반응 수가 보이는 실제 댓글 최대 3개를 추천한다. 제목은 원문 제목을 기반으로 시작한다. 자동 초안은 검수 완료를 뜻하지 않으며 대조 체크는 사람이 한다.
- 사용 흐름: 기존 후보는 `이 글만 수집`으로 한 건씩 HTML/미디어를 확보할 수 있다. 원문 선별 화면의 현재 선택에서 곧바로 검수 전 미리보기 또는 원문 ZIP 저장·이미지 제작까지 진행한다. ZIP 재선택은 나중에 수정할 때만 필요하다.
- 검증: `npm run check`에서 JS 169개 문법 검사와 55개 테스트 suite 통과. Electron 렌더러에서 메뉴 문구 제외, 본문·이미지 순서, 근거 있는 댓글, 검수 전 최종 출력 차단을 확인했다. 저장소의 기존 실제 원문 이미지 8장으로 검수 전 예시 9장 ZIP을 만들고 첫 표지를 확인했다.
- Windows: 0.2.4 x64 ZIP을 빌드하고 `%LOCALAPPDATA%\Programs\ThreadsCutEditor\app-0.2.4`에 설치했다. 바탕화면에 `Threads Cut Editor 0.2.4` 바로가기, `Threads-Cut-Editor-0.2.4-Windows-x64.zip`, `Threads-real-source-review-preview.zip`을 제공했다. 배포 ZIP SHA-256: `63D3BA913BCEF335B22E3C92E665CF606580FF73D7E4E285591CD7717C2DC93B`. 0.2.3은 보존했다.
- 확인 범위: 기존 1,583건을 실제 원문 대조·변환 완료한 것으로 기록하지 않는다. 이번 예시는 실자료지만 검수 전 상태이며 권리·개인정보·게시 승인 및 실제 게시는 없었다. 다음 작업은 실제 후보 한 건을 선택해 원문/이미지/댓글을 육안 대조하고 04 검수로 전달하는 것이다.

---

# 2026-09-27 — 원문 선별 ZIP과 게시 이미지 제작 재설계

사용자 피드백: 기존 HTML 페이지 전체 텍스트를 본문으로 쓸 수 없고, 검은 단색 제목 표지는 목표 결과물이 아님. 제목/본문 글·이미지 및 위치/실제 댓글을 원문에서 선별하여 ZIP으로 묶고 그 ZIP을 읽어 제작. `docs/SOURCE_BUNDLE_GUIDE.md`가 선별 근거/파일 형식의 기준.

현재 작업 브랜치 `codex/rebuild-source-curation-20260927` (main `2165279`에서 생성). 기존 작업 폴더의 무관한 PNG 수정은 건드리지 않고 별도 worktree에서 작업. `app/source-batch.html/js`, `source-workflow.js`, `source-workflow.mjs`, `app/source-curation.js`, `app/source-bundle-zip.js`, `docs/SOURCE_BATCH_PIPELINE.md`를 재설계 중. HTML 조각은 미선택으로 시작, 직접 확인한 제목/본문/이미지 위치/댓글과 첫 장의 실제 글/이미지 배경을 ZIP에 저장. 확인되지 않은 ZIP은 PNG 제작 및 converted 표시 불가. 실동작 검증·PR은 완료 후 기록.

---

# 2026-09-27 — 원문 보존·일괄 변환 작업

## 자동 목록·전체 처리 연결

- `/app/source-batch.html`이 기존 작업 대기열 1,583건의 수집/변환/차단 상태를 자동 표시한다. `전체 자동 처리`는 CLI 수집을 실행하고 확보한 원문을 브라우저에서 순차 변환해 로컬 `data/runtime/source_pipeline/results/`에 ZIP을 저장한다. 결과 폴더 열기·중지·재시작 후 상태 복원을 제공한다.
- 확보한 HTML은 공백·줄바꿈과 댓글·이미지의 원문 대조 전이면 `needs_verbatim_check` 등으로 남긴다. 원문 없음·404/410·심한 소재는 자동 완료로 승격하지 않는다. 사용자 PC Chrome/Edge에서 대량 실동작 확인이 필요하다.

사용자 최신 지시: 제목과 본문 원문을 공백·줄바꿈까지 그대로, 본문 이미지 원래 위치·원본 파일, 인기 댓글만 확보하고 자동 이미지 변환한다. 변환 완료를 표시하며 많은 건을 처리한다. 과거 후보/Jev/임시 작업물을 전부 정리한다. 추가 소재 발견은 중단하고 기존 자료부터 처리한다.

- 새 로컬 입력 화면 /app/source-batch.html: 저장된 HTML 또는 명시적인 원문 TXT/JSON과 같은 폴더의 이미지를 선택해 PNG와 ZIP을 순차 생성한다. 인기 댓글은 공개 좋아요 수 또는 best 표기가 있을 때만 고른다.
- TXT 본문 원문은 공백·줄바꿈을 보관한다. HTML DOM 텍스트는 화면과 다를 수 있어 needs_verbatim_check로 표시한다. 없는 이미지는 needs_media. converted는 정확한 원문 TXT/JSON과 자산 확인 및 PNG 생성 후에만.
- 기존 전 경로를 data/_system/source-material-inventory.json에 분류: 후보 MD 1570, Jev JSON 953, 묶음 13, 정리 폴더 12+9 (중복 ID 3개, 실제 고유 ID 18), 임시 제작 폴더 35, source package 1, Discovery 보조 후보 13, raw batch 파일 31, demo/meta 5. 작업 대기열 1583개 중 Jev 연결 953, 명시적 정리 폴더 연결 6/21, 변환 완료 0. 옛 handoff의 19 unique와 불일치. 기존 파일 삭제·이동·C/A/P 승격 없음.
- scripts/acquire-existing-sources.mjs --all 은 기존 후보의 공개 URL에서 HTML 원본 바이트와 연결 이미지 후보를 순차 보관한다. Windows 실측 앞 20건: HTML 저장 11, 정확한 URL 없음 7, 원문 HTTP 410·404 차단 2. 저장된 HTML은 본문/댓글/이미지 정확성 검증 전이므로 변환 완료 0이다. 원문·이미지는 로컬 runtime와 ZIP에만 보관한다.
- PR #1·#2·#3 및 최신 편집기 화면 브랜치를 main에 통합하고 병합된 원격 브랜치를 정리했다. Windows Node 24에서 53개 테스트, GitHub Actions check 성공. 심한 소재는 변환 전 excluded_severe로 제외하며 가벼운 논쟁은 남긴다. 남은 검증은 실제 원문 대조, 미디어 육안 검수, Chrome/Edge 대량 ZIP 저장이다. docs/SOURCE_BATCH_PIPELINE.md.

---

# NEXT RUN HANDOFF

## 🔴 LATEST USER OVERRIDE — 2026-09-24
- Do not collect any new material for now. No new raw leads or retained candidates until the existing discovery corpus is fully normalized.
- Current job is only to inventory and modify/merge all existing discovery TXT/Markdown/legacy candidates/bundles.
- Use existing Jev results where present and convert candidates into program-ready canonical bundles.
- Canonical target: `candidate.md` + `content.txt` + `comments.txt` + `manifest.json` + `media/` only when actual source media can be acquired.
- `content.txt`: `[TITLE]`, `[BODY_SEQUENCE]`, `[CUT_PLAN]`, `[COMMENTS_TO_USE]`, `[PROGRAM_ASSEMBLY_ORDER]`, `[SOURCE_STATUS]`.
- Search/web access only for re-verification/evidence filling of an already-existing candidate. Never use it to discover a new candidate during this phase.
- Do not infer missing body/comments/media. Record exact blockers.
- Scope remains `01_DISCOVERY`; A1/P1/publishing forbidden; `publicationAllowed=false`.

## 2026-09-25 00:16 KST — Existing-corpus normalization
- New discovery: **0**.
- Rebuilt/filled existing Jev [0001] candidate `data/candidates/260916_C0_A0_P0_25살연애불가능할까.md` as canonical `01_DISCOVERY/data/candidate_bundles/blind-cn6hnlfx/`.
- Public Blind source reverified: full visible body; page displays 43 comments; 6 actually-read comments selected; body-content media observed: 0.
- BODY_SEQUENCE 7 / CUT_PLAN 7 / PROGRAM_ASSEMBLY_ORDER 1.
- Current observations kept separately: main display views 243/comments 43; same-page recommendation card views 175/likes 1. No metric normalization/inference.
- `publicationAllowed=false`; no downstream work.
- This ID was already present in the prior-normalized list, so cumulative unique canonical count remains **19** rather than double-counting it.
- Existing Jev batch snapshot: 1,273 candidates; deterministic current full-corpus denominator reconciliation remains pending.

## Progress summary
- 전체 기존 대상 수: final deterministic denominator unresolved; Jev snapshot 1,273.
- 이번 실행 수정·통합 수: 1.
- 누적 완료 수: 19 unique canonical IDs tracked (this run repaired an already-counted ID).
- 남은 수: final denominator unresolved; Jev-snapshot arithmetic alone is not a proven all-corpus remaining count.
- Jev 통합 수: 1 existing Jev item repaired/consumed this run.
- 새 canonical bundle 수: 0 unique (bundle files were missing/incomplete and were filled for an already-counted ID).
- 본문·댓글·이미지: body verified / 6 selected from publicly visible comments / body media 0 observed.
- CUT_PLAN·PROGRAM_ASSEMBLY_ORDER: 7 / 1.
- blocker: final all-existing inventory denominator unresolved; full 43-comment set not exhaustively read; rights/privacy/defamation/human review incomplete.

## Prior normalized bundles
- `blind-cn6hnlfx`
- `blind-ftu7d1tv`
- `blind-g1gb3ari`
- `inven-2727679`
- `inven-3290621`
- `blind-L5aQCt8c`
- `inven-index-mz-9months`
- `inven-4061413`
- `inven-2727900`
- `inven-2424028`
- `theqoo-425048627`
- `theqoo-3240588755`
- `theqoo-1913908638`
- `theqoo-1924192134`
- `theqoo-2280791561`
- `theqoo-263633450`
- `natepann-373653563`
- `theqoo-2747645645`

## Sequential candidate automation
- Continue another already-existing raw/Jev/candidate file only. No new-material discovery.
- Prefer deterministic inventory reconciliation alongside conversion so the true denominator can be reported without guessing.

## TEMP TEST ONLY conversion lane
- Existing production/test state remains untouched. This automation must not enter `03_PRODUCTION`.
- REAL publishing/metrics remains disabled. Only `04_REVIEW_PUBLISH` may publish after human rights/privacy/safety approval.
