# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 10:18 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## This run — production contract corrected
The binding carousel contract is now explicit in `03_PRODUCTION/FORMAT_PLAYBOOK.md`:
- Slide 1 cover only: one image + original post title by default.
- Slide 2 onward: ordered original-post screenshots only.
- Full original body must be captured; no summarizing, rewriting, condensing or dropping body text.
- Platform/browser UI chrome may be cropped, body content may not.
- No automatic explanatory/summary/reaction/CTA/story cards between screenshots.
- No automatic privacy masking; masking remains user-directed.
- Attached source images/media and source visual format must be preserved.
- Missing real screenshots/media remains `ASSETS_PENDING`.
- Screenshot intake owns ordering, crop suggestions, normalization and provenance, not editorial rewriting.
- Square Instagram/Threads package and vertical Reels/Shorts renderer remain separate outputs.

The source visual format can now be recorded as `TEXT_ONLY`, `TEXT_WITH_INLINE_IMAGE`, `CAROUSEL_SOURCE`, `SCREENSHOT_POST`, `NEWS_CARD_POST`, or `MIXED_MEDIA_POST` so image/layout-heavy originals are not reduced to text-only records.

## Discovery state inherited from prior useful run
Raw materially inspected: **43**.
Retained: **8**.
Top retained: Inven `내 방 달라는 딸 대처법.jpg`, `오늘 이혼도장 찍었다..나처럼 실패하지 말아라.`, `남편 도시락 싸주는 유부녀의 평소 저녁밥 수준..`, `분당 헬스장에서 포착된 의문의 남성`, plus four other retained leads from the 09:17 batch.

## Asset / production truth
Full-post screenshots captured this run: **NO (0)**.
Completed REAL source-backed carousel this run: **NO**.
A1=0, P1=0. No OCR/moderation/publication success claimed. No rights state was invented.

## Repo changes
- `5557755734b1af0cfe6793adb65cf778535ed738` — production: make source screenshot carousel binding

This run changed documentation/production contract only; runtime code was not changed, so npm/server/browser results are not claimed.

## Next concrete priority
1. Implement the screenshot-intake data/runtime path around ordered `source_screenshots[]`, source visual format, `full_body_capture_status`, crop suggestions and normalization without auto-masking or rewriting.
2. Acquire actual full-post screenshots for a strong candidate, preserving every body screen and attached media in order.
3. Produce the first real 1080×1080 cover + full-post-screenshot carousel and verify dimensions/readability in Chrome.
4. Continue high-volume Korean-community Discovery (40–80 raw / 15–30 retained when coverage allows), storing each retained candidate in the current human-readable candidate structure rather than grouped root JSON.
5. Keep P0 until 04 observes actual approved publication success.
