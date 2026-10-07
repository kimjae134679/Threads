# Android review0.1.2 validation — preparation, not live sync

Verified PC0.3.16 baseline887eb1abffa378f7d7156bc8d0ecdb7126316686 is reused.
Worktree/branch: mobile-worktree / codex/android-review-20261008. This task edits
only mobile/android-review. PC originals, actual evaluations, source checkout,
bridge services/queues and concurrent reproduction were not changed.

## Evidence

- Same desktop outputVersion formula and rendering/image hashes; version/round/
  criteria/revision isolation; stable requestHash+operationId replay; offline
  IndexedDB queue; explicit conflict rebase; approval decision separate from posting.
- Native official device-flow controller tested by JVM mock endpoint/vault/clock;
  no AndroidKeyStore, real token or network executed. Tests include cancellation
  during device response, token response and protected save, expiry/slow_down,
  refresh/denial/logout and approval-before-any-call. Activity callbacks bind to
  individual attempts; token values never cross to WebView.
- Native Java compiled with installed SDK36/JDK21. AES/GCM AndroidKeyStore code
  protects a no-backup atomic file; key generation is lazy after approved verified
  login. Current approvalflagsfalse/IDsunset mean no such action can run.
- PC exchange fixtures verify read-only0.3.16 store, new explicit outputs, physical
  PNG hashes/Git blob SHAs, versioned history, independent PC-local provenance
  snapshot, request hashes/replay receipts, stale/conflict detection and proposals
  only. A junction path could initially overlap source; independent review found
  it, regression reproduced, physical path guard now refuses it with zero writes.
- Fresh synthetic packaged UI at390/800 checks ten scores/memo/checks/approval
  dialog, reload persistence, conflict records/rebase, new-version blank score,
  no overflow, and0.1.2 disconnected connection readiness. Screenshot and JSON
  evidence use only synthetic assets/reviews. Native screen execution is untested.
- Installed SDK tools aapt/javac/d8/zipalign/apksigner build without installs or
  downloads. Existing debug key reused; no signing key created. Final0.1.2 APK
  versionCode3, minAPI26/targetSDK36, v2/v3 signatures verified. Only ordinary
  INTERNET permission; backup/debug/cleartext false, ConnectionActivity notexported.
- APK inspection confirms only manifest/UIassets/dex/signature metadata; mock
  auth strings/tests/PCfixtures absent, native/GitHub readiness code packaged.
- Test totals, artifact sizes/SHA256 and remote commit are recorded in the final
  delivery receipt after full verification. Earlier0.1.1 evidence is superseded.

## Explicit boundaries

No real dedicated repo/App registration, install/grant, official authentication,
access/refresh token, Android wrapping key or actual data upload was created.
No actual Android device/AVD is available, so installation/native UI/Keystore/TLS/
real GitHub login/download/feedback sync are unverified. No PCcanonical merge,
learning/reproduction feedback application or publishing executed.

Current ConnectionConfig disables both approvals and lacks public IDs. A NEW
private review-data repo separate from ALL bridge/command repos, private GitHub
App selected-repo install and user device consent are required. Contents write
is repo-wide. See CONNECTION_ACTIVATION.md for exact approvals, then configure
public IDs, rebuild and test the approved actual connection. PC imports remain
reviewable proposals; canonical merging requires separately approved transaction.

Only code/mock/tests/docs may be pushed to the existing Threads code branch.
APK/source delivered privately to the same Library file identities, without
original materials, actual evaluations or credentials. No public APK release.
Windows POSIX xattrs unavailable; private sidecars preserve returned identities.
Temporary loopback UI server and own isolated Chrome profiles stopped after QA.
## Final local verification

Fresh combined suite: 75/75 passed (29 mobile/native mock tests, 24 PC exchange,
20 PC publisher and 2 desktop baseline suites). Mobile JS syntax checks and
scoped Git whitespace checks passed. Independent native and PC publisher
review found no remaining Critical/Important issue after regression fixes.
APK: 37,394 bytes; SHA256
`e4ff01cfdfd08ebd6d1acb31818f60f87a5574f1b9af83f966cb59596f0cc77b`.
The source ZIP is separately extracted and tested before private delivery;
its result and the final source/remote commit are recorded in the delivery receipt.
