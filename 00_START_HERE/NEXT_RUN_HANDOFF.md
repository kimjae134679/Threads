# NEXT RUN HANDOFF

Updated: 2026-09-18 07:18 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
Latest useful Discovery inspected **40+ raw leads** across Korean-community-first search plus overseas support lanes and retained **15 new candidates: 13 C1 + 2 C0**. C0 is used only where Blind public company index exposed the lead but no exact individual URL was verified.

Top new candidates: Reddit `Found out my (25F) bf (33M) is $200,000 in consumer debt` (+44; travel + stock-market betting debt), `AITA for not putting my sister’s wedding expenses on my credit card and humiliating her?` (+7,972), `37M married to 36F for 6 years. Discovered $60k in hidden credit card debt + 401k loan` (+385), `Found out my husband has been hiding debt for 7 years` (+72), and Blind index lead `축의금 문제인데 제가 잘못했나요?` (1,820 / 좋아요 1 / 댓글 38). Exact visible metrics are observation-specific; missing metrics remain unconfirmed.

Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. All new candidates remain `ASSETS_PENDING`, `publicationAllowed=false`; rights/privacy/human review remains required and only 04_REVIEW_PUBLISH may publish.

## Material implementation this run
Added `scripts/build-acquisition-queue.mjs` and wired `npm run acquisition:queue`. It turns the one-candidate-per-file Markdown store into a deterministic operational screenshot-acquisition queue under `data/_system/`, prioritizing exact-public C1/A0/P0 records and carrying forward only observed metadata. It does not grant rights, infer OCR/moderation, fabricate screenshots, change A/P state, or publish. C0 remains manual/provenance-pending. The script is included in `npm run syntax`.

## Verification truth
This run made code/package/handoff changes through GitHub. No executable checkout/browser was available here, so runtime execution, `npm run check`, server smoke and Chrome E2E are **not claimed**. No real screenshot bytes were available, so no acquisition/crop/normalization/carousel success is claimed. No temporary artifacts were created.

## Next
1. Run `npm run acquisition:queue` in an executable checkout and use the generated queue to acquire permitted ordered full-post screenshots for strongest Korean C1 candidates first (`나몰래 대출받은 남편`, `결혼 전 고민..(시댁 관련)`, `주식중독 남편.. 대출 막는법 있을까?`).
2. Feed real bytes through deterministic intake → human completeness verification → UI-chrome crop review/gate → reviewed-crop-plan validator → 1080x1080 contain normalization → strict carousel builder/validator.
3. Render the first real 1080x1080 cover + full-original-post screenshot carousel and inspect it in Chrome.
4. Continue Korean-community-first high-volume Discovery with dedupe; keep A0 until actual source-backed user-facing assets exist and P0 until 04 verifies real publication.
