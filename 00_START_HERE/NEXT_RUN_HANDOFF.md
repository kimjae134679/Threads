# NEXT RUN HANDOFF

Updated: 2026-09-18 19:19 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## Binding format
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL original body. Cover uses the exact original title by default. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Discovery truth
Latest full high-volume useful Discovery remains **40+ raw / 15 retained C1** from 2026-09-18 10:37 KST. Latest focused Korean acquisition refresh was **13 raw / 6 retained exact-source leads** at 18:14 KST in `data/_raw_batches/discovery-2026-09-18-1814.md`. Top new leads include TheQoo `[판] 전업주부 하려고 대학 나왔냐는 시어머니` (84,564 views / 576 comments observed), `판) 임밍아웃 몰카 왜 하는 건가요?` (146,987 / 701), and `결혼 5년차 아내 불면증 고친 남편` (15,726 / 30; three image entries observed, image body unread). All remain `ASSETS_PENDING`.

## Existing real asset progress
For TheQoo `결혼 승낙 받자마자 탈모인거 밝힌 남편..`, one real Chrome full-page PNG exists plus eight attached source JPEGs. Human-reviewed crop provenance is at `data/source-packages/theqoo-3826792703/review/crop-plan.json`. Five ordered 1080x1080 screenshot-derived body slides exist at `carousel/body-00.png` through `body-04.png` and were visually inspected previously.

Strict pipeline remains `create-source-carousel-plan.mjs` → `assemble-rendered-source-carousel.mjs` → `validate-rendered-source-carousel.mjs` and fails closed on invalid/gapped/non-1080 assets.

## Material progress this run
Added `scripts/build-exact-title-cover-html.mjs` (commit `f26699b40b7c1b7ebb5cd0509c9b0e14d21c5328`) and wired it into `npm run syntax` (commit `b8ad2176dcb7c92907f7baec96a801c4d5eb90b5`). It creates a fixed 1080x1080 browser cover preview from an explicitly supplied real image and exact original title, using cover-only composition with image, restrained gradient, source label and title. It rejects empty/unsupported image files and does not generate or rewrite the title. Its output explicitly reports `renderedPng:false`, so HTML generation cannot be mistaken for a finished PNG or verified carousel.

## Verification truth
Remote Windows/browser device `KJW` is still offline (last seen 2026-09-18 14:29 KST). Therefore no executable runtime, `npm run check`, server smoke, cover PNG, new screenshot capture or Chrome E2E is claimed. GitHub contents API committed the code/package changes and this handoff. No publication action occurred.

## Run truth
Discovery this run: **raw 0 / retained 0**; latest full useful Discovery remains **40+ / 15 C1**, latest focused refresh **13 / 6**. New full-post screenshots: **0**. Existing full-page screenshot: **1 real PNG**. Existing attached source media: **8 JPEGs**. Existing reviewed body slides: **5**. Real final source-backed carousel: **NO — exact-title cover PNG/rendered six-slide package still pending**. A1/P1 remain 0; only 04 may publish.

## Next
1. When KJW is online, run the exact-title cover builder with `결혼 승낙 받자마자 탈모인거 밝힌 남편..` and a selected existing real source image; open at 1080x1080 in Chrome and capture/inspect the actual cover PNG.
2. Run strict plan → assemble → rendered validator; inspect all six slides in Chrome; run `npm run check` and server smoke where relevant. Record only observed results.
3. Acquire full-post screenshots for the strongest new TheQoo leads and continue a 40–80 raw Korean-community discovery pass when coverage permits.
4. Do not advance rights/publication state without evidence.