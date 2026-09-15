# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 KST

Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish. Rights/privacy/Audience Comfort/current human approval fail closed. Never fabricate API/OCR/moderation/engagement/rights/credentials/delivery/publication and never persist plaintext secrets.

## Current state
Package `0.42.1`. Source Package intake accepts ordered real screenshots/images with post/continuation/media/comment roles and exports source-backed 1080×1080 PNG slides: first real image hook, evidence assets in source order using contain over blurred background, then CTA. No generated replacement imagery and no provider/publication side effect.

Current implementation tip before this handoff: `ae0de20`. The authorized Windows checkout was pulled to current main and `npm run check` was actually executed. A real regression was found in discovery contract coverage: `discovery-batch-2026-09-16-0037.json` is a legacy mixed-schema batch without the newer per-candidate contract fields. The test now validates strict fail-closed rules only for explicit contract-v2 batches rather than rewriting legacy observations or inventing engagement semantics.

## Validation truth
`npm run check`: **PASS**, exit 0. Discovery safety contract: 8 contract-v2 batches PASS, 1 legacy batch explicitly skipped. Mutation checks still reject publication=true, manualReview=false, noncanonical engagement, duplicate URLs, and comfort BLOCK + APPROVE. Actual ffmpeg/ffprobe vertical regression also PASS at 1080×1920 H.264/yuv420p/30fps.

Browser E2E and actual square PNG download dimensions were not executed in this run, so they are not claimed.

## Real source-backed result
**NOT YET A COMPLETED USER-FACING SET.** No new lawfully reusable/user-provided Korean-community screenshot set was acquired in this run. Public candidates remain `ASSETS_PENDING` where applicable. Text-only demos do not count.

## Next priority
1. Use authorized Chrome/browser tooling with an actual permitted/user-provided Korean-community screenshot set.
2. Visually inspect the source-backed carousel and trigger PNG export; verify every file is exactly 1080×1080, ordered/readable and non-destructively preserves source evidence.
3. Fix any user-facing issue found; rerun targeted tests + `npm run check` + server smoke/browser E2E.
4. Keep publication blocked until rights/privacy/current human approval pass; only 04 may publish.
5. Once square quality is proven, feed the same Source Package into the separate 1080×1920 Reels/Shorts renderer without stretching square cards.
