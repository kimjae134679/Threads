# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 23:18 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Material change this run
Strengthened `scripts/build-screenshot-intake-manifest.mjs`: every real PNG/JPEG intake asset now records actual byte length and SHA-256, and duplicate source bytes are rejected. This makes ordered screenshot provenance auditable and prevents the same screenshot from silently occupying multiple body positions. It still does NOT infer source relationship, full-body completeness, OCR/vision, rights, privacy clearance, moderation or publication.

## Discovery truth carried from latest full discovery run
Fresh full-run raw leads/results inspected: **40+**.
Fresh retained: **4 C1**.
Top candidates: cousin wedding donation (+6,754); reciprocal family-support wedding conflict (+6,099); sister asks wealthy husband for £22k wedding (+3,166); daughter wants ~$70k wedding fully funded (+1,695).
Full bodies read for those 4: **YES**. Comments fully read: **NO**.

## Asset / publication truth
Full-post screenshots captured this run: **0**.
Actual source bytes acquired this run: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**.
Existing candidates remain `ASSETS_PENDING`, `publicationAllowed=false`; rights/privacy/human review gates remain. No OCR/moderation/rights clearance/publication success is claimed.

## Validation truth
This run changed a CLI-only intake path through the GitHub connector. No executable checkout/Chrome session was available here, so `npm run check`, server smoke and browser E2E are **not claimed**. The change is deliberately dependency-free Node code using built-in `crypto`.

## Next concrete priority
1. Continue Korean-community discovery toward a 15–30 retained batch when public exact pages support it.
2. Acquire actual complete screenshots/image bytes for strongest Korean C1 via permitted public/manual capture.
3. Run screenshot intake builder; verify sequence, dimensions, byte lengths, SHA-256 and provenance; duplicates must fail.
4. Build schema-v5 Source Package and 1080×1080 cover + complete original screenshots only.
5. Chrome-verify real source-backed output before A1; only 04_REVIEW_PUBLISH may create P1.
