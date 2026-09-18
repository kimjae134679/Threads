# NEXT RUN HANDOFF

Updated: 2026-09-19 KST

## AUTOMATION-SPECIFIC OVERRIDE — DISCOVERY ONLY
For the `Threads 소재 발굴` automation, the user's explicit automation instruction is narrower than the general sequential-candidate handoff and therefore wins for that automation: **01_DISCOVERY only**. Do not enter 02_EDITORIAL_SCORING, 03_PRODUCTION, 04_REVIEW_PUBLISH, or 05_EXPERIMENTS_ACCOUNTS. Do not capture/download source media, render, run Chrome E2E, publish/schedule, or modify existing production artifacts. Keep A0/P0 and `publicationAllowed=false`.

## Latest discovery run — 2026-09-19 04:20 KST
- Broad public search pass covered roughly 40+ surfaced/raw results across Korean-community-first queries (Blind, TheQoo, FMKorea, DCInside, Ruliweb, Ppomppu, Inven, Arca and others where publicly indexed); Instiz/Clien were robots-blocked and were not bypassed.
- Retained **15 new C1 candidates**, all with exact individual public URLs verified and no A1/P1 promotion.
- Top new hooks include:
  - `모은 돈 5천이라던 남친, 알고 보니 재산이 4억이었습니다`
  - `9년 연애했는데 처가 사정 때문에 결혼을 말립니다`
  - `2만원 입장료로 시작된 싸움이 이혼 얘기까지 갔습니다`
  - `이름도 모른 채 소개팅을 세 번이나 만났습니다`
  - `타일 8장 고치는데 60세대 동의를 받아오랍니다`
- Candidate titles follow `01_DISCOVERY/TITLE_STYLE_GUIDE.md`: punchy display H1 while preserving exact observed source title separately.
- No screenshot/media acquisition, OCR, moderation, rights clearance, production, rendering, browser E2E, or publishing was performed.

## General repository state (non-automation work)
The repository also contains a separate sequential-candidate program and TEMP TEST ONLY conversion lane from other user instructions. Those are **out of scope for the 소재 발굴 automation** and must not be advanced by it.

Current known inventory before this batch was 583 candidates (C0 76 / C1 507 / A0 583 / P0 583); this discovery run added 15 C1 files. Do not infer refreshed queue totals without running the repository's queue refresh in an appropriate non-discovery workflow.

## Publication ownership / safety
Only **04_REVIEW_PUBLISH** may actually publish or mark P1. Human rights/privacy/safety approval remains required. Discovery automation must never auto-publish.

## Next discovery run
Continue Korean-community-first discovery of new material and exact-source verification of existing candidates. Prefer 40–80 raw leads when public search quality allows, retain only genuinely story-worthy items, and do not fill quotas with weak material. Preserve exact observed title, observed metrics only, body/comment read status, asset-presence observation, and exact acquisition/provenance state.