# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 15:19 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Latest Discovery state
Latest discovery inspected roughly **40+ materially distinct public/index/search leads** and retained **15 new deduped candidates**: **4 C1 + 11 C0**. Strongest observed C1 remains `결혼식 해보니까 오지도 않고 5만원 내는 사람 많더라` (TheQoo exact page; selected observation 50,295 views / 568 comments). Other C1s: `간호사랑 기싸움하려고 환자 죽일뻔한 의사 썰..`, `이제는 산에서까지 뛰어다니나 보네요`, `95년생이랑 75년생이랑 결혼가능할까요`.

## Production state
Runtime commit `a67094c` fixes a user-visible quality risk in tall full-post screenshot slicing. Sequential 1080×1080 body slides now overlap by 72 rendered pixels instead of meeting at a hard boundary, reducing the chance that a line of text is split exactly at the swipe boundary while preserving every source pixel in order. Cover remains first real source asset + original title; `media` remains contain-rendered; export still requires `fullBodyCaptureStatus=complete`. No rewritten body cards, CTA cards, automatic privacy masking, OCR or vision were added.

## Asset / publication truth
Full-post screenshots captured this run: **0**.
Actual source bytes acquired this run: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**. `publicationAllowed=false`; no OCR/moderation/rights/publication success claimed.

## Verification truth
Checked out current repo on the authorized desktop and ran `git diff --check`, `node --check app/source-intake.js`, and full `npm run check`: **PASS**. The suite included actual ffmpeg 1080×1920 H.264 render/ffprobe PASS. Actual Chrome E2E was not run, so browser visual success is not claimed.

## Next concrete priority
1. Acquire complete ordered source images for a strong C1 (`결혼식 5만원` / `당근 꿀 알바`).
2. Feed one complete source set through auto-cover + overlap-safe tall-post slicing and produce the first real source-backed 1080×1080 carousel.
3. Verify that real output in Chrome, then continue acquisition/crop-suggestion automation.
