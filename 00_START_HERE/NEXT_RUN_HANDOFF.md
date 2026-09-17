# NEXT RUN HANDOFF

Updated: 2026-09-18 04:19 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest implementation
`0fe53ca5f62c9df00f1239d80038501ee7d38a3f` adds deterministic screenshot ordering to `scripts/build-screenshot-intake-manifest.mjs`. Intake now supports `--order-mode filename`, which natural-sorts screenshot basenames (for example 1, 2, 10 rather than lexical 1, 10, 2) before assigning `sourceSequence`. Default `--order-mode cli` preserves explicitly supplied order. The chosen order mode is recorded in the manifest provenance. This does not infer body completeness, OCR/vision, rights, privacy, moderation or publication.

## Latest Discovery truth
Most recent useful Discovery inspected **40+ raw public leads** and retained **15 new C1 candidates**. Strong Korean candidates remain Blind `[결혼 고민] 결혼 전부터 경제권 요구하는 여친... 내가 잘못함?`, `맨날 사고치는 남편`, `갓난 아기 육아분담 어떡하고 있나요?`, `결혼 예정 부부의 명절 문제`, `결혼 비용및 축의금 정산 의견 차이`, and `실수령 외벌이 500 저축 얼마해야하나요? 이사가야할까요?`.

This implementation run Discovery: **raw 0 / retained 0**. Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. Candidates remain `ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human review remains required and only 04_REVIEW_PUBLISH may publish.

## Verification truth
Material repo change: deterministic ordered screenshot intake. No executable checkout/browser was available in this run, so targeted runtime tests, `npm run check`, server smoke and Chrome E2E were not run or claimed. No temporary artifacts were created.

## Next
1. Continue high-volume Korean-community discovery on useful Discovery runs.
2. Acquire permitted ordered full-post screenshots for a strong source-accessible Korean candidate.
3. Feed real bytes through intake (`--order-mode filename` where capture filenames encode order) → human completeness verification → UI-chrome crop review → normalization → validators → strict carousel builder/validator.
4. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
5. Keep A0 until actual source-backed user-facing assets exist; keep P0 until 04 verifies real publication.
