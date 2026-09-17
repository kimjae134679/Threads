# NEXT RUN HANDOFF

Updated: 2026-09-17 20:17 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → independent normalization validator → strict source-backed carousel plan → validator.

## This run — production hardening
Read current handoff, main/recent commits and latest ops `145-sol.md`; repo tip treated as authoritative. Added `scripts/validate-screenshot-normalization-plan.mjs` as an independent fail-closed gate before carousel planning. It rechecks contiguous source order, SHA-256 uniqueness, byte length, exact capture/source URL, acquisition/provenance, verified-full-body status, 1080x1080 contain math, no stretching, body-crop prohibition, user-directed privacy masking, `publicationAllowed=false`, and `04_REVIEW_PUBLISH` ownership.

This run did not perform a new discovery sweep: raw candidate count 0; retained count 0. Current top candidates remain Blind `이혼 고민 (빚쟁이인 나...백수 남편)` (24K/comments260), `맨날 사고치는 남편` (7,226/comments65), and `협의이혼시 이런 경우는 재산분할 어떻게해?` (1,581/comments19).

## Asset truth
Full-post screenshots captured this run: 0. Actual source bytes acquired: 0. Real source-backed carousel produced: NO. A1/P1: 0. Existing candidates remain `ASSETS_PENDING / publicationAllowed=false`. Rights/privacy/human-review gates remain; only 04_REVIEW_PUBLISH may publish.

## Verification truth
GitHub connector provides repository file mutation but no executable checkout in this run, so the new Node validator, `npm run check`, server smoke and Chrome E2E were NOT executed. Do not infer test success from the commit.

## Next
1. Continue Korean-community high-volume discovery and ranking when discovery is the run focus.
2. Acquire one permitted complete screenshot sequence for the strongest C1 using public/manual capture without access-control bypass.
3. Run intake → completeness verification → crop review/gate → normalization → new normalization validator → carousel plan/validator on real bytes.
4. Render and inspect the first real 1080x1080 source-backed carousel in Chrome when executable checkout/browser tooling is available.
