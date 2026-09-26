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
