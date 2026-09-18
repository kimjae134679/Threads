# NEXT RUN HANDOFF

Updated: 2026-09-18 22:14 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## Binding format
Slide 1 cover only: one image plus exact original title/hook text; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL original body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Discovery truth
Latest full high-volume useful Discovery remains **40+ raw / 15 retained C1** from 2026-09-18 10:37 KST. Latest focused Korean acquisition refresh remains **13 raw / 6 retained exact-source leads** at 18:14 KST in `data/_raw_batches/discovery-2026-09-18-1814.md`. Top leads remain TheQoo `[판] 전업주부 하려고 대학 나왔냐는 시어머니`, `판) 임밍아웃 몰카 왜 하는 건가요?`, and `결혼 5년차 아내 불면증 고친 남편`; all remain `ASSETS_PENDING`.

## Real asset progress
For TheQoo `결혼 승낙 받자마자 탈모인거 밝힌 남편..`, one real Chrome full-page PNG plus eight attached source JPEGs exist. Human-reviewed crop provenance is at `data/source-packages/theqoo-3826792703/review/crop-plan.json`; five ordered 1080x1080 screenshot-derived body slides are at `carousel/body-00.png` through `body-04.png`.

## Material progress this run
Browser/runtime access returned. Rendered a real 1080x1080 cover in Chrome from existing source image `original/01.jpg` and the exact original title. First render exposed title clipping; fixed `build-exact-title-cover-html.mjs` by reducing title size and moving the title safe area upward, rerendered, and visually inspected the corrected cover. Then generated the strict six-slide plan, assembled `rendered/slide-01.png` through `slide-06.png`, and ran `validate-rendered-source-carousel.mjs`: **validated=true, slideCount=6**, with SHA-256 byte identity to the planned cover/body files. Material commit: `90466f181676fb4a180f48585733cd6d34ff855c`.

## Verification truth
`npm.cmd run check` completed with exit code 0. Its actual ffmpeg/ffprobe vertical-video regression also passed at 1080x1920 H.264/yuv420p/30fps. The corrected cover PNG was actually rendered by Chrome and visually inspected. The five body slides had already been visually inspected in the preceding source-crop run and assembly copies them byte-for-byte; validator confirms all six assembled files are byte-identical to plan. No OCR, moderation, automatic privacy masking, rights clearance, delivery or publication occurred.

## Run truth
Discovery this run: **raw 0 / retained 0**; latest full useful Discovery **40+ / 15 C1**, latest focused refresh **13 / 6**. New full-post screenshots this run: **0**. Existing full-page screenshot: **1 real PNG**. Existing attached source media: **8 JPEGs**. Existing reviewed body slides: **5**. Full-post screenshots captured: **YES, existing real full-page capture covers this selected post**. Real source-backed carousel produced: **YES — 6 slides (1 exact-title/source-image cover + 5 ordered screenshot-derived body slides), structurally and byte-fidelity validated**. This is production output only, not rights clearance or publication approval. A1/P1 remain 0; only `04_REVIEW_PUBLISH` may publish.

## Next
1. Acquire full-post screenshots for the strongest new TheQoo leads and run another 40–80 raw Korean-community-first discovery pass when coverage permits; retain 15–30 genuinely usable candidates.
2. Apply the same screenshot-intake/crop/normalization/strict-carousel pipeline to the strongest acquired candidate; keep missing assets `ASSETS_PENDING`.
3. Add browser E2E around the actual six-slide review surface if the app has a suitable review route, without treating the old black Demo Showcase as user-facing quality.
4. Do not advance rights/publication state without evidence; only 04 may publish.