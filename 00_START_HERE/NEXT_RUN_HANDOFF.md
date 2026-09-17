# NEXT RUN HANDOFF

Updated: 2026-09-17 12:16 KST

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
`scripts/build-screenshot-intake-manifest.mjs` records ordered screenshot sequence, dimensions, byte length, SHA-256, exact public capture URL, observation time and explicit acquisition state. Intake starts with `fullBodyCaptureStatus=pending` and does not infer completeness.

`scripts/plan-screenshot-normalization.mjs` now refuses to normalize pending/incomplete screenshot sets. It requires `fullBodyCaptureStatus=VERIFIED_COMPLETE`, a valid `fullBodyVerifiedAt`, and `fullBodyVerificationMethod=HUMAN_REVIEW|USER_CONFIRMED`. This prevents a partial post capture from silently becoming a production carousel. It still preserves contiguous source order, hashes, source URL, acquisition state/provenance, 1080×1080 no-stretch containment, body-crop prohibition, and user-directed privacy masking.

## Latest Discovery baseline
Discovery refresh at 2026-09-17 11:38 KST:
- raw inspected: 40+
- retained as new candidate files: 4 C1_A0_P0.
- top candidates: Blind `이혼 고민 (빚쟁이인 나...백수 남편)` (24K views/260 comments observed), `자꾸 빚 내서 미국주식 사자는 남편` (1,078/11), `헤어지는게 맞을까..?` (610/14), `빚 숨기고 결혼한 남편` (117/5).
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Material repo change: normalization is now hard-gated on explicit full-body verification instead of accepting the intake manifest's default `pending` state. Implementation commit `b62062988d3d1e94e37e5cc4a028d8cdd67d755a`.

No source screenshot bytes were available through this connector-only run, so full-post screenshots remain 0 and no source-backed carousel was produced. No OCR/vision/moderation/rights/publication success is claimed.

Executable checkout/Node/Chrome were unavailable through the current connector surface, so `npm run check`, server smoke, and browser E2E were NOT executed or claimed.

## Next highest-priority work
1. Acquire permitted full-post screenshot sequences for the strongest Korean C1, beginning with the 24K/260-comment crypto-debt marriage conflict.
2. Feed real ordered files through screenshot intake with truthful acquisition state.
3. Human/user verify that the sequence covers the FULL body, set the explicit verification fields, then normalize no-stretch/UI-chrome-only.
4. Produce the first real cover + source-screenshot carousel and inspect the actual 1080×1080 output in Chrome.
5. Continue Korean-first high-volume Discovery in parallel without filler.
