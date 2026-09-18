# NEXT RUN HANDOFF

Updated: 2026-09-18 10:37 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## Binding user-facing format
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS/media covering the FULL original body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
Latest useful Discovery at 2026-09-18 10:37 KST inspected **40+ raw leads** across Korean-community-first searches plus Reddit backup lanes and retained **15 new C1 candidates**. Restricted/community sources were used only through public/index/search-accessible pages; no login/anti-bot bypass or bulk crawl.

Top newly retained candidates:
- Blind `공직자윤리법 재산등록 대출???` — spouse-hidden loan may surface through mandatory asset reporting; exact public URL, 220 views / 1 like / 14 comments observed.
- TheQoo `같은 대기업 다니고 돈 많아 믿었는데…동료 30명 속여 70억원 가로챈 40대女` — coworker/investment fraud report, 22,704 views observed; defamation/legal framing review required.
- TheQoo `[네이트판] 취집한 친구 너무 얄밉네요...` — marriage wealth-gap/bragging conflict, 61,875 views observed; repost provenance/rights review required.
- Reddit `My [26F] husband [28M] hid debt from me for more than 3 years, and therapy isn’t helping. What next?` — nearly $300k hidden debt followed by another secret emergency loan.
- Reddit `AITA best friend upset about wedding gift` — bridesmaids paid $500 each for a requested bracelet, then bride complained about missing cash gifts; +412 votes observed.
- Lighter lane: TheQoo `아내 생일 준비를 제대로 못한 남편 (feat. 결혼 바이럴)` — surprise plan abandoned in favor of spouse-preferred quiet birthday; 13,867 views / 8 comments observed.

All 15 were stored one-candidate-per-Markdown under `data/candidates/` with actual observed metrics only. No grouped discovery JSON was created in `data/` root.

## Existing first real source asset acquisition
Commit `01475a8` added `data/source-packages/theqoo-3826792703/` for TheQoo `결혼 승낙 받자마자 탈모인거 밝힌 남편..`: eight source-linked JPEGs in page order, 534,020 bytes total. OCR was not run, privacy was not auto-masked, rights clearance is not claimed, publication remains false/04-only. Human full-body completeness approval is still pending and no final 1080x1080 source-backed carousel has been produced.

## Run truth
Discovery this run: **raw 40+ / retained 15 C1**. Full-post screenshots captured this run: **0**. New source bytes captured this run: **0**. Real final source-backed carousel produced this run: **NO**. Existing source package remains 8 images / 534,020 bytes for one TheQoo image post. New candidates remain `A0_P0 / ASSETS_PENDING / publicationAllowed=false`.

## Verification
This run changed candidate Markdown/handoff only; no application/runtime path changed. `npm run check`, server smoke, OCR/moderation and browser E2E were not run and no success is claimed.

## Next
1. Verify the existing eight-image TheQoo 3826792703 sequence for full-body completeness and build the first real cover + ordered source carousel.
2. Attempt permitted source screenshot/media acquisition for the strongest new Korean C1 candidates, prioritizing the hidden-loan asset-reporting story and high-view TheQoo money/workplace candidates.
3. Keep screenshot body exact and complete; do not convert summaries into body cards.
4. Keep all new candidates A0/P0 until real source-backed user-facing assets and 04 publication evidence exist.
