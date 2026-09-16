# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 17:16 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Latest Discovery state
Previous discovery inspected roughly **40+ leads** and retained **15 candidates (14 C1 + 1 C0)**. Top acquisition target remains `돈 때문에 결혼접을까 고민된다는 남자` — Ppomppu exact page, 6,298 views / 15 comments, two JPG attachments listed. A fresh public search still exposes the exact page and attachment names, but direct page fetch is currently 403; no bypass was attempted.

## Production change this run
`app/source-package.js` schema is now v3. Screenshot/media intake records explicit `sourceSequence`, `acquisitionState` (`CAPTURED`, `USER_PROVIDED`, `SOURCE_MEDIA`, `ASSETS_PENDING`), original dimensions, capture URL/time and applied crop provenance. Body assets must remain in nondecreasing source sequence. `assetsPending` now stays true unless full-body status is complete AND every body asset is actually acquired. This prevents metadata-only attachment listings from being mistaken for usable source-backed carousel assets.

Role chain, publication ownership, `publicationAllowed=false`, rights/privacy/human review gates and no automatic privacy masking remain unchanged. No OCR/vision result was claimed.

## Asset / publication truth
Raw candidate count this run: **0 new discovery leads** (production-focused run).
Retained count this run: **0 new candidates**.
Full-post screenshots captured this run: **0**.
Actual source bytes acquired this run: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**.

## Verification truth
The runtime file was changed directly on main through GitHub. Connector environment does not provide a checkout/runtime shell for this repository in this run, so `npm run check`, server smoke and browser E2E were **not run**; no test success is claimed.

## Next concrete priority
1. Acquire the two actual Ppomppu JPG bytes through a permitted public/manual capture path; do not treat filenames/index metadata as acquisition.
2. Verify whether they contain the complete original body. If not, capture every remaining body screen in source order.
3. Feed acquired assets into schema-v3 screenshot intake, render the first real source-backed square carousel, and verify it in Chrome before any A1 consideration.
