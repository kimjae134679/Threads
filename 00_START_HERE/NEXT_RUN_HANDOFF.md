# NEXT RUN HANDOFF

Updated: 2026-09-18 03:36 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
This useful Discovery pass inspected **40+ raw public leads** across Korean-community-first searches plus public Reddit and retained **15 new C1 candidates**, each as one Markdown file under `data/candidates/`. Restricted sources were approached only through public search/index/page results; no bulk crawling, login or anti-bot bypass was used.

Strong Korean candidates: Blind `[결혼 고민] 결혼 전부터 경제권 요구하는 여친... 내가 잘못함?` (97 / 14 comments), `맨날 사고치는 남편` (7,226 / 65; investment losses exceeding 3억원 tied to postpartum work/household conflict), `갓난 아기 육아분담 어떡하고 있나요?` (5,115 / 121), `결혼 예정 부부의 명절 문제` (8,375 / 7 likes / 161), `결혼 비용및 축의금 정산 의견 차이` (1,966 / 21), `실수령 외벌이 500 저축 얼마해야하나요? 이사가야할까요?` (1,114 / 38), plus housing-vs-ETF and wedding-gift norm disputes.

Strong overseas support candidates: Reddit `AITA for accepting money from my parents for my wedding then eloping.` (+17,821), `AITA for telling my parents they have to pay for my wedding.` (+12,084), marriage debt-disclosure (+3,046), destination-wedding parent exclusion (+547), and wedding gift vs unpaid debt (+17). Metrics are recorded only where actually visible at the same observation time; missing views/comments are explicitly left unclaimed.

Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. All new candidates remain `ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human review remains required and only 04_REVIEW_PUBLISH may publish. No OCR/moderation/rights verification, asset capture, delivery or publication success was performed or inferred.

## Verification truth
Material repo change: 15 new human-readable candidate Markdown files plus this handoff. This was a Discovery-data run, not a renderer-code/UI change. No executable checkout/browser was available, so `npm run check`, server smoke and Chrome E2E were not run or claimed. No temporary artifacts were created.

## Next
1. Dedupe and continue Korean-community high-volume discovery, favoring stronger current stories over generic advice/news.
2. Prioritize permitted ordered full-post screenshot capture for `결혼 예정 부부의 명절 문제`, `맨날 사고치는 남편`, `갓난 아기 육아분담 어떡하고 있나요?`, and source-accessible high-ranked candidates.
3. Feed real bytes through intake → completeness verification → UI-chrome crop review → normalization → validator → strict carousel builder/validator.
4. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
5. Keep A0 until actual source-backed user-facing assets exist; keep P0 until 04 verifies real publication.
