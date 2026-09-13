# NEXT RUN HANDOFF — Threads AI Content Monetization Lab

Updated: 2026-09-14 KST

## Read this first

This file is the execution handoff for recurring development. Do not stop at planning. Inspect current `main`, continue implementation, test it, fix failures, and leave the next handoff after meaningful changes.

Current repository state from the latest completed run:

- implementation tip before final handoff update: `88828d87ab44a79a1b0a788852d7021eab5b192f`
- latest verified CI: GitHub Actions run `34770599699` on `88828d8...` = **SUCCESS**
- preceding repaired implementation run `34770550263` on `2a520b5...` = **SUCCESS**
- read operations-hub `019-sol.md` after this file for exact implementation history.
- repository tip always wins over stale handoff text.

## What the latest run added

P1 Viral Finder/discovery normalization advanced materially:

- `app/features/discovery/sources/source-model.js`
  - canonical URL normalization removes common tracking parameters while preserving meaningful query parameters
  - `engagementEvidence()` explicitly separates **observed** engagement (`manual-observed` or `source-metadata`) from **inferred-only** interest scores
  - `normalizeCandidate()` creates a common cross-platform discovery envelope: source/lane/adapter/collection policy/evidence/risk/dedupe keys
  - exact duplicate grouping and same-story grouping were added
  - same-story title normalization strips common noise tokens such as 속보/단독/영상/짤/breaking/update before grouping
- `app/features/discovery/sources/source-review.js`
  - Viral Finder rows expose evidence state: observed metric / inferred-only / unverified
  - rows expose exact-duplicate or same-story group counts
  - normalized source/lane/evidence/group information is attached as row dataset metadata for later bulk review work
- `app/features/discovery/sources/source-review.css`
  - distinct evidence chips were added
- `test/discovery-source-model.test.mjs`
  - canonical URL, observed-vs-inferred evidence, normalization, duplicate grouping, manual-only source behavior are regression tested

Implementation commits:

```text
0207a5c13fc79ca4f5832683fece88a7c269acbe
e8fe52bb3f95bf4d338419bcef4bf946a7061815
f8683c25ea938e47a827de7ec7ed82456e74c19f
45a4a5ab210c6e934c6a81f742e5ea4baff82418
2a520b5821a273ca76a5a0d349a8cb10ff2fa124
88828d87ab44a79a1b0a788852d7021eab5b192f
```

## Validation state

Confirmed green after fixing an intermediate same-story regression:

```text
Actions 34770550263 — SUCCESS — head 2a520b5821a273ca76a5a0d349a8cb10ff2fa124
Actions 34770599699 — SUCCESS — head 88828d87ab44a79a1b0a788852d7021eab5b192f
```

The first intermediate duplicate-group version had a failing regression because generic title words such as `영상/속보` were not removed consistently. That is fixed. Do not reintroduce a stricter raw-title equality requirement.

Local container cloning could not access github.com because outbound DNS was unavailable; GitHub Actions is the authoritative executable check in that environment.

## Real discovery test note

A fresh public-web discovery probe was attempted across Reddit/YouTube/news-style search surfaces. It did **not** yield a sufficiently strong new batch that was simultaneously current, multi-source, and backed by verifiable engagement metrics. NAVER direct article access was blocked by robots in the web environment, and several returned results were old/promotional or lacked reliable visible engagement counts.

No weak/old candidate was falsely inserted as a strong viral example. Existing verified discovery fixtures remain the stronger test set. Continue current discovery probes when useful, but only record metrics that are actually visible/verifiable.

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

### P1. Viral Finder / multi-platform discovery — ACTIVE

Already added: Source Registry, theme lanes, source/lane filters, normalized observed-vs-inferred evidence layer, canonical URLs, exact-duplicate groups, same-story groups, evidence/group chips.

Next high-value P1 work:

1. make bulk candidate import pass every candidate through `normalizeCandidate()` and persist normalized discovery metadata rather than calculating it only at render time.
2. add a batch duplicate/same-story review surface that can collapse/select a whole group and later support keep-strongest/move-group actions.
3. add source-risk and observed-vs-inferred filtering to the Viral Finder toolbar.
4. keep actual adapter states explicit: `connected / connected-when-credentialed / manual-only / planned`.
5. keep expanding realistic public discovery fixtures only when dates/metrics are genuinely verifiable.

Do not manufacture engagement counts. Blind/DCInside remain public-index/user-URL/screenshot/manual Capture paths, not bulk crawlers.

### P2. Audience Comfort

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
