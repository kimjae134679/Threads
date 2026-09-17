# NEXT RUN HANDOFF

Updated: 2026-09-17 20:38 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → independent normalization validator → strict source-backed carousel plan → validator.

## This run — high-volume Discovery refresh
Read current README/handoff, main/recent commits and latest ops `146-sol.md`; repo tip treated as authoritative. Public/index/search exploration covered Korean-community-first lanes (Blind, TheQoo, DCInside/FMKorea/Ruliweb/Ppomppu/Inven/Arca queries; Clien/Instiz were robots-blocked and not bypassed) plus Reddit. Raw leads inspected: 40+. Retained: 15 new one-candidate-per-Markdown files in `data/candidates/`; all exact public URLs are C1 and all remain A0/P0.

Top retained candidates:
- Blind `코인 하는 남편 간섭해도 될까요?` — observed 5,522 views / 55 comments; husband reportedly trades crypto in 2–3억원 units after starting with 200만원 and buying a home/car from gains.
- TheQoo `축의금 10만원으로 통일한다는 비혼친구... 너무 서운해요` — observed 66,831 views / 592 comments; strong friendship/non-marriage/wedding-gift dispute.
- TheQoo `반반결혼의 최후 (애로부부 캡쳐)` — observed 75,932 views / 515 comments; image-post sequence about rigid 50/50 marriage finances colliding with childbirth/childcare.
- TheQoo `결혼 승낙 받자마자 탈모인거 밝힌 남편..` — observed 104,013 views / 391 comments; image-post lead, body not read so candidate explicitly says `본문 미확인`.
- Reddit/WSB `Loss Porn` — observed +7,916 votes; $50k personal loan taken for trading and lost, strong leveraged-loss human story.

Other retained lanes include husband refusing to sell crypto gains, hidden fiancé debt, repaying a large wedding gift to a possibly non-marrying friend, crypto loss after using a credit line, boss-arranged dating rejection, mobile-invitation wedding gift etiquette, provocative household-money conflict, a wedding cancellation family dilemma, and a fiancé hiding $10k debt.

## Asset truth
Full-post screenshots captured this run: 0. Actual source bytes acquired: 0. Real source-backed carousel produced: NO. A1/P1: 0. New candidates are `ASSETS_PENDING / publicationAllowed=false`. Rights/privacy/human-review gates remain; only 04_REVIEW_PUBLISH may publish. No OCR/moderation success claimed.

## Verification truth
This was a Discovery/data run through GitHub connector and public web surfaces. No executable checkout/browser E2E was available, so `npm run check`, server smoke and Chrome E2E were not executed or claimed.

## Next
1. Prioritize permitted full-post screenshot acquisition for the strongest C1 image/text candidates, especially `반반결혼의 최후`, `축의금 10만원으로 통일한다는 비혼친구`, and `코인 하는 남편 간섭해도 될까요?`.
2. For image-post candidates marked `본문 미확인`, do not fill in missing content until the original image sequence is actually read.
3. Run real screenshot bytes through intake → completeness verification → crop review/gate → normalization → validator → carousel plan/validator.
4. Render and inspect the first real 1080x1080 source-backed carousel in Chrome when executable checkout/browser tooling is available.
