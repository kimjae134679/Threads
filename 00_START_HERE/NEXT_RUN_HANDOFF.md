# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-17 05:18 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Material work this run — screenshot normalization ordering hardening
Updated `scripts/plan-screenshot-normalization.mjs` at repo tip. The planner now rejects an empty intake manifest, missing/non-positive/non-integer `sourceSequence`, duplicate sequence values, and input whose sequence is not already strictly increasing. It records `sourceSequencePolicy=PRESERVE_STRICT_INPUT_ORDER`. This prevents the normalization stage from silently accepting reordered or duplicated original-post screenshots. Existing no-stretch 1080×1080 containment, `bodyCropAllowed=false`, manual/verified UI-chrome crop only, user-directed privacy masking only, `publicationAllowed=false`, and `04_REVIEW_PUBLISH` ownership remain unchanged.

Threads implementation commit: `79697759f766521b10b2fe934fabd57612b9e70f`.

## Latest Discovery baseline
Latest useful discovery run inspected **raw 40+ leads/results** and retained **15 candidates (12 C1 + 3 C0)**. Top candidates remain the debt-forgiveness wedding gift, secretly altered late-mother wedding dress, $3,000 wedding gift followed by demand for the balance, job-devaluation/pretend-quitting story, Blind `화담숲 예약 킹받는다.` C0, Blind bitcoin-teacher lead, and the receipt-written/published-novel shared-media post.

## Asset truth
Full-post screenshots captured: **0**.
Actual source bytes acquired: **0**.
Completed real source-backed carousel: **NO**.
A1/P1: **0**.
Candidates requiring real source assets remain `ASSETS_PENDING`. No OCR/moderation/rights/publication success is inferred.

## Test truth
This automation environment exposes GitHub file operations but no runnable repository checkout/Node/Chrome process. The changed script was inspected structurally, but `npm run check`, server smoke and browser E2E were not run this turn and are not claimed passing.

## Next concrete priority
1. Continue Korean-first high-volume discovery and exact-URL/full-body verification for strongest C0 leads.
2. Acquire complete original-post screenshots/source media for `주식으로 8천날림`, `[인증] 하루 5.2억 손실, 한 달 15억 손실`, then strongest retained candidates.
3. Run screenshot intake → hardened normalization planner and preserve every original body screen in strict source order.
4. Crop UI chrome only after manual/verified bounds; never crop body text and do not automatically privacy-mask.
5. Build 1080×1080 cover + complete original screenshot carousel and Chrome-verify before A1. Only `04_REVIEW_PUBLISH` may create P1.
