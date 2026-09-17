# NEXT RUN HANDOFF

Updated: 2026-09-17 18:18 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 is cover only (one image + original title/hook, unchanged by default). Slide 2+ are ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summarized/interstitial/CTA body cards. UI chrome crop only when body is preserved. Privacy masking is user-directed only. Missing real source assets means `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → explicit reviewed crop-plan gate → 1080x1080 contain/no-stretch normalization → strict source-backed carousel plan → strict carousel-plan validation.

New `scripts/apply-reviewed-ui-chrome-crops.mjs` closes the gap between suggestions and normalization: it refuses unresolved crop decisions, accepts either `KEEP_ORIGINAL` or `HUMAN_APPROVED_UI_CHROME_CROP`, validates crop bounds, requires explicit human confirmation that full original body/source media remain when cropping, preserves order/SHA/capture provenance, performs no automatic privacy masking, and keeps `publicationAllowed=false` with `04_REVIEW_PUBLISH` as sole publish owner. It emits a plan only; it does not mutate source screenshot bytes.

## Latest Discovery refresh
Latest discovery refresh remains 2026-09-17 17:34 KST:
- raw inspected: 40+ public search/index/page leads
- retained: 5 new C1_A0_P0
- top candidates: Reddit `36M 32F Wife has wealthy parents...`, cancelled-wedding repayment conflict, hidden $17k debt
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Material repo change: added the reviewed UI-chrome crop gate above. Fresh public discovery probing was also performed Korean-community-first; robots-blocked domains were not bypassed. No new candidate was retained in this implementation-focused run because no source screenshot bytes were acquired and discovery results did not improve the existing ranked set enough to justify weak additions.

Testing truth: this GitHub connector surface does not provide an executable checkout, so `npm run check`, server smoke, targeted Node execution and Chrome E2E were not actually run here and no success is claimed.

## Asset truth
Full-post screenshots captured: 0. Actual source bytes: 0. Real source-backed carousel produced: NO. A1/P1: 0. Candidates remain `ASSETS_PENDING / publicationAllowed=false`.

## Next highest-priority work
1. Acquire one permitted complete screenshot sequence for a strong C1, preferably a concise Korean-community candidate with exact public provenance.
2. Run intake → explicit completeness verification → crop suggestion → human crop decision gate → normalization → strict carousel plan → validator on real bytes.
3. Render first real 1080x1080 cover + full-post screenshot carousel and inspect in Chrome.
4. Continue high-volume Korean-community-first discovery/ranking in parallel.
5. Run targeted tests + `npm run check`/server/browser E2E when an executable checkout becomes available.
