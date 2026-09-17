# NEXT RUN HANDOFF

Updated: 2026-09-17 13:17 KST

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
- If real screenshots/source assets are unavailable, remain `ASSETS_PENDING`; never synthesize body cards.

## Current screenshot-intake implementation
`scripts/build-screenshot-intake-manifest.mjs` records ordered screenshot evidence and starts full-body completeness pending. New `scripts/verify-screenshot-intake-complete.mjs` is the explicit transition step: it only accepts a non-empty contiguous source sequence and requires `HUMAN_REVIEW` or `USER_CONFIRMED`, then records `VERIFIED_COMPLETE`, verification timestamp and method while keeping publicationAllowed=false. `scripts/plan-screenshot-normalization.mjs` continues to reject anything not explicitly verified complete. The new verifier is included in `npm run syntax`.

## Latest Discovery baseline
Discovery refresh at 2026-09-17 12:35 KST:
- raw inspected: 40+ public/index/search leads.
- retained as new candidate files: 4 C1_A0_P0.
- top new retained: family wedding-loan conflict (+5,192 observed Reddit score), inheritance/wedding debt conflict (+3,432), sister wedding-gift conflict (+3,943), destination-wedding invitation conflict (+547).
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Material implementation: added an explicit, auditable full-body screenshot verification transition instead of requiring hand-edited manifest fields. This makes the intended flow executable: intake pending → human/user completeness confirmation → normalization. It does not infer source relationship, rights, privacy, OCR/vision, moderation or publication readiness.

No source screenshot bytes were available through this connector-only run, so full-post screenshots remain 0 and no source-backed carousel was produced. Executable checkout/Node/Chrome were not available through the current connector surface, so `npm run check`, server smoke and browser E2E were NOT executed and no green status is claimed.

## Next highest-priority work
1. Acquire permitted full-post screenshot sequences for strongest Korean C1 candidates.
2. Run intake → explicit completeness verification → normalization on real source bytes.
3. Build the first real cover + full-post screenshot 1080×1080 carousel and inspect it in Chrome.
4. Continue Korean-first high-volume discovery/ranking alongside acquisition; do not substitute weak filler for volume.
