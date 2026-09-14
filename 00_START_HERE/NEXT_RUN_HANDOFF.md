# NEXT RUN HANDOFF — Threads AI Content Monetization Lab

Updated: 2026-09-14 KST

## Read this first

Inspect current `main` and recent commits first, then read the latest sequential operations-hub note. Repository tip always wins. Keep implementing.

Current implementation line now includes P8 persistence foundations after the earlier P7 scheduler work.

## Non-negotiable role / safety chain

`01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`

- 04 alone owns final publication.
- Audience Comfort hard BLOCK cannot be approved.
- REVIEW approval must match the current scan signature.
- unknown rights and stale image privacy fail closed.
- never fake API success, metrics, OCR/face detection, credentials, delivery, or publication.
- never persist plaintext passwords, tokens, API keys, authorization headers or cookies.

## P1–P7 current state

Materially implemented for the current browser/session architecture:

- multi-source/theme-lane Viral Finder, evidence normalization, dedupe/same-story grouping, risk/source filters
- Audience Comfort BLOCK/REVIEW + audit
- bulk review/group/tag/editorial handoff
- Community Card Factory 1080×1350 + real manual drag privacy masks
- READY/HOT/EVERGREEN Warehouse + provenance/history/freshness/review/assets
- official Threads media capability + dry-run, fail closed without current approval/credentials/live enablement
- optional Buffer path kept separate from canonical publication until delivery is actually verified
- Scheduler HOT priority, spacing, pause/resume/stop, reorder, provider target metadata, bounded audit and post-now routing only to 04

Earlier installed-Chrome E2E verified app bootstrap, candidate/discovery rendering, card capture build, real mouse privacy mask and privacy review. Fresh P7 Scheduler browser E2E is still required when the authorized Windows machine is online.

## P8 persistence foundation — ACTIVE

Package `0.22.0` begins versioned persistence/migration work.

### Browser-neutral snapshot model

`app/features/persistence/state/state-model.js`

- schema-versioned state snapshot envelope
- preserves app items, Scheduler control/history, profile and experiment metadata slots
- role chain embedded with final owner `04_REVIEW_PUBLISH`
- legacy browser `{version, items}` state migrates into schema v1
- rejects snapshots from a newer unsupported schema
- recursively rejects secret-like keys (`password`, token, API key, authorization, cookie, etc.)
- Scheduler control history bounded to latest 100 entries

Regression: `test/persistence-state-model.test.mjs`.

### Server-side file store foundation

`persistence.mjs`

- JSON state store with schema validation
- fail-closed recursive secret-field rejection
- revision number for optimistic-concurrency writes
- stale expected revision => conflict instead of silent overwrite
- atomic temp-file write + rename
- file permission request `0600`
- missing state file reads as revision 0 / no snapshot

Regression: `test/persistence-store.test.mjs` covers first write/read, revision conflict, secret rejection and unsupported schema.

Runtime state is ignored via `data/runtime/` in `.gitignore`; no persisted runtime data or plaintext secret is committed.

## Browser limitation this run

The authorized Windows/Chrome machine was unavailable at run time, so no new P7 Scheduler browser-E2E claim was made. Do not mark Scheduler UI E2E passed until actually observed.

## Validation

New implementation commits include:

```text
c550eefd386f8cfba7a92522416d1c2af74eecf9  Add versioned persistence snapshot model
7effa9df9689f83f120595f05fb535f0775cf62f  Test persistence snapshot migrations and secret rejection
1aa540e2c3cd0a27eebf4f1bacbccaf30c14b393  Run persistence migration model in project checks
98273d8f4fdcf9d8b9d6e5d60ad5a6d85fb343ed  Add fail-closed file persistence store
75c096e63ee764bcab9eed9a5fd6733c1695bb50  Test file persistence revision and secret gates
b9a1db6fccfc4ce3b9db95fbefc6ee3f5550bea7  Ignore runtime persistence state
49c5bc501d9b39a0b6362560e107984a3c84e334  Run persistence store regression in checks
```

Intermediate persistence tests already showed green CI on their commits. Verify the newest tip CI before claiming final green.

## Next priority

1. If Windows/Chrome is online, perform the missing actual Scheduler E2E first: provider select, pause/resume/stop, reorder, audit counts and post-now routing to 04 with no external call.
2. Wire the persistence store into explicit server GET/PUT state endpoints with revision conflict semantics; do not auto-enable writes without clear client action.
3. Add browser persistence bridge/import-export from current local state into the versioned snapshot, preserving current approval/safety state exactly and refusing secret fields.
4. Add account/profile identifiers and experiment state migration without storing provider credentials.
5. Continue toward DB-backed persistence only after file-store/API contract tests are stable.
6. Buffer delivery-status sync only after verifying a real current official API query shape; never guess a field or claim delivery from job acceptance.

Every meaningful run: syntax/regression/server smoke + targeted tests, actual browser E2E where relevant, meaningful commit/push, CI status only when observed, cleanup, and next sequential operations note.

## 2026-09-14 Run 030 update

Fresh repo baseline was `642bedbc44bdbc49de3cc92f5eac683278f7493c` with ops note `029-sol.md`.

New code commit:

`4cafd5d143b8b3ca02f9b3392cd4ee54d579829f` — revisioned persistence state API.

Implemented:

- `GET /api/state` explicit read of `{revision, updatedAt, snapshot}`
- `PUT /api/state` explicit write with `expectedRevision`
- runtime path configurable via `PERSISTENCE_STATE_PATH`, default ignored `data/runtime/state.json`
- HTTP regression verifies revision 0, revision 1 write, stale 409 conflict, and secret-field 400 rejection
- package `0.22.1`

Fresh real Chrome Scheduler E2E on the authorized Windows machine is now observed PASS for:

- browser feature bootstrap `ready`
- two eligible Queue rows rendered
- provider target selection persisted (`buffer`)
- pause/resume visible state
- manual reorder
- post-now audit routed to `04_REVIEW_PUBLISH`
- no `/api/threads/publish` or `/api/buffer/publish` network request during post-now route
- stop state
- no page errors in the complete Scheduler fixture

Therefore the previous P7 fresh-browser-control blocker is closed. This is not a live publication claim.

Latest operations note: `030-sol.md`.

Next priority is P8 browser persistence bridge: explicit export/import/save/load using `ThreadsPersistenceStateModel`, preserving Scheduler control/history plus credential-free profile/experiment identifiers, with visible revision conflict handling and no silent overwrite. After that, stabilize migration contracts before DB-backed persistence/versioning.
