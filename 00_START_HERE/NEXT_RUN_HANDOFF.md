# NEXT RUN HANDOFF — Threads AI Content Monetization Lab

Updated: 2026-09-14 KST

## Read this first

This is the execution handoff for recurring development. Do not stop at planning. Inspect current `main`, continue implementation, test it, fix failures, and leave the next handoff after meaningful changes.

Current completed implementation checkpoint:

- implementation tip: `3ef258ec679ac3c1d05913a7e9a9511ba5b65760`
- GitHub Actions run `34779668883`: syntax/regression checks **SUCCESS**, local server smoke **SUCCESS** (job `103784236352`)
- read operations-hub `022-sol.md` after this file for exact implementation history.
- repository tip always wins over stale handoff text.

## Latest run — P2 Audience Comfort materially implemented

New feature domain:

```text
app/features/discovery/comfort/
├─ comfort-model.js
├─ comfort-review.js
└─ comfort-review.css
```

It is loaded centrally from `app/bootstrap/feature-loader.js` after Viral Finder. No cross-feature companion chain was introduced.

### Visible category/reason review UI

A new `AUDIENCE COMFORT / HUMAN REVIEW` panel shows:

- BLOCK / REVIEW / comfortable counts
- level filter
- comfort-category filter
- explicit human-readable reason chips
- recent human-review audit result/note where present
- REVIEW-only approve / hold / reject controls
- BLOCK rows explicitly show `자동 BLOCK · 승인 불가`

The UI persists the latest scan envelope in `item.comfortReview.latestScan` with a stable `scanSignature`, avoiding needless repeated writes.

### Human review audit

`ThreadsComfortReviewModel.appendAudit()` records:

```text
outcome
note
reviewedAt
reviewer                 null unless a real identity is supplied
reviewSource             human-ui
comfortLevelAtReview
comfortScoreAtReview
categoriesAtReview[]
blockReasonsAtReview[]
reviewReasonsAtReview[]
```

No reviewer identity is fabricated.

Hard safety rule:

```text
BLOCK + approve
→ throws blocked_comfort_cannot_be_human_approved
```

A human review may clear only a REVIEW candidate, not a hard BLOCK candidate.

### Batch comfort actions

Current filtered set can perform:

```text
현재 REVIEW 보류
현재 BLOCK 패스
```

`safeBatchDisposition()` refuses to use review-hold as a way to promote BLOCK candidates. BLOCK batch handling is only fail-closed skip.

### Mixed/obfuscated text regression

`app/viral-model.js` now also catches reasonable separator-obfuscation variants for high-risk terms, including examples such as:

```text
동 물 학 대
g o r e
d.o.x.x
self_harm footage
```

This is intentionally narrow; it is not claimed to be a semantic moderation model.

### Tests / package

New:

`test/comfort-model.test.mjs`

It verifies:

- Korean/English mixed obfuscated hard-BLOCK detection
- doxxing variant detection
- REVIEW can receive a human audit decision
- reviewer remains null unless actually supplied
- BLOCK cannot be human-approved
- batch skip affects BLOCK only
- REVIEW category hold remains separate

`test/feature-layout.test.mjs` now requires the Comfort feature files and central-loader registration.

`package.json` is now `0.14.0`; syntax/test commands include the new model/UI/test files.

## P1 status

P1 Viral Finder remains mostly complete from prior runs:

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

Browser interaction E2E remains useful if a browser-capable run is available, but do not delay P2/P3 indefinitely for it.

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

### P2. Audience Comfort — ACTIVE / PARTIALLY COMPLETE

Completed this run:

- explicit BLOCK/REVIEW category/reason UI
- persisted latest Comfort scan metadata
- human-review audit trail with no fake identity
- hard prohibition against human-approving BLOCK
- category/level filters
- safe batch REVIEW hold and BLOCK skip
- mixed/obfuscated Korean/English regression cases

Next P2 targets:

1. integrate Comfort result chips directly into existing Viral Finder candidate rows as well as the dedicated panel
2. ensure downstream `ready` / editorial handoff respects `comfortReview.humanClearedReview` for REVIEW candidates, without allowing BLOCK override
3. add audit/history visibility in candidate detail view and exportable metadata where appropriate
4. add more false-positive/false-negative regressions around words such as news reporting, quoted terms, and mixed punctuation without weakening hard BLOCK
5. if browser interaction is available, test category filters, review buttons, batch actions, reload persistence, and mobile width

### P3. Bulk candidate review

Need select all/visible/group, approve/reject/hold/tag, duplicate-group actions, bulk editorial handoff, blocked reason visibility, keyboard/large-list usability. Existing group actions can be reused rather than reimplemented.

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

## Handoff target

After meaningful changes, create the next sequential note under:

`kimjae134679/project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`

Include baseline, files/features changed, exact behavior, tests/results, discovery examples if any, blockers, next priority, and new Threads SHA(s).
