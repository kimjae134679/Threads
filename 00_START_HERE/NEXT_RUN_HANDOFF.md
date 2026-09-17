# NEXT RUN HANDOFF

Updated: 2026-09-17 09:19 KST

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
`scripts/build-screenshot-intake-manifest.mjs` records ordered screenshot sequence, PNG/JPEG dimensions, byte length, SHA-256, exact public capture URL and observation time. Duplicate bytes are rejected. This run fixed a truthfulness bug: the script previously hard-coded every local file as `USER_PROVIDED`, even when the file could have come from manual/browser capture. `--acquisition-state` is now required and limited to `USER_PROVIDED`, `MANUAL_CAPTURE`, or `BROWSER_CAPTURE`; the manifest and each asset preserve that explicit state and matching provenance. The script still does NOT infer full-body completeness, source relationship, rights, privacy, OCR/vision, moderation, or publication.

`scripts/plan-screenshot-normalization.mjs` requires a non-empty ordered manifest, sequence 1..N with no gaps/duplicates, unique source hashes, matching capture URLs, dimensions/provenance/acquisition state, and plans 1080×1080 no-stretch normalization. Crop remains manual/verified UI-chrome-only; body crop and automatic privacy masking remain forbidden.

## Latest Discovery baseline
Latest discovery refresh (ops 124-sol):
- raw inspected: 40+
- retained: 3 (C1 2 + C0 1)
- top candidates from that run: wedding cancellation venue-cost repayment conflict (+9,412 observed Reddit score); $500 memorial donation wedding-gift conflict (+1,353 observed score); Blind `연애경험없는데 제가 여자분에게 무례 범한건가요..` as C0 because exact individual URL/full body were not verified.
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

Existing strong acquisition priorities remain Korean source-first, including `하이닉스37억몰빵`, `주식으로8천날림`, `하루52억한달15억손실`, plus strong relationship/workplace candidates where exact public URLs are already C1.

## This run
Material repo change: screenshot intake acquisition method can no longer be silently mislabeled as user-provided. Commit `e34fb2111e3bba745ccf2341346da2d22f7b23d6`.

No source screenshot bytes were available in this connector-only run, so full-post screenshots remain 0 and no source-backed carousel was produced. No OCR/vision/moderation/rights/publication success is claimed.

Executable checkout/Node/Chrome were not available through the current connector surface, so `npm run check`, server smoke, and browser E2E were NOT executed in this run. Run them at the next executable checkout before claiming green status.

## Next highest-priority work
1. Continue high-volume Korean-community discovery/ranking (40–80 raw when coverage permits, retain 15–30 genuinely usable rather than filler).
2. Acquire full-post screenshots for the strongest C1/C0-resolved candidates through permitted public/manual/browser paths.
3. Feed real ordered files through `build-screenshot-intake-manifest.mjs` with the truthful `--acquisition-state` value.
4. Verify full-body coverage manually, then normalize with the no-stretch/UI-chrome-only pipeline.
5. Produce the first real cover + full-post screenshot carousel and inspect it in Chrome.
6. Only after source-backed user-facing quality is working, continue provider/publishing work.
