# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-17 03:16 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Material change this run — screenshot normalization
Added `scripts/plan-screenshot-normalization.mjs`. It consumes a real `SCREENSHOT_INTAKE_MANIFEST` and creates an ordered 1080×1080 normalization plan for every source screenshot using `CONTAIN_NO_STRETCH`. It records scaled dimensions and exact padding, explicitly forbids body cropping, leaves UI-chrome crop to manual/verified suggestion only, and keeps privacy masking user-directed. It does not infer full-body completeness, OCR, moderation, rights or publication readiness.

This closes part of the screenshot-intake priority: ordered source dimensions can now be normalized to square feed output without stretching or silently cropping original body content. It does not create substitute body cards.

## Discovery baseline carried forward
No new discovery run was performed in this implementation-focused run. Latest useful discovery baseline remains **raw 40+ / retained 15 C1** from the 02:35 Korean-community-first refresh.
Top candidates remain `주식으로 8천날림`, `[인증] 하루 5.2억 손실, 한 달 15억 손실`, `27살 여자 오늘 파혼했어요 눈물나는데 잘한거 맞죠?`, and `이거 어떻게 복수해줄까요?ㅠㅠ`.

## Asset truth
Full-post screenshots captured this run: **0**.
Actual source bytes acquired: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**.
Candidates remain `ASSETS_PENDING`, `publicationAllowed=false`; rights/privacy/human review gates remain. No OCR/moderation/rights/publication success was inferred.

## Verification truth
`node --check scripts/plan-screenshot-normalization.mjs` passed on the authorized Windows checkout. `npm run check` was run and failed in the pre-existing `test/source-package.test.mjs` fixture because `fullBodyCaptureStatus=complete` now requires acquired body assets with provenance/source dimensions. Do not claim the full suite passes until that fixture is updated to the stricter source-package contract. No Chrome E2E was run because this change is a CLI planning path and no real source screenshots were available.

## Next concrete priority
1. Acquire complete original-post screenshots/source media for `주식으로 8천날림`, then `[인증] 하루 5.2억 손실, 한 달 15억 손실`, `27살 여자 오늘 파혼했어요 눈물나는데 잘한거 맞죠?`, and `이거 어떻게 복수해줄까요?ㅠㅠ`.
2. Preserve every body screen in order; crop UI chrome only, never body text; no automatic privacy masking.
3. Run screenshot intake, then the new normalization planner; verify order/dimensions/hash/provenance.
4. Build 1080×1080 cover + complete original screenshot carousel and Chrome-verify before A1. Only `04_REVIEW_PUBLISH` may create P1.
