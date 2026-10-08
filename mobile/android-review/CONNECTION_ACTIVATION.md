# APK 0.1.2 connection readiness and exact approval boundary

The implementation now includes native device-flow screen/controller, official
host HTTPS transport, AndroidKeyStore AES/GCM token vault, credential-free local
page bridge, GitHub versioned review adapter, and local PC export/import proposal
modules. This describes implemented preparation code, not real synchronization.
`ConnectionConfig` approvals are both false, app/repository IDs empty, and login
disabled. The APK creates no authentication request or vault key while inactive.
No repository/app/key/token/permission/upload was created or executed here.

## Dedicated private repository is mandatory

Create/approve a NEW dedicated private review-data repository on the user's own
account. It must be separate from every bridge/relay/PC command repository.
Do not reuse a bridge repository, even with a separate branch: Contents write
is repository-wide. Source stays on the existing approved Threads code branch;
private post assets/evaluations belong only in the dedicated review-data repo.

User must separately authorize these exact actions before activation:

1. Create that dedicated private repository and independent `mobile-review/data`
   branch containing review state and immutable hashed PNGs. Leave it private.
2. Register a private GitHub App, Only on this account; Enable Device Flow;
   expiring user tokens on; webhook off. Install only on the dedicated repository
   with Contents read/write plus required Metadata read. No other repo, email,
   account/admin, Actions, Workflows or publishing permissions.
3. Approve official GitHub device login and issuance/rotation of the user's
   app-specific expiring access/refresh tokens, and their encrypted storage on
   the user's Android device. A new AndroidKeyStore wrapping key is created lazily
   only after approved login and dedicated repository verification; this future
   key creation also needs that explicit approval. No app private key/client
   secret is needed for device flow or device-origin refresh.
4. Approve first PRIVATE review release/evaluation upload and Android online
   pilot. Approve PC canonical merging separately after reviewing import proposals.
   None of these approvals imply actual platform posting.

Do not ask the user to paste tokens/keys. After approval, configure only PUBLIC
`CLIENT_ID`, owner/repo/numeric ID and approval flags in `ConnectionConfig`,
then rebuild with the existing signing identity and deliver the approved build. Use build.ps1 -ApprovedPublicConfig with a private local-connection.json file (ignored by Git); do not edit/push actual public repository configuration into source. The build rejects credential fields and bridge/command repository exclusions. Required public fields are clientId, owner, repo, repositoryId, branch:mobile-review/data, activationApproved:true, dedicatedRepositoryApproved:true, excludedRepositories:[exact bridge/command repo identities]. No such approved config was supplied or compiled in this task.
The user personally completes `https://github.com/login/device` in the system
browser. Current 0.1.2 deliberately cannot activate merely by pressing a button.

## Native implementation and limits

- `DeviceFlowController`: injected endpoint/vault/clock/verifier; bounded server
  intervals, pending/slow_down/expiry/denial, generation-bound cancellation,
  expiring tokens and refresh without client secret; no token returned to JS.
- `ConnectionActivity`: disabled/prepared state now; official external browser
  after approval, per-attempt callback identity, cancel/logout. Local logout
  removes encrypted tokens/key; GitHub app consent revocation is in GitHub settings.
- `AndroidTokenVault`: app-private no-backup atomic file, AES256/GCM, random IV,
  profile-bound associated data, non-exportable AndroidKeyStore key. Constructor
  does not generate a key. Missing/corrupt key or storage errors require login;
  no plaintext fallback. Hardware backing depends on the actual device and was
  not tested. No real vault was executed by the JVM tests.
- `GithubHttp`: only github.com device/token paths and api.github.com selected
  repo paths, normal TLS checks, no redirects/logs, response/request bounds,
  timeouts, 403/429/remaining-zero cooldown using Retry-After/reset headers.
- `ReviewNativeBridge`: packaged local pages only, no remote frame/navigation;
  token/auth/config mutation APIs not exposed. The API method returns review
  data or sanitized failure. Git writes narrow to one ledger path, isolated ref
  and `force:false`. Config defaults cannot access any repository.
- `native-api.js`/`github-adapter.js`: now bundled, inactive until approved native
  config and protected session exist. Existing offline queue/revision/conflict
  logic reused. Real asset/login/online verification is still pending.

PC export/import is a separate local adapter with read-only 0.3.16/0.3.18 store and
new explicit output paths. Imports produce proposals plus separate checks and
human decision records; they never call PC save or publish. See `PC_EXCHANGE.md`
for trusted-local-baseline requirements, history, stale/conflict and receipt rules.
Publish/export and mobile review must advance the dedicated Git branch with
non-force transactions. A PC release publisher is prepared with an injected API and synthetic tests; no live publisher/import scheduler was deployed here.

The remaining callable PC wiring is now prepared: completed active-round selection,
verified content-hash incremental supply, durable publication recovery, pinned
transport and atomic canonical feedback transaction with exact-byte backup and
receipts/decisions in the same JSON commit. The isolated PC0.3.18 source copy now
includes shared writer hooks and `pc-binding.mjs` for explicit paths/store,
durable journal and validated intake proof. It remains default-off, creates no
scheduler and is not installed in the actual PC application. See PC_PIPELINE.md,
PC_0318_BINDING.md, PC_RELEASE_FEED.md and PC_FEEDBACK_TRANSACTION.md.
Real activation still needs an approved credential provider, explicit actual
configuration, source deployment and separately approved device/online/canonical
pilots. No original ratings were merged or actual canonical caller deployed.

## Verification distinction

JVM auth tests use fake endpoints, fake token strings and an in-memory vault;
they never call AndroidKeyStore, GitHub, or generate an authentication token/key.
Native Android classes compile with installed SDK36/JDK21. Synthetic browser QA
checks packaged review UI/IndexedDB at390/800, including truthful connection
readiness. APK is signed with the pre-existing debug key. There is no connected
Android device/AVD image, so native screen execution/real Keystore/TLS/login and
actual online sync are unverified. Do not present code/mock/build as those tests.

Sources: [GitHub App device authorization](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app),
[device-origin refresh](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens),
[GitHub App registration](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app),
[non-force Git updates](https://docs.github.com/en/rest/git/refs),
[Android Keystore](https://developer.android.com/privacy-and-security/keystore),
[AES/GCM parameter specification](https://developer.android.com/reference/android/security/keystore/KeyGenParameterSpec).
