# NEXT RUN HANDOFF — Threads AI Content Monetization Lab

Updated: 2026-09-14 KST

## Read this first

This is the execution handoff for recurring development. Do not stop at planning. Inspect current `main`, continue implementation, test it, fix failures, and leave the next handoff after meaningful changes.

Current verified implementation checkpoint:

- implementation tip: `29a9b996e3513e4c8d9d1b8e6cc5ebeffc789c81`
- GitHub Actions run `34785739288`, job `103800763036`: JavaScript syntax/regression **SUCCESS**, local server smoke **SUCCESS**
- package: `0.16.0`
- latest sequential operations note to read next: `024-sol.md`
- repository tip always wins over stale handoff text.

## P2 Audience Comfort — materially complete for current workflow

Keep these gates intact:

- explicit BLOCK/REVIEW reason/category UI
- human review audit without fabricated reviewer identity
- hard BLOCK cannot be human-approved
- REVIEW approval is bound to the exact current Comfort scan signature
- stale human review is blocked downstream
- ready/editorial paths fail closed
- Comfort audit export exists

Do not weaken these gates while expanding later workflow features.

## P3 Bulk candidate review — materially complete for current workflow

Current capabilities now include:

- visible selection / clear selection
- selected count + visible count + selected status summary
- hold/reject/editorial handoff with result summaries
- normalized review tags (NFKC, trim, whitespace collapse, case normalization)
- bulk tag add and remove
- exact normalized tag filtering in the Viral Finder list
- keyboard helpers only when focus is not in an input: `Esc` clears selection, `Ctrl/Cmd+Shift+A` selects visible rows
- group-level editorial handoff now routes through `ThreadsBulkReviewModel` and the same Audience Comfort gate/audit path
- exact duplicate / same-story group actions remain available
- editorial packet carries normalized tags + source/Viral/Comfort snapshot

Browser interaction E2E remains useful when a browser-capable run is available, but do not block forward implementation indefinitely.

## P4 Community Card Factory — ACTIVE

New feature files:

```text
app/features/production/cards/privacy-mask-model.js
app/features/production/cards/privacy-mask.js
test/card-privacy-mask-model.test.mjs
```

Current manual image privacy workflow:

- Community Card Factory still creates 1080x1350 cards and preserves text PII masking.
- For capture-image cards, turn on `마스킹 모드` and drag on the preview canvas.
- Dragging writes a real black rectangle directly into the canvas that will be used for PNG export.
- Each capture card has an explicit `개인정보 검토 완료` control.
- Single capture-image PNG export is blocked until that capture is marked reviewed.
- `PNG 전체 저장` is blocked while any capture image remains unreviewed.
- Adding a mask automatically invalidates that card's reviewed state until re-reviewed.
- Image change or preview rebuild resets the session privacy review state.
- `Privacy JSON` exports rectangle metadata and explicitly records that OCR/automatic face detection was NOT claimed.
- no OCR/image privacy success is fabricated.

This privacy-mask state is intentionally session-scoped because original screenshots are also session-only. A later persistence step may store normalized mask metadata only after deciding how it binds safely to exact image identity.

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

### P4. Community Card Factory — ACTIVE

Next targets:

1. browser-test actual drag coordinates on desktop/mobile widths, individual export block, whole-package export block, and rebuild/reset behavior when possible
2. add undo-last-mask per capture and clearer per-image mask count/status
3. bind privacy metadata to an exact session image fingerprint/name/size tuple so stale review cannot accidentally carry to a newly selected image
4. integrate privacy envelope into the card manifest/storyboard save metadata without persisting original image bytes
5. ensure final 04 review can see whether image privacy review was completed

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
