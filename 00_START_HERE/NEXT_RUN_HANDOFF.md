# NEXT RUN HANDOFF

Updated: 2026-09-18 02:39 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → independent normalization validator → strict source-backed carousel plan → strict carousel validator.

## Latest Discovery truth
This useful Discovery pass inspected **40+ raw leads** across Korean-community-first public search/index/page results plus Reddit fallback and retained **15 C1 candidates** as one Markdown file per candidate in `data/candidates/`.

Top candidates: Blind `부모님 결혼 반대(나는 남자)` (16K / 138 comments), `부모님 결혼 반대` with 4-year-older girlfriend (19K / 147), `축의금 물가가 많이 올랐다.` (160 / 16), `남친 부모님 결혼 반대` with expected marriage funding (2,658 / 33), `부모님 결혼 반대` after a first family meal (135 / 19), plus Reddit lottery-secret engagement (+13,120), secret pre-marriage lottery (+9,212), rich-coworker spending pressure (+4,227), and coworker wedding-band conflict (+11,956).

Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. All new candidates remain `ASSETS_PENDING / publicationAllowed=false` until real source-backed assets and 04-confirmed publication exist.

No OCR/moderation/rights verification, asset capture, delivery or publication success was performed or inferred.

## Verification truth
Material repo change: 15 new per-candidate Markdown records created through GitHub contents API. Discovery used only public search/index/page access; no bulk crawling or access-control bypass. No executable checkout/browser was used, so `npm run check`, server smoke and Chrome E2E were not run or claimed. This run changed Discovery data, not renderer code.

## Next
1. Continue high-volume Korean-community Discovery/ranking while deduping against retained files.
2. Acquire permitted ordered full-post screenshots for strongest source-accessible candidates, prioritizing high-comment Blind stories where public capture is permitted.
3. Run real bytes through intake → completeness verification → crop review/gate → normalization → validator → strict carousel builder/validator.
4. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
5. Keep A0 until actual source-backed user-facing assets exist; keep P0 until 04 verifies real publication.
