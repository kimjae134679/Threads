# NEXT RUN HANDOFF

Updated: 2026-09-17 22:37 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → independent normalization validator → strict source-backed carousel plan → validator.

## This run — Discovery refresh
Read README, current handoff, current main/recent commits and latest sequential ops `150-sol.md`; repo tip treated as authoritative. Public/index/search exploration covered Korean-community-first lanes plus Reddit, without login/anti-bot bypass or restricted bulk crawling.

Inspected **40+ raw leads** across the search/index result sets and retained **15 new C1_A0_P0 candidates** after relevance/dedupe filtering. Candidate files are one Markdown file per item under `data/candidates/`; no grouped discovery JSON was created in `data/` root.

Top newly retained candidates:
- Blind `남편이 비자금을 숨겼는데 배신감드네 ㅠ` — 21K views / 18 likes / 187 comments.
- Blind `축의금 문화, 결혼 문화 10년내 다바뀔 듯` — 85K / 433 / 543.
- Blind `남편이 올려서 다른 사람들한테도 물어보라고해서 올려봐` — 12K views / 86 comments.
- Blind `절친이 축의금 10만원 함(내가 속좁은 거야?)` — 13K views / 95 comments.
- Blind `배우자의 동의없는 대출 및 주식투자는 이혼사유?` — 1,958 / 1 / 19.
- Reddit `AITA for not returning money my ex-husband sent to me mistakenly?` — observed score +9,444.

Other retained lanes include repeated leveraged stock losses, secret 1.8억 stock debt, family futures-loss spillover, workplace matchmaking pressure, in-law wedding-gift imbalance, wedding-MC compensation, and destination-wedding family conflict. Exact URLs and only actually observed metrics are recorded in each candidate file. Where the accessible result did not verify the body to the end, the candidate explicitly says `본문 전체 미확인`.

## Asset truth
Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. All new candidates remain `ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human-review gates remain and only 04_REVIEW_PUBLISH may publish. No OCR/moderation/rights/publication success claimed.

## Verification truth
This was a Discovery/data run using public search/index evidence and GitHub file writes. No executable checkout/browser asset-capture session was available, so `npm run check`, server smoke and Chrome E2E were not applicable/executed and are not claimed.

## Next
1. Prioritize permitted full-post screenshot capture for `남편이 비자금을 숨겼는데 배신감드네 ㅠ`, `절친이 축의금 10만원 함(내가 속좁은 거야?)`, and strongest prior high-engagement Korean candidates.
2. Run real source bytes through intake → completeness verification → crop review/gate → normalization → validator → strict carousel plan/validator.
3. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
4. Keep A0 until actual source-backed user-facing assets exist; keep P0 until 04 verifies real publication.
