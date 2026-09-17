# NEXT RUN HANDOFF

Updated: 2026-09-17 23:16 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → independent normalization validator → strict source-backed carousel plan → validator.

## This run — production hardening
Read current handoff, current main/recent commits and latest sequential ops `151-sol.md`; repo tip treated as authoritative. Material repo change: hardened `scripts/build-source-backed-carousel-plan.mjs` so the carousel builder itself now fails closed on malformed/unvalidated body geometry instead of relying only on the separate validator. It now checks SHA-256 format/uniqueness, captureUrl/sourceUrl equality, exact 1080x1080 target, positive integer source/scaled dimensions, nonnegative integer padding, exact 1080 closure, centered contain geometry, and `USER_DIRECTED_ONLY` privacy masking before any source screenshot can enter the carousel plan. Existing full-body verification, contiguous source order, no-stretch/no-body-crop and 04-only publish gate remain.

## Discovery status
This implementation run inspected **0 raw leads** and retained **0 new candidates**. Most recent completed Discovery refresh remains **40+ raw / 15 retained**. Top recent candidates remain Blind `남편이 비자금을 숨겼는데 배신감드네 ㅠ`, `축의금 문화, 결혼 문화 10년내 다바뀔 듯`, `남편이 올려서 다른 사람들한테도 물어보라고해서 올려봐`, `절친이 축의금 10만원 함(내가 속좁은 거야?)`, plus Reddit `AITA for not returning money my ex-husband sent to me mistakenly?`.

## Asset truth
Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. Candidates remain `ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human-review gates remain and only 04_REVIEW_PUBLISH may publish. No OCR/moderation/rights/publication success claimed.

## Verification truth
GitHub-connected source edit was available, but no executable checkout/browser session was available. The changed script was inspected at repo tip; `npm run check`, server smoke, runtime fixture tests and Chrome E2E were not executed and are not claimed.

## Next
1. Acquire permitted ordered full-post screenshots for the strongest Korean candidates.
2. Run real bytes through intake → completeness verification → crop review/gate → normalization → validator → strict carousel builder/validator.
3. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
4. Keep A0 until actual source-backed user-facing assets exist; keep P0 until 04 verifies real publication.
