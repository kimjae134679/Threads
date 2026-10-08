# 0.1.4 internal scale and UX verification

This is an internal verification build, not a connected final delivery. Actual
Internet review synchronization remains blocked. Both native activation approvals
remain false, public IDs are unset, and no login, token/key generation, repository
or App registration, grant, user-data upload, scheduler or actual publishing ran.
Do not ask the user to install this as a working connected replacement.

Only common modules from confirmed PC source
`865afa8111213049dd0abeac1a1ca182712e1435` were selected after initially verifying
`720978d1f58baf5ce3278ed6223426f6f9e005e1`. The final APK-common adapter/limits
are unchanged between those two confirmed commits; the source bundle also
includes the final short-lock snapshot binding and explicit default-off runner.
The PC source branch's later unconfirmed head was not used. Installed PC viewer, original materials and
actual review files were not modified or used for these tests. Parent reports
that the PC integration worker separately validated 365 posts, 3,073 images and
1,806,272-byte state; this worker reproduces that size with synthetic data only.
Remote review schema1 and the verified0.3.16/0.3.18/0.3.19 evaluation contracts
are unchanged. A public `connectionAvailable` flag distinguishes configured login
availability from a saved authenticated session; it carries no credential.

## Implemented behavior

- State over1MB is fetched using the exact pinned Git blob, with byte length,
  SHA1 and schema checks; the bounded state limit is8MiB.
- Base64 alphabet/padding checks avoid recursive-regex stack overflow. Bounded
  wrapped base64 is normalized and then checked against exact encoded/decoded
  limits. Individual PNGs remain25MiB; export aggregate is capped at1GiB.
- Native bridge and HTTP admit bounded state-only JSON writes. Other native
requests retain1.1MB limits. Bounded responses allow40MiB including JSON-escaped
line wrapping for a maximum25MiB PNG. No broader route, host, TLS or permission access.
- List refresh downloads no images. Only visible pages of the selected post
  request verified images, at most two at a time, with hash cache/coalescing and
  retired-selection protection. Rating controls are built without image awaits.
- Local rating, memo, criteria and decision save durably before automatic
  transmission is requested. Queue replay, response-loss deduplication, explicit
  conflict and blank new output versions are preserved. "Server saved" means the
  remote ledger acknowledged an operation; it is not a PC canonical-import ack.
- Compact plain Korean onboarding, no manual repository/address/file input, no
  fake disabled login. A login action appears only for approved configured login
  without a saved session, including when cached posts exist. Approved successful
  login returns automatically and requests refresh. Technical details collapse.
- Native root owns system bars/cutouts/keyboard insets without accumulating or
  double padding; light/dark themes and bar icon appearances are explicit.

## Evidence and limits

Reproducible synthetic fixture: `test/scale-fixture.mjs`; scale contracts:
`test/scale-contract.test.mjs`; whole-collection browser interaction:
`test/scale-browser-qa.mjs`; exact state/PNG boundary regression:
`../../test/base64-boundary.test.mjs`; native JVM mocks:
`test/native-bounds.test.mjs`, `test/native-window.test.mjs` and
`test/native-auth.test.mjs`. Browser QA uses the installed Chrome with private CDP
pipes and owned loopback-only fixture servers. It does not verify an Android
device, native screen, Keystore, actual TLS/login or live online PC synchronization.

Synthetic365-post actual UI saves, persisted queue reload, search/category counts,
selection retirement, conflict and blank new version are checked. Screenshots
cover390/800px and light/dark onboarding; no horizontal overflow. The private
delivery ZIP contains machine-readable final counts/timings, logs and synthetic
screenshots; original user data and credentials are absent. APK bundle bytes are
checked against the tested assets, existing signing identity is reused, and
extracted source tests are rerun before same-identity Library replacement.

Final source/browser measurements:365 unique posts,3,073 unique assets and exact
1,806,272-byte ledger; initial manifest refresh fetched zero images. Source Chrome
seed/list129ms, controls14ms,365 actual UI saves27.388s; five image requests across
navigation, maximum two simultaneous; minimum tested text contrast6.18:1.
These are one desktop synthetic run, not Android performance guarantees. A revoked
stored-session401 fixture preserved the complete cache/queue and exposed the
configured connection-management action. The exact bundled asset harness also
passed. Final mobile+runner201/201 and final PC regression17/17 passed; earlier
full project check passed88 suites before adding the final runner. Independent
reviews found and resolved wrapped-base64 bounds, inaccessible re-login and
incorrect PC-ack wording. No remaining Critical/Important in reviewed scopes.

Actual connection still requires separately approved dedicated private review
repository/private App selected-repository grant, official user consent, public
configuration and approved PC credential provider. Real device and separately
approved canonical merge/backup/recovery pilots remain pending. Final PC binding
captures coherent immutable scratch snapshots with short canonical checks and
keeps network awaits outside the source writer. Parent's365/3073 full mock run
used the prior lock implementation; final short-lock behavior has separate
regression/package validation. This Android task reruns final binding/runner
regressions with synthetic data, not the actual full PC collection. No scheduler
was deployed. Legacy
unknown guards remain preserved, and arbitrary Windows power-loss durability is
not established by process-crash tests.
