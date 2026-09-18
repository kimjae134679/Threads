# NEXT RUN HANDOFF

Updated: 2026-09-18 10:24 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## Binding user-facing format
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS/media covering the FULL original body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
Latest useful Discovery at 2026-09-18 09:33 KST inspected **40+ raw leads** and retained **15 new C1 candidates**. Top candidates remain Blind `남편의 비밀적금`, `남편이 제 몰래 대출받아 코인을 하다가 다 날렸어요`, `남편 주식`, plus existing `나몰래 대출받은 남편`; lighter lane includes Inven `자체생산)본인 일본 유학 및 결혼 썰`.

## First real source asset acquisition
Commit `01475a8` added the first real source-media package: `data/source-packages/theqoo-3826792703/` for TheQoo `결혼 승낙 받자마자 탈모인거 밝힌 남편..` (`https://theqoo.net/square/3826792703`). The public post exposes exactly eight source-linked JPEGs; all eight were downloaded in page order to `original/01.jpg` … `08.jpg` (534,020 bytes total). These are source media, not generated substitutes. The source page showed 104,013 views / 391 comments when inspected. OCR was not run, privacy was not auto-masked, rights clearance is not claimed, and publication remains false/04-only.

A headless Chrome attempt against Blind `나몰래 대출받은 남편` produced only Blind's error page, so that failed image was deleted and is **not** counted as a source screenshot. TheQoo page-level headless screenshot also did not yield a usable file; no success is claimed for it. Temporary failed captures were cleaned.

## Run truth
Discovery this implementation run: **raw 0 / retained 0**; latest useful Discovery remains **40+ / 15 C1**. Full-post source sequence acquired this run: **8 ordered source images for 1 image-only post**. Actual source bytes acquired: **8 files / 534,020 bytes**. Full-post screenshot completeness gate: **not yet human-approved**. Real final 1080x1080 source-backed carousel produced: **NO**. A1/P1 remain **0**.

## Verification
An executable Windows checkout was used for the first time in this sequence. `npm run check` was started; syntax phase started successfully but final test completion was not observed before handoff, so full check success is not claimed. No server smoke/Chrome carousel E2E is claimed yet. Source package was committed and pushed to main.

## Next
1. Treat TheQoo 3826792703 as the first concrete source package: verify the eight-image sequence for full-body completeness, then run intake/crop/normalization and strict carousel validation without rewriting the body.
2. Build a real 1080x1080 cover using the unchanged original title, followed by the eight original images in order; inspect actual output in Chrome.
3. Continue permitted capture attempts for strongest Korean C1 candidates; do not count Blind error pages as captures.
4. Keep C0 out of deterministic intake; A0 until source-backed user-facing assets pass gates and P0 until 04 verifies publication.
