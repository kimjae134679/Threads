# NEXT RUN HANDOFF

Updated: 2026-09-17 17:34 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 is cover only (one image + original title/hook, unchanged by default). Slide 2+ are ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summarized/interstitial/CTA body cards. UI chrome crop only when body is preserved. Privacy masking is user-directed only. Missing real source assets means `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review stage → 1080x1080 contain/no-stretch normalization → strict source-backed carousel plan → strict carousel-plan validation. `scripts/suggest-ui-chrome-crops.mjs` emits ordered crop-review records but applies no automatic crop or privacy masking.

## Latest Discovery refresh
Discovery refresh at 2026-09-17 17:34 KST:
- raw inspected: 40+ public search/index/page leads across Korean-community-first queries plus public Reddit fallback; robots/login-restricted sources were not bypassed
- retained: 5 new C1_A0_P0 after dedupe/story/safety/access filtering
- top candidates: Reddit `36M 32F Wife has wealthy parents, and I’m struggling with the fact that I have to work while my family vacations without me.`, `AITAH for not offering to re-pay my ex-fiancee's (25F) parents (50s M&F) for any of the cost they incurred for our wedding that I (28M) incurred?`, `My wife is a sahm and has racked up 17k of debt in the past 11 months behind my back`
- additional retained: `AITH for postponing my wedding after finding out about my fiance's debt?`, `AITAH for not bringing food to a co workers going to get married celebration celebration`
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## Discovery access truth
Korean sources were searched first. Some restricted domains returned robots/access blocks and were not bypassed; genuinely retainable exact individual Korean source pages were not obtained in this run, so no Korean C1 was invented. Public Reddit pages supplied the five retained exact-URL candidates.

## Asset truth
Full-post screenshots captured: 0. Actual source bytes: 0. Real source-backed carousel produced: NO. A1/P1: 0. New candidates remain `ASSETS_PENDING / publicationAllowed=false`.

## Next highest-priority work
1. Continue Korean-community-first discovery and try to resolve strong public/index leads to permitted exact individual URLs.
2. Acquire one permitted complete screenshot sequence for a strong C1, prioritizing a concise full-body candidate.
3. Run intake → explicit completeness verification → crop review → normalization → strict carousel plan → validator on real bytes.
4. Render first real 1080x1080 cover + full-post screenshot carousel and inspect in Chrome.
5. Run targeted tests + `npm run check`/server/browser E2E when an executable checkout becomes available.
