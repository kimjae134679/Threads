# NEXT RUN HANDOFF — Threads AI Content Monetization Lab

Updated: 2026-09-14 KST

## Read this first

This file is the execution handoff for recurring development. Do not stop at planning. Inspect current `main`, continue implementation, test it, fix failures, and leave the next handoff after meaningful changes.

Current repository state from the latest completed run:

- implementation tip: `1586905fe363417e8db2468418017f8bc90863fe`
- latest verified CI: GitHub Actions run `34773565936` on `1586905...` = **SUCCESS**
- read operations-hub `020-sol.md` after this file for exact implementation history.
- repository tip always wins over stale handoff text.

## What the latest run added

P1 Viral Finder bulk workflow advanced materially:

- `app/viral-review.js`
  - Viral discovery import now runs each imported candidate through `ThreadsDiscoverySourceModel.normalizeCandidate()` and persists the normalized envelope as `item.discoveryNormalized` instead of relying only on render-time recomputation.
  - persisted metadata includes canonical URL/source/lane/adapter/collection policy/evidence/risk/dedupe keys plus `normalizedAt` and `normalizedBy`.
  - existing items missing normalized metadata are backfilled during Viral scoring/rescore.
  - import duplicate detection now uses canonical URLs, so tracking-parameter variants are rejected as the same imported candidate.
  - added independent filters for evidence quality (`observed / inferred-only / none`) and source risk (`green / yellow / red / unknown`).
  - duplicate/same-story groups now have actual review controls:
    - group select
    - collapse/expand group (collapsed groups keep the strongest visible)
    - keep strongest, which moves lower-score group members to `skip` and records a `viralReview.duplicateResolution` audit trail.
  - rows expose evidence and source-risk chips in the Viral Finder itself.
- `app/viral-review.css`
  - added secondary filter and group-review control styling.
- `test/feature-layout.test.mjs`
  - guards discovery normalization persistence/filter/group-action wiring against accidental removal.

Implementation commits:

```text
0cc75c4d8276321f3333d62406c434b430448510  Add persisted discovery metadata and group review controls
13c1bc38c5ad491b5d4ea8341170ff78012f7170  Style Viral Finder evidence and group controls
1586905fe363417e8db2468418017f8bc90863fe  Guard Viral Finder normalization and group review wiring
```

## Validation state

Confirmed GitHub Actions success:

```text
34773559194  head 13c1bc38c5ad491b5d4ea8341170ff78012f7170  SUCCESS
34773565936  head 1586905fe363417e8db2468418017f8bc90863fe  SUCCESS
```

The workflow includes repository JavaScript syntax/regression checks and server smoke configured by `.github/workflows/check.yml`.

## Real discovery test note

A fresh public-web probe was attempted again. It found an indexed Reddit AI digest dated 2026-09-12 that reported high-scoring r/technology topics (for example an AI data-center town-hall controversy around ~4.1K score and 246 comments), but this is a **secondary digest/index record**, not a direct verified source post in the current probe. It was therefore not promoted into the production viral feed and its counts were not treated as canonical observed metrics.

Other meme/YouTube-style search results were old, removed, low-signal, or lacked directly verifiable current engagement. Rule remains: `no direct/verifiable metric → do not invent/promote it`.

## Mandatory execution loop

1. Read current `main`, recent commits, this file, and latest operations-hub sequential note.
2. Check current CI before editing; if the tip is red, repair before expanding when feasible.
3. Implement the next substantive backlog item. Do not only report plans.
4. Run repository syntax/regression/server smoke tests through available CI and targeted tests.
5. Never fake API success, live publishing, metrics, credentials, moderation, OCR, or image masking.
6. Preserve approval, rights, safety, and human-review gates.
7. Commit/push meaningful changes and update operations-hub handoff.
8. Remove temporary junk.

## Role boundaries

`01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`

- 01 discovers/packages candidates; does not publish.
- 02 owns fact/source validation, scoring, and content angle approval.
- 03 transforms approved briefs without inventing facts.
- 04 owns final safety/rights/human approval and actual publication.
- 05 owns experiment/account strategy and performance interpretation.
- `A10 Unknown rights` remains non-publishable until resolved and re-reviewed.

## Remaining backlog — execute in order, skipping completed work

### P1. Viral Finder / multi-platform discovery — ACTIVE, close to handoff to P2

Already added: Source Registry, theme lanes, source/lane filters, normalized observed-vs-inferred evidence layer, canonical URLs, exact-duplicate/same-story groups, persisted normalized discovery metadata for Viral discovery import/backfill, evidence/risk filters, group select/collapse/keep-strongest controls.

Next high-value P1 work:

1. normalize the base JSON import path and Google Trends/manual candidate creation path too, so every candidate source stores the same discovery envelope, not only the Viral discovery import/backfill path.
2. improve group review with explicit group status summary and `move whole group to research/hold/skip` without selecting members one-by-one.
3. make `keep strongest` behavior explicit for exact duplicate vs same-story groups; same-story may need `hold alternatives` instead of always skipping depending on editorial use.
4. preserve adapter states: `connected / connected-when-credentialed / manual-only / planned`.
5. continue realistic public discovery fixtures only when dates/metrics are genuinely verifiable.

Do not manufacture engagement counts. Blind/DCInside remain public-index/user-URL/screenshot/manual Capture paths, not bulk crawlers.

### P2. Audience Comfort — NEXT MAJOR PHASE

Existing hard BLOCK: graphic gore/violence, animal abuse, sexual violence/exploitation, graphic self-harm, doxxing, strongly gross/unpleasant material. Appropriate non-graphic sensitive cases may route to REVIEW.

Next: visible BLOCK/REVIEW reason chips, human-review audit trail, batch filter, Korean/English mixed-text tests. Image review must not pretend masking/OCR succeeded.

### P3. Bulk candidate review

Need select all/visible/group, approve/reject/hold/tag, duplicate-group actions, bulk editorial handoff, blocked reason visibility, keyboard/large-list usability.

### P4. Community Card Factory

1080x1350 hook/excerpt/reaction/ending packages. Preserve text PII masking. Next privacy item remains real manual drag-rectangle image masks before final PNG export.

### P5. Content Warehouse

READY/HOT/EVERGREEN with provenance, status history, expiry/freshness, theme/format tags, rights/review state, assets, queue eligibility.

### P6. Official image/carousel publishing

Official APIs only; capability states; dry-run validation; fail closed without credentials/scopes/human approval; real request/response/error audit only.

### P7. Scheduler / queue

HOT priority, theme/source/format spacing, pause/stop/post-now/reorder controls, visible scheduling reasons, final 04 gates preserved.

### P8. Persistence / multi-account

Only after earlier workflow is substantially complete: DB/server persistence, migration/versioning, multi-account experiment/profile state, no plaintext secrets.

## Handoff target

After meaningful changes, create the next sequential note under:

`kimjae134679/project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`

Include baseline, files/features changed, exact behavior, tests/results, discovery examples if any, blockers, next priority, and new Threads SHA(s).
