# NEXT RUN HANDOFF — Threads AI Content Monetization Lab

Updated: 2026-09-14 KST

## Read this first

Do not stop at planning. Inspect current `main`, recent commits, then read the latest sequential operations-hub note. Repository tip always wins over stale handoff text.

Current verified implementation checkpoint:

- implementation tip: `3f747a4695c5d7be09ea6e728c3708f38801139c`
- GitHub Actions run `34789810832`: **SUCCESS**
- workflow covers JavaScript syntax/regression plus local server smoke
- package: `0.17.0`
- latest operations note: `025-sol.md`

## Role chain / non-negotiable gates

`01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`

- 01 discovers/packages; does not publish.
- 02 owns fact/source verification and content angle approval.
- 03 transforms approved briefs without inventing facts.
- 04 owns rights/safety/final human approval and actual publication.
- 05 owns experiment/account strategy and performance interpretation.
- hard Audience Comfort BLOCK cannot be human-approved.
- REVIEW approval is bound to the current Comfort scan signature; stale review fails closed.
- `A10 Unknown rights` remains non-publishable.
- never fake API success, metrics, moderation, OCR, face detection, privacy masking, credentials, or live publishing.

## P1–P3 — materially complete for current workflow

Keep intact:

- multi-platform/source registry with explicit adapter state
- normalized observed-vs-inferred engagement evidence
- exact duplicate / same-story grouping
- source risk + lane/source filters
- Audience Comfort BLOCK/REVIEW categories and audit
- visible/group bulk selection, hold/reject/tag/editorial handoff
- group editorial handoff uses the same Comfort gate
- no Blind/DCInside prohibited bulk crawling; public index/user URL/screenshot/manual Capture only

## P4 Community Card Factory — materially complete for current browser/session architecture

Current behavior:

- 1080×1350 card/carousel storyboards
- text PII masking
- manual drag rectangles draw real black masks onto export canvas
- undo-last-mask and per-card mask count/status
- each capture requires explicit privacy review before PNG export
- privacy review is bound to exact image identity `(name, size, lastModified, type)`
- replacing/rebuilding image state makes old review stale/fail-closed
- saved Card Factory metadata/manifest includes privacy envelope, not original image bytes
- privacy envelope explicitly says automated OCR/face detection were not claimed
- `04` approval queue displays Card privacy PASS/PENDING/STALE and blocks approval when capture privacy gate is not allowed

Browser pointer E2E is still useful when a browser-capable environment is available, but do not block later implementation on it.

## P5 Content Warehouse — ACTIVE / substantially expanded

Current model/UI now supports:

- **READY / HOT / EVERGREEN** warehouse buckets
- separate actual queue eligibility vs warehouse bucket classification
- HOT > READY > EVERGREEN priority at equal manual priority
- priority 1–5, ACTIVE/HOLD, not-before, expiry
- freshness states: scheduled / expired / expiring-soon / fresh-today / fresh / hot-no-expiry / open
- normalized theme tags and format tags
- bounded warehouse change history (latest 50)
- source/canonical URL/discovery source/lane/source risk/adapter provenance snapshot
- observed engagement copied into provenance only when explicitly marked `mode === "observed"`
- asset summary: text/cards/capture count/image privacy state
- review summary: Research/Draft/Safety/rights/privacy/Comfort/current human approval
- queue eligibility continues to fail closed on Comfort, production assets, image privacy, Safety Gate, current approval, HOLD/not-before/expiry
- warehouse metadata/taxonomy changes do not stale publish approval because they do not change content itself

Regression coverage includes READY/HOT/EVERGREEN ordering, freshness, image privacy, NFKC tag normalization, history, provenance and review summary.

## Mandatory execution loop

1. Read current `main`, recent commits, this file, and latest operations note.
2. If tip CI is red, repair before expansion when feasible.
3. Implement substantive work, not only plans.
4. Run syntax/regression/server smoke plus targeted tests; confirm green only when actually observed.
5. Commit meaningful changes and update the operations-hub handoff.
6. Remove temporary/cache/probe junk.

## Remaining backlog — execute in order

### P5. Content Warehouse — finish useful refinements, then move on

Useful remaining work if it materially improves operation:

1. warehouse detail/export for provenance/history
2. optionally auto-suggest theme/format tags from existing classification/production metadata without overwriting human tags
3. ensure legacy warehouse records migrate safely to schema v2 defaults

Do not spend many runs polishing minor Warehouse UI after these basics are sound.

### P6. Official image/carousel publishing — NEXT MAJOR PRIORITY

Build official-provider capability and validation layers only.

Requirements:

- distinguish provider/media capability and states such as unsupported / credential-required / ready-to-validate / live-disabled
- image/carousel only where official platform APIs actually support it
- dry-run request validation before any live call
- final `04` human approval + rights/safety/privacy gates required
- absent credentials/scopes/approval => fail closed and continue other work
- never ask for passwords/secrets; document needed environment variables/scopes only
- never fabricate request IDs, platform responses, publish URLs, success, or metrics
- real external responses/errors must be auditable separately from local dry-run results

### P7. Scheduler / queue

HOT priority, theme/source/format spacing, pause/stop/post-now/reorder controls, visible scheduling reasons, and final 04 gates preserved.

### P8. Persistence / multi-account

Only after earlier workflow is substantially complete: DB/server persistence, schema migrations/versioning, multi-account experiment/profile state, no plaintext secrets.

## Discovery policy

On useful runs, perform real public/indexed discovery across multiple lanes/sources. Record only visible/verifiable engagement as observed evidence; secondary digest or ambiguous values remain non-canonical. Do not bulk crawl Blind/DCInside or other sources without a permitted collection path.

## Handoff target

After meaningful changes create the next sequential note under:

`kimjae134679/project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`

Include baseline, exact files/features changed, tests/results, discovery examples if any, blockers, next priority and new Threads SHA(s).
