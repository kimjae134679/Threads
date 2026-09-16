# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-17 04:35 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Material work this run — Discovery refresh
Public search/index coverage inspected **raw 40+ leads/results** across Korean-community-first queries plus Reddit/social lanes. Restricted sources were not bulk-crawled or bypassed. Retained **15 new candidates** as one Markdown file per candidate under `data/candidates/`: **12 C1 + 3 C0**. C0 was used where only a Blind public index/list URL was verified; exact individual URLs were not invented.

Top new candidates:
1. `Am I wrong for giving my brother a "debt forgiveness" card as his wedding gift instead of cash?` — https://www.reddit.com/r/amiwrong/comments/1wi06a7/am_i_wrong_for_giving_my_brother_a_debt/ — observed score +794; posted Sep 16 2026; brother stopped repaying $3,500 loan, spent on jet ski/Vegas, then objected when remaining $3,100 debt forgiveness became the wedding gift.
2. `AITAH for refusing to give my stepmother my late mom’s wedding dress after she altered it behind my back?` — https://www.reddit.com/r/BORUpdates/comments/1wct28w/aitah_for_refusing_to_give_my_stepmother_my_late/ — observed score +3,038; heirloom wedding dress secretly altered for stepsister, restoration/family dispute follows. Repost provenance requires original-source/rights review.
3. `AITA for not helping my sister pay for her wedding?` — https://www.reddit.com/r/AmItheAsshole/comments/1cuvk6h/aita_for_not_helping_my_sister_pay_for_her_wedding/ — observed score +3,943; $3,000 gift followed by demand for the "balance" for a dream wedding.
4. `AITAH for pretending that I quit my job because my partner kept devaluing it?` — https://www.reddit.com/r/BORUpdates/comments/1srr4ks/aitah_for_pretending_that_i_quit_my_job_because/ — observed score +2,747; work/marriage/money conflict with a strong behavioral reversal.
5. `화담숲 예약 킹받는다.` — Blind public index only, observed index metrics 19K / 346 / 332; kept C0 until exact post URL/body is verified.
6. `교사 7년간 월급으로 비트코인만 모았어요. 질문에 답변 드립니다.` — exact Blind original URL provenance exposed by public index; body/asset still not read/acquired, so no return/performance claims were invented.
7. `I wasn't allowed to use a notebook at my cashier job... printed out receipts... finally published my novel.` — https://www.reddit.com/r/nextfuckinglevel/comments/kdp598 — observed score +110,406; shared-media post, source media bytes still unacquired.

Other retained lanes include wedding-vendor unpaid balance, wedding-ceremony prank, long-distance co-parenting move conflict, family indifference after novel publication, and Korean Blind dating/asset-balance leads.

## Candidate truth / storage
Every retained item is a separate Markdown file in `data/candidates/` using `YYMMDD_Cx_A0_P0_*.md`. No new grouped discovery JSON was created in `data/`. Every file records source/provenance state, observation time, only visible metrics, body/comments read state, source-image state, swipe rationale, acquisition state, and `publicationAllowed=false`. Public third-party bodies are summarized rather than copied wholesale. `본문 미확인` is used where appropriate.

## Asset truth
Full-post screenshots captured this run: **0**.
Actual source bytes acquired: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**.
All new candidates remain `ASSETS_PENDING`; rights/privacy/human review gates remain. No OCR/moderation/rights/publication success was inferred.

## Existing implementation/test truth
The prior Source Package fixture repair remains in repo (`20830b69...`). This discovery-only automation environment did not expose a runnable checkout/Node/Chrome process, so `npm run check`, server smoke and browser E2E were not run this turn and are not claimed passing.

## Next concrete priority
1. Verify exact individual URLs/full bodies for strongest Korean C0 leads and continue Korean-first high-volume discovery without lowering story quality.
2. Acquire complete original-post screenshots/source media for `주식으로 8천날림`, `[인증] 하루 5.2억 손실, 한 달 15억 손실`, then strongest newly retained candidates.
3. Preserve every body screen in order; crop UI chrome only, never body text; no automatic privacy masking.
4. Run screenshot intake + normalization planner and verify order/dimensions/hash/provenance.
5. Build 1080×1080 cover + complete original screenshot carousel and Chrome-verify before A1. Only `04_REVIEW_PUBLISH` may create P1.
