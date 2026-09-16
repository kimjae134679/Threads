# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 10:23 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Current binding production contract
- Slide 1 cover only: one image + original post title by default.
- Slide 2 onward: ordered original-post screenshots only.
- Full original body must be captured; no summarizing, rewriting, condensing or dropping body text in the carousel.
- Platform/browser UI chrome may be cropped, body content may not.
- No automatic explanatory/summary/reaction/CTA/story cards between screenshots.
- No automatic privacy masking; masking remains user-directed.
- Attached source images/media and source visual order must be preserved.
- Missing real screenshots/media remains `ASSETS_PENDING`.
- Screenshot intake owns ordering, crop suggestions, normalization and provenance, not editorial rewriting.
- Square Instagram/Threads package and vertical Reels/Shorts renderer remain separate outputs.

## Source format — simplified user rule
Do not use detailed media taxonomy. New candidate/Source Package records use exactly one of these:
- `글` — text-centered, no required source image.
- `이미지` — post body + attached image/photo/news capture; preserve text and image together.
- `이미지 포스팅` — image/card/carousel/screenshot itself is the main content; preserve all images/slides in original order.

Old labels such as `TEXT_ONLY`, `TEXT_WITH_INLINE_IMAGE`, `CAROUSEL_SOURCE`, `SCREENSHOT_POST`, `NEWS_CARD_POST`, `MIXED_MEDIA_POST` are legacy only and must not be used for new records.

## Discovery state inherited from prior useful run
Raw materially inspected: **43**.
Retained: **8**.
Top retained: Inven `내 방 달라는 딸 대처법.jpg`, `오늘 이혼도장 찍었다..나처럼 실패하지 말아라.`, `남편 도시락 싸주는 유부녀의 평소 저녁밥 수준..`, `분당 헬스장에서 포착된 의문의 남성`, plus four other retained leads from the 09:17 batch.

## Asset / production truth
Full-post screenshots captured in this format-rule update: **NO (0)**.
Completed REAL source-backed carousel in this format-rule update: **NO**.
A1=0, P1=0. No OCR/moderation/publication success claimed. No rights state was invented.

## Repo changes for simple source-format rule
- `c111fc625417e4284830c0488c1a83324398ed7a` — simplify candidate media classification in `data/README.md`
- `2f0ebd771958bf917c4306d2439b814a5ea0e43d` — make `data/candidates/` use only 글/이미지/이미지 포스팅
- `3ef993a7c504c7ffb3a48959e5608f760308a570` — update START_HERE with simplified format rule
- `cb959192eb9433fe57247b42ca17cd13b4c53fc6` — replace detailed source visual taxonomy in production playbook

Runtime code was not changed in this format-rule update, so npm/server/browser results are not claimed.

## Next concrete priority
1. Apply `글 / 이미지 / 이미지 포스팅` to newly collected candidates and migrate actively used legacy candidate records when touched.
2. Implement the screenshot-intake data/runtime path around ordered `source_screenshots[]`, `source_format`, `full_body_capture_status`, crop suggestions and normalization without auto-masking or rewriting.
3. Acquire actual full-post screenshots for a strong candidate, preserving every body screen and attached media in order.
4. Produce the first real 1080×1080 cover + full-post-screenshot carousel and verify dimensions/readability in Chrome.
5. Continue high-volume Korean-community Discovery, storing each retained candidate as one human-readable file rather than grouped root JSON.
6. Keep P0 until 04 observes actual approved publication success.
