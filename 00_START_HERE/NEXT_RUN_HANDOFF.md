# NEXT RUN HANDOFF

Updated: 2026-09-18 08:16 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
Latest useful Discovery inspected **40+ raw leads** and retained **10 new C1 candidates** after dedupe/story/safety/evidence filtering. Top retained include Reddit canceled-wedding/non-refundable-venue (+9,412), $20K venue/mistress-proposal conflict (+13,261), nearly $20K hidden husband debt (+96), exhausted $500 bridesmaid budget (81 points / 94% upvoted), and destination-wedding family conflict (+547). This implementation run itself did **raw 0 / retained 0** Discovery.

Full-post screenshots captured this implementation run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. Candidates remain `ASSETS_PENDING`, `publicationAllowed=false`; rights/privacy/human review remains required and only 04_REVIEW_PUBLISH may publish.

## Existing implementation
`scripts/build-acquisition-queue.mjs` + `npm run acquisition:queue` now rank Korean-community exact-source candidates ahead of overseas support lanes. Exact acquisition URL is read only from the candidate `## 정확한 링크` section instead of accepting an arbitrary URL elsewhere in the file. A filename classified C1 but missing an exact-link URL is fail-closed into a blocked-inconsistent section rather than sent to capture. The queue also carries the recorded acquisition state for manual capture operators. It does not grant rights, infer OCR/moderation, fabricate screenshots, change A/P state, auto-mask privacy, or publish.

## Verification truth
Material code change committed through GitHub as `156707aaeb803ca8e6888673fef727bb1ed34386`. No executable checkout/browser was available in this run, so runtime execution, `npm run check`, server smoke and Chrome E2E are not claimed. No source screenshot bytes were acquired and no temporary artifacts were created.

## Next
1. Run `npm run acquisition:queue` in an executable checkout and acquire permitted ordered full-post screenshots for strongest Korean C1 candidates first (`나몰래 대출받은 남편`, `결혼 전 고민..(시댁 관련)`, `주식중독 남편.. 대출 막는법 있을까?`).
2. Fix any C1 records the stricter queue reports as provenance-inconsistent; upgrade C0 only after exact individual public URL verification.
3. Feed real bytes through deterministic intake → human completeness verification → UI-chrome crop review/gate → reviewed-crop-plan validator → 1080x1080 contain normalization → strict carousel builder/validator.
4. Render the first real 1080x1080 cover + full-original-post screenshot carousel and inspect it in Chrome.
5. Keep Korean-community-first high-volume Discovery; A0 until actual source-backed user-facing assets exist and P0 until 04 verifies real publication.
