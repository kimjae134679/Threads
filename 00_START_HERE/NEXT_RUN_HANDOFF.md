# NEXT RUN HANDOFF

Updated: 2026-09-17 22:19 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → independent normalization validator → strict source-backed carousel plan → validator.

## This run — implementation
Read current handoff, current main/recent commits and latest sequential ops `149-sol.md`; repo tip treated as authoritative. Hardened `scripts/validate-screenshot-normalization-plan.mjs` so malformed normalization geometry cannot silently pass: source/scaled dimensions and byte lengths must be positive safe integers, acquisition/provenance must be non-empty strings, padding must be non-negative safe integers, padding must close exactly to 1080x1080, and contain padding must remain centered within one pixel. Existing full-body human/user verification, source URL, sequence, SHA, no-stretch, no-body-crop, user-directed privacy masking, `publicationAllowed=false`, and `04_REVIEW_PUBLISH` checks remain intact.

Implementation commit: `afa179387b6d99b64a5006f1920baf3ab06e8c7c`.

## Discovery continuity
This implementation run inspected **0 raw leads** and retained **0 new candidates**. Most recent completed Discovery refresh remains **40+ raw / 16 retained C1**. Top candidates remain Blind `축의금 내고 식권 안받으면` (64K / 51 / 384), `축의금 논란 , 제가 이상한가요?(특이케이스)` (8,933 / 17 / 92), `돌잔치 축의금 이게 맞는거야?` (7,053 / 15 / 58), Blind `주식` (674 views / 17 comments; body not verified to end), and Reddit `AITA for declining a late invite I got to a coworker’s wedding?` (+1,042 score).

## Asset truth
Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. Candidates remain `ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human-review gates remain and only 04_REVIEW_PUBLISH may publish. No OCR/moderation success claimed.

## Verification truth
GitHub connector provided repository-file editing but no executable checkout/browser asset-capture session. The validator change was reviewed structurally, but `npm run check`, targeted runtime tests, server smoke and Chrome E2E were **not executed or claimed**.

## Next
1. Acquire permitted ordered full-post screenshots for `축의금 내고 식권 안받으면`, `축의금 논란 , 제가 이상한가요?(특이케이스)`, `돌잔치 축의금 이게 맞는거야?`, then strongest prior TheQoo/Blind candidates.
2. Run real source bytes through intake → completeness verification → crop review/gate → normalization → hardened normalization validator → carousel plan/validator.
3. Render the first real 1080x1080 cover + full-original-post screenshot carousel and inspect it in Chrome.
4. Keep all candidates A0 until actual source-backed user-facing assets exist; keep P0 until 04 verifies real publication.
