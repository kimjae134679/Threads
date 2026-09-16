# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 13:14 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Latest useful Discovery refresh
Public search/index/page exploration screened **~58 materially distinct leads** across Korean-community-first queries and adjacent public social/search lanes. Restricted sources were not bulk crawled or bypassed. After dedupe, story-potential, safety/comfort and provenance filtering, **16 new C1 candidate Markdown files** were retained under `data/candidates/`.

Top candidates remain: `상황 진짜 위험해보이는 돌고래유괴단`, `20년지기 여사친 하고 결국 결혼했다`, `이시대를 사는 4050 특징`, `회사 언니가 남친과 헤어진 이유`, `여직원 원룸 구한다고해서 방내어줌`, `친구랑 낡은 집에 살았는데.jpg`, plus existing `남편 비상금 발견했어요....`.

## 13:14 production change — automatic cover renderer
`app/source-intake.js` now treats every user-selected image as an ORIGINAL POST asset. A separate cover file is no longer required. The program automatically creates slide 1 from the first ordered original asset as the background plus the candidate's original title, while preserving that same first source asset as slide 2. Therefore selecting N ordered original screenshots/media produces N+1 PNGs: 1 auto-generated 1080×1080 cover + N faithful original-post slides.

The generated cover is represented in SOURCE_PACKAGE provenance as a locally derived asset; it is not falsely claimed as a source screenshot. Slide 2 onward remains only `post`/`media`, no summary/reaction/CTA cards, no OCR/vision claim, no automatic privacy masking. Export remains blocked unless `fullBodyCaptureStatus=complete`. Commit: `30b5746a`.

## Asset / production truth
Full-post screenshots captured this production run: **0**.
Actual source bytes acquired this run: **0**.
Completed REAL source-backed carousel this run: **NO** because no complete ordered source screenshot set is available yet.
A1/P1 remain unchanged; `publicationAllowed=false`. No OCR/moderation/rights/publication success claimed.

## Verification truth
The change was made through the GitHub connector. This run did not have a mounted/browser runtime for `npm run check`, server smoke or Chrome E2E, so no test success is claimed. The next runtime-enabled run must exercise: one source image → 2 PNGs, multi-source ordering → N+1 PNGs, and complete/pending export gate.

## Next concrete priority
1. Acquire complete ordered original-post screenshots for the strongest C1 relationship/workplace candidates.
2. Feed one complete set into the new auto-cover intake and produce the first real 1080×1080 auto-cover + full-post carousel.
3. Verify dimensions/readability/order in Chrome when browser tooling is available.
4. Continue Korean-community-first high-volume Discovery without grouped JSON in `data/` root.
5. Keep P0 until 04 observes actual approved publication success.
