# NEXT RUN HANDOFF

Updated: 2026-09-17 14:14 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 is cover only (one image + original title/hook, unchanged by default). Slide 2+ are ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summarized/interstitial/CTA body cards. UI chrome crop only when body is preserved. Privacy masking is user-directed only. Missing real source assets means `ASSETS_PENDING`.

## Current screenshot-intake implementation
`build-screenshot-intake-manifest.mjs` records ordered evidence; `verify-screenshot-intake-complete.mjs` requires explicit `HUMAN_REVIEW` or `USER_CONFIRMED`; `plan-screenshot-normalization.mjs` rejects non-`VERIFIED_COMPLETE` input and uses 1080x1080 contain/no-stretch output with body crop forbidden. This run added `test/screenshot-normalization-plan.test.mjs`, which regression-tests rejection of pending and machine-only completeness and verifies publicationAllowed=false, 04 ownership, no-stretch, no body crop and user-directed masking on accepted input. An attempted package wiring accidentally narrowed the pre-existing syntax surface; it was immediately reverted at repo tip so existing checks were preserved. The new targeted test remains in-repo and can be run directly when executable Node is available.

## Latest Discovery baseline
Discovery refresh at 2026-09-17 13:34 KST:
- raw inspected: 40+
- retained: 3 new — 2 C1_A0_P0 + 1 C0_A0_P0
- top: Blind `황당 면접 후기` (4,000 / 5 / 13), `직장내괴롭힘 피해 직원을 징계한 회사` (1,012 / 6 / 10; heightened review), `나 똥차 타는데 소개팅 태우러간다했네..` (19K / 16 / 165 index-only C0)
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Material repo change: added targeted regression coverage for the source-first normalization gate. No executable checkout/Node/Chrome is available through the current connector surface, so the test, `npm run check`, server smoke and browser E2E were NOT executed and no green status is claimed. No source screenshot bytes were available, so no asset/OCR/moderation/rights/publication success is claimed.

## Next highest-priority work
1. Acquire a permitted complete screenshot sequence for a strong Korean C1.
2. Run intake → explicit completeness verification → normalization on real bytes.
3. Build first real cover + full-post screenshot 1080x1080 carousel and inspect in Chrome.
4. Continue Korean-first high-volume discovery/ranking and resolve strong C0 exact URLs.
5. Wire the new targeted regression test into the full check command only while preserving every existing syntax/test entry.
