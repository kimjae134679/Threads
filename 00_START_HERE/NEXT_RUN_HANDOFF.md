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

## 2026-09-24 12:14 KST — Existing-corpus normalization
- New discovery: **0**.
- Converted existing candidate `01_DISCOVERY/data/candidates/2026-09-23_inven_japan-study-marriage-story_C1.md` into `data/candidate_bundles/inven-2424028/`.
- Created `candidate.md`, `content.txt`, `comments.txt`, `manifest.json`.
- Exact public Inven source reverified. Long narrative body is readable and was segmented into BODY 01–14 covering Japan-study origin, military service, relationship/marriage, employment, home purchase/loan, and Q&A.
- `content.txt` includes 9 natural CUT points and final PROGRAM_ASSEMBLY_ORDER.
- Two inline body images are linked by the source. IMAGE:001 direct public asset resolved and identified as the 2023-05-24 loan transaction table; repository media bytes were not imported this pass. IMAGE:002 is positioned after the current-salary section, but its asset fetch timed out, so it remains BLOCKED.
- Comment count 21 is visible but actual comment text is not exposed; `comments.txt` remains BLOCKED rather than invented.
- Current page snapshot showed views 15,254 / recommendations 9 / comments 21; treat views as volatile.
- `publicationAllowed=false`; C1/PARTIAL; no downstream work.
- Cumulative canonical bundles now: **9**.
- Full deterministic legacy/raw candidate total is still not established; do not claim remaining count yet.
- Next: continue another already-existing raw/Jev/candidate file only. No new-material discovery.

## Prior normalized bundles
- `blind-cn6hnlfx` — 25살 연애 불가능할까; PARTIAL, source re-open blocked.
- `blind-ftu7d1tv` — 27살 여자 오늘 파혼; body verified, selected visible comments.
- `inven-2727679` — 41세 비혼녀; image-driven, body asset unresolved.
- `inven-3290621` — 아버지 회사/임플란트 썰; body verified, image identity blocked.
- `blind-L5aQCt8c` — 남자친구 화내는거 처음 봄; body + selected visible comments verified.
- `inven-index-mz-9months` — MZ신입 9개월; C0/PARTIAL, direct URL/body/comments/media unresolved.
- `inven-4061413` — 회사 불륜/퇴사 썰; body verified, comments text blocked, no body-content media.
- `inven-2727900` — 여친이 삐졌을때 하지말아야하는 행동; C1/PARTIAL, body image observed but exact asset/provenance blocked, comments text blocked.
- `inven-2424028` — 일본 유학 및 결혼 썰; C1/PARTIAL, body verified, IMAGE:001 direct asset resolved, IMAGE:002 fetch blocked, comments text blocked.

## Sequential candidate automation
- Sequential work means existing-corpus normalization only. Do not rebuild a new-discovery queue.

## TEMP TEST ONLY conversion lane
- Existing production/test state remains untouched. This automation must not enter `03_PRODUCTION`.
- REAL publishing/metrics remains disabled. Only `04_REVIEW_PUBLISH` may publish after human rights/privacy/safety approval.
