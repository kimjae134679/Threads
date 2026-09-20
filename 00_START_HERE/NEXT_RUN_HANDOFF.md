# NEXT RUN HANDOFF

Updated: 2026-09-21 01:27 KST

## 01_DISCOVERY latest
- Latest discovery-only run retained 2 new C1 candidates: `헬스장에서 얼떨결에 번호 따일 뻔한 썰`, `[스압]20년 만에 전재산 천만원 된 썰`.
- Restricted sources were not bypassed; those candidates remain A0/P0 and publicationAllowed=false.

## Sequential candidate lane
- Queue refreshed from every current `data/candidates` markdown file after pulling main: 1,190 candidates total; the 2 newest 260921 candidates are included.
- Processed exactly one next unprocessed filename-order key: `260916_입주청소하러갔다가`.
- Exact source was already verified at `https://www.inven.co.kr/board/webzine/2097/2728192` (post ID `2728192`).
- Public direct source media was actually downloaded without login/bypass: WebP, 39,288 bytes, SHA-256 `37de18cc8d8ea30768d297f065db267846578b05573fe45a10374aadb771d1c6`.
- Candidate remains C1/A0/P0: the canonical screenshot-intake script currently supports PNG/JPEG dimensions only, so WebP cannot yet be persisted through the verified intake path. No A1/P1 or rights/moderation claims were made.
- Do not re-evaluate older blocked entries unless their unblock condition changes. Continue with the next unprocessed filename-order key next run.

## TEMP TEST ONLY lane
- Added `03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/260921_입주청소하러갔다가_TEMP_TEST_ONLY/stage9_webp_intake_blocker.json` plus the real source WebP only inside that TEMP_TEST_ONLY folder.
- Running the real stage-9 intake exposed a concrete blocker: `build-screenshot-intake-manifest.mjs` rejects WebP because dimension parsing is PNG/JPEG-only; stage 10 was therefore not run.
- `temporaryTestOnly=true`, `publicationAllowed=false`, approvedVersion=null, executionEligible=false; no blur/generated fallback and no fabricated conversion.
- Exact unblock: add provenance-preserving WebP intake/dimension support (without pretending a transcode is original bytes), then rerun stage 9 before UI-chrome review.

## Publication ownership / safety
Only `04_REVIEW_PUBLISH` may publish or mark P1 after human rights/privacy/safety approval. No real publishing or metrics collection was performed.
