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

## 2026-09-24 11:14 KST — Existing-corpus normalization
- New discovery: **0**.
- Converted existing raw-batch candidate `260916_C1_A0_P0_여친이삐졌을때하지말아야하는행동` from `data/_raw_batches/260916_C1_A0_P0_discovery_0333.json` into `data/candidate_bundles/inven-2727900/`.
- Created `candidate.md`, `content.txt`, `comments.txt`, `manifest.json`.
- Exact public Inven source reverified: title `여친이 삐졌을때 하지말아야하는 행동`; body image exists; visible author text is `😂😂`; recommendations 2 / comments 11. Do not merge volatile view snapshots.
- Program structure recorded as TITLE → IMAGE:001(BLOCKED) → BODY 01. Added CUT_PLAN around title/image/reaction.
- Exact body image bytes/direct asset URL and original provenance/rights remain unresolved; no fake `media/` asset was created and UI/profile images were excluded.
- Actual comment text was not exposed in this verification; only count 11 verified. `comments.txt` is explicit BLOCKED rather than invented.
- `publicationAllowed=false`; C1/PARTIAL; no downstream work.
- Cumulative canonical bundles now: **8**.
- Full deterministic legacy/raw candidate total is still not established; do not claim remaining count yet.
- Next: continue another already-existing raw/Jev candidate only. No new-material discovery.

## Prior normalized bundles
- `blind-cn6hnlfx` — 25살 연애 불가능할까; PARTIAL, source re-open blocked.
- `blind-ftu7d1tv` — 27살 여자 오늘 파혼; body verified, selected visible comments.
- `inven-2727679` — 41세 비혼녀; image-driven, body asset unresolved.
- `inven-3290621` — 아버지 회사/임플란트 썰; body verified, image identity blocked.
- `blind-L5aQCt8c` — 남자친구 화내는거 처음 봄; body + selected visible comments verified.
- `inven-index-mz-9months` — MZ신입 9개월; C0/PARTIAL, direct URL/body/comments/media unresolved.
- `inven-4061413` — 회사 불륜/퇴사 썰; body verified, comments text blocked, no body-content media.
- `inven-2727900` — 여친이 삐졌을때 하지말아야하는 행동; C1/PARTIAL, body image observed but exact asset/provenance blocked, comments text blocked.

## Sequential candidate automation
- Sequential work means existing-corpus normalization only. Do not rebuild a new-discovery queue.

## TEMP TEST ONLY conversion lane
- Existing production/test state remains untouched. This automation must not enter `03_PRODUCTION`.
- REAL publishing/metrics remains disabled. Only `04_REVIEW_PUBLISH` may publish after human rights/privacy/safety approval.
