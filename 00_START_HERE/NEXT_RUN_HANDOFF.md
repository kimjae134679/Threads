# NEXT RUN HANDOFF

Updated: 2026-09-17 10:42 KST

## Start here
Repo tip wins. Preserve the role chain:
`01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`.
Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success and never store plaintext secrets.

## User-facing format is binding
- Old black-background text-only Demo Showcase/storyboard is regression/developer material only.
- Slide 1: cover only, one image + original post title/hook; original title unchanged by default.
- Slide 2+: original source screenshots in order, covering the FULL original post body.
- No summarizing/paraphrasing/rewriting/dropping body text in the carousel.
- UI/browser chrome may be cropped only if body content is preserved.
- No automatic explanatory/summary/reaction/CTA cards between screenshots.
- No automatic privacy masking. User-directed masking only.
- Source-attached media should remain in the source sequence where relevant.
- If real screenshots/source assets are unavailable, remain `ASSETS_PENDING`; never synthesize body cards.
- Square carousel target: 1080×1080. Vertical video is a separate 1080×1920 renderer; never stretch square cards.

## Current screenshot-intake implementation
`scripts/build-screenshot-intake-manifest.mjs` records ordered screenshot sequence, PNG/JPEG dimensions, byte length, SHA-256, exact public capture URL and observation time. Duplicate bytes are rejected. `--acquisition-state` is required and limited to `USER_PROVIDED`, `MANUAL_CAPTURE`, or `BROWSER_CAPTURE`; manifest/assets preserve the supplied acquisition truth. It does NOT infer full-body completeness, source relationship, rights, privacy, OCR/vision, moderation, or publication.

`scripts/plan-screenshot-normalization.mjs` requires a non-empty ordered manifest, sequence 1..N with no gaps/duplicates, unique source hashes, matching capture URLs, dimensions/provenance/acquisition state, and plans 1080×1080 no-stretch normalization. Crop remains manual/verified UI-chrome-only; body crop and automatic privacy masking remain forbidden. Both intake scripts are in the normal syntax/check gate.

## Latest Discovery baseline
Discovery refresh at 2026-09-17 10:34–10:42 KST:
- raw inspected: 40+ public search/index leads across Korean-community-first multi-lane queries plus Reddit; restricted sources were not bypassed. Clien/Instiz were robots-blocked and not circumvented.
- retained as new candidate files this run: 1 C1_A0_P0. Quality threshold was kept rather than filling with generic/old wedding-gift results.
- new retained: Blind `이혼 고민` — exact public post URL verified; visible full body read; observed at the same public-page snapshot as 조회수 192 / 댓글 16; post describes discovering during marriage that the otherwise highly compatible partner borrowed money to invest.
- prior strong priorities remain Blind `어쩌다 괴물이 되어버렸을까...`, `죄의식이 낮은건가?`, `이혼이 답인데 자식이 너무 맘에 걸린다`, `축의금 문화, 결혼 문화 10년내 다바뀔 듯`.
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Material repo change: added `data/candidates/260917_C1_A0_P0_이혼고민_결혼중빚투발견.md` from an exact public Blind URL. Candidate commit: `3ee34058c03c88d48ba5ebd0be993ddd15464e7a`.

No source screenshot bytes were acquired, so the new candidate remains `ASSETS_PENDING`, A0/P0, `publicationAllowed=false`. No OCR/vision/moderation/rights/publication success is claimed.

Executable checkout/Node/Chrome were unavailable through the current connector surface, so `npm run check`, server smoke, and browser E2E were NOT executed or claimed.

## Next highest-priority work
1. Acquire real full-post screenshots for strongest Korean C1s through permitted public/manual/browser paths.
2. Feed real ordered files through `build-screenshot-intake-manifest.mjs` with truthful acquisition state.
3. Manually verify full-body coverage, then normalize with no-stretch/UI-chrome-only rules.
4. Produce the first real cover + full-post screenshot carousel and inspect it in Chrome.
5. Continue Korean-first high-volume Discovery in parallel; retain quality rather than filler.
6. Only after source-backed user-facing quality works, continue provider/publishing work.
