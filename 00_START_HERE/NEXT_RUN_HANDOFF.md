# NEXT RUN HANDOFF

Updated: 2026-09-17 17:17 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 is cover only (one image + original title/hook, unchanged by default). Slide 2+ are ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summarized/interstitial/CTA body cards. UI chrome crop only when body is preserved. Privacy masking is user-directed only. Missing real source assets means `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review stage → 1080x1080 contain/no-stretch normalization → strict source-backed carousel plan → strict carousel-plan validation. `scripts/suggest-ui-chrome-crops.mjs` now emits ordered crop-review records keyed by source sequence/SHA/provenance but deliberately applies no crop: every suggestion starts `HUMAN_REVIEW_REQUIRED`, auto-crop is forbidden, body preservation is mandatory, and privacy masking remains user-directed. This closes the missing automation handoff between intake and normalization without pretending pixel analysis or OCR/vision occurred.

## Latest Discovery refresh
Discovery refresh at 2026-09-17 16:35 KST:
- raw inspected: 40+ public search/index/page leads across Korean-community-first searches; restricted/robots-blocked sources were not bypassed
- retained: 5 new C1_A0_P0 after dedupe/story/safety/access filtering
- top candidates: Blind `한 주식에 몰빵했는데 아직은 두렵지 않네`, `결혼을 앞둔 남자친구의 주식 빚 숨겨줘야할까?`, `결혼 주선자 사례 X, 청첩장 못 받음. 축의금 해야돼?`
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Material repo change: added `scripts/suggest-ui-chrome-crops.mjs`. It preserves source ordering and provenance, never auto-crops, never auto-masks privacy, and keeps `publicationAllowed=false` / `04_REVIEW_PUBLISH` ownership. No executable checkout/real screenshot bytes were available through this GitHub connection, so no `npm run check`, server smoke, Chrome E2E, OCR/vision, or real-render success is claimed.

## Asset truth
Full-post screenshots captured: 0. Actual source bytes: 0. Real source-backed carousel produced: NO. A1/P1: 0. All current candidates remain `ASSETS_PENDING / publicationAllowed=false` unless separately proven otherwise.

## Next highest-priority work
1. Acquire a permitted complete screenshot sequence for a strong Korean C1, prioritizing a full-body candidate with native source media.
2. Run intake → explicit completeness verification → crop review → normalization → strict carousel plan → independent validator on real bytes.
3. Render first real 1080x1080 cover + full-post screenshot carousel and inspect in Chrome.
4. Continue Korean-first high-volume discovery/ranking; target 40–80 raw and 15–30 retained when genuinely usable coverage permits.
5. Run targeted tests + `npm run check`/server/browser E2E when an executable checkout becomes available.
