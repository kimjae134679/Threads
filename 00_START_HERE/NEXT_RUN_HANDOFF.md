# NEXT RUN HANDOFF

Updated: 2026-09-17 23:37 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → independent normalization validator → strict source-backed carousel plan → validator.

## This run — Discovery refresh
Started from current README/handoff, current main/recent commits and latest ops `152-sol.md`; repo tip treated as authoritative. Public search/index/page exploration covered 40+ raw leads across Korean-community-first lanes plus Reddit fallback. Restricted/robots-blocked sources were not bypassed. Retained 15 new C1_A0_P0 candidates as one Markdown file per candidate under `data/candidates/`.

Top new candidates: Blind `결혼 1년정도 됐는데, 남편이 빚투로 2억5천 빚을 만들었어요...` (6,083/53), `시댁` (15K/40/182), `남편이 빚을 숨기고 친정부모님 지원금으로 갚았어요.` (883/13), `축의금 때문에 친구한테 섭섭한데..` (422/13), plus Reddit `AITA for not giving my fiancé any of the winnings to pay off her debt?` (+5,564 votes), `I just found my husband has 45K dollars in secret credit card debt.` (+4,798 votes), and `AITAH for calling off my wedding after finding out my fiancé never had the money he promised to contribute?` (+6,535 votes).

## Discovery status
This run inspected **40+ raw leads** and retained **15 new candidates** after dedupe/taste/safety/access filtering. Candidate files record exact public URL, observed title, same-observation metrics only when visible, body/comments read state, acquisition state and why swipe-worthy. No new grouped discovery JSON was created at `data/` root.

## Asset truth
Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. New candidates remain `ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human-review gates remain and only 04_REVIEW_PUBLISH may publish. No OCR/moderation/rights/publication success claimed.

## Verification truth
Discovery records were written directly through GitHub-connected source operations. No executable checkout/browser session was available; `npm run check`, server smoke and Chrome E2E were not relevant/executed for Markdown-only discovery additions and are not claimed.

## Next
1. Acquire permitted ordered full-post screenshots for the strongest Korean candidates, starting with the 2.5억 빚투 / 시댁 / 친정지원금 숨긴빚 stories.
2. Run real bytes through intake → completeness verification → crop review/gate → normalization → validator → strict carousel builder/validator.
3. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
4. Keep A0 until actual source-backed user-facing assets exist; keep P0 until 04 verifies real publication.
