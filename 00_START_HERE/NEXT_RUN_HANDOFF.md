# NEXT RUN HANDOFF

Updated: 2026-09-18 04:38 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest implementation
`0fe53ca5f62c9df00f1239d80038501ee7d38a3f` adds deterministic screenshot ordering to `scripts/build-screenshot-intake-manifest.mjs`: default CLI order plus natural filename order, recorded in provenance. It does not infer body completeness, OCR/vision, rights, privacy, moderation or publication.

## Latest Discovery truth
Latest useful Discovery inspected **40+ raw public leads** across Korean-community-first searches plus Reddit support and retained **15 new C1 candidates** as individual Markdown files under `data/candidates/`.

Top candidates: Blind `주식중독 남편.. 대출 막는법 있을까?` (930 / 좋아요 3 / 댓글 19), `넋두리… 수의사 남편 주식 개인투자자로 전향 어떻게 생각해?` (6,015 / 댓글 165), `남편 동생이 400빌리고 또 400을 빌려갔는데..` (1,082 / 댓글 22), `돈 없는 시댁` (3,414 / 댓글 44), `남편 카드값` (844 / 댓글 31). Also retained a positive surprise-car saving story and several marriage/family-money conflicts. Overseas support includes ex-husband mistaken transfer/debt deduction (+9,444), wedding money used for a house (+17,821), Italy destination wedding affordability (+1,341), wedding-family contribution dispute (+34), and $6k destination-wedding debt (+67).

Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. All new candidates remain `ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human review remains required and only 04_REVIEW_PUBLISH may publish.

## Verification truth
Material repo change: 15 new human-readable candidate Markdown files plus this handoff. Discovery used permitted public search/index/page access; no bulk crawl/login/anti-bot bypass. No grouped discovery JSON was created in `data/` root. This was Discovery-data work, not renderer/UI code; no executable checkout/browser was available for `npm run check`, server smoke or Chrome E2E, and none are claimed. No OCR/moderation/rights verification or publication was performed. No temporary artifacts were created.

## Next
1. Acquire permitted ordered full-post screenshots for `주식중독 남편.. 대출 막는법 있을까?` or `넋두리… 수의사 남편 주식 개인투자자로 전향 어떻게 생각해?` if publicly/manual-capture accessible.
2. Feed real bytes through deterministic intake → human completeness verification → UI-chrome crop review → normalization → validators → strict carousel builder/validator.
3. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
4. Continue high-volume Korean-community discovery with dedupe; keep A0 until actual source-backed user-facing assets exist and P0 until 04 verifies real publication.
