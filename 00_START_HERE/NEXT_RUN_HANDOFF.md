# NEXT RUN HANDOFF

Updated: 2026-09-18 09:16 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Latest Discovery truth
Latest useful Discovery at 2026-09-18 08:37 KST inspected **40+ raw leads** across Korean-community-first public search/index lanes plus Reddit support and retained **10 new C1 candidates** after dedupe/story/safety/evidence filtering. Korean exact-source additions include `결혼 승낙 받자마자 탈모인거 밝힌 남편..` (TheQoo 104,013 views / 391 comments), `이모때문에 스트레스 미치게 받아. 다른 집들 친척 결혼식 관련 경험좀..` (Blind), `남편 전화 못받는 아내` (TheQoo 7,254 / 20), `결혼식 비용이 부족했던 남성` (Ruliweb 18,161 views / 79 recommendations), and `결혼식 식대가 얼만데 축 의금 얼마를 내냐 소리 진짜 웃긴다.` (Ruliweb 16,095 / 95). Overseas support additions include brother's $800 wedding gift after uninvite (+2,566), last-minute Europe wedding gift reversal (+4,018), husband hidden $70K+ debt (+23), coworker-child cash-card pressure (+104), and SAHM wife's hidden $17K debt update (+2,037).

TheQoo/Ruliweb image-centric candidates explicitly say `본문 미확인` where image body was not actually read. Restricted sources were not bulk crawled or bypassed. Clien/Instiz search access was robots-blocked and was not circumvented. One attempted candidate write was blocked by tooling and was not counted as retained.

Full-post screenshots captured this implementation run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. New candidates remain `ASSETS_PENDING`, `publicationAllowed=false`; rights/privacy/human review remains required and only 04_REVIEW_PUBLISH may publish.

## Existing implementation
`scripts/build-acquisition-queue.mjs` + `npm run acquisition:queue` rank Korean-community exact-source candidates ahead of overseas support lanes. Exact acquisition URL is read only from the candidate `## 정확한 링크` section. As of commit `d76155d34f28800046bf459ca1131906c24432a2`, C0/index-only records are fail-closed out of deterministic screenshot capture entirely: they are emitted only under `Provenance pending` and must obtain an exact individual public source and be promoted to C1 first. A filename classified C1 but missing an exact-link URL is separately blocked as inconsistent. The queue carries recorded acquisition state for manual capture operators and does not grant rights, infer OCR/moderation, fabricate screenshots, change A/P state, auto-mask privacy, or publish.

## Verification truth
This implementation run changed the acquisition queue and this handoff through GitHub contents API. Discovery this implementation run: **raw 0 / retained 0**; latest useful Discovery remains **40+ / 10 C1**. No executable checkout/browser was available, so `npm run check`, server smoke and Chrome E2E are not claimed. No source screenshot bytes or temporary artifacts were created.

## Next
1. Run the stricter queue in an executable checkout and acquire permitted ordered full-post screenshots for strongest Korean C1 candidates first, including existing `나몰래 대출받은 남편`, `주식중독 남편.. 대출 막는법 있을까?`, plus high-response `결혼 승낙 받자마자 탈모인거 밝힌 남편..` where source image sequence can be captured lawfully.
2. For C0 records, verify exact individual public provenance and promote to C1 before any deterministic screenshot intake. For image-centric records marked `본문 미확인`, do not editorially reconstruct; obtain the actual ordered source images/screenshots first.
3. Feed real bytes through deterministic intake → human completeness verification → UI-chrome crop review/gate → reviewed-crop-plan validator → 1080x1080 contain normalization → strict carousel builder/validator.
4. Render the first real 1080x1080 cover + full-original-post screenshot carousel and inspect it in Chrome.
5. Keep Korean-community-first high-volume Discovery; A0 until actual source-backed user-facing assets exist and P0 until 04 verifies real publication.
