# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 11:16 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## This run — Source Package runtime now matches the binding carousel contract
`app/source-package.js` was still implementing the obsolete editorial storyboard behavior despite the docs already being corrected. It has now been changed materially:
- package requires a cover plus at least one real original-post screenshot/image;
- slide 1 is cover image + original title by default;
- slide 2 onward accepts only original `post`/`media` assets in source order;
- no reaction/comment/context card kinds in the normal source package;
- no automatic CTA, reaction label, rewritten hook, or body overlay;
- no automatic PII mask suggestions/privacy alterations;
- source format is only `글 / 이미지 / 이미지 포스팅`;
- `fullBodyCaptureStatus` is explicit (`complete / partial / pending`), and incomplete capture remains `assetsPending=true`;
- crop suggestion is limited to platform/browser UI while preserving original body/media.

`test/source-package.test.mjs` was replaced to lock this behavior. A stale regression assertion for developer showcase data was also corrected to accept the already-moved `/data/_developer/...` location.

## Verification truth
Targeted `node test/source-package.test.mjs`: **PASS** on the authorized local machine.
`npm run check`: syntax phase ran, but the local working tree had a pre-existing uncommitted stale copy of `test/field-test-showcase.test.mjs`, so the full suite stopped on its old path assertion. The repo-tip test itself was corrected in commit `400a734e`; no claim of a full green suite is made. A clean temporary-clone verification attempt did not complete through the remote execution channel, so it is not claimed.
Browser E2E: not run; this change is package-model behavior and no new rendered user-facing output was produced.

## Discovery state inherited from 10:37 run
Raw materially inspected: **52**.
Retained: **20 candidate files** (15 C1 + 5 C0).
Top candidates remain `입주 청소하러 갔다가`, `마약사범에게 뇌물 받은 경찰의 충격적인 반전..`, `ㅈ소기업 리뷰이벤트 근황`, `회사에서 뒷담화를 끊게 된 계기`, `KTX혼자서 두자리 예매?`, `결혼하면 은근히 의견 갈린다는 돈관리 유형`.

## Asset / production truth
Full-post screenshots captured this run: **0**.
Actual source bytes copied into a Source Package: **0**.
Completed REAL source-backed carousel this run: **NO**.
A1=0, P1=0. No OCR/moderation/rights/publication success was fabricated.

## Repo changes
- `011179f715ca65f6b479632dc06764f71bff1763` — production: enforce cover plus faithful screenshot package
- `739c2dafc95a4b75797f15853b3f73d850cef36c` — test: cover and full-post screenshot contract
- `400a734eac8f972ccc1f71546c83b2e38af2aeb9` — test: accept developer showcase data location

## Next concrete priority
1. Acquire actual ordered source screenshots/images for a top C1 candidate and mark full-body capture complete only after every original body screen is present.
2. Feed those real assets through the corrected Source Package and produce the first 1080×1080 cover + faithful full-post screenshot carousel.
3. Verify actual dimensions/readability in Chrome; do not use old black-background demo cards as completion evidence.
4. Continue high-volume Korean-community Discovery and resolve the strongest C0 exact URLs.
5. Keep P0 until 04 observes actual approved publication success.
