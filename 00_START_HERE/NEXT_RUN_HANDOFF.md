# NEXT RUN HANDOFF

Updated: 2026-09-17 15:14 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 is cover only (one image + original title/hook, unchanged by default). Slide 2+ are ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summarized/interstitial/CTA body cards. UI chrome crop only when body is preserved. Privacy masking is user-directed only. Missing real source assets means `ASSETS_PENDING`.

## Current source-first implementation
`build-screenshot-intake-manifest.mjs` records ordered evidence; `verify-screenshot-intake-complete.mjs` requires explicit `HUMAN_REVIEW` or `USER_CONFIRMED`; `plan-screenshot-normalization.mjs` rejects non-`VERIFIED_COMPLETE` input and uses 1080x1080 contain/no-stretch output with body crop forbidden. `build-source-backed-carousel-plan.mjs` now enforces slide 1 COVER_ONLY and slide 2+ ORIGINAL_POST_SCREENSHOT only, contiguous source order, original-title/exact-phrase cover text, preserved provenance, no stretch/body crop, no automatic privacy masking, and `publicationAllowed=false` / `04_REVIEW_PUBLISH` ownership. It explicitly does not claim rendering, rights, moderation, delivery or publication success.

## Latest Discovery baseline
Discovery refresh at 2026-09-17 14:37~14:50 KST:
- raw inspected: 40+ public search/index/page leads across Korean-community-first queries plus Reddit/global fallback
- retained: 5 new C1_A0_P0
- top Korean candidates: Blind `나몰래 대출받은 남편` (12K / 257; body incomplete), `신입사원 퇴사 레전드(고전&장문 주의)` (18K / 19; body incomplete), `축의금 (진짜 난감 ㅠㅠ 조언 좀)` (1,144 / 13; public body read)
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Added the strict source-backed carousel planning stage after normalization. This materially closes the gap between verified source screenshots and the binding carousel structure without fabricating body cards or publication state. No real screenshot bytes were available through the current connector surface, so no A1 or rendered-carousel claim was made. No executable checkout/Chrome was available here; targeted tests, `npm run check`, server smoke and Chrome E2E were therefore not claimed as run.

## Next highest-priority work
1. Acquire a permitted complete screenshot sequence for a strong Korean C1, preferably `축의금 (진짜 난감 ㅠㅠ 조언 좀)` or complete-body-verify the stronger 12K/18K Blind candidates.
2. Run intake → explicit completeness verification → normalization → strict carousel plan on real bytes.
3. Implement/render the first real 1080x1080 cover + full-post screenshot carousel and inspect in Chrome.
4. Continue Korean-first high-volume discovery/ranking and resolve strong C0 exact URLs.
5. Run targeted tests + `npm run check`/server/browser E2E when an executable checkout becomes available.
