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

## 2026-09-15 Run 040 update

Reference-first source-media production is now implemented in `28011c1fc2d344c843cfba92ba2eb5fc487cc5ce`, package `0.35.0`.

- default feed renderer changed from 1080x1350 text-led cards to `reference-square` 1080x1080
- slide 1 uses the first real selected source image as blurred/darkened full-bleed background with a large hook
- slide 2+ preserve real source/capture images in selected order with `contain`; generated-image fallback is explicitly disabled
- card production now fails closed when the reference profile has no actual source image
- added `Source Asset` production gate states from `DISCOVERED` through `PUBLISH_READY`, preserving rights/privacy/human-approval requirements
- Source Review patching keeps a coalesced `patchQueued` microtask and child-list-only candidate observer; regression now asserts those anti-loop constraints
- source registry and docs now formalize Korean-community discovery as public-index/permitted-browser/manual capture rather than bulk crawling
- official-media target model separates Threads feed, Instagram feed/carousel, Instagram Reel, and YouTube Short capabilities; Reels/Shorts remain `unsupported` until a real vertical-video renderer exists
- current field-test first candidate now points to the real r/iPhone post `1wbsyos` with only the observed 8,238-vote signal and Apple official fact source; source media remains `ASSETS_PENDING`

Fresh installed-Chrome E2E observed after the final changes:

`{"bootstrap":"complete","fieldCards":3,"sourceHref":"https://www.reddit.com/r/iphone/comments/1wbsyos/apple_announces_foldable_iphone_duo/","imported":{"status":"inbox","basis":"field_test_requires_human_review","demo":true},"template":"reference-square","dims":[{"w":1080,"h":1080,"index":"0"},{"w":1080,"h":1080,"index":"1","file":"fixture.png"}],"privacyGate":{"allowed":true,"captureCount":1,"reviewedCount":1,"pending":[],"staleIdentity":[],"code":"image-privacy-reviewed"},"saved":{"schema":3,"renderProfile":"reference-square","size":[1080,1080],"generatedImageFallback":false,"cardTypes":["hook","capture-image"]},"publishCalls":[],"pageErrors":[]}`

`npm run check` passed on the final working tree. `/api/health` returned `ok:true`. GitHub Actions run `34873538573` for `28011c1` was observed `in_progress`; do not claim CI green until a later run observes completion.

Live publishing is still intentionally blocked without current human approval and real provider credentials/scopes. Instagram feed/carousel needs an official publishing connector and public media staging. Reels/Shorts additionally require a separate real 1080x1920 MP4 renderer.

Latest ops note: `039-sol.md`.

Next priority: implement a real, compliant source-asset acquisition/staging adapter for allowed public/official sources and manual screenshot handoff, then connect approved square artifacts to Instagram feed/carousel dry-run without weakening 04 ownership or approval gates. Do not add anti-bot bypasses or generated-image fallback.

## 2026-09-15 Run 041 update

Source-media acquisition is now implemented in `6243fbe` (`Add-explicit-source-media-acquisition-adapter`), package `0.36.0`.

- Added `source-assets.mjs`: explicit direct-media HTTPS acquisition only, CDN allowlist, redirect revalidation, 10 MB cap, JPEG/PNG/WebP/GIF only, no page scraping or bulk crawling.
- Added `/api/source-assets/capabilities` and `/api/source-assets/proxy`; the proxy does not persist bytes and returns `no-store` + `nosniff`.
- Community Card Factory accepts explicit direct source-media URLs in addition to manual file/screenshot input. Remote bytes are session-only; source URLs are saved as provenance references only.
- Loading a remote source asset does not clear rights/privacy gates or imply OCR/moderation success.
- `test/source-assets.test.mjs` covers allowlist, HTTPS/userinfo rejection, valid image fetch, redirect escape blocking and SVG rejection.

`npm run check` passed on package `0.36.0`; `/api/health` and source-asset capability smoke passed.

Fresh installed-Chrome E2E observed with the source-proxy request fulfilled by a local PNG fixture: `bootstrap=ready`, one explicit source URL loaded, two 1080x1080 reference-square cards rendered, zero Threads/Buffer publish calls, zero page errors. This proves the browser acquisition/render path, not a live external-CDN fetch claim.

The earlier Discovery Source Review main-thread loop is already fixed on current main and remains covered by the anti-loop regression; it did not recur in this browser run.

Next priority: add a compliant public-media staging abstraction for approved rendered feed assets so Instagram Feed/Carousel can receive provider-fetchable URLs, but keep it `credential-required`/`live-disabled` until a real official provider configuration exists. Do not expose local filesystem paths or weaken 04 approval ownership.

## 2026-09-15 Run 042 update

Approved media staging and Instagram Feed/Carousel dry-run plumbing are now implemented through `8e41953d61656d83e17a2d052d37e9619e16a385`, package `0.37.2`.

- `media-staging.mjs` accepts only PNG/JPEG/WebP rendered data URLs, max 10 assets / 5 MiB each, writes only server-generated UUID filenames under ignored runtime state, and rejects arbitrary filesystem paths.
- `PUBLIC_MEDIA_BASE_URL` must be a public HTTPS origin; private/loopback/local origins fail closed. `MEDIA_STAGING_ENABLED=1` is a separate explicit gate. A configured origin never implies provider reachability: staged results remain `staged-unverified` with `externalReachabilityVerified:false`.
- `instagram.mjs` requires operator-supplied access token, numeric Instagram user id, explicit Graph API version and explicit required scopes. It does not guess current scopes/version. Capability remains `credential-required` / `live-disabled` / `ready-to-validate`.
- Instagram Feed/Carousel supports IMAGE or up to 10 images in dry-run request plans only. Plans explicitly record `externalCalls:0` and live publishing is not implemented.
- `media-publish-routes.mjs` and `server.mjs` now expose bounded staging capabilities/stage/serve plus Instagram capability/dry-run routes. Both staging and Instagram dry-run run the existing current-human-approval validator first. Instagram dry-run accepts only URLs from the configured staging origin and reports `publicationOwner: 04_REVIEW_PUBLISH`, `livePublicationAttempted:false`.
- `/api/connectors` now exposes non-secret media staging/Instagram capability snapshots.
- server JSON body limit remains bounded; only the staging route opts into a larger 24 MiB ceiling for up to ten rendered assets.
- added `test/media-staging.test.mjs`, `test/instagram-media.test.mjs`, `test/media-publish-routes.test.mjs`, and `test/server-media-api.test.mjs` covering state gates, path/origin restrictions, stale approval, bounded serving, server stage -> GET -> Instagram dry-run, and explicit no-live-publication metadata.

GitHub Actions run `34881954297` for the route regression wiring completed successfully. Final-tip run for `8e41953d61656d83e17a2d052d37e9619e16a385` was queued when this handoff was written; confirm it before claiming final green.

No new Chrome E2E is claimed in this run because the authorized Windows device went offline after a clean worktree was prepared. No Instagram API call, provider media fetch, live post, moderation/OCR success or credential validity is claimed.

Latest ops note: `043-sol.md`.

Next priority: once the authorized Windows/Chrome machine is online, run current-main server smoke plus fresh browser E2E through approved card artifact -> staging -> Instagram dry-run and verify zero publication/provider calls. Then add the corresponding 04 UI control only if it can remain fail-closed on stale approval and unverified media reachability. Reels/Shorts remain unsupported until a real separate 1080x1920 MP4 renderer exists.

## 2026-09-15 Run 044 update

Baseline was `a0a14a6713ea6af060f2c176286922e4944cc2ef`. The earlier Discovery Source Review bootstrap loop was already fixed on main, so this run continued the next real P6 blocker instead of redoing stale work.

Implementation commit: `83e7a066e65d29a2dd4af4ba98676952d90664d3` (`0.38.0`).

### 04-only approved-render staging UI

`app/features/publish/official-media/official-media-publisher.js` now exposes server-derived capability rows for Threads media, bounded media staging, and Instagram Feed/Carousel. Currently approved queue cards receive an `Instagram 스테이징 / dry-run` control owned by `04 REVIEW_PUBLISH` only.

The staging control:
- requires the same candidate to be open in Card Factory;
- rechecks current human approval revision;
- accepts only current `#cardPreviewGrid` canvases;
- requires exactly 1080×1080 canvases and at most 10 assets;
- converts those canvases to PNG data URLs and sends them to the bounded `/api/media-staging/stage` route;
- records `staged-unverified`, exact approval basis, returned staged URLs, and `externalReachabilityVerified:false` without claiming provider fetchability.

The Instagram dry-run button becomes usable only after that approval-bound staging succeeds. It calls `/api/instagram/media/dry-run`, stores the bounded request-plan audit, displays `04_REVIEW_PUBLISH`, and explicitly says there was no live call. Missing provider credentials remain visible in capability state; dry-run plan construction is not credential validation.
### Validation actually observed

- `npm.cmd run check` passed completely after the changes.
- The Windows-only `test/server-media-api.test.mjs` harness exposed two real portability races: URL `.pathname` produced `C:\C:\...` under Node/Windows, and registering an `exit` listener after an already-exited child caused unsettled top-level await. The test now uses `fileURLToPath()` and only waits for `exit` while the child is still running.
- `/api/health` returned `ok:true` on the real Node server.
- `/api/connectors` during browser validation reported staging `ready-to-validate`, Instagram `credential-required`, and staging external reachability `false`.
- Fresh installed-Chrome E2E actually observed bootstrap `ready`, two Card Factory canvases at 1080×1080, current human approval, one real staging POST, `staged-unverified` with matching approval basis, `externalReachabilityVerified:false`, then an Instagram CAROUSEL two-item dry-run owned by `04_REVIEW_PUBLISH`.
- Browser E2E observed zero live provider/publish calls and zero page errors. No Meta credential validity, external media reachability, provider fetch, or live publication was claimed.

GitHub Actions push run `34886084824` for `83e7a06` was `in_progress` when this note was first written; only call it green if a later observation confirms completion/success.

### Next priority

1. Re-run/observe the latest Actions result and keep CI claims exact.
2. With real operator Instagram configuration later, validate provider-side media URL fetch/creation without enabling live publication; until then keep `credential-required` and external reachability unverified.
3. Do not build Reels/Shorts by stretching square cards. After Feed/Carousel provider validation is materially complete, add the separate 1080×1920 MP4 renderer.
4. Continue compliant public discovery only when it adds useful verified candidates; do not bulk crawl Blind/DCInside or invent engagement values.


## 2026-09-15 Run 045 update

Baseline was `0459dc9b482ebae3752236cf2df036be22bafc26` (package `0.38.0`). Repo tip was treated as authoritative over earlier handoffs.

Implementation commit: `c9ad5c6c06929447e32e4d471a5665859de4123d` — `Add Instagram container validation gate`.
Package is now `0.39.0`.

### Exact implementation

- `instagram.mjs` now separates provider container validation from live publishing with `INSTAGRAM_MEDIA_VALIDATION_ENABLED=1`.
- Validation still requires operator-supplied access token, numeric Instagram user id, explicit Graph API version, and explicit required scopes. The adapter does not guess any of them.
- `validateInstagramMediaContainers()` can create an IMAGE media container or CAROUSEL child containers + parent through the configured official Graph `/media` path only.
- The validation adapter never calls `/media_publish`; `livePublishImplemented` remains `false`, and returned audit state explicitly records `livePublicationAttempted:false` and `mediaPublishEndpointCalled:false`.
- A successful container id is recorded only as `providerContainerCreationObserved:true`; it deliberately does **not** claim media processing success or full provider media-fetch verification.
- Provider failures are sanitized to status/code/subcode. Provider error messages and access tokens are not returned or persisted.
- `POST /api/instagram/media/validate` remains behind current human approval plus approval-bound staged-media validation, preserving candidate/revision binding and 04-only ownership.
- 04 REVIEW_PUBLISH UI adds a separate `공식 컨테이너 검증` control. It stays disabled unless the current candidate has staged approved media and Instagram capability reports `validationState: ready-to-validate`.
- No live publication endpoint was added.

### Validation actually performed

- `npm.cmd run check` passed on package `0.39.0`, including syntax plus all existing and new regressions.
- Mock official-boundary regression observed IMAGE validation making exactly 1 `/media` POST and CAROUSEL validation making exactly 3 `/media` POSTs (2 children + 1 parent); all asserted zero `/media_publish` calls.
- Regression also verifies validation-disabled fail-closed behavior and sanitized upstream provider errors without token leakage.
- `/api/health` returned `ok:true` on a fresh local server.
- `/api/connectors` and `/api/instagram/media/capabilities` with no credentials observed `instagramState: credential-required`, `validationState: credential-required`, `validationEnabled:false`, `providerContainerValidationImplemented:true`, `livePublishImplemented:false`.
- Fresh installed-Chrome E2E actually observed: `bootstrap:ready`, one current 04 approval card, provider-validation button present and disabled, capability text `자격 증명 필요 · live 없음`, zero Graph/provider/validation requests, and zero page errors.
- No real Instagram credential was present, so no official provider container was created in this run. Do not describe provider validation as successful.

### Safety/ownership preserved

- Role chain remains `01 DISCOVERY -> 02 EDITORIAL_SCORING -> 03 PRODUCTION -> 04 REVIEW_PUBLISH -> 05 EXPERIMENTS_ACCOUNTS`.
- Only 04 owns provider validation/publish controls.
- Current human approval and approval-revision-bound staged media are required before provider validation.
- No plaintext secret is stored in repository/state.
- Demo/test outputs remain non-public.

### Blocker / next priority

Real provider validation now needs actual operator Instagram credentials/scopes, an explicit current Graph API version, and externally reachable approved staged media. When those are available, set `INSTAGRAM_MEDIA_VALIDATION_ENABLED=1` and validate **container creation only** first; keep live publication disabled and do not call `media_publish`. Record only the provider behavior actually observed. Only after Feed/Carousel provider validation is materially complete should the separate 1080x1920 MP4 Reels/Shorts renderer become the next major implementation target.

## 2026-09-15 Run 046 update

Baseline was `f1a82da34a507aeba1cd2510f29604a2d7e19f3a` (package `0.39.0`). The Discovery Source Review bootstrap loop was already fixed on current main, so this run continued nonblocked work after the Instagram container-validation gate.

New implementation line:

- `411db62755689ad666c2d959712f49323c3e755d` ? add real FFmpeg vertical MP4 renderer.
- `0211070a86f9261ffd30acad55720f927e9d1502` ? add actual FFmpeg/ffprobe runtime regression.
- `a1744c8688d837db591efe7fa25959b8e2e4e651` ? clamp output to the declared duration after the first runtime test exposed concat tail leakage.
- `0c76889154c0b181955173a3ac166a66fbf7b65a` ? distinguish vertical render implementation from still-unsupported live publishing.
- `18d51206d5e7013bf2ccce8ab153c94d83f451ec` ? cover the separate render-vs-publish contract.
- `38ea2aba391b24562c6fdd7ceea84942e214971d` ? run the renderer in project syntax/regression checks and bump package to `0.40.0`.

### Exact behavior

- New `vertical-video.mjs` renders source PNG/JPEG/WebP images into a real 1080x1920, 30 fps, H.264, yuv420p MP4 using local FFmpeg.
- The renderer accepts at most 20 local image inputs, pads without stretching aspect ratio, produces no audio, writes `+faststart`, cleans its scratch concat manifest, and always returns `publishReady:false` + `reviewRequired:true`.
- `probeVerticalVideo()` uses ffprobe so tests verify the actual encoded dimensions/codec/pixel format/duration instead of trusting the requested command line.
- The first real runtime test caught a 1.4667 s output for a declared 1.0 s two-frame render. The renderer now applies an explicit output duration cap and the same test observes exactly 1.0 s.
- `instagram-reel` and `youtube-short` target metadata now declare `renderImplementation: ffmpeg-local`, 1080x1920 MP4, while publication capability deliberately remains `unsupported`. A local renderer must not be confused with provider/API readiness.
- No Reel/Short publication route, credentials, provider call, OCR/moderation claim, engagement claim, or live post was added.

### Validation actually observed

- Local Windows FFmpeg: `8.1.2-full_build-www.gyan.dev`.
- Actual runtime regression rendered two generated PNG fixtures and ffprobe observed `1080x1920`, `h264`, `yuv420p`, `30/1`, duration `1.0` seconds.
- `npm.cmd run check` passed completely on package `0.40.0`, including the new runtime renderer test and all existing safety/persistence/publish regressions.
- Fresh server smoke used port `43173` because `4173` and `4183` were already occupied; `/api/health` returned `ok:true`.
- No browser UI changed in this run, so no new Chrome E2E claim is made. Earlier browser E2E remains authoritative for the Discovery/04 paths.

### Next priority

1. Keep Instagram Feed/Carousel live/provider state blocked until real operator credentials/scopes, explicit current Graph version and provider-fetchable staged media exist.
2. Integrate the new vertical renderer into 03 PRODUCTION as an explicit human-reviewable artifact workflow rather than adding a publish shortcut. Add source/provenance binding and privacy/rights revision binding before any 04 handoff.
3. Only after that, add platform-specific Reel/Short validation adapters using official APIs and explicit capability states. Do not infer provider readiness from local MP4 success.
4. Continue P7/P8 only for concrete workflow gaps; avoid persistence churn.

## 2026-09-15 Run 047 update

Baseline was `48f9b91de804b8337a2a2c909c860915d382b794` (package `0.41.0`), which already integrated the 03 PRODUCTION vertical artifact handoff and 04 artifact notice. Repo tip remained authoritative over `046-sol.md`.

Fresh real Chrome E2E exposed a selection-sync bug in that new UI: after submitting a new candidate, `#detailTitle` showed the selected candidate but `.vertical-video-production-panel` remained hidden because refresh only followed preview/click mutations. This did not reintroduce the old Discovery Source Review main-thread hang; 20 consecutive CDP Runtime evaluations completed in 0–3 ms with bootstrap still `ready` and zero page exceptions.

Implementation commit `908c37c21e5a75746f50b4890aa20d26f50e6122` adds a narrowly scoped `MutationObserver` on `#detailTitle` so programmatic candidate selection/import refreshes the vertical-production gate. The preview observer remains `childList:true, subtree:false`; no document/body-wide observer was added. Package is `0.41.1` and `test/vertical-video-ui.test.mjs` guards the observer scope and selection refresh wiring.
Validation actually observed after the fix:

- `npm.cmd run check` passed on `0.41.1`, including actual FFmpeg/ffprobe render (`1080x1920`, H.264, yuv420p, 30 fps, 1.0 s), artifact API regressions and the new UI regression.
- `/api/health` on port `43174` returned `ok:true`.
- Fresh Chrome 140 headless E2E observed `featureBootstrap=ready`, `featureVerticalVideoProduction=ready`, candidate submit/select, vertical panel visible, render correctly disabled with explicit missing-gate reasons, 20 responsive Runtime probes, and zero page errors.
- No provider publish/validation call or live publication was attempted.

Next priority: exercise the complete vertical UI with a real Card Factory capture/privacy-reviewed fixture through actual browser render/download and confirm the 04 artifact notice/revision-stale behavior. Keep Reel/Short provider publishing `unsupported` until an official adapter and real credentials/contracts exist. Instagram Feed/Carousel provider validation remains blocked on operator credentials/scopes, explicit current Graph version and provider-fetchable HTTPS staging.

### Run 047 CI follow-up

GitHub Actions on `48f9b91` and the first Run 047 tip `a583988` were actually red at `npm run check`; do not treat those tips as CI-green. The new vertical artifact/API regressions had required FFmpeg/ffprobe even on runners where those executables may be absent, unlike the older renderer smoke which already skipped its runtime portion explicitly.

`e257fff13492be316fbb2bea8b877eb588c79846` (`0.41.2`) makes artifact/API regressions portable without weakening production gates: request validation, capability state, stale-rights and privacy-block server failures still always execute; only successful encode/download assertions are skipped when FFmpeg/ffprobe are unavailable. An explicit simulated missing-runtime run passed both tests, and the normal Windows `npm.cmd run check` still passed with the real 1080x1920 encode path exercised.

Verify the new tip CI before claiming green. If green, the next browser priority remains the full Card Factory privacy-reviewed fixture → vertical render → 04 artifact notice/revision-stale workflow.

## 2026-09-15 Run 048 update

Baseline was `af92e7392fc1ed74dd9298596a95d6ba4abb12e1` (package `0.41.2`). Repo tip already contained the full vertical Card Factory browser harness work beyond `047-sol.md`; it remained authoritative.

Implementation commit `07ab9dc34294e3593cf768325440ec640d7ba9b1` (`0.41.3`) turns the real Chrome vertical flow into an assertion-bearing operator E2E command: `npm run browser:e2e:vertical`.

Actually observed on installed Chrome against a real local server:
- bootstrap and selected candidate stayed responsive across 20 consecutive main-thread probes (0-1 ms observed each);
- Card Factory produced two 1080x1080 canvases;
- manual privacy review gate was explicitly `image-privacy-reviewed`;
- rights review was bound to the saved Card Factory revision;
- real FFmpeg render produced/downloaded a 1080x1920 H.264 MP4, 12,647 bytes;
- 04 REVIEW_PUBLISH displayed the artifact handoff with no publish approval implied;
- changing candidate revision marked both 03 status and 04 handoff `stale`;
- zero Threads/Buffer live publish requests and zero page errors were observed.

The E2E script now fails on page errors, any live publish request, missing/empty artifact download, wrong square inputs, missing privacy review, wrong 1080x1920 probe, accidental `publishReady:true`, provider capability other than `unsupported`, missing 04 handoff notice, missing stale invalidation, or responsiveness probes >= 1 second.

`npm run check` passed locally; `/api/health` returned `ok:true`. GitHub Actions run `34907268039` for `07ab9dc` was observed `completed/success`.

No Instagram credential/provider validation or live publication was attempted. Feed/Carousel provider validation remains blocked on real operator credentials/scopes, explicit Graph version and provider-fetchable approved HTTPS staging. Reel/Short provider publication remains `unsupported`; local MP4 rendering is not provider readiness.

Next priority: avoid inventing persistence work. Continue only concrete workflow gaps. When real provider configuration exists, validate official Instagram container creation without `media_publish`; otherwise improve non-live review/production ergonomics or compliant discovery with verifiable public evidence. Keep the role chain and 04-only publication ownership unchanged.

## 2026-09-15 Run 049 update

Vertical production now bounds accidental long renders in `1753eda` (`0.41.4`).

- Server rejects vertical requests over 180 seconds with `vertical_duration_limit_exceeded`.
- 03 UI computes duration from rendered card count × seconds-per-image and disables render above the same limit.
- Duration input refreshes the production gate immediately.
- Regression covers the server-side limit.
- `npm run check` passed.
- Fresh installed-Chrome vertical E2E passed: bootstrap stayed ready; 20 responsiveness probes were 0–1 ms; 2×1080 square cards → reviewed privacy/rights → 1080×1920 H.264 artifact → 04 handoff → stale invalidation; zero live publish requests and zero page errors.
- `/api/health` returned `ok:true` on port 43176.

Provider publication remains unsupported for vertical artifacts. Instagram official validation is still blocked on real operator credentials/scopes, explicit Graph API version and provider-fetchable approved HTTPS staging. Do not fabricate provider success.

Next priority: keep nonblocked production/review ergonomics focused and evidence-based; if Instagram operator configuration appears, validate official container creation only with `/media_publish` still disabled.

## 2026-09-15 Run 050 update

Stale vertical artifacts now fail closed for download in `7b94aa369a2abb10fe3ee2058708910773bad61a` (`0.41.5`).

- 03 hides/removes the MP4 download URL whenever artifact `handoffBasisUpdatedAt` no longer matches the candidate revision.
- The vertical panel now refreshes directly on `threads:content-revision-changed`; no broad DOM observer was added.
- The Chrome E2E now asserts stale download `{hidden:true, href:null, ariaDisabled:"true"}` in addition to stale 03/04 notices.
- `npm run check` passed, including actual FFmpeg/ffprobe 1080x1920 H.264 render.
- Fresh Chrome E2E on a fresh server at 43177 passed: 20 main-thread probes 0–1 ms, two 1080x1080 inputs, reviewed privacy/rights, 12,647-byte vertical MP4, 04 handoff, stale invalidation, stale download blocked, zero live publish requests and zero page errors.
- `/api/health` returned `ok:true`.

Provider publication remains unchanged: vertical is `unsupported`; Instagram container validation still requires real credentials/scopes, explicit Graph version and provider-fetchable approved HTTPS staging. No provider success or live publication is claimed.

## 2026-09-15 Run 052 update

Fresh mixed discovery + demo refresh landed after baseline 5258390.

- Added data/discovery-batch-2026-09-15-1219.json across finance, relationships/money, human-interest, AI/markets; no invented engagement or copied third-party media.
- Added data/demo-showcase-2026-09-15.json with three DEMO ONLY storyboards, captions, Viral/Comfort review decisions, CTA endings and pre-publish checks.
- Demo Showcase now loads the Sep 15 mixed-source set; imports remain demoOnly and productionEligible=false and require normal gates.
- Fresh npm run check PASS including actual FFmpeg regression.
- Fresh installed-Chrome vertical E2E PASS on current server 43179: main-thread 0-1ms, privacy/rights gate, 1080x1920 H.264, 04 handoff, stale-download guard, zero page errors/live publish requests.
- First E2E against old server on 4173 failed stale guard; fresh current server passed. Stale local servers are a test-environment hazard.

Next: run mixed demos through full interactive Card Factory only when reusable source assets are established; provider validation still requires real credentials/scopes/approved HTTPS staging.
