# NEXT RUN HANDOFF

Updated: 2026-09-17 19:19 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → strict source-backed carousel plan → validator.

## This run
Added `test/reviewed-ui-chrome-crop-gate.test.mjs` to lock the reviewed crop gate against regressions. It covers KEEP_ORIGINAL, rejects unreviewed decisions, rejects approved crops without explicit full-body preservation confirmation, rejects out-of-bounds crops, accepts a valid human-approved UI-chrome crop, and rechecks publication/privacy invariants. Material commit: `e5850392cd2de185b678fa0caa51dfec2ad080fa`.

No executable checkout is exposed by the GitHub connector in this run, so Node/npm/server/Chrome execution success is NOT claimed. The test was committed but not executed here.

Discovery performed in this implementation run: raw 0, retained 0. Latest completed Discovery refresh remains 2026-09-17 18:36–18:45 KST: raw 40+; retained 3 (1 C1_A0_P0 + 2 C0_A0_P0). Top: Blind `소개팅해달라고 괴롭히는 상사`, `나 도저히 아이 못낳겠다니까 계속 낳자는데`, `양가 어른 용돈문제..`.

## Asset truth
Full-post screenshots captured: 0. Actual source bytes acquired: 0. Real source-backed carousel produced: NO. A1/P1: 0. Candidates remain `ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human review gates remain. Only 04 may publish.

## Next
1. Continue Korean-community discovery emphasizing exact public individual URLs and stronger story/engagement.
2. Acquire one permitted complete screenshot sequence for a strong C1.
3. Run source-first chain on real bytes and render/inspect first real 1080x1080 carousel.
4. Execute committed regression tests plus `npm run check`/server smoke/Chrome E2E when an executable checkout is available.
