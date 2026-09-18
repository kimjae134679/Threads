# NEXT RUN HANDOFF

Updated: 2026-09-18 09:33 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
Latest useful Discovery at 2026-09-18 09:33 KST inspected **40+ raw leads** across Korean-community-first public search/index lanes plus Reddit support and retained **15 new C1 candidates** after dedupe/story/safety/evidence filtering. Restricted sources were not bulk crawled or bypassed.

Strongest new Korean candidates: Blind `남편의 비밀적금` (55K views / 64 likes / 710 comments), `남편이 제 몰래 대출받아 코인을 하다가 다 날렸어요` (406 / 12; hidden 80M KRW credit line and about 60M KRW loss), `남편 주식` (988 / 25; hidden leverage and almost -200M KRW), `코인 하는 남편 간섭해도 될까요?` (5,522 / 55; 200M–300M KRW crypto scalping after prior gains), `남편 몰래 재산 탕진하고 대출까지 받은 아내` (6,318 / 48), `배우자의 동의없는 대출 및 주식투자는 이혼사유?` (1,958 / 19), and `빚 안 갚고 주식 하겠다는 남편` (1,412 / 1 / 33). Inven `자체생산)본인 일본 유학 및 결혼 썰` (15,261 / recommendation 9 / comments 21) adds a lighter autobiographical lane.

Reddit support additions include fiancé debt lies before wedding (+310), divorce after spouse refused financial help during unemployment (+7,966), sister demanding more than a $3,000 wedding gift (+3,943), parent paying daughter's but not son's wedding (+9,837), and wedding-money-versus-house conflict (+406). One attempted file already existed/tooling rejected it and is not counted.

Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. New candidates remain `ASSETS_PENDING`, `publicationAllowed=false`; rights/privacy/human review remains required and only 04_REVIEW_PUBLISH may publish.

## Existing implementation
`scripts/build-acquisition-queue.mjs` + `npm run acquisition:queue` rank Korean-community exact-source candidates ahead of overseas support lanes. C0/index-only records are fail-closed out of deterministic screenshot capture and must obtain exact individual public provenance and become C1 first. Queue state does not grant rights, infer OCR/moderation, fabricate screenshots, change A/P state, auto-mask privacy, or publish.

## Verification truth
15 candidate Markdown files and this handoff were written through GitHub contents API. This was Discovery-data work, not renderer/UI code. No executable checkout/browser was used for `npm run check`, server smoke or Chrome E2E; none are claimed. No source screenshot bytes or temporary artifacts were created.

## Next
1. Acquire permitted ordered full-post screenshots for strongest Korean C1 candidates first: `남편의 비밀적금` → `남편이 제 몰래 대출받아 코인을 하다가 다 날렸어요` → `남편 주식` → existing `나몰래 대출받은 남편`.
2. Keep C0 out of deterministic intake until exact individual public provenance is verified. Never reconstruct unread image bodies.
3. Feed real bytes through deterministic intake → human completeness verification → UI-chrome crop review/gate → 1080x1080 contain normalization → strict carousel builder/validator.
4. Render the first real 1080x1080 cover + full-original-post screenshot carousel and inspect it in Chrome.
5. Keep Korean-community-first high-volume Discovery; A0 until actual source-backed user-facing assets exist and P0 until 04 verifies real publication.
