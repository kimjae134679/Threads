# One-shot PC wiring preparation

`pc/review-pipeline.mjs` connects the existing producer, private pinned reader,
mobile ledger contract and atomic feedback transaction. It is a library with
`supplyOnce({outputDirectory})` and `importOnce()`; it has no executable entry,
timer, service, scheduler or real source/account binding. Both operations default
to disabled. Transfer approval and canonical merge approval are separate gates.

## Interfaces and persisted contracts

Create with `createPcReviewPipeline({enabled:false,dataTransferApproved:false,
canonicalMergeApproved:false,repository,api?,getAccessToken?,fetchImpl?,store,
criteria,readSnapshots,readJournal,persistJournal,withSupplyLock,
supplyLockContract:{allFeedWriters:true},allowedOutputRoot,feedbackTransaction})`.
All bindings are explicit. The checked-in source supplies no actual values.

When future approvals exist, `supplyOnce` invokes the existing feed under the
caller-declared shared feed-journal writer lock. Each invocation requires a new
explicit output namespace. `readSnapshots` must provide coherent trusted current
pointer/report/completed delivery journal. Only the active whole completed round
is selected; incomplete/failed transitions wait without using an older round.
`readJournal` and durable `persistJournal` retain independent local provenance
and uncertain publication evidence outside the uploaded tree. Existing asset
hashes are verified and reused. Mobile feedback advances do not trigger release
rewrite. See PC_RELEASE_FEED.md for recovery and reconciliation limits.

`importOnce` separately requires canonical merge approval, obtains the exact
private branch commit/state through `readPinnedReviewState`, and passes the
pinned commit plus complete state hash to the configured transaction. The
transaction independently loads canonical data and trusted PC baseline under
the declared PC-wide writer barrier. Its `unchanged` result means no file write;
the pipeline exposes `conflict` or `blocked` when that result contains such
review outcomes. A mixed batch retains per-operation outcomes in `proposal`;
only accepted proposals are committed, while conflicting posts remain intact.
Decisions/checks remain in additive `mobileImport.decisionRecords`, separate
from canonical scores/memos. A publication approval is never a posting call.

`pc/github-transport.mjs` is a fixed `https://api.github.com` transport, requiring
an injected approved token provider. It neither acquires nor stores tokens.
Selected-repo paths, exact-SHA comparison, hashed PNG/state trees, single-parent
commits and non-force refs are the only routes. Exact JSON wire bytes are captured
and validated before awaiting credentials; mutation/toJSON cannot bypass gates.
Redirects, size excesses, malformed responses and unauthorized paths fail;
403/429/rate exhaustion applies cooldown without retry. Credential/response
error text is sanitized. The pinned reader checks private owner/name/numeric ID,
non-default branch, exact commit and state Git blob SHA before returning data.

## What is still required after permission

The callable algorithm and synthetic wiring are prepared. It is **not yet only
repository settings plus a device test**: actual PC binding is undeployed.
Activation still requires a reviewed approved credential provider, coherent
read-only PC snapshot paths/store and durable journal/lock binding. Canonical
merge additionally needs a shared writer adapter covering ALL desktop saves
and round activation. The existing desktop private queue does not use this new
barrier; a standalone filesystem lock does not protect against it. Generic
transactions reject activation without the explicit all-writers/round contract.
PC source changes, any actual rating binding and scheduling are outside this task.
No new API/data change is required remotely; canonical JSON adds `mobileImport`
receipts/revisions/separate decisions and preserves its original0.3.16 fields.

After those bindings and approvals are reviewed, perform real Android install,
native Keystore/login/TLS, small private supply/review/conflict/reconnect pilot,
and separately approved canonical merge/backup/recovery checks. No actual
platform publication follows. No such action was executed here.

## Synthetic proof

`test/pc-review-pipeline.test.mjs` runs the actual producer and adapters through
an in-memory Git object/ref model and mocked Fetch Responses. It writes only new
marked synthetic temporary fixtures. It verifies complete-round supply, mobile
review, atomic canonical commit, repeated import deduplication, lost mobile
acknowledgement, independent PC conflict preservation and blank new-round scores.
It does not establish actual authentication, device execution or live syncing.
