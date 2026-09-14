# NEXT RUN HANDOFF ??Threads AI Content Monetization Lab

Updated: 2026-09-14 KST

## Read this first

Inspect current `main` and recent commits first, then read the latest sequential operations-hub note. Repository tip always wins. Keep implementing.

Current implementation line now includes P8 persistence foundations after the earlier P7 scheduler work.

## Non-negotiable role / safety chain

`01 DISCOVERY ??02 EDITORIAL_SCORING ??03 PRODUCTION ??04 REVIEW_PUBLISH ??05 EXPERIMENTS_ACCOUNTS`

- 04 alone owns final publication.
- Audience Comfort hard BLOCK cannot be approved.
- REVIEW approval must match the current scan signature.
- unknown rights and stale image privacy fail closed.
- never fake API success, metrics, OCR/face detection, credentials, delivery, or publication.
- never persist plaintext passwords, tokens, API keys, authorization headers or cookies.

## P1?밣7 current state

Materially implemented for the current browser/session architecture:

- multi-source/theme-lane Viral Finder, evidence normalization, dedupe/same-story grouping, risk/source filters
- Audience Comfort BLOCK/REVIEW + audit
- bulk review/group/tag/editorial handoff
- Community Card Factory 1080횞1350 + real manual drag privacy masks
- READY/HOT/EVERGREEN Warehouse + provenance/history/freshness/review/assets
- official Threads media capability + dry-run, fail closed without current approval/credentials/live enablement
- optional Buffer path kept separate from canonical publication until delivery is actually verified
- Scheduler HOT priority, spacing, pause/resume/stop, reorder, provider target metadata, bounded audit and post-now routing only to 04

Earlier installed-Chrome E2E verified app bootstrap, candidate/discovery rendering, card capture build, real mouse privacy mask and privacy review. Fresh P7 Scheduler browser E2E is still required when the authorized Windows machine is online.

## P8 persistence foundation ??ACTIVE

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

`4cafd5d143b8b3ca02f9b3392cd4ee54d579829f` ??revisioned persistence state API.

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

## 2026-09-14 Run 031 update

P8 browser bridge is now implemented in `59bd24df38b9229bfb101e99c38c5d687ca5202c` (`Add explicit browser persistence bridge`), package `0.23.0`.

New behavior:

- persistence model + bridge are loaded through staged `feature-loader.js`
- explicit JSON export and file-import preview
- explicit server read preview; server read does not overwrite browser state
- explicit Apply required before restoring preview
- explicit server save with optimistic revision
- current server revision visible in UI
- stale revision conflict fails closed and displays the current revision
- Scheduler live browser `{state,...}` correctly maps to snapshot `{status,...}` and round-trips back
- server 409 response exposes `currentRevision`

Fresh real Chrome E2E observed PASS:

`{"bootstrap":"ready","serverSave":"r1","serverRead":"preview-only","explicitApply":"restored","scheduler":"paused-preserved","conflict":"visible-r2-error"}`

No automatic publication or provider API call is coupled to persistence restore.

Latest ops note: `031-sol.md`.

Next priority: credential-free account/profile identifiers + experiment state persistence and explicit schema migration tests; then define schema v2/DB migration semantics and scoped server namespaces without arbitrary filesystem access or plaintext secrets.

## 2026-09-14 Run 032 update

P8 persistence schema is now v2 in `d39f8401f3a365cbb2381fdcbc4888ac1c7081e7`.

Implemented:

- credential-free Account Registry profile metadata is included in browser snapshots
- candidate `experimentAssignment` values are normalized into explicit experiment records
- restore merges experiment records back by candidate id
- v0/v1 snapshots migrate to v2; future unsupported schemas fail closed
- profile/experiment secret-like fields are rejected before normalization
- server JSON persistence accepts v2 and migrates v1 records to v2
- package `0.24.0`
- legacy sparse candidates without `sourceRisk` no longer crash Inbox rendering; they display YELLOW/review

Fresh installed-Chrome E2E observed:

`{"bootstrap":"ready","schema":2,"profiles":3,"experiment":"TH-B","v1Migration":2,"secretRejected":true,"serverRevision":1,"pageErrors":[]}`

Latest ops note: `032-sol.md`.

Next priority: scoped server persistence namespaces/profile ids with strict id validation and independent revision conflicts, then DB-backed storage behind the same contract/migrations. Do not add arbitrary filesystem paths or credentials, and never couple restore to publication.

## 2026-09-14 Run 033 update

Scoped persistence is now implemented in `fc5fbe89a7e1cee658c6ca8176ba8a0436ca8571`, package `0.25.0`.

- `/api/state?namespace=<id>` uses strict namespace validation
- `default` preserves the old storage path
- profile namespaces map to server-generated sibling files only; no arbitrary path input
- traversal/slash ids fail closed with HTTP 400
- revisions are independent per namespace
- browser UI exposes `default` plus Account Registry ids `TH-A`, `TH-B`, `TH-C`
- scope changes clear stale preview/revision state before further reads/writes

Fresh installed-Chrome E2E observed:

`{"bootstrap":"ready","options":["default","TH-A","TH-B","TH-C"],"defaultRevision":1,"profileRevision":1,"badge":"default 쨌 SERVER r1","pageErrors":0}`

Latest ops note: `033-sol.md`.

Next priority: DB-backed persistence behind the same schema-v2 + namespace + optimistic-revision contract, with explicit migration/versioning and file-store fallback until DB parity is proven. Never persist credentials and never couple persistence to publication.

## 2026-09-14 Run 034 update

Current repo tip already contained optional SQLite persistence in `20a2986ad86ebf2d69a792b37ae73914cbaa8521`, package `0.26.0`.

This run added explicit file?뭆QLite migration in `693248b` (`Add explicit file to SQLite persistence migration`), package `0.27.0`.

Implemented:

- `SqliteStateStoreRegistry.importRecord()` preserves exact source revision/updatedAt
- imported snapshots still pass schema-v2 normalization/migration and recursive secret rejection
- existing SQLite namespaces refuse import by default; overwrite requires explicit `overwrite: true`
- `persistence-migrate.mjs` migrates only validated requested namespaces from JSON stores
- empty namespaces are skipped rather than materialized
- new regression covers revision preservation, namespace isolation, v1?뭭2 migration, experiment preservation, overwrite refusal/opt-in and invalid namespace rejection

Actual SQLite-backed server smoke returned:

`{"defaultBackend":"sqlite","defaultRevision":0,"profileBackend":"sqlite","profileRevision":1,"schema":2}`

`npm run check` passed locally. This run changed server persistence only, so no new browser-E2E claim was made. No migration path can trigger publication.

Latest ops note: `034-sol.md`.

Next priority: add an explicit operator CLI around the migration primitive without exposing filesystem paths in HTTP, then add shared backend parity tests for file vs SQLite and safe backend diagnostics. Keep file fallback until parity is proven and continue to reject plaintext secrets.

## 2026-09-14 Run 035 update

P8 migration/operator safety advanced in `5223bdb1a239a1db4600129a0c1cdd14206242a5`, package `0.29.0`.

Implemented:

- operator-only `npm run migrate:persistence` CLI
- migration refuses all mutation without explicit `--apply`
- existing target namespaces still require a separate explicit `--overwrite`
- no migration filesystem path is exposed through HTTP
- shared file/SQLite backend parity regression for revisions, namespace isolation, validation and secret rejection
- safe `GET /api/state/status` diagnostics with backend/schema/capability fields only; no state/DB path leakage
- diagnostics regression boots both actual file and SQLite server backends

`npm run check` passed locally. A Windows SQLite WAL cleanup race in the new status test was fixed by waiting for child-server exit before temp cleanup.

CLI observation: `--help` exits 0; source/target without `--apply` refuses mutation and exits 2.

No browser UI changed and no new browser-E2E claim is made. Persistence remains completely decoupled from 04 publication/provider calls.

Latest ops note: `035-sol.md`.

Next priority: verify final CI; then focus only on concrete remaining P8 gaps, especially browser-level multi-account/profile isolation or future DB schema changes justified by actual requirements. Keep file backend as fallback and never persist provider credentials.

## 2026-09-14 Run 036 update

P8 browser multi-account isolation is now implemented in `6eb9101` (`Isolate account scoped persistence restore`), package `0.30.0`.

Implemented:

- persistence snapshots now carry an explicit optional `scope` (`workspace/default` or `account/<id>`) without changing schema v2
- `default` keeps the existing full workspace snapshot/restore contract
- account namespaces save only that account's credential-free profile metadata and experiment assignments
- account snapshots do not duplicate shared candidate bodies or Scheduler control/history
- restore of an account scope changes only that account's experiment assignments; other account assignments and shared candidate state remain untouched
- Scheduler state is restored only for the `default` workspace scope
- workspace snapshots cannot be applied into an account namespace, mismatched account scopes fail closed, and malformed/unknown scope kinds fail closed
- persistence preview text now states when an account scope will not apply shared candidates/Scheduler

Fresh installed-Chrome E2E observed PASS:

`{"bootstrap":"ready","serverRevision":1,"serverScope":{"kind":"account","id":"TH-A"},"serverProfiles":["TH-A"],"serverExperiments":["a:TH-A"],"restoredA":"A-saved","preservedB":"B-local-preserve","preservedScheduler":"stopped","pageErrors":[]}`

`npm run check` passed on package `0.30.0`; server `/api/health` smoke returned `ok:true`. Temporary Playwright/runtime state was removed after E2E.

Next priority: only add further DB schema changes for a concrete requirement. Useful remaining P8 work is to decide whether account-scoped profile metadata needs editable runtime state beyond the static Account Registry; if so, add that state with explicit migration and the same no-secret rule. Otherwise keep SQLite optional/file fallback stable and avoid persistence churn.

## 2026-09-14 Run 037 update

Credential-free editable runtime profile state is now implemented in `12c0f85c8cb655d2a449976613f2d797c50d308b`, package `0.31.0`.

- new `app/features/persistence/profiles/profile-state.js`
- known Account Registry ids only; unknown ids fail closed
- per-account `enabled`, planned/testing/active/paused/retired status, bounded notes and updatedAt
- existing recursive secret-field rejection applies to profile state and patches
- account scoped snapshots/restores include only the selected profile runtime state
- default workspace scope carries all stored profile runtime overrides
- legacy snapshots without `profileStates` do not silently erase existing overrides
- cross-account profile-state payloads fail closed

Fresh installed-Chrome E2E observed: TH-A active state saved to account scope, local TH-A changed, TH-B paused locally, then TH-A server read/apply restored only TH-A while preserving TH-B and Scheduler `stopped`; no Threads/Buffer publish request and no page errors.

`npm run check` and `/api/health` smoke passed locally. Latest ops note: `037-sol.md`.

Next priority: verify CI for the new tip, then avoid persistence churn unless a concrete requirement exists. A useful remaining option is making profile active/paused state influence experiment-account selection/visibility without ever weakening 04 publication gates or storing credentials.

## 2026-09-14 Run 038 update

Runtime profile state now actively constrains new experiment assignment in `57595792c23d72af9356601436e37ef3d18406bf`, package `0.32.0`.

- `profile-state.js` exposes `canAssign(accountId)`
- new `profile-experiment-guard.js` disables paused, retired, or explicitly disabled accounts in the experiment assignment selector
- planned/testing/active enabled accounts stay available
- existing experiment records are preserved when a profile becomes paused/disabled
- this does not alter 04 publication ownership or any rights/safety/approval gate

Fresh Chrome E2E observed TH-B transition planned?뭦aused?뭓ctive?뭗isabled reflected in the real experiment selector with pageErrors `[]`.

Concurrent remote demo-showcase commits landed during this run. The profile guard commit was repeatedly rebased onto current remote main and ultimately pushed without force; demo showcase code/tests were preserved.

Latest ops note: `037-sol.md`.

Next priority: confirm CI for the final tip, then avoid additional persistence schema churn unless an actual operational requirement appears. Profile state/experiment visibility now has a complete credential-free path; further work should move to concrete workflow gaps rather than inventing persistence features.


## 2026-09-15 Run 039 update

Field-test Showcase rotation is now date-agnostic in `2b9e4b860daf53b12880c123cbf6eea33fc04763`, package `0.34.0`.

- added `data/field-test-showcase-index.json` as the only current showcase pointer
- browser loader validates the index as `demoOnly:true`, `productionEligible:false`, and a safe `/data/<file>.json` path before fetching
- removed the hard-coded `field-test-showcase-2026-09-14-night.json` dependency from the UI
- regression now resolves the current payload through the index, requires a real existing file, valid `generatedAt`, and demo/non-production flags
- future field-test rotations can update the index without editing feature code

Fresh installed-Chrome E2E observed PASS:

`{"bootstrap":"ready","fieldCards":3,"before":0,"after":1,"importedDemo":true,"importedStatus":"inbox","importedBasis":"field_test_requires_human_review","publishCalls":[],"pageErrors":[]}`

This confirms the previous browser bootstrap/main-thread hang is not reproduced on the current feature line, the indexed showcase loads, and importing a field-test candidate still enters the full review chain rather than publication.

`npm run check` passed locally. `/api/health` returned `ok:true`. GitHub Actions run `34863278117` for `2b9e4b8` completed with `success`.

Latest ops note: `038-sol.md`.

Next priority: keep the indexed field-test feed fresh only with actually verified public examples; do not fabricate engagement. Avoid further persistence/schema churn without a concrete requirement. Any future live-post work remains gated by 04, current human approval, rights/safety state, official provider capability and real credentials/scopes.
