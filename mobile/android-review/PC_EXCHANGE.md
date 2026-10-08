# PC exchange preparation (0.3.16 / 0.3.18 / 0.3.19, local only)

`pc/exchange.mjs` prepares exports and import proposals against the verified
desktop `post-review-store.cjs` contract. Tests use synthetic PNGs, mock rows,
and fresh temporary directories. No real materials or ratings were read;
no PC source/rating write, GitHub request, repo creation, upload, app registration,
key/token creation, permission grant, learning run or publication was performed.

## Read-only export

`createReadOnlyPcStore(materialRoot)` accepts exactly package versions `0.3.16`, `0.3.18` and `0.3.19`, invokes
`createPostReviewStore(materialRoot,{readOnly:true})`, and exposes only `list`
and `image`. It does not expose `save`, `visit` or `decide`. Calling this against
real materials remains outside this preparation task. An injected test store
must explicitly declare `readOnly:true`; that declaration is an injection
contract, not a security guarantee about arbitrary injected code.

`exportRelease({store,rows,criteria,reviewRound,allowedOutputRoot,
outputDirectory,previousState?,previousTrustedLocalSnapshot?,
previousAssetDirectory?,repository?})` accepts
explicit current production-report rows and a read-only store. Report rows
must retain canonical IDs, current round, source/output SHA256, ruleVersion
and ordered rendered PNG names/hashes. `outputVersion` is computed by the
existing desktop `version(row)` function, then compared with `store.list()`.
The input rows are completed artifact rows; this preparation does not invent
production hashes for missing/held source-only entries.

The existing absolute output root must contain a **new, absent** explicit
output directory. Parent realpaths must remain inside that root; overlap with
the store's materials root, overwrite, in-place exports and path escapes are
rejected. All validation and source image reads precede output creation.
An I/O failure after creation may leave an incomplete new namespace; preserve
it for inspection and use a new output directory, never an overwrite retry.

Outputs are:

- `mobile-review/state.json` (at most 1,000,000 UTF-8 bytes)
- `mobile-review/assets/<sha256>.png` (each at most 25 MiB)
- `pc-local/export-provenance.json` (independently preserved local baseline;
  outside the `mobile-review` upload tree and never uploaded)

Image bytes must have the full PNG signature and their declared SHA256. Each
`assets[url].blobSha` is the real Git SHA1 of `blob <byteLength>\0` plus the
PNG bytes. The same immutable PNG bytes are physically included in the output
tree so their blob SHAs can remain reachable. A future upload must commit
state and those PNG files coherently; an asset SHA in JSON alone is insufficient.

New outputVersion/round starts at revision zero and cannot inherit an old
mobile review. Only the current canonical PC evaluation for the exact
ID/outputVersion/round can seed score/note. No `previous` PC score is copied.
Same version/round/criteria preserves the mobile review/revision and the
original PC baseline from the independently retained trusted local snapshot,
rather than copying the remote baseline. Passing `previousState` requires
`previousTrustedLocalSnapshot`; missing snapshots or mismatched remote
`pcExport`, release identity, or criteria are rejected before output writes.
Existing `operations`, prior
asset bytes and prior manifests/reviews survive new releases. A prior asset
directory is required whenever a prior asset map is carried forward; the
exporter rechecks its SHA256 and Git blob SHA.

Optional repository metadata is **public configuration data only**:
`{owner,repo,repositoryId,private:true,dedicatedReviewRepository:true,
branch:'mobile-review/<name>',excludedRepositories:[...]}`. Supply the exact
bridge and command repository identities as exclusions. The identity must
refer to a dedicated private review repository separate from those repos.
No real repository is configured by default. This assertion does not verify
GitHub visibility or ownership; approved future transport must verify them.
No repository or branch is created by these functions.

## State additions and ledger provenance

State keeps `githubReviewSchema:1` and the existing manifest/assets/operations.
It adds:

```js
pcExport: {
  pcVersion: '0.3.16',
  entries: {
    [JSON.stringify([id, outputVersion, reviewRound])]: {
      canonicalEvaluationHash: '<SHA256 of recursively key-sorted evaluation|null>',
      baseRevision: 0
    }
  }
},
history: [{manifest: previousManifest, pcExport: previousExportProvenance}]
```

The local `pc-local/export-provenance.json` contains
`{pcExchangeProvenanceSchema:1,releaseIdentityHash,pcExport}`. The release identity
hash binds schema/round, complete criteria and ordered ID/title/outputVersion/
round/immutable-image URL+SHA256 fields; it excludes editable mobile review and
revision fields. The exporter returns the same `trustedLocalSnapshot` plus
`snapshotFile`. Only the `mobile-review` subtree is a future upload candidate;
never commit or upload `pc-local`. Retain its snapshot independently on the PC.

The operation ledger needs the smallest additive change:
`operations[operationId] = {requestHash,request:fullWireRequest,result}`.
`requestHash` remains SHA256 UTF-8 JSON with recursively sorted object keys.
`result` remains the original terminal `applied`, `conflict` or `stale` result.
Legacy records lacking `request` stay preserved/readable/replayable; they are
not reconstructible from the latest manifest and cannot generate PC proposals.
The importer returns `missing_request_provenance` for them. Never derive an
old operation's score or memo from a later aggregate review.

## Import acceptance and proposed PC payloads

`prepareFeedbackImport({state,trustedLocalSnapshot,rows,criteria,reviewRound,canonicalEvaluations?,
canonicalRevisions?,receipts?,sourceCommit?})` is pure and returns no file writes.
Rows/criteria/round are the current independent read-only PC snapshot.
`canonicalEvaluations` must contain the current canonical evaluations in a real
pilot (empty/default is only appropriate for a verified empty synthetic
baseline). `trustedLocalSnapshot` is mandatory and must be loaded from the
independently preserved local `pc-local/export-provenance.json`; never construct
it from remote `state.pcExport`. The importer enforces its schema, baseline
fields, full remote `pcExport` equality and release identity/criteria hash.
Missing, malformed or mismatched snapshots are refused even for duplicates.
The explicit input argument cannot prove where arbitrary caller-supplied
objects originated; the eventual trusted caller must load the preserved local
file. The exporter now writes that file; approved retention/access policy and
authenticated remote fetch remain to be integrated.

Before a real pilot, the caller must also verify that the exact pinned
`sourceCommit` was fetched from the separately approved dedicated private
repository. A SHA string validates syntax; it does not authenticate a commit
or authorize a canonical merge. This offline module implements no remote fetch.

A proposal requires:

1. A structurally valid operation ledger and full exact wire request whose
   operationId and complete requestHash match the ledger.
2. Valid integer score 1–10 or null; note string <=10,000 characters; separate
   boolean checks belonging to the applicable criteria; a valid mobile decision.
3. Current ID/outputVersion/reviewRound and criteriaVersion, using desktop
   `version(row)` rather than title/date matching.
4. `applied` terminal result with `revision === baseRevision + 1`; no applied
   result exceeding the manifest revision; the final revision's payload must
   agree with the manifest review.
5. An independently preserved trusted local export snapshot whose release
   identity and baseline match remote state, matching current canonical evaluation hash,
   and matching PC import revision (from the baseline/approved receipts or
   explicit `canonicalRevisions` keyed by `[id,outputVersion,reviewRound]`).
6. No conflicting operationId replay or contradictory receipt identity/revision.

Every evaluation proposal is `{evaluation,provenance}`. `evaluation` has the
canonical desktop shape:
`{id,outputVersion,sourceFingerprint,outputSha256,ruleVersion,title,
score,note,updatedAt,reviewRound}`. Its `updatedAt` comes from the exact mobile
operation timestamp; merge policy must decide whether to preserve that time
or record an additional acceptance time. `provenance` carries operationId,
requestHash, pinned sourceCommit if supplied, deviceId, createdAt,
criteriaVersion, baseRevision and terminal revision.

`mobileDecisionRecords` separately carries version/round, checks, decision
and the same provenance. It does not translate decisions into desktop
`eligible|held|rejected` progress/dispositions or combine decision/checks with
score/note. `publish_approved` remains a human review decision, never a posting
action or final platform approval.

Identical **approved merge receipts** deduplicate operations. Reused IDs with
different hashes are rejected. `proposedReceipts` is an output proposal;
it is not proof that a merge occurred. Persist/use it as an approved receipt
only after a separately authorized canonical merge and receipt transaction.
These functions perform neither transaction. An interrupted/failed merge must
not advance the receipt or revision. Consecutive valid revisions yield ordered
proposals; a future merge must retain ordering and atomic deduplication.

Changed output/round/criteria becomes `stale`. Remote conflicts/stale results
remain explicit. PC evaluation changes since the trusted export become
`canonical_changed_since_export`; revision gaps become `base_revision_mismatch`.
Both sides' payloads remain in conflict output. There is no last-write-wins,
no score reassignment to new artifacts and no automatic conflict resolution.
Legacy/missing provenance is blocked, not guessed.

## Local synthetic use and checks

`pc/synthetic-fixture.mjs` supplies a reusable mock-only input:

```js
import {syntheticInputs} from './pc/synthetic-fixture.mjs';
import {exportRelease} from './pc/exchange.mjs';
const inputs = syntheticInputs();
await exportRelease({
  ...inputs,
  allowedOutputRoot: 'C:\\explicit-existing-fixture-root',
  outputDirectory: 'C:\\explicit-existing-fixture-root\\new-release'
});
```

Do not substitute real PC paths during preparation. Run:

```text
node --test mobile/android-review/test/pc-exchange.test.mjs
node --check mobile/android-review/pc/exchange.mjs
node --check mobile/android-review/pc/synthetic-fixture.mjs
```

The dedicated review repo/app/permission grant, authenticated transport,
trusted caller snapshot retention/access integration, real-data pilot and canonical merge
approval/transaction remain unresolved. The original PC ratings/source and
APK integration stay outside these local preparation functions.

## Atomic release publisher preparation

`pc/publish-release.mjs` adds `publishPreparedRelease` as a source-only producer
boundary. Tests call an in-memory injected GitHub API with newly created
synthetic export namespaces. No actual API request, upload, authentication,
grant, repository creation, scheduling or canonical PC write was performed.
The publisher is not deployed or enabled in the APK.

The explicit input is:

```js
{
  approved: true,
  dedicatedReviewRepository: true,
  owner, repo, repositoryId, branch: 'mobile-review/<name>',
  excludedRepositories: ['exact-owner/bridge-repo', 'exact-owner/command-repo'],
  exportDirectory: '<absolute complete new export namespace>',
  expectedHead: '<40 lowercase hex SHA from an authenticated pinned read>',
  api: injectedAuthenticatedFutureApi
}
```

These approval flags are future activation gates, not evidence that approval
has happened. No live repository or API is configured. The injected API uses
the same relative `/repos/...` paths and `{method,body:object}` calls as the
reviewer adapter. Its authenticated transport, exact host allowlist and token
lifecycle remain external and pending. It must not substitute bridge/connector
credentials. The repository must be dedicated, private, have the exact numeric
ID/owner/name, and use an existing review branch different from its default.
Bridge/command exclusions are mandatory explicit metadata.

The publisher first validates the local export before any API call. It reads
only the `mobile-review` subtree of the complete namespace; it rejects passing
`pc-local`, `mobile-review` or `assets` as the export root. The upload subtree
must contain exactly `state.json` and `assets`; asset files must match the asset
map exactly. Unknown files and local provenance within that subtree are refused.
Symlinks/junctions in all path components and hard-linked files are rejected.
Files must be regular, bounded and stable during bounded reads. PNG signature,
SHA256 and real Git blob SHA must match. State is <=1,000,000 bytes, each PNG
<=25 MiB, at most 5,000 assets and <=128 MiB total PNG bytes. Exceeding these
limits requires explicit archive/sharding work. The publisher writes no local
file and never reads or uploads the sibling `pc-local` directory.

Before creating any Git objects, it verifies private repository metadata and
that the branch's observed head exactly equals `expectedHead`. It reads that
commit/tree and loads `mobile-review/state.json` with Contents `ref` pinned to
the exact expected commit. Only a 404 at that path represents an initial absent
ledger; authorization/transport errors or malformed/oversized/hash-mismatched
state are not treated as empty state. The response's Git blob SHA is checked.

A fresh head argument cannot authorize an old export to erase interim feedback.
The candidate must preserve every existing operation record (complete
requestHash/request/result), immutable asset mapping and prior history record.
The same ID/outputVersion/round with identical criteria must keep the current
mobile review, revision and image list. If a release/criteria switch removes
current versions, the exact current remote manifest, including its latest
reviews, must be retained in candidate history. Any loss/change yields a
`pending` result with `stale_export_operations`, `stale_export_assets`,
`stale_export_reviews` or `stale_export_history`, with zero Git object writes.
The caller must read the current state, produce a fresh validated export and
ask for the intended release action through the approved workflow. There is
no automatic merge of an old export with new reviews.

After validation, the publisher creates PNG and state blobs, verifying every
returned SHA against the exact bytes. One tree preserves `base_tree` and adds
only `mobile-review/assets/<sha256>.png` plus `mobile-review/state.json`; no
unrelated file is deleted or replaced. One commit uses `parents:[expectedHead]`.
Returned tree/commit identities and parent are checked, then the exact branch
head is checked again before a `force:false` ref update. The immutable PNGs and
state become reachable together through that one commit.

`confirmed` is returned only when the ref-update acknowledgement identifies
that exact candidate commit. An advanced initial head yields `stale` without
Git object writes. A later branch advance/non-fast-forward or ref rejection
remains `pending`; 422 is a rejection without asserting a concurrency cause.
A lost/malformed ref acknowledgement is `publication_unconfirmed`, carrying
the candidate commit for separately authenticated verification. It is never
reported as confirmed even if the mock branch happened to advance. There is
no retry, force push, history reset, descendant replay claim or automatic
old-release merge. A future caller must verify an uncertain outcome before
deciding to re-export or request another publication attempt. Failed attempts
may leave unreachable Git objects; they do not make the local export current.

Verification:

```text
node --test mobile/android-review/test/pc-publish.test.mjs
node --check mobile/android-review/pc/publish-release.mjs
```

This closes the source-level atomic release producer boundary. Actual transport,
approval, the private data pilot and canonical evaluation merge transaction
remain unresolved; no scheduler or real credential flow is implemented here.

## Verified PC contracts and upgrades

isVerifiedPcVersion(value) accepts exactly 0.3.16, 0.3.18 and 0.3.19. Store opening, export provenance, trusted-local import checks and prepared/pinned publisher baseline checks use that allowlist. No version ranges, later versions or prerelease strings are accepted. These versions retain the same desktop version(row), PNG storage and score/note evaluation contract. PC0.3.19's small-window UI changes are preserved in the integrated branch; no installed viewer was changed.

A new export records its verified store.pcVersion when supplied; otherwise it uses the installed source package version. Unsupported explicit versions fail before output writes. The read-only desktop wrapper supplies its checked installed version. Synthetic stores may declare a verified version without changing source package files.

An unchanged release identity retains the exact independently trusted prior pcExport version and entry baselines across a runtime upgrade. For example, running PC 0.3.18 against an unchanged 0.3.16 remote release keeps the 0.3.16 baseline, allowing the feed's transport no-op to retain a local snapshot which still matches remote state exactly. Mobile operations, revisions and reviews remain importable. A new release identity uses the current verified runtime version and archives prior provenance with the exact old manifest. Trust still requires full remote/local equality; a runtime upgrade does not authorize rewriting a remote baseline or recapturing canonical evaluation hashes.
