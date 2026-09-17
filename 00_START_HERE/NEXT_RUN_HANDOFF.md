# NEXT RUN HANDOFF

Updated: 2026-09-18 06:16 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
Latest useful Discovery inspected **40+ raw leads** and retained **15 C1 candidates**. Top candidates remain Blind `나몰래 대출받은 남편` (12K views / 257 comments), `결혼 전 고민..(시댁 관련)` (9,902 / 99), `남편 회식(술자리) 늦게 오면 불안하고 화가 나` (1,586 / 좋아요 1 / 댓글 29), `동생 결혼 반대` (3,414 / 좋아요 2 / 댓글 14), plus Reddit wedding-fund/debt conflicts. This implementation run did not perform a new discovery sweep: raw 0 / retained 0.

Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. Current source candidates remain `ASSETS_PENDING`, `publicationAllowed=false`; rights/privacy/human review remains required and only 04_REVIEW_PUBLISH may publish.

## Implementation completed this run
Added `scripts/validate-reviewed-crop-plan.mjs` at repo tip. It independently fail-closes reviewed UI-chrome crop plans before downstream normalization/rendering. It validates type/source URL, closed publication gate and 04 ownership, immutable contiguous source order, unique valid SHA-256 evidence, exact capture/source URL match, source dimensions, explicit human full-body/media preservation confirmation, `USER_DIRECTED_ONLY` privacy masking, crop bounds, and rejects meaningless full-frame crops. This reduces the chance that a malformed/tampered crop plan silently reaches user-facing rendering.

## Verification truth
Material repo commit: `3c59070548cfc9394d8b06305c71adf302afcdf3`. Connector access did not provide an executable checkout/browser in this run, so runtime fixture tests, `npm run check`, server smoke and Chrome E2E are not claimed. No OCR/moderation/rights verification, source acquisition, delivery or publication was performed or inferred. No temporary artifacts were created.

## Next
1. Acquire permitted full-post screenshots for `나몰래 대출받은 남편`, then `결혼 전 고민..(시댁 관련)`.
2. Feed real bytes through deterministic intake → human completeness verification → UI-chrome crop review/gate → reviewed-crop-plan validator → 1080x1080 contain normalization → strict carousel builder/validator.
3. Render the first real 1080x1080 cover + full-original-post screenshot carousel and inspect it in Chrome.
4. Continue Korean-community-first high-volume Discovery with dedupe; keep A0 until actual source-backed user-facing assets exist and P0 until 04 verifies real publication.
