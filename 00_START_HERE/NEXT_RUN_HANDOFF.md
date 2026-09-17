# NEXT RUN HANDOFF

Updated: 2026-09-17 14:50 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 is cover only (one image + original title/hook, unchanged by default). Slide 2+ are ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summarized/interstitial/CTA body cards. UI chrome crop only when body is preserved. Privacy masking is user-directed only. Missing real source assets means `ASSETS_PENDING`.

## Current screenshot-intake implementation
`build-screenshot-intake-manifest.mjs` records ordered evidence; `verify-screenshot-intake-complete.mjs` requires explicit `HUMAN_REVIEW` or `USER_CONFIRMED`; `plan-screenshot-normalization.mjs` rejects non-`VERIFIED_COMPLETE` input and uses 1080x1080 contain/no-stretch output with body crop forbidden. `test/screenshot-normalization-plan.test.mjs` regression-tests the source-first normalization gate. No executable Node/Chrome checkout is available through the current connector surface, so do not claim unexecuted checks.

## Latest Discovery baseline
Discovery refresh at 2026-09-17 14:37~14:50 KST:
- raw inspected: 40+ public search/index/page leads across Korean-community-first queries plus Reddit/global fallback
- retained: 5 new C1_A0_P0
- Korean retained: Blind `나몰래 대출받은 남편` (12K views / 257 comments; full body not fully verified), `신입사원 퇴사 레전드(고전&장문 주의)` (18K / 19; full body not fully verified), `축의금 (진짜 난감 ㅠㅠ 조언 좀)` (1,144 / 13; public body read)
- global retained: Reddit `AITA for not giving a wedding gift?` (+415; body read), `AITA for not putting my sister’s wedding expenses on my credit card and humiliating her?` (+7,972; full body not fully verified)
- exact individual URLs/provenance: confirmed for all 5
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Added five human-readable one-candidate-per-file Markdown records under `data/candidates/`. No grouped discovery JSON was created. Search/index coverage included Blind/DCInside/FMKorea/TheQoo/Instiz/Ruliweb/Ppomppu/Clien/Arca and Reddit-oriented queries; some restricted domains were inaccessible through public search tooling and were not bypassed. Weak generic market/loan/news items were not retained. All new candidates remain `publicationAllowed=false`, `ASSETS_PENDING`, rights/privacy/human-review gated and P0.

## Next highest-priority work
1. Acquire a permitted complete screenshot sequence for a strong Korean C1, preferably `축의금 (진짜 난감 ㅠㅠ 조언 좀)` because its public body was fully readable, or complete the body verification for the stronger 12K/18K Blind candidates first.
2. Run intake → explicit completeness verification → normalization on real bytes.
3. Build first real cover + full-post screenshot 1080x1080 carousel and inspect in Chrome.
4. Continue Korean-first high-volume discovery/ranking and resolve strong C0 exact URLs.
5. Run targeted test + `npm run check`/server/browser E2E when an executable checkout becomes available.
