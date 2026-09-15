# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 KST

Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish. Rights/privacy/Audience Comfort/current human approval fail closed. Never fabricate API/OCR/moderation/engagement/rights/credentials/delivery/publication and never persist plaintext secrets.

## Current state
Package `0.42.1`. Source Package intake accepts ordered real screenshots/images with post/continuation/media/comment roles, provenance, privacy/rights review state, and no fake OCR/vision result. The source-backed square preview uses the first real image as blur/darken hook, then preserves actual evidence with contain over a blurred copy, then CTA.

New commit `6befc860dd2d6483577da1e565359dc6ac2b7b86` adds browser-side **1080×1080 PNG set export** from those exact selected assets. It renders hook + each evidence asset in order + CTA, does not generate replacement imagery, and has no publication/provider side effect.

Latest discovery commit before it: `d30a39416c79fd10ee050413d629329d2a6d1d66`.

## Validation truth
This run had GitHub access but no executable authorized local checkout/Chrome session. `npm run check`, server smoke, browser E2E, actual PNG dimensions/download behavior and CI green are NOT claimed for the new tip.

## Real source-backed result
**NOT YET A COMPLETED USER-FACING SET.** No lawfully reusable/user-provided Korean-community screenshot set was acquired in this run. Public candidates remain `ASSETS_PENDING`; text-only demos do not count.

## Next priority
1. With authorized Chrome/local tooling, load an actual permitted/user-provided Korean-community screenshot set and visually inspect the square carousel.
2. Trigger PNG export and verify every file is exactly 1080×1080, ordered/readable, and preserves evidence without destructive crop.
3. Fix any regression; run targeted tests + `npm run check` + server smoke and browser E2E.
4. Keep demo/example outputs separate from production warehouse and publication blocked until rights/privacy/current human approval pass.
5. Once square quality is proven, feed the same Source Package to the separate 1080×1920 Reels/Shorts renderer; never stretch square cards.
