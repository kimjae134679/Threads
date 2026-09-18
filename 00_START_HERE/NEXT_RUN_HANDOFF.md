# NEXT RUN HANDOFF

Updated: 2026-09-18 21:16 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## Binding format
Slide 1 cover only: one image plus exact original title/hook text; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL original body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Discovery truth
Latest full high-volume useful Discovery remains **40+ raw / 15 retained C1** from 2026-09-18 10:37 KST. Latest focused Korean acquisition refresh was **13 raw / 6 retained exact-source leads** at 18:14 KST in `data/_raw_batches/discovery-2026-09-18-1814.md`. Top leads remain TheQoo `[판] 전업주부 하려고 대학 나왔냐는 시어머니` (84,564 views / 576 comments observed), `판) 임밍아웃 몰카 왜 하는 건가요?` (146,987 / 701), and `결혼 5년차 아내 불면증 고친 남편` (15,726 / 30; three image entries observed, image body unread). All remain `ASSETS_PENDING`.

## Existing real asset progress
For TheQoo `결혼 승낙 받자마자 탈모인거 밝힌 남편..`, one real Chrome full-page PNG exists plus eight attached source JPEGs. Human-reviewed crop provenance is at `data/source-packages/theqoo-3826792703/review/crop-plan.json`. Five ordered 1080x1080 screenshot-derived body slides exist at `carousel/body-00.png` through `body-04.png` and were visually inspected previously.

Strict pipeline remains `create-source-carousel-plan.mjs` → `assemble-rendered-source-carousel.mjs` → `validate-rendered-source-carousel.mjs` and fails closed on invalid/gapped/non-1080 assets.

## Material progress this run
Strengthened `scripts/validate-rendered-source-carousel.mjs` at commit `747f400ce82ac55b0594abfc4f3f6cb60012f9f4`. The rendered validator now requires every assembled `slide-NN.png` to be byte-identical (SHA-256, plus planned byte count/dimensions when present) to the corresponding planned cover/body PNG. This closes a fidelity gap where a 1080x1080 PNG of the right kind/order could previously pass even if its pixels differed from the source-backed plan. Validation output now records `byteIdenticalToPlan:true` per slide and `allSlidesByteIdenticalToPlan:true`. This is deliberately not a claim of full-post completeness or human visual approval.

## Verification truth
No executable browser/runtime was available in this run, so `npm run check`, server smoke, cover PNG rendering and Chrome E2E are **not claimed**. The code change was committed through GitHub contents API. No OCR, moderation, automatic privacy masking, rights clearance, delivery or publication action occurred.

## Run truth
Discovery this run: **raw 0 / retained 0**; latest full useful Discovery remains **40+ / 15 C1**, latest focused refresh **13 / 6**. New full-post screenshots: **0**. Existing full-page screenshot: **1 real PNG**. Existing attached source media: **8 JPEGs**. Existing reviewed body slides: **5**. Real final source-backed carousel: **NO — exact-title cover PNG/rendered six-slide package still pending**. A1/P1 remain 0; only 04 may publish.

## Next
1. When the browser device is online, build the strict cover with exact title `결혼 승낙 받자마자 탈모인거 밝힌 남편..` and a selected existing real source image; open at 1080x1080 in Chrome and capture/inspect the actual cover PNG.
2. Run strict plan → assemble → rendered validator; the validator must now prove byte identity to the plan. Inspect all six slides in Chrome; run `npm run check` and server smoke where relevant. Record only observed results.
3. Acquire full-post screenshots for the strongest new TheQoo leads and continue a 40–80 raw Korean-community discovery pass when coverage permits.
4. Do not advance rights/publication state without evidence.