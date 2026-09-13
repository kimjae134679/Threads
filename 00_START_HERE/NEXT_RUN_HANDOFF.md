# NEXT RUN HANDOFF — Threads AI Content Monetization Lab

Updated: 2026-09-14 KST

## Read this first

This file is the execution handoff for recurring development. Do not stop at planning. Inspect current `main`, continue implementation, test it, fix failures, and leave the next handoff after meaningful changes.

Current repository state from the latest completed run:

- implementation tip: `db95cf7c649786bedb1f40076412c155b9207d16`
- latest verified CI: GitHub Actions run `34776451461` on `db95cf7...` = **SUCCESS**
- read operations-hub `021-sol.md` after this file for exact implementation history.
- repository tip always wins over stale handoff text.

## What the latest run added

P1 Viral Finder consistency and group review advanced materially.

### Cross-path discovery normalization

New:

`app/features/discovery/sources/source-normalization-sync.js`

The same `ThreadsDiscoverySourceModel.normalizeCandidate()` envelope is now persisted for candidates entering through:

```text
manual candidate form
Google Trends import
JSON Inbox import
existing candidate state at feature bootstrap
other candidate-list renders that introduce un-normalized items
```

The synchronization layer uses a stable signature and only persists when normalized content actually changes. It stores `normalizedAt` / `normalizedBy` without continuously rewriting unchanged items.

It is registered centrally in `app/bootstrap/feature-loader.js`.

### Group-wide Viral Finder dispositions

New:

`app/features/discovery/viral/group-actions.js`

Duplicate/same-story group UI now gains:

```text
그룹 → 조사
그룹 보류
그룹 패스
status summary
```

BLOCK candidates are not promoted by group actions. Audit metadata is written under `viralReview.groupDisposition*`.

Same-story handling is now explicitly different from exact duplicate handling:

```text
exact duplicate keep strongest
→ lower duplicates may go to skip

same story 최고점 유지 · 대안 보류
→ lower non-blocked variants return to Inbox as held editorial alternatives
→ duplicateResolution = same-story-alternative-hold
```

A potential MutationObserver self-loop in status-summary patching was found and fixed before handoff.

## Implementation commits

```text
2f0fd02da52c6188f16381a2d2f989a5de453ba9  Persist discovery normalization across all candidate paths
be745512cd1c057fe00be7dcc94847be10e73fd1  Load discovery normalization sync
2204479ffdf936d3360037bc92110a1575934a76  Guard cross-path discovery normalization sync
ee150dd3c5a867bceeacb6313907a9c3e22a4c39  Check discovery normalization sync in CI
04182cb3943cfdc6e199f6229ec694bb9d6fd74e  Add group-wide Viral Finder dispositions
f5d808285a7e8f8c89287b1efe53a127c9f1b77d  Load Viral Finder group action feature
49c75862039d91392ddba53f594dced74729d913  Guard Viral Finder group-wide actions
c1f7c18e50fbc5ec1353c56be1a6fa5795cb4187  Check Viral Finder group actions in CI
db95cf7c649786bedb1f40076412c155b9207d16  Avoid group status patch observer loop
```

## Validation state

Confirmed GitHub Actions success:

```text
34776351603  head ee150dd3c5a867bceeacb6313907a9c3e22a4c39  SUCCESS
34776428360  head c1f7c18e50fbc5ec1353c56be1a6fa5795cb4187  SUCCESS
34776451461  head db95cf7c649786bedb1f40076412c155b9207d16  SUCCESS
```

The workflow includes repository JavaScript syntax/regression checks and configured server smoke.

CI is not a full interactive-browser E2E. If a browser-capable path is available, quickly verify manual/Google/JSON normalization persistence and group buttons before deeper work; fix browser-only issues if found.

## Discovery note

No new production candidate was promoted in this run because the work focused on state consistency/review controls.

Rule remains:

```text
direct/verifiable public metric → may be observed evidence
secondary digest / unclear metric → do not promote as canonical observed engagement
```

Blind/DCInside remain public-index/user-URL/screenshot/manual Capture paths only; no bulk crawler.

## Mandatory execution loop

1. Read current `main`, recent commits, this file, and latest operations-hub sequential note.
2. Check current CI before editing; if tip is red, repair before expanding when feasible.
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

### P1. Viral Finder / multi-platform discovery — MOSTLY COMPLETE

Already added:

- Source Registry and theme lanes
- source/lane filters
- adapter states and collection policies
- canonical URLs
- observed-vs-inferred engagement evidence
- exact duplicate / same-story grouping
- persisted discovery normalization on Viral import and now manual/Google/JSON/base candidate paths
- evidence/risk filters
- group select/collapse/keep strongest
- group-wide research/hold/skip
- same-story editorial-alternative hold behavior

Short remaining P1 regression task, only if interactive browser testing is available:

1. confirm manual form, Google Trends and JSON import persist `discoveryNormalized` after render/reload
2. click exact-duplicate/same-story group actions and confirm summary + audit behavior
3. repair any browser-only issue found

Do not delay P2 indefinitely just because full live browser E2E is unavailable.

### P2. Audience Comfort — ACTIVE NEXT PHASE

Existing hard BLOCK includes graphic gore/violence, animal abuse, sexual violence/exploitation, graphic self-harm, doxxing, strongly gross/unpleasant material. Appropriate non-graphic sensitive cases may route to REVIEW.

Next implementation targets:

1. show explicit BLOCK/REVIEW category chips and human-readable reason chips in Viral Finder instead of only generic warning text
2. add a human-review audit trail for REVIEW decisions (who/when/outcome/note where available; no fake reviewer identity)
3. add batch filters/actions by comfort category/reason while preserving BLOCK fail-closed behavior
4. expand regression tests with Korean, English, and mixed/obfuscated text variants where reasonable
5. keep image privacy separate: do not claim OCR/image masking succeeded

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
