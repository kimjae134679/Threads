# NEXT RUN HANDOFF

Updated: 2026-09-18 12:17 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## Binding user-facing format
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS/media covering the FULL original body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
Latest useful Discovery at 2026-09-18 10:37 KST inspected **40+ raw leads** and retained **15 new C1 candidates**. Top lanes: Blind `공직자윤리법 재산등록 대출???`, TheQoo `같은 대기업 다니고 돈 많아 믿었는데…동료 30명 속여 70억원 가로챈 40대女`, TheQoo `[네이트판] 취집한 친구 너무 얄밉네요...`, Reddit hidden ~$300k spouse debt, and Reddit $500 bridesmaid bracelet/cash-gift conflict. Restricted sources were not bulk crawled or bypassed.

## Existing real source package
`data/source-packages/theqoo-3826792703/` contains eight real source-linked JPEGs in page order for `결혼 승낙 받자마자 탈모인거 밝힌 남편..`, 534,020 bytes total. This run visually inspected all eight files: they are source-attached TV-frame media, not browser/full-post screenshots. Therefore they must not be mislabeled as captured full-post screenshots or by themselves satisfy full-body completeness. OCR was not run; privacy was not auto-masked; rights clearance is not claimed; publication remains false/04-only.

## This implementation run
Pulled current `main` in the executable Windows checkout and visually inspected all eight TheQoo assets. Fixed an acquisition-provenance ambiguity in `scripts/build-screenshot-intake-manifest.mjs`: it now accepts explicit `SOURCE_MEDIA_DOWNLOAD`, whose provenance states that downloaded post-linked media does NOT claim a full-post screenshot or full-body completeness. Generated `data/source-packages/theqoo-3826792703/intake-manifest.json` from the real eight files, recording deterministic order, dimensions, byte lengths and SHA-256 while leaving completeness pending. Threads commit: `ca6808e`.

`npm run check` passed after the change. No Chrome user-facing E2E was run this implementation run, so none is claimed.

## Run truth
Discovery this implementation run: **raw 0 / retained 0**; latest useful Discovery remains **40+ / 15 C1**. Full-post screenshots captured this run: **0**. New source bytes: **0**. Real final source-backed carousel produced this run: **NO**. Existing source media remains 8 images / 534,020 bytes. A1/P1 remains 0; `publicationAllowed=false` and only 04 may publish.

## Next
1. Acquire actual permitted full-post/browser screenshots for a strong Korean C1 candidate; do not treat attached media alone as the screenshot body unless the captured post itself establishes that sequence as the complete original body.
2. Run real screenshot bytes through intake → human completeness review → UI-chrome crop review → normalization → strict 1080x1080 cover + ordered-original carousel.
3. Inspect the first real carousel in Chrome; do not count the legacy black text-only Demo Showcase.
4. Continue Korean-community-first high-volume Discovery and keep A0/P0 until evidence gates are actually satisfied.
