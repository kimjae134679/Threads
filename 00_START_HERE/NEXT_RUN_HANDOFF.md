# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-17 00:17 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Material change this run
Hardened `scripts/build-screenshot-intake-manifest.mjs`: `--source-url` must now parse as an absolute public HTTP(S) URL, embedded credentials are rejected, and localhost/private-network hosts are rejected. URL fragments are stripped before provenance is written. This prevents local/file-like/non-public references from entering screenshot provenance as if they were exact public source URLs.

Baseline before change: `90c22f97f6c9d45cdda318f6b9176f648709f024`.
Implementation commit: `f9631ec60920bdab1b2e7e48701a289e6013a63c`.

## Discovery truth
No fresh discovery sweep was run in this implementation-focused turn.
Latest completed Discovery batch remains: raw leads/results **40+**, retained **5 C1**.
Top retained from that batch: wedding cash gifts 50% demanded by in-laws (+4,078); Tiffany necklace wedding-gift dispute (+3,877); $40k parental gift/control conflict (+605); forced $10k family wedding contribution (+162); Blind economic-control marriage dispute (97 views / 14 comments at observation).

## Asset / publication truth
Full-post screenshots captured this run: **0**.
Actual source bytes acquired this run: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**.
Existing candidates remain `ASSETS_PENDING`, `publicationAllowed=false`; rights/privacy/human review gates remain. No OCR/moderation/rights clearance/publication success is claimed.

## Verification truth
The GitHub-connected runtime provided repository file reads/writes but no executable checkout/Chrome session in this turn. Therefore `npm run check`, server smoke, targeted executable test and browser E2E were **not run** and are not claimed as passing. The changed script was inspected at repo tip after write.

## Next concrete priority
1. Continue Korean-community discovery toward a 15–30 retained batch when exact public pages support it.
2. Acquire actual complete screenshots/image bytes for strongest Korean C1 via permitted public/manual capture.
3. Execute the screenshot intake builder against real captured files; verify URL guard, sequence, dimensions, byte lengths, SHA-256 and provenance.
4. Build schema-v5 Source Package and 1080×1080 cover + complete original screenshots only.
5. Chrome-verify real source-backed output before A1; only 04_REVIEW_PUBLISH may create P1.
