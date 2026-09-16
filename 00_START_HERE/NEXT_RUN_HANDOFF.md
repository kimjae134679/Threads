# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-17 04:18 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Material implementation this run
Repaired the stale `test/source-package.test.mjs` fixture that was blocking the stricter Source Package contract. The complete-body fixture now supplies real-contract acquisition state, source sequence, source dimensions and provenance for every body screenshot, expects current schema v5, and asserts `bodyAssetsAcquired=true` / `completeBodyEvidence=true`. Added a negative regression assertion proving that `fullBodyCaptureStatus=complete` is rejected when acquisition/dimensions evidence is missing.

Commit: `20830b69deacd0881476f7c8d8a2e139e4880454` (`test: align source package fixture with acquired evidence contract`).

## Test truth
The previously known `source-package.test.mjs` fixture mismatch has been corrected in repo. This automation environment does not expose a runnable repository checkout/Node process, so `npm run check`, server smoke and browser E2E were **not run in this turn** and are not claimed passing. Next runnable checkout should execute the targeted source-package test first, then `npm run check`.

## Latest Discovery baseline
Most recent Discovery refresh inspected **raw 40+ leads/results** and retained **10 new C1 candidates**. Top acquisition priorities remain `주식으로 8천날림` → `[인증] 하루 5.2억 손실, 한 달 15억 손실` → `결혼 한달 남았는데 파혼..` → `부모님 결혼 반대(나는 남자)`.

## Asset truth
Full-post screenshots captured this run: **0**.
Actual source bytes acquired: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**.
Candidates remain `ASSETS_PENDING`, `publicationAllowed=false`; rights/privacy/human review gates remain. No OCR/moderation/rights/publication success was inferred.

## Existing implementation state
`scripts/plan-screenshot-normalization.mjs` remains the normalization path: ordered 1080×1080 `CONTAIN_NO_STRETCH`, no body crop, UI-chrome crop manual/verified only, privacy masking user-directed. Source Package requires complete body evidence before a package can truthfully leave `ASSETS_PENDING`.

## Next concrete priority
1. On a runnable checkout, run targeted source-package test + `npm run check`; fix any remaining real failures rather than weakening contracts.
2. Acquire complete original-post screenshots/source media for `주식으로 8천날림`, `[인증] 하루 5.2억 손실, 한 달 15억 손실`, then `결혼 한달 남았는데 파혼..`.
3. Preserve every body screen in order; crop UI chrome only, never body text; no automatic privacy masking.
4. Run screenshot intake + normalization planner and verify order/dimensions/hash/provenance.
5. Build 1080×1080 cover + complete original screenshot carousel and Chrome-verify before A1. Only `04_REVIEW_PUBLISH` may create P1.
