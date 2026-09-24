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

## 2026-09-24 21:17 KST — Existing-corpus normalization
- New discovery: **0**.
- Converted existing C1 `data/candidates/260916_C0_A0_P0_27살여자오늘파혼.md` into `01_DISCOVERY/data/candidate_bundles/blind-ftu7d1tv/`.
- Exact original Blind URL/body and publicly exposed comments reverified.
- BODY 01~08 / CUT_PLAN 8 / PROGRAM_ASSEMBLY_ORDER written.
- Current observed metrics: 5,821 views / 55 comments / 14 likes; legacy observation 2,096 views / 39 comments retained separately.
- Five actually exposed/read comments selected; full 55-comment set not claimed as read.
- No source-body content media observed; avatar/ads/UI excluded.
- `publicationAllowed=false`; no downstream work.
- Cumulative canonical bundles now: **18**.
- Existing Jev batch snapshot: 1,273 candidates; current repo candidate Markdown count was previously observed higher, so deterministic full-corpus denominator still needs reconciliation before claiming remaining count.
- Next: continue another already-existing raw/Jev/candidate file only. No new-material discovery.

## Prior normalized bundles
- `blind-cn6hnlfx`
- `blind-ftu7d1tv`
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
- Sequential work means existing-corpus normalization only. Do not rebuild a new-discovery queue.

## TEMP TEST ONLY conversion lane
- Existing production/test state remains untouched. This automation must not enter `03_PRODUCTION`.
- REAL publishing/metrics remains disabled. Only `04_REVIEW_PUBLISH` may publish after human rights/privacy/safety approval.
