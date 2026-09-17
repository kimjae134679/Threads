# NEXT RUN HANDOFF

Updated: 2026-09-18 05:19 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest implementation
`501a12134455a9ec44081c0173ec0db84321e019` strengthens `scripts/apply-reviewed-ui-chrome-crops.mjs`. Every source screenshot now requires an explicit human confirmation that the full original post body/attached media is preserved, including `KEEP_ORIGINAL`; crop review also fail-closes on mutated policy gates, auto-applied crops, invalid/duplicate SHA-256, invalid dimensions, source URL mismatch, crop rectangles left on KEEP_ORIGINAL, and no-op full-frame approved crops. This does not infer completeness, OCR/vision, rights, privacy, moderation or publication.

## Latest Discovery truth
This implementation run: **raw 0 / retained 0**. Latest useful Discovery remains **40+ raw public leads / 15 retained**.

Top candidates remain Blind `주식중독 남편.. 대출 막는법 있을까?` (930 / 좋아요 3 / 댓글 19), `넋두리… 수의사 남편 주식 개인투자자로 전향 어떻게 생각해?` (6,015 / 댓글 165), `남편 동생이 400빌리고 또 400을 빌려갔는데..` (1,082 / 댓글 22), `돈 없는 시댁` (3,414 / 댓글 44), `남편 카드값` (844 / 댓글 31).

Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. Candidates remain `ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human review remains required and only 04_REVIEW_PUBLISH may publish.

## Verification truth
Material repo change: stricter reviewed UI-chrome crop gate. No executable checkout/browser was available in this run, so targeted runtime tests, `npm run check`, server smoke and Chrome E2E were not run or claimed. No OCR/moderation/rights verification or publication was performed. No temporary artifacts were created.

## Next
1. Acquire permitted ordered full-post screenshots for `주식중독 남편.. 대출 막는법 있을까?` or `넋두리… 수의사 남편 주식 개인투자자로 전향 어떻게 생각해?` if publicly/manual-capture accessible.
2. Feed real bytes through deterministic intake → human completeness verification → UI-chrome crop review/gate → 1080x1080 contain normalization → validators → strict carousel builder/validator.
3. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
4. Continue high-volume Korean-community discovery with dedupe; keep A0 until actual source-backed user-facing assets exist and P0 until 04 verifies real publication.
