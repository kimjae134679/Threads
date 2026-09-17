# NEXT RUN HANDOFF

Updated: 2026-09-18 03:15 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → independent normalization validator → strict source-backed carousel plan → strict carousel validator.

Latest implementation change hardens exact-public source provenance at screenshot intake: non-public IPv4 literals are now rejected fail-closed, including unspecified/loopback/private/link-local, carrier-grade NAT `100.64.0.0/10`, protocol/documentation/benchmark ranges and multicast/reserved space. Existing IPv6 local/private rejection and secret-bearing URL query rejection remain.

## Latest Discovery truth
Most recent useful Discovery pass inspected **40+ raw leads** and retained **15 C1 candidates**. This implementation run performed **0 raw / 0 retained** Discovery because it materially improved the screenshot-acquisition path immediately after that high-volume pass.

Top candidates remain Blind `부모님 결혼 반대(나는 남자)` (16K / 138 comments), 4-year-older-girlfriend `부모님 결혼 반대` (19K / 147), `축의금 물가가 많이 올랐다.` (160 / 16), `남친 부모님 결혼 반대` (2,658 / 33), plus Reddit lottery-secret engagement (+13,120), secret pre-marriage lottery (+9,212), rich-coworker spending pressure (+4,227), and coworker wedding-band conflict (+11,956).

Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. Candidates remain `ASSETS_PENDING / publicationAllowed=false` until real source-backed assets and 04-confirmed publication exist.

No OCR/moderation/rights verification, asset capture, delivery or publication success was performed or inferred.

## Verification truth
Material repo change: `scripts/build-screenshot-intake-manifest.mjs` provenance URL validation hardened at repo tip. Change was written through GitHub contents API. No executable checkout/browser was available, so targeted runtime tests, `npm run check`, server smoke and Chrome E2E were not run or claimed. No temporary artifacts were created.

## Next
1. Continue high-volume Korean-community Discovery/ranking while deduping against retained files.
2. Acquire permitted ordered full-post screenshots for strongest source-accessible candidates.
3. Run real bytes through intake → completeness verification → crop review/gate → normalization → validator → strict carousel builder/validator.
4. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
5. Keep A0 until actual source-backed user-facing assets exist; keep P0 until 04 verifies real publication.
