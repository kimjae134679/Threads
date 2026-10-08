# PC feedback transaction: source-only, default disabled

`pc/feedback-transaction.mjs` adds callable transaction preparation and recovery. No CLI, timer, scheduler, desktop `store.save`, account connection, real-material binding, or real canonical merge is installed. Tests use generated temporary synthetic fixtures only. Android APK behavior is unchanged.

## Synthetic fixture API

```js
import {createFixtureFeedbackTransaction} from './pc/feedback-transaction.mjs';
import {requestHash} from './pc/exchange.mjs';

const transaction = createFixtureFeedbackTransaction({
  enabled: true,
  syntheticFixture: true,
  allowedFixtureWorkspace: temporaryWorkspace,
  fixtureRoot: temporaryFixtureRoot,
  feedbackFile: temporaryFeedbackFile,
  readSnapshots: async () => ({
    rows, criteria, reviewRound, trustedLocalSnapshot
  })
});
const result = await transaction.importFeedback({
  state: pinnedRemoteState,
  sourceCommit: pinnedGitCommit,
  pinnedStateHash: requestHash(pinnedRemoteState)
});
const recovery = await transaction.recover();
```

`enabled` and `syntheticFixture` default to false. Disabled calls return `{status:'disabled', canonicalWritePerformed:false}` before filesystem or snapshot reads. Enabled fixtures require an explicitly allowed absolute workspace, a strict child of the OS temporary directory whose basename begins `pc-feedback-fixture-`, a strict child file named `canonical-feedback.json`, and a root marker `.mobile-feedback-fixture.json` containing `{schemaVersion:1, syntheticOnly:true}`. This is an explicit synthetic fixture designation, not automatic detection of whether arbitrary content is synthetic.

All target, workspace, lock, marker and journal paths reject traversal, symlinks/junctions, and multi-link files. The feedback file must already exist. No default real PC path is supplied. A path's parent tree is checked again before replacement. Filesystem checks are defenses against mistakes and stable aliases; a hostile process that can replace directory entries at precisely timed boundaries is outside this local fixture threat model.

The caller supplies a remote state obtained from a verified pinned Git read. `sourceCommit` is a 40-character hexadecimal Git commit; `pinnedStateHash` is `requestHash(state)`, the semantic SHA-256 hash from `exchange.mjs`, not a Git blob ID. These injected pins record and bind the supplied state; the module does not fetch or authenticate GitHub itself. The trusted snapshot callback must independently retain the PC-local export baseline; it must never derive that baseline from the remote state. The callback is called under the writer lock and again immediately before each rename attempt.

## Canonical contract and atomic boundary

The existing feedback JSON stays compatible with PC0.3.16: `schemaVersion:1`, `recordType:'user_post_quality_feedback'`, the exact current `reviewRound`, and `evaluations`. Every proposal is regenerated through `prepareFeedbackImport` against the current canonical evaluations, receipts and revisions. Exact ID, output version, round, criteria, baseline evaluation hash and revision ordering govern acceptance. Conflicts and stale operations preserve the original; old scores remain attached to their older output versions. Duplicate ID/output-version canonical entries fail closed.

Additive `mobileImport` metadata lives **inside the same canonical JSON**:

```json
{
  "schemaVersion": 1,
  "receipts": [],
  "revisions": {},
  "decisionRecords": []
}
```

Its receipts record operation ID, request hash, exact identity, revision and evaluation hash. `decisionRecords` retain mobile decisions/checks and their provenance separately from ratings. A `publish_approved` mobile decision never invokes a PC workflow disposition, publishing gate or posting action. Other canonical fields and unrelated evaluations are preserved.

The single replacement commits ratings, receipts, revisions and decision records together. A lost response after replacement is recovered by the exact after hash; the next import sees the already committed receipt and returns `status:'unchanged'` without a second canonical write or transaction journal. A successful replacement returns `status:'committed'`, `canonicalWritePerformed:true`, proposal details, transaction ID, backup/journal paths and before/after hashes.

## Backup, journal, lock and recovery

For each nonempty proposal, a UUID namespace in `<feedbackFile>.mobile-import` holds an exact byte-for-byte `.before.bin` backup, a fully written/fsynced `.after.json` replacement, and an immutable `.journal.json` with their hashes and pinned source provenance. Each file is created exclusively (`wx`), file-synced, and directory-synced where supported before canonical replacement. These are write-once transaction artifacts, not operating-system tamper-proof storage; pending recovery verifies their hashes.

An exclusive filesystem lock serializes cooperating callers of this module. A live or indeterminate PID is never evicted. A known-dead owner is reclaimed under an identity-bearing file guard with its own pid/host/nonce and the same recursive exclusive-create protocol (bounded nesting). A known-dead reclaimer is therefore recoverable. Exact identity checks prevent a stale reclaimer removing a replacement. Incomplete/unknown owner records or legacy ownerless guard directories remain intact and blocked for operator inspection; this version never creates ownerless guard directories.

Before each native rename, including Windows busy-file retries, the module rereads the trusted snapshots and compares the canonical bytes to the exact before bytes. It uses a single same-volume filesystem rename. Windows directory fsync may be unsupported; `directorySynced:false` reports that limitation. File fsync and atomic rename tests do not prove survival of arbitrary power loss or storage-controller failure.

Recovery inspects unresolved immutable journals:

| Canonical hash | Recovery action |
| --- | --- |
| Exact after hash | Recognize committed transaction; write resolution; retain committed receipts |
| Exact before hash | Recognize `before_preserved`; retain original canonical file and durable stage |
| Any other hash, missing file, invalid backup/stage/journal | Refuse recovery; preserve current file and artifacts |

Recovery never restores a backup over an external edit. A matching before file already is the rollback for this single-file atomic boundary. Resolutions are write-once records; previously resolved transactions remain historical artifacts. Orphans created before their journal was durably written are retained and never promoted into a canonical write.

For fixture failure tests, `failpoint(stage)` receives only a stage name (`afterBackup`, `afterStage`, `afterJournal`, `beforeCas`, `afterRename`, `afterDirectorySync`), without content or credentials. Fixture `io.rename` can inject replacement failures while every other file operation remains native and durable. The reusable generic core always uses native rename.

## Future approved binding and remaining integration

`createFeedbackTransaction` exposes the same callable core for a future separately approved binding. It defaults to disabled and requires both `enabled:true` and `canonicalMergeApproved:true`. It further requires explicit `allowedWorkspace`, `feedbackFile`, `readSnapshots`, a `withCanonicalWriter(work)` adapter, and `canonicalWriterContract:{allCanonicalWriters:true, roundActivation:true}`. Missing adapter/contract rejects activation before trusted snapshot reads. The declaration is the caller's contract, not proof that a real desktop writer participates.

The adapter must execute and await `work` exactly once while holding the **same** transaction barrier used by every canonical PC save and round activation. `readSnapshots` must reread and validate the active pointer, status report, completed delivery journal, current rows/criteria/round and independently retained export provenance under that barrier. Snapshot selection can reuse the release-feed reader; it must refuse incomplete or failed round transitions. The feedback JSON itself is read inside the barrier by this module.

The isolated PC0.3.18 source copy now includes the shared root writer queue/barrier covering desktop saves, visits, decisions, migration, coherent reads and complete activation. `pc/pc-binding.mjs` supplies this actual source adapter and fixed-path/durable-journal readers, default-disabled. See PC_0318_BINDING.md. The installed PC application remains untouched; live activation still requires source deployment with all participating writers, explicitly approved actual configuration/credentials and a separately approved canonical pilot. Writers outside the barrier are not made safe by a prewrite hash check alone.

Verification command:

```text
node --test mobile/android-review/test/pc-feedback-transaction.test.mjs
```

The suite covers disabled no-I/O gates; score/null/memo and decision separation; exact identity/version/round; ordered revisions; receipt retry; conflict preservation; exact backup bytes; exclusive locking; before/after recovery; unknown edit/corruption refusal; native replacement failure; Windows retry CAS; dead-owner recovery after an actual child-process crash; path aliases; and the required shared-adapter ordering. All executed writes are temporary synthetic files.
