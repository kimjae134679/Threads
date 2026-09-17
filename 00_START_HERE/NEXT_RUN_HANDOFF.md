# NEXT RUN HANDOFF

Updated: 2026-09-18 01:36 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → independent normalization validator → strict source-backed carousel plan → strict carousel validator.

## This run — Discovery
Started from current README/handoff, current main/recent commits and latest ops `156-sol.md`; repo tip treated as authoritative. Public search/index/page exploration inspected **40+ raw leads** across Korean-community-first lanes plus Reddit fallback, without login/anti-bot bypass or restricted bulk crawling. Retained **15 new C1 candidates**, one Markdown file per candidate under `data/candidates/`.

Top candidates this run:
- Blind `남편 외도` — exact public URL; 1,542 views / 3 likes / 36 comments observed.
- Blind `제 남편 이 여자후배 좋아하는것 맞죠?` — exact public URL; 491 views / 14 comments observed.
- Blind `남편 회식 징글징글하다` — exact public URL; 126 views / 22 comments observed.
- Blind `업체에서 운영하는 하객알바 축의금 댓글 부탁드려요` — exact public URL; 147 views / 7 comments observed.
- Blind `축의금 계좌이체` — exact public URL; 453 views / 7 comments observed.
- Blind `부모쪽 축의금 질문` — exact public URL; 358 views / 24 comments / 68 poll participants observed.
- Blind `결혼식 비용 축의금` — exact public URL; 4,270 views / 4 likes / 7 comments observed.
- Reddit `AITA for not giving my fiancé any of the winnings to pay off her debt?` — exact public URL; +5,564 votes observed.
- Reddit `AITA for not supporting my husband` — exact public URL; crypto-loan/larger hidden-debt story.
- Reddit wedding-event business/family-friend unpaid-balance story — exact public URL; +937 votes observed.

Other retained Korean candidates cover coworker wedding-gift resentment, family wedding-gift settlement, long-distance old-friend wedding gift, TV-discussed hidden debt, and pregnancy/childcare versus husband dinner conflict. Candidate files record only same-observation metrics actually visible, whether body/comments were read, source/acquisition state, and `publicationAllowed=false` gates.

## Discovery/asset truth
Discovery raw candidate count this run: **40+**. Retained: **15**.

Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. All new candidates remain `C1_A0_P0 / ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human-review gates remain and only `04_REVIEW_PUBLISH` may publish.

No OCR/moderation/rights verification, asset capture, delivery or publication success was performed or inferred.

## Verification truth
GitHub candidate writes completed. This was a Discovery/data run; no executable checkout/browser session was used, so `npm run check`, server smoke and Chrome E2E were not run or claimed. No user-visible production code path changed.

## Next
1. Dedupe/rank the newest Korean candidates against the existing candidate corpus and prioritize the strongest source-accessible items.
2. Acquire permitted ordered full-post screenshots for the strongest candidates.
3. Run real bytes through intake → completeness verification → crop review/gate → normalization → validator → strict carousel builder/validator.
4. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
5. Keep A0 until actual source-backed user-facing assets exist; keep P0 until 04 verifies real publication.
