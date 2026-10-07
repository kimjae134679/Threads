# Callable PC release feed

`pc/release-feed.mjs` completes the source-only PC producer for the verified 0.3.16 exporter and publisher. It has no CLI, process startup, recurring timer, daemon, scheduling, token acquisition or canonical feedback writes. `enabled` defaults to false; disabled calls perform zero source reads, exports, journal saves or transport calls.

## API

```js
import {runReleaseFeed, selectCompletedRound} from './pc/release-feed.mjs';

const result = await runReleaseFeed({
  enabled: explicitlyEnabled,
  readSnapshots,          // async () => {pointer, report, deliveryJournal}
  store,                  // explicit read-only store; list() and image()
  criteria,
  repository,             // dedicated private identity + isolated review branch
  api,                    // explicitly injected approved transport or mock
  allowedOutputRoot,      // absolute caller-owned scratch root
  outputDirectory,        // absolute NEW namespace within scratch root
  journal: savedJournal,  // {} initially; independently retained local JSON later
  persistJournal,         // async journal => durable save BEFORE resolving
  // Optional test/read-only binding; default is readPinnedReviewState:
  // readRemoteSnapshot: async ({repository, api, enabled, allowAbsent}) =>
  //   ({head, tree, state, blobSha})
});
```

`repository` uses the existing `dedicatedRepositoryMetadata` contract: owner, repo, numeric repositoryId, private=true, dedicatedReviewRepository=true, branch=`mobile-review/<name>`, and explicit excludedRepositories. The default pinned reader authenticates repository identity, privacy, branch separation, commit/tree identity and the exact state Git blob hash through the injected API. A replacement reader is a trusted read-only dependency and must provide the same guarantees. No real transport or credential source is configured by this module.

`selectCompletedRound(snapshot)` returns `{reviewRound, posts, pages, rows, sourceStatusSha256}` or null. `runReleaseFeed` returns `disabled`, `waiting`, `noop`, `confirmed`, `pending`, `stale` or `blocked`, with reasons and caller-persistable journal evidence where relevant. Prepared calls include `exported`, the existing exporter result with `state`, `trustedLocalSnapshot`, `assetDirectory`, `outputDirectory`, `stateFile` and `snapshotFile`. Recovery returns the confirmed head and journal without making another export.

## Selection and preservation

Selection requires the current pointer to be active and wholeCollectionRegenerated=true. The report must have the same round, deliveryStatus=complete, processed exactly equal to entries.length, no failed entry, and every output row generated with nonempty images. Pointer post/page counts must exactly match unique output rows and images. The delivery journal must have the same round and complete=true; rollback/error markers refuse selection. Optional delivery counts and pointer audit rows are cross-checked. There is no previous-round lookup or fallback.

The completion snapshot is read again after export and before commit/ref requests. A changed current collection prevents publication. Caller snapshot bindings should read a coherent snapshot and bind to the approved PC source only when a real pilot is authorized.

Each run reads the remote state at its authenticated current head. The exporter receives that state, its independently retained local trusted baseline, and local retained immutable assets. This preserves the newest mobile operations, review revisions and history. It never takes old canonical release bytes as a replacement for a newer remote ledger. A missing or mismatched trusted baseline rejects preparation before publication.

The publication fingerprint binds criteria, round, canonical ID/title, source fingerprint, output hash, rule version and image hashes, plus the pointer source status hash when present. Mobile review/revision changes are excluded. An unchanged release is a transport-write noop even after mobile feedback advances; its local trusted baseline stays available for later imports. A new round archives the exact latest remote manifest, without copying its scores into new outputs.

The existing publisher still validates its full prepared namespace. A feed-owned API wrapper derives each Git blob SHA from the bytes. If the pinned remote immutable asset mapping already contains that SHA, it fetches `/git/blobs/<sha>` and validates size, exact content and Git hash before returning the existing SHA to the publisher. Only new blobs reach POST. New state content, tree and commit retain the existing expected-parent, non-force publication contract. PC-local provenance never enters the upload tree.

## Durable publication and replay

Callers must serialize runs for one repository/journal and durably save every `persistJournal` input before resolving. The module returns JSON-compatible journal state; it does not choose a journal file, canonical source path or locking/scheduling policy.

The journal binds the dedicated repository identity and stores confirmed provenance/assets independently from remote state. Pending evidence includes the publication fingerprint, expected parent, exact state content/blob hashes, export paths, trusted baseline, candidate tree/commit and phase. Checkpoints occur before POST commit (`commit_in_flight`), after a verified candidate response (`candidate_created`) and before PATCH ref (`ref_update_in_flight`). A failed checkpoint prevents the following mutation. If the precommit checkpoint rejects before POST commit starts, the feed restores the previous export_ready phase and tree evidence, then saves that safe state through the normal pending-result checkpoint; this also handles a callback which saved its input before throwing. Once POST commit starts, in-flight evidence is retained for uncertain responses. An uncertain acknowledgement remains pending and is never automatically retried within the same call.

Replay verifies the exact candidate commit tree, single expected parent, pinned state bytes/hash and independently retained baseline before doing anything else. If the branch already points to the candidate, it confirms through read-only evidence. If the branch has an authenticated descendant, it checks lineage, release identity, baseline, preserved operations/assets/history and monotonic reviews before confirming. An unrelated or rewound ledger is blocked. If the branch remains at the expected parent, it may re-send only the same candidate non-force ref request, after rechecking completion and durably saving the ref checkpoint. It never creates a second commit during recovery.

A known precommit failure is distinguished by `phase=export_ready` and no candidate commit. On retry, the feed resumes the exact existing export namespace without overwriting it or creating another namespace. It requires the same completed source fingerprint and pinned remote head/state hash, verifies bounded local state bytes/Git hash and the independent on-disk provenance, rechecks canonical store IDs/versions/current evaluations, and verifies the current source PNG hashes. The existing publisher then validates the full physical export namespace and every retained PNG before its first transport call. The same durable commit/ref checkpoints still apply.

If the pinned remote head or feedback state changed since this known precommit preparation, retry returns `pending` with `precommit_remote_changed_reexport_required` and performs no publication writes. An explicitly serialized caller may discard ONLY an `export_ready` pending record whose candidate is null, durably save that decision while retaining `journal.confirmed`, then invoke the feed with a fresh NEW outputDirectory. The next run reads the latest authenticated pinned ledger and reuses the retained confirmed trusted baseline/assets to preserve new feedback. The old namespace stays untouched. A missing independently retained baseline still rejects export. The caller must never clear `commit_in_flight`, an unknown commit response, a known candidate or an uncertain ref result to force a fresh publication.

If a commit creation response was lost before its SHA could be retained, the producer fails closed. Git commit creation has no deduplication contract; an unknown candidate must be resolved through approved read-only investigation before any new commit attempt. No real investigation or publication has been performed by the synthetic tests. A pending publication tied to another active collection is never replayed into that collection.

## Synthetic verification

The tests use a new temporary directory per fixture, two small synthetic PNGs, read-only fake stores and an in-memory Git API. They never open actual PC materials, ratings, accounts or credentials. Recorded TDD stages include the missing default-disabled behavior assertion and the descendant review-rewind assertion, followed by passing fixes.

```text
node --test mobile/android-review/test/pc-release-feed.test.mjs
28 tests passed

node --test mobile/android-review/test/pc-release-feed.test.mjs \
  mobile/android-review/test/pc-exchange.test.mjs \
  mobile/android-review/test/pc-publish.test.mjs
```

Coverage includes active-complete collection selection, incomplete/missing/failed transitions, zero default-off side effects, unchanged release after mobile feedback, new-round feedback preservation, verified existing PNG reuse, changed PNG delta, tampered blobs/candidates, lost ref request/acknowledgement, unknown commit response, authenticated feedback descendants, review rewind rejection, journal persistence failure, repository binding, the default pinned reader, safe same-namespace precommit retries, changed canonical/source PNG rejection and advanced-feedback reexport requirements and one-shot commit checkpoint rejection recovery.

Real activation still requires user-approved read-only source bindings, scratch/journal locations, serialized invocation, dedicated repository/branch metadata, approved credential provider and a separately authorized real pilot. The module creates none of them.
