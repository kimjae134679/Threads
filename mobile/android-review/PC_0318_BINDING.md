# Local PC0.3.19 integration update (2026-10-08)

The selected writer/exchange changes from ee66964edf6d74723bc557469ae6a1f5d4ea1910
are now installed in the local PC0.3.19 viewer, with its previous installation
preserved. The existing round/evaluation/PNG data is unchanged. Default-off PC
bindings and dependencies are also present in resources/pc-review. This does not
enable live transfer/import or supply an operational entry point/credential provider.

Explicit verified-intake evidence may use {allowedWorkspace,sourceRoot,workRoot?}
for a proven non-CLI round. sourceRoot must be bounded and disjoint from material,
state and export roots. Its exact status SHA/row identities/completion proof/fatal
checks remain mandatory. The original {allowedWorkspace,workRoot} CLI contract
still derives rounds/<intake-id>/source strictly.

Measured full release:365posts/3073images, state1,806,272bytes. State is bounded
at8MiB; PNG aggregate1GiB/each25MiB/5000assets. Large Contents metadata uses its
exact pinned Git blob SHA and byte/Git-hash verification. The exporter enforces
aggregate budget before writing and reads prior assets with bounded file identity
checks. The Android adapter needs this update and review-limits.js in a rebuilt
APK. Long supply retains the canonical barrier (mock full supply83.133s), so
snapshot staging or explicit busy/retry UX remains a live-deployment requirement.

See docs/CANONICAL_PC_MOBILE_INTEGRATION_2026-10-08.md. Earlier branch-only
statements below describe the Android preparation history, not current PC install.

---

# PC 0.3.18 writer integration / PC 0.3.19 UI compatibility

The Android branch integrates verified PC source
`f22b0319fefa375f224a9bdc89edc072e0f5b73a`. These changes are confined to this
isolated source copy. The installed PC viewer, original materials and actual
ratings have not been modified. Remote review schema remains 1. Canonical
feedback keeps schema 1 and additive `mobileImport` receipts, revisions and
separate human decisions; no receipt or revision is invented by PC edits.

Latest PC0.3.19 source `8ba9bab95047c148c187ed5a63a4ef29e0e354b4` is also
integrated, preserving its small-window HTML/CSS/JS updates. Its store,
migration, release and shared model files are byte-identical to the earlier
PC source; the exact verified version allowlist now includes0.3.19. Tests retain
unchanged0.3.18 remote baselines/operations across this upgrade and leave new
versions blank. The actual installed0.3.19 viewer remains untouched and does
not contain this branch's writer integration. Future integration installation
is required before actual canonical import can safely be enabled.

`desktop/review-canonical-writer.cjs` supplies one root queue and cross-process
writer barrier, outside the archived `07` folder. PC saves, visits, decisions,
migration, coherent reads and whole-round activation share it. Activation holds
it through CAS, entire old feedback-folder archival (including transaction
sidecars), old-pointer archival and the completed delivery journal. Owned
mutation ordering supports awaited reentry without waiting for an outside PC
writer that is itself waiting for the barrier. Known-dead root/reclaimer owners
are recovered using exclusive creation and exact owner identities. Unknown
owners are preserved and blocked. Secure bounded PC reads reject links and
check named/opened file identities and changes.
Windows transient lock-read EPERM/EACCES/EBUSY retries read fresh bytes for at
most one second (also capped by the acquisition deadline). Persistent denial
throws; release still requires exact fresh owner identity before removing a lock.

`pc/pc-binding.mjs` exports `createBoundPcReviewPipeline`. It lazily binds the
actual PC store, fixed pointer/status/delivery/feedback/workflow paths and a
durable independent `stateRoot/pc-release-feed.json`. It is disabled by default
and has no CLI, timer, service or scheduler. All paths, criteria, dedicated
private repository metadata and approved credential provider must be explicitly
supplied. No real values or credentials are checked in. Transfer and canonical
merge approvals are separate. Disabled operations do not read/create files or
call transport.

The material root must be inside `allowedMaterialWorkspace`. Existing state
and export directories must be disjoint from each other and the material root;
each export uses a new explicit namespace. One state namespace belongs to one
binding/repository. The state barrier precedes the canonical root barrier for
supply/import/recovery, while canonical import then takes its transaction lock.
No other participating writer takes the state barrier from inside the canonical
barrier. The current implementation holds the canonical barrier across the
one-shot transport operation, prioritizing a coherent snapshot over PC edit
latency. Keep these directories writable only by approved participating writers.

Default `completionPolicy: 'regenerated-only'` retains full-regeneration checks.
Explicit `'verified-intake'` also accepts the exact validated PC 0.3.18 intake
contract, with both whole-regeneration flags false. `intakeEvidence` must supply
`{allowedWorkspace,workRoot}`. The binding reads
`workRoot/rounds/<current intake round>/source/intake-complete.json`, verifies the
exact source status SHA against the current pointer and output row identities,
and rejects fatal files in either that source root or the work root. Missing,
mismatched, incomplete or failed evidence waits without falling back to an old
round. The proof must match every unique output ID, post/page count, audited or
preserved row and current completed delivery journal.

`supplyOnce({outputDirectory})`, `importOnce()` and `recoverOnce()` are explicit
invocations. A restarted instance loads its durable journal and independent
baseline. PC edits preserve imported metadata but trigger content-hash conflicts
for unapproved mobile overwrites. New output versions/rounds start blank. Human
`publish_approved` remains separate from PC workflow eligibility and executes no
posting. API registration, repository creation and actual posting are absent.

The transaction's reclaim guard now records pid/host/nonce in a file, so a
known-dead reclaimer is recoverable. A legacy ownerless `.reclaim` directory or
unknown/corrupt owner cannot establish safe ownership and remains intact for
operator inspection; this implementation never creates such directories.
Windows may not support directory fsync: file fsync plus atomic replacement is
verified, while full power-loss durability still requires a platform pilot.

Synthetic tests exercise real copied PC store reads/saves, mock private transport,
atomic import, preserved metadata, reopened feed journal, conflict detection,
alias rejection, completed-round selection and intake proof/fatal mismatch.
Independent processes exercise root serialization and crash recovery. These are
not actual-user-data or online synchronization tests.

Before live activation: explicitly approve/register the new dedicated private
review repository and private GitHub App, selected-repository grant, official
user consent and approved PC credential provider; review/configure actual paths
and criteria; deploy this writer-integrated PC source with all participating
writers; rebuild with approved public identifiers; then test an Android device,
Keystore/TLS/login, private supply/reconnect/conflict and separately approved
canonical pilot. None of those actions happened in this task.
