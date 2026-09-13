# NEXT RUN HANDOFF — Threads AI Content Monetization Lab

Updated: 2026-09-14 KST

## Read this first

This is the execution handoff for recurring development. Do not stop at planning. Inspect current `main`, continue implementation, test it, fix failures, and leave the next handoff after meaningful changes.

Current completed implementation checkpoint:

- implementation tip: `ebc0236abab6880d18c43ef63b8d9f9e20776ccb`
- GitHub Actions run `34784015681`: syntax/regression checks **SUCCESS**, local server smoke **SUCCESS** (job `103796086829`)
- read operations-hub `023-sol.md` after this file for exact implementation history.
- repository tip always wins over stale handoff text.

## P2 Audience Comfort — materially complete for current workflow

Current safety/gate behavior:

- explicit BLOCK/REVIEW reason/category UI
- human-review audit with no fabricated reviewer identity
- hard BLOCK cannot be human-approved
- REVIEW approval is bound to the exact current Comfort scan signature
- content/scan changes invalidate old approval as `stale-human-review`
- Viral Finder rows display current Comfort gate + reason chips
- existing `선택 → 제작 후보` is intercepted fail-closed
- comfortable candidates may proceed
- REVIEW requires matching current human approval
- BLOCK / uncleared REVIEW / stale REVIEW are removed from ready selection
- selected candidate detail shows current gate + recent audit history
- Comfort audit metadata can be exported as JSON
- batch REVIEW hold / BLOCK skip remain fail-closed

Do not weaken these gates while adding later workflow features.

## P3 Bulk candidate review — ACTIVE

New feature files:

```text
app/features/discovery/viral/bulk-review-model.js
app/features/discovery/viral/bulk-review.js
test/bulk-review-model.test.mjs
```

Central bootstrap loads `bulk-candidate-review` after Audience Comfort.

Current controls:

- 보이는 항목 선택
- 선택 해제
- 선택 보류
- 태그 적용
- 선택 → 편집 검토
- existing selected research / ready / skip
- existing exact-duplicate / same-story group actions

Bulk editorial handoff creates `item.editorialHandoff` with source metadata, Viral snapshot, Comfort export envelope, tags, and timestamp. It uses `ThreadsComfortReviewModel.mayAdvance(item, "editorial")`; BLOCK, uncleared REVIEW, and stale REVIEW are skipped. Safe/current-human-cleared items move to `research` with `item.bulkReview.audit`.

Package is now `0.15.0`.

## P1 status

P1 Viral Finder remains mostly complete:

- Source Registry/theme lanes
- adapter states and collection policies
- canonical URLs
- observed-vs-inferred engagement evidence
- cross-path persisted discovery normalization
- exact duplicate / same-story grouping
- evidence/risk filters
- group select/collapse/keep strongest
- group-wide research/hold/skip
- same-story alternatives held instead of treated as useless exact duplicates

Browser interaction E2E remains useful if a browser-capable run is available, but do not block forward implementation on it indefinitely.

## Mandatory execution loop

1. Read current `main`, recent commits, this file, and latest operations-hub sequential note.
2. If current tip CI is red, repair before expanding when feasible.
3. Implement the next substantive backlog item, not only plans.
4. Run syntax/regression/server smoke plus targeted tests.
5. Never fake API success, live publishing, metrics, credentials, moderation, OCR, or image masking.
6. Preserve approval, rights, safety, and human-review gates.
7. Commit meaningful changes and update operations-hub handoff.
8. Remove temporary junk.

## Role boundaries

`01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`

- 01 discovers/packages candidates; does not publish.
- 02 owns fact/source validation, scoring, and content angle approval.
- 03 transforms approved briefs without inventing facts.
- 04 owns final safety/rights/human approval and actual publication.
- 05 owns experiment/account strategy and performance interpretation.
- `A10 Unknown rights` remains non-publishable until resolved and re-reviewed.

## Remaining backlog — execute in order

### P3. Bulk candidate review — ACTIVE / PARTIALLY COMPLETE

Next targets:

1. add clearer selected-item status/result summary for hold/tag/editorial handoff and large-list feedback
2. make group-level editorial handoff use the same `ThreadsBulkReviewModel` Comfort gate/audit path
3. add normalized review-tag filters plus bulk tag removal
4. add safe keyboard/accessibility helpers only when text inputs are not focused
5. browser-test selection sync, ready-gate interception, reload persistence, and mobile width when possible

### P4. Community Card Factory

1080x1350 hook/excerpt/reaction/ending packages. Preserve text PII masking. Next privacy item remains **real manual drag-rectangle image masks before final PNG export**. Do not claim OCR/image masking succeeded.

### P5. Content Warehouse

READY/HOT/EVERGREEN with provenance, status history, expiry/freshness, theme/format tags, rights/review state, assets, queue eligibility.

### P6. Official image/carousel publishing

Official APIs only; capability states; dry-run validation; fail closed without credentials/scopes/human approval; real request/response/error audit only.

### P7. Scheduler / queue

HOT priority, theme/source/format spacing, pause/stop/post-now/reorder controls, visible scheduling reasons, final 04 gates preserved.

### P8. Persistence / multi-account

Only after earlier workflow is substantially complete: DB/server persistence, migration/versioning, multi-account experiment/profile state, no plaintext secrets.

## Discovery policy

Keep discovery balanced across theme lanes and sources. Record only actually visible/verifiable public engagement as observed evidence. Secondary digest or unclear metrics remain non-canonical. Do not bulk crawl Blind/DCInside or other sources without a permitted collection path; use public index metadata, user URLs, screenshots, or manual Capture instead.

## Handoff target

After meaningful changes, create the next sequential note under:

`kimjae134679/project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`

Include baseline, files/features changed, exact behavior, tests/results, discovery examples if any, blockers, next priority, and new Threads SHA(s).
