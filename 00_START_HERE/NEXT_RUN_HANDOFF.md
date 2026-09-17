# NEXT RUN HANDOFF

Updated: 2026-09-18 07:39 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
Latest Discovery inspected **40+ raw leads** across Korean-community-first public search/index lanes plus Reddit support lanes. Korean source access was uneven and some domains were robots-restricted; no bypass was attempted. After dedupe/story/safety/evidence filtering, retained **10 new C1 candidates** rather than padding the set with weak or unverifiable leads. Each is one Markdown file under `data/candidates/`; no grouped discovery JSON was created in `data/` root.

Top new candidates: Reddit `AITA “ being cruel” for telling my daughter that she will need to help pay back the money that I spent on her wedding` (+9,412; canceled wedding after daughter cheating + non-refundable venue), `AITA for not changing my daughter's wedding venue even though my sister's husband proposed to his 22-year-old mistress there last month?` (+13,261; $20K non-refundable venue), `Husband hid a ton of debt from me - how can I move forward` (+96; nearly $20K hidden debt), `How To Respond If I Can’t Afford the Wedding` (81 points / 94% upvoted; $500 bridesmaid budget exhausted), and `AITA for not helping my sister pay for her wedding but helping our family go to the wedding?` (+547).

Observation-specific metrics only; missing metrics remain unconfirmed. Some pages exposed only part of the full post; candidate records say so rather than filling missing text. Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. All new candidates remain `ASSETS_PENDING`, `publicationAllowed=false`; rights/privacy/human review remains required and only 04_REVIEW_PUBLISH may publish.

## Existing implementation
`scripts/build-acquisition-queue.mjs` + `npm run acquisition:queue` convert one-candidate-per-file Markdown into deterministic operational screenshot-acquisition metadata under `data/_system/`. It does not grant rights, infer OCR/moderation, fabricate screenshots, change A/P state, or publish.

## Verification truth
This Discovery run changed candidate Markdown and handoff through GitHub. No executable checkout/browser was available, so runtime execution, `npm run check`, server smoke and Chrome E2E are not claimed. No source screenshot bytes were acquired and no temporary artifacts were created.

## Next
1. Acquire permitted ordered full-post screenshots for strongest Korean C1 candidates already queued (`나몰래 대출받은 남편`, `결혼 전 고민..(시댁 관련)`, `주식중독 남편.. 대출 막는법 있을까?`) before overseas support candidates.
2. Upgrade strong Korean C0 leads only when exact individual public URL/provenance is actually verified.
3. Feed real bytes through deterministic intake → human completeness verification → UI-chrome crop review/gate → reviewed-crop-plan validator → 1080x1080 contain normalization → strict carousel builder/validator.
4. Render the first real 1080x1080 cover + full-original-post screenshot carousel and inspect it in Chrome.
5. Continue Korean-community-first high-volume Discovery with dedupe; keep A0 until actual source-backed user-facing assets exist and P0 until 04 verifies real publication.
