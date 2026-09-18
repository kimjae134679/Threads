# NEXT RUN HANDOFF

Updated: 2026-09-18 13:25 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## Binding user-facing format
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL original body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
Latest useful Discovery remains **40+ raw / 15 retained C1** from 2026-09-18 10:37 KST. Top lanes: Blind `공직자윤리법 재산등록 대출???`, TheQoo `같은 대기업 다니고 돈 많아 믿었는데…동료 30명 속여 70억원 가로챈 40대女`, TheQoo `[네이트판] 취집한 친구 너무 얄밉네요...`, Reddit hidden ~$300k spouse debt, Reddit $500 bridesmaid bracelet/cash-gift conflict. Restricted sources were not bulk crawled or bypassed.

## Material progress this run
Using real Chrome headless + Chrome DevTools Protocol in the executable Windows checkout, captured the public TheQoo post `결혼 승낙 받자마자 탈모인거 밝힌 남편..` after scrolling the entire document to trigger lazy-loaded media. The resulting real browser screenshot is `data/source-packages/theqoo-3826792703/screenshots/full-page-20260918-1319.png`, **1103×13187 / 1,442,565 bytes**. Visual inspection confirms the title/post header and all eight previously acquired source-attached TV-frame images are rendered in source order; comments/list UI also remain below the post and must be cropped away before carousel use. This is the first actual browser/full-page source screenshot byte acquired for this package.

Added dependency-free `scripts/capture-full-post-cdp.mjs`, which connects to an already-authorized local Chrome CDP port, navigates to an exact public URL, scrolls through the document to load lazy media, captures beyond the viewport, and explicitly states that human completeness review is still required. It does not OCR, rewrite, auto-mask privacy, infer rights, or publish.

## Verification truth
The captured PNG was actually opened and visually inspected. `node --check scripts/capture-full-post-cdp.mjs` and full `npm run check` passed, including the actual ffmpeg/ffprobe 1080×1920 regression. No final 1080×1080 carousel or publication is claimed yet.

## Run truth
Discovery this implementation run: **raw 0 / retained 0**. Full-post/browser screenshots captured this run: **1 full-page PNG**. New screenshot bytes: **1,442,565**. Existing attached source media: **8 JPEGs / 534,020 bytes**. Real final source-backed carousel: **NO**. A1/P1 remain 0; `publicationAllowed=false`; only 04 may publish.

## Next
1. Derive reviewed post-content crop boundaries from the real full-page screenshot, excluding TheQoo/browser/list/comments chrome while preserving all eight source-body images in order.
2. Split/normalize the reviewed body sequence into strict 1080×1080 slides without dropping body content; build slide 1 from the exact original title plus a selected cover image.
3. Validate the first real source-backed carousel and inspect the rendered output in Chrome.
4. Continue Korean-community-first high-volume Discovery; do not advance rights/publication states without evidence.