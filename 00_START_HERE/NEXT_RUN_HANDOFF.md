# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 16:36 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Latest Discovery state
This run queried multiple Korean-community-first lanes plus Reddit/public web and inspected roughly **40+ search/index/page leads**. After rejecting promotional, ordinary market/news, low-story, duplicate and weak-fit results, **15 new one-file Markdown candidates** were retained: **14 C1 + 1 C0**.

Top new candidates:
1. `돈 때문에 결혼접을까 고민된다는 남자` — Ppomppu exact page, 6,298 views / 15 comments; two source JPGs are listed but image body not read and bytes not acquired.
2. `결혼 후 퇴사 고민` — Blind exact public page, 2,694 views / 2 likes / 19 comments; career-vs-marriage conflict, text body publicly read.
3. `AITA for gifting a donation` — Reddit exact page, +1,351 observed score; wedding asked for charity donation, bride objected when guest donated $500 instead of giving cash.
4. `AITA for not changing my daughter's wedding venue...` — Reddit exact page, +13,261 observed score; $20K non-refundable venue collides with family affair history.
5. `AIO if I want to send an invoice for people that no-call no-showed to my wedding?` — Reddit exact public repost, +191 observed score; wedding no-show invoice dispute.

Other retained lanes include Korean image humor (`남편 아이 없이 친구들이랑 핵노잼여행`, `그거 너야 바부가나디야`), Everest-cost surprise, Korean entertainment/community posts, and additional wedding/dating conflicts. `2026년 회사별 느낌 NEW ver.` is deliberately C0 because only a Blind index/list page was observed and no exact individual URL was verified.

## Production state
Runtime commit `a67094c` remains the current production behavior: tall post screenshots are sliced into sequential 1080×1080 body slides with 72 rendered-pixel overlap, preserving source order and readability. Cover remains first real source asset + original title; export requires `fullBodyCaptureStatus=complete`. No rewritten body cards, automatic privacy masking, OCR or vision were added.

## Asset / publication truth
Full-post screenshots captured this run: **0**.
Actual source bytes acquired this run: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**. All new candidates are A0/P0 and `publicationAllowed=false`; rights/privacy/human review gates remain.

## Verification truth
This was a Discovery/data-only run. No runtime code changed, so npm/server/browser tests were not rerun. Candidate files were written directly to main through the GitHub contents API. No OCR/moderation/API publication success is claimed.

## Next concrete priority
1. Acquire the complete ordered source JPGs/screenshots for `돈 때문에 결혼접을까 고민된다는 남자` first; its exact page already exposes two attached JPGs.
2. If those two images contain the full post, feed them through screenshot intake and produce the first real source-backed square carousel; otherwise capture every remaining body screen before export.
3. Verify the real output in Chrome, then continue high-volume Korean discovery and asset acquisition.
