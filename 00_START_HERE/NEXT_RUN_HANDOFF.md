# NEXT RUN HANDOFF

Updated: 2026-09-18 16:19 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## Binding format
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL original body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
Latest useful Discovery remains **40+ raw / 15 retained C1** from 2026-09-18 10:37 KST. Top lanes remain Blind `공직자윤리법 재산등록 대출???`, TheQoo `같은 대기업 다니고 돈 많아 믿었는데…동료 30명 속여 70억원 가로챈 40대女`, TheQoo `[네이트판] 취집한 친구 너무 얄밉네요...`, Reddit hidden ~$300k spouse debt, Reddit $500 bridesmaid bracelet/cash-gift conflict.

## Existing real asset progress
For TheQoo `결혼 승낙 받자마자 탈모인거 밝힌 남편..`, one real Chrome full-page PNG exists plus eight attached source JPEGs. Human-reviewed crop provenance is stored at `data/source-packages/theqoo-3826792703/review/crop-plan.json`. Five ordered 1080x1080 screenshot-derived body slides exist at `carousel/body-00.png` through `body-04.png`; all were visually inspected previously. They preserve source order and use contain/padding rather than destructive final cropping.

## Material progress this run
Added `scripts/assemble-rendered-source-carousel.mjs` at Threads commit `b77fa4fd5ded63e0134a3164d6b46dfb0cfe99de`. It deterministically assembles a real 1080x1080 cover plus sequential `body-00.png` onward into `slide-01.png` onward. It fails closed on non-PNG/non-1080 assets or sequence gaps, byte-copies body slides without rewriting/stretching/masking/regeneration, removes stale `slide-NN.png` outputs, and records source SHA-256/bytes/dimensions in an assembly manifest. Publication stays false and owned by `04_REVIEW_PUBLISH`; OCR/privacy masking/rights/publication/human visual approval remain explicitly unclaimed.

This complements `validate-rendered-source-carousel.mjs`: assembler creates the deterministic package, validator checks it against the strict source-backed plan. It does not fabricate the missing cover or claim final carousel completion.

## Verification truth
Remote Windows/browser device `KJW` was checked and is currently offline. Therefore the new assembler was not runtime-executed here; `npm run check`, server smoke and Chrome E2E are not claimed this run. GitHub contents API committed the implementation. No source bytes or temporary artifacts were altered.

## Run truth
Discovery this implementation run: **raw 0 / retained 0**. New full-post screenshots: **0**. Existing full-page screenshot overall: **1 real PNG**. Existing attached source media: **8 JPEGs**. Existing reviewed body slides: **5**. Real final source-backed carousel: **NO — exact-title cover/rendered six-slide package still pending**. A1/P1 remain 0; only 04 may publish.

## Next
1. When executable device is online, render slide 1 using exact original title `결혼 승낙 받자마자 탈모인거 밝힌 남편..` plus selected image, with no title rewrite.
2. Run `assemble-rendered-source-carousel.mjs` to byte-preserve the five reviewed body slides as slide 2–6; build/validate source-backed plan; run `validate-rendered-source-carousel.mjs`.
3. Inspect all six in real Chrome and complete `npm run check`; record only observed results.
4. Continue Korean-community-first high-volume Discovery/acquisition and acquire additional full-post screenshots. Do not advance rights/publication state without evidence.