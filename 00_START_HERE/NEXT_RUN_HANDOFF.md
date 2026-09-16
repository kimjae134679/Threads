# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-17 01:14 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Material change this run
Screenshot intake provenance hardening in `scripts/build-screenshot-intake-manifest.mjs`.
- exact public HTTP(S) source URL checks remain.
- source URL query parameters that look credential/secret-bearing (`token`, `access_token`, `api_key`, `authorization`, `secret`, `signature`, etc.) are now rejected instead of being persisted in a manifest.
- `--observed-at` now requires an ISO-8601 datetime and is normalized to UTC ISO form before persistence.
- existing source order, actual dimensions, byte length, SHA-256, duplicate-byte rejection, `publicationAllowed=false`, user-directed privacy masking, and 04-only publish ownership remain unchanged.
- no OCR/vision/moderation/rights/full-body completeness/publication success is inferred.

Implementation commit: `6595eaf99e17b3d509bdc3cf57db02bffa4bd06b`.

## Latest Discovery baseline carried forward
Latest useful Discovery sweep: raw leads/results inspected **40+**; newly retained **7 C1**.
Top candidates: niece in near-wedding-dress + matching flower crown; equal $8k wedding money for son who will not marry; excluding low-gift family in favor of richer guests; unemployed destination-wedding guest criticized for non-cash gift; minimum-wage employees pressured toward boss wedding cash gift.

Full-post screenshots captured: **0**.
Actual source bytes acquired: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**.
Current candidates remain `ASSETS_PENDING`, `publicationAllowed=false`; rights/privacy/human review gates remain.

## Verification truth
This environment had GitHub repository write access but no executable checkout/browser session exposed for runtime verification. Therefore `npm run check`, server smoke, browser E2E, screenshot capture, OCR, moderation and publication are **not claimed** this run. The GitHub contents write succeeded and produced the implementation commit above.

## Next concrete priority
1. Continue Korean-community-first high-volume Discovery toward 15–30 strong retained candidates per useful sweep without padding weak/duplicate leads.
2. Acquire actual complete screenshots/source bytes for strongest Korean C1 and top story candidates via permitted public/manual capture.
3. Run screenshot intake against those real files and verify order/dimensions/hash/provenance.
4. Build schema-v5 Source Package and 1080×1080 cover + complete original screenshots only.
5. Chrome-verify real source-backed output before A1; only `04_REVIEW_PUBLISH` may create P1.
