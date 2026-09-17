# NEXT RUN HANDOFF

Updated: 2026-09-17 15:35 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 is cover only (one image + original title/hook, unchanged by default). Slide 2+ are ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summarized/interstitial/CTA body cards. UI chrome crop only when body is preserved. Privacy masking is user-directed only. Missing real source assets means `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → 1080x1080 contain/no-stretch normalization → strict source-backed carousel plan. `build-source-backed-carousel-plan.mjs` enforces COVER_ONLY slide 1 and ORIGINAL_POST_SCREENSHOT slide 2+, contiguous source order/provenance, no body crop, no automatic privacy masking, `publicationAllowed=false`, publish owner `04_REVIEW_PUBLISH`.

## Latest Discovery baseline
Discovery refresh at 2026-09-17 15:35 KST:
- raw inspected: 40+ public search/index/page leads across Korean-community-first queries plus Reddit/global fallback; restricted/robots-blocked sources were not bypassed
- retained: 6 new C1_A0_P0 after dedupe/story/safety/access filtering
- strongest new candidates: Reddit `AITA for secretly marrying at the courthouse after my parents turned my wedding into a week-long festival and told me to take a €44k loan?` (+871 observed today), `AITA for not giving my parents half of my lottery winnings.` (+11,395), cancelled wedding venue repayment conflict (+9,412), lottery $15k husband/wife allocation conflict (+260), last-minute Europe wedding gift reversal (+4,018), sister mocked cheap wedding then wanted funding (+8,246)
- Korean search coverage was attempted first; this run did not retain weak/index-only Korean leads merely to hit quota
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Created six individual human-readable candidate Markdown files under `data/candidates/`; no grouped discovery JSON was created. Exact individual public URLs were verified for all six. Metrics recorded only when visible in the same observation. No rights/OCR/moderation/asset/publication claims were invented.

## Next highest-priority work
1. Acquire a permitted complete screenshot sequence for a strong Korean C1; continue resolving strong Korean index leads to exact URLs.
2. Run intake → explicit completeness verification → normalization → strict carousel plan on real bytes.
3. Render first real 1080x1080 cover + full-post screenshot carousel and inspect in Chrome.
4. Continue Korean-first high-volume discovery/ranking; target 40–80 raw and 15–30 retained when genuinely usable coverage permits.
5. Run targeted tests + `npm run check`/server/browser E2E when an executable checkout becomes available.
