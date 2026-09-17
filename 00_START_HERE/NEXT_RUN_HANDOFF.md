# NEXT RUN HANDOFF

Updated: 2026-09-18 00:38 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → independent normalization validator → strict source-backed carousel plan → strict carousel validator.

## This run — Discovery refresh
Started from current README/handoff, current main/recent commits and latest ops `154-sol.md`; repo tip treated as authoritative. Public/search/index exploration across Korean-community-first lanes plus Reddit fallback inspected **40+ raw leads** without login/anti-bot bypass or bulk crawling. Retained **15 new candidate files** after story-potential/access/safety filtering: 14 C1 exact-public-URL candidates and 1 C0 index-only candidate. One attempted candidate write was blocked by the tool and was not counted. An initially misclassified index-only item was immediately corrected from C1 to C0 and the incorrect file deleted.

Top new candidates: Blind `이거 어떻게 복수해줄까요?ㅠㅠ` (2,493 views / 54 comments), `결혼 주선자 사례 X, 청첩장 못 받음. 축의금 해야돼?` (4,072 / 41), `JW메리어트 호텔 결혼 축의금 얼마나?` (3,631 / 1 like / 22), `임신 막달 남편 격일 회식 이해가 가는지` (229 / 12), `축의금 때문에 친구한테 섭섭한데..` (422 / 13), plus Reddit `AITA for telling my best friend that I’m not paying for everyone in her wedding after loaning her money?` (+1,924 votes). The index-only `결혼 10년 차, 영원히 사위는 남인가 봅니다` remains C0 despite visible index metrics because exact individual URL was not confirmed.

## Asset truth
Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. All new candidates remain `ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human-review gates remain and only 04_REVIEW_PUBLISH may publish. No OCR/moderation/rights/publication success claimed.

## Verification truth
Candidate Markdown files were written directly through GitHub-connected operations. No executable checkout/browser session was available, so `npm run check`, server smoke and Chrome E2E were not run or claimed. Discovery evidence came only from public search/index/page observations; restricted sources were not bypassed.

## Next
1. Acquire permitted ordered full-post screenshots for strongest Korean candidates, prioritizing `이거 어떻게 복수해줄까요?ㅠㅠ`, `결혼 주선자 사례 X...`, `임신 막달 남편 격일 회식...`, and the strongest recent hidden-debt stories.
2. Run real bytes through intake → completeness verification → crop review/gate → normalization → validator → strict carousel builder/validator.
3. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
4. Keep A0 until actual source-backed user-facing assets exist; keep P0 until 04 verifies real publication.
