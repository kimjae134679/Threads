# NEXT RUN HANDOFF

Updated: 2026-09-18 15:15 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## Binding format
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL original body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
Latest useful Discovery remains **40+ raw / 15 retained C1** from 2026-09-18 10:37 KST. Top lanes remain Blind `공직자윤리법 재산등록 대출???`, TheQoo `같은 대기업 다니고 돈 많아 믿었는데…동료 30명 속여 70억원 가로챈 40대女`, TheQoo `[네이트판] 취집한 친구 너무 얄밉네요...`, Reddit hidden ~$300k spouse debt, Reddit $500 bridesmaid bracelet/cash-gift conflict.

## Existing real asset progress
For TheQoo `결혼 승낙 받자마자 탈모인거 밝힌 남편..`, one real Chrome full-page PNG exists plus eight attached source JPEGs. Human-reviewed crop provenance is stored at `data/source-packages/theqoo-3826792703/review/crop-plan.json`. Five ordered 1080x1080 screenshot-derived body slides exist at `carousel/body-00.png` through `body-04.png`; all were visually inspected in the previous run. They preserve the source order and use contain/padding rather than destructive final cropping.

## Material progress this run
Added `scripts/validate-rendered-source-carousel.mjs` at Threads commit `b891dc73fd13717f2ea2f700bc4243783647a120`. It fail-closes the final rendered artifact directory against a `SOURCE_BACKED_CAROUSEL_PLAN`: exact slide count, deterministic `slide-01.png` naming/order, slide 1 COVER_ONLY, slide 2+ ORIGINAL_POST_SCREENSHOT only, every rendered file real PNG and exactly 1080x1080, SHA-256/byte provenance recorded, and publication remains disabled under `04_REVIEW_PUBLISH`. Its output explicitly does not claim OCR, automatic privacy masking, rights clearance, publication, delivery, or human visual approval.

This closes a missing structural verification gap between the strict carousel plan and actual rendered files. It does **not** fabricate a cover or claim the first final carousel exists.

## Verification truth
Remote executable/browser device was unavailable this run, so runtime execution, `npm run check`, server smoke, and Chrome E2E are not claimed. The new validator was committed through GitHub contents API. No source bytes were altered and no temporary artifacts were created.

## Run truth
Discovery this implementation run: **raw 0 / retained 0**. New full-post screenshots: **0**. Existing full-page screenshot overall: **1 real PNG**. Existing attached source media: **8 JPEGs**. Existing reviewed body slides: **5**. Real final source-backed carousel: **NO — cover/rendered six-slide package still pending**. A1/P1 remain 0; only 04 may publish.

## Next
1. On an executable device, create slide 1 from exact original title `결혼 승낙 받자마자 탈모인거 밝힌 남편..` plus a selected image, without rewriting/sensationalizing.
2. Assemble `slide-01.png` cover + the five reviewed body slides as `slide-02.png`..`slide-06.png`, build/validate the source-backed plan, then run `validate-rendered-source-carousel.mjs`.
3. Inspect all six in real Chrome and complete `npm run check`; record only observed results.
4. Continue Korean-community-first high-volume Discovery/acquisition and acquire additional full-post screenshots. Do not advance rights/publication state without evidence.