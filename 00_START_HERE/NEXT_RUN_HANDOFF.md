# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 12:17 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## This run — screenshot intake runtime corrected
The actual browser intake path in `app/source-intake.js` still contained old editorial-carousel behavior even though `app/source-package.js` had already been corrected. This run fixed that runtime mismatch.

Material changes:
- selected asset #1 is now explicitly the **cover**; it is not treated as original-post body evidence.
- asset #2 onward accepts only `post` or `media`, matching the binding Source Package contract.
- old `continuation` / `comment` editorial kinds were removed from the intake UI.
- cover text now comes from the selected candidate's original title; the old custom hook/caption path is no longer fed into Source Package.
- preview no longer appends a CTA/reaction/editorial ending card.
- PNG rendering no longer creates an extra CTA card; output count equals selected cover + actual source sequence.
- body screenshots are rendered contain-style without text overlays; no body text is rewritten.
- source assets remain `verifiedByVision=false` and `verifiedByOcr=false`; no automatic privacy masking was added.
- `fullBodyCaptureStatus` remains explicit; export is blocked unless it is `complete`, preventing partial screenshot sets from being presented as a completed carousel.

## Discovery state inherited from latest useful run
Raw materially screened: **~73**.
Retained: **15 new C1 candidates**.
Top candidates remain `대기업 다닌다던 남편이 고졸이었어`, `남편 비상금 발견했어요....`, `12년차 차장입니다. 회사에서 넵 쓰지마세요`, `길에서 핸드폰 빌려줬더니 온 카톡`.

## Asset / production truth
Full-post screenshots captured this run: **0**.
Actual source bytes acquired this run: **0**.
Completed REAL source-backed carousel this run: **NO**.
A1=0, P1=0. No OCR/moderation/rights/publication success claimed.

## Repo changes
- `00ec226f85cbaeea3297ab6b6fe660653d856edf` — `app/source-intake.js`: enforce cover + faithful original screenshot sequence and remove legacy editorial cards.

## Verification truth
A local clone/syntax attempt was made, but the execution environment could not resolve `github.com`, so no local `npm run check`, server smoke or browser E2E result is claimed for this run. The change was made through the GitHub repository API against the current blob SHA.

## Next concrete priority
1. Add/verify the browser UI control for `fullBodyCaptureStatus` (`complete / partial / pending`) so operators can explicitly confirm complete capture instead of defaulting to pending.
2. Acquire the complete ordered original-post screenshots for one strong C1 candidate; preserve every body screen and attached media.
3. Produce the first real 1080×1080 cover + full-post screenshot carousel and verify actual dimensions/readability in Chrome.
4. Continue high-volume Korean-community Discovery in parallel; keep candidate records one Markdown file each.
5. Keep P0 until 04 observes actual approved publication success.
