# Private GitHub synchronization: preparation only

Official documentation checked 2026-10-08. No app registration, key/token
creation, app installation, permission grant, actual data upload, or real
GitHub authentication/API synchronization was performed. APK 0.1.1 is unchanged
and disconnected. This new adapter is source-only and excluded by
`build-assets.mjs`.

## Feasibility and authentication

A small personal review feed can use an already authorized owner-controlled
private GitHub repository without a separate hosted review server. This is an
engineering inference from documented device-flow and Git database APIs;
it is not proof of a deployed connection.

Prefer a private **GitHub App** enabled for device flow. The user signs in at
`https://github.com/login/device` in an external official browser and explicitly
authorizes the app. Device authorization/token exchange uses the public client
ID without a client secret. Official refresh-token documentation also exempts
tokens originally issued by device flow from requiring a client secret. Leave
expiring user tokens enabled. Handle server polling interval, pending/slow_down,
expiry, denial and logout/revocation. No connector, bridge, plugin or developer
shell token may substitute for the user's new app-specific authorization.

GitHub App user access is the intersection of user rights, app permissions and
installed repositories. Select only the approved existing private repository,
with Contents read/write and required Metadata read. No email, organization
administration, Actions, Workflows, webhooks or other repositories are needed.
These Git REST APIs accept GitHub App user tokens. No installation-token JWT,
private key, client secret, callback server or webhook server is used by this
proposed user-token-only flow. Registration itself is a separate pending action.

**Contents write is repository-wide**, not scoped to one branch/directory.
The adapter's allowlist does not change GitHub's permission boundary. If the
chosen repository also contains sensitive bridge material, the user must
assess that access before installation. Do not use bridge branches, queues,
service configuration or secrets. OAuth App `repo` scope is less appropriate
because it grants broad public/private repository access and more capabilities.

Sources: [GitHub App user tokens and device flow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app),
[refreshing device-flow tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens),
[private app registration](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app),
[OAuth scope breadth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps).

## Prepared adapter and atomic contract

`app/github-adapter.js` exports `createGithubAdapter`, supplying `request(path,
init)` and `downloadAsset(image)` for the existing `syncReviews` client.
There is **no fetch, native authentication/token storage or real configuration**
in this module. It accepts an injected native authenticated JSON HTTPS `api`.
That future transport takes API-relative paths and `{method, body:object}`,
resolves only to `https://api.github.com`, sets `Accept: application/vnd.github+json`
and a supported `X-GitHub-Api-Version`, adds the user token in native memory,
rejects redirects, bounds response size/time, and throws sanitized errors with
numeric `status`. Rate-limit backoff belongs outside this adapter. Native
auth/storage/transport remains to be implemented and reviewed before activation.
Credentials must never enter WebView JS, IndexedDB, localStorage, URLs, logs,
source, APK or Library. Eventual native token storage needs Android
Keystore-backed protection, rotation and deletion on logout.

Configuration requires `approved:true`, explicit owner/repository and positive
numeric repository ID, plus an existing isolated `mobile-review/<name>` branch.
Default is disabled. Each snapshot/asset read checks returned repository
identity, private visibility and that the chosen branch is not the default.
No bridge/default/public-repository fallback exists. Keep the repository private
throughout operation; metadata checking cannot prevent an administrator from
changing visibility after a check.

Atomic file: `mobile-review/state.json`, containing:

- `githubReviewSchema:1`
- `manifest`: the exact object described in `SERVICE_CONTRACT.md`
- `assets`: map from `/v1/review/assets/<sha256>.png` to `{blobSha,sha256}`
- `operations`: map from operationId to `{requestHash,result}`; requestHash is
  SHA256 of the complete request with recursively sorted object keys, result is
  its original terminal response.

The producer must physically commit immutable PNGs at
`mobile-review/assets/<sha256>.png`. A SHA in JSON alone does not keep a Git blob
reachable. It must use the verified desktop outputVersion formula and preserve
versioned review history and deduplication records. Producer and reviewer must
both use the same isolated branch and non-force single-parent transactions.
Never force-push, reset or delete that history for ordinary synchronization.

Read branch commit SHA, its tree, and state with Contents API `ref` pinned to
that SHA. Download registered immutable blobs through the private API, never
`download_url`/raw URLs. Check SHA256, full PNG signature and the existing 25 MiB
image limit. State cap is 1,000,000 UTF-8 bytes to remain in the Contents API's
fully supported small-file range. Overflow fails closed and requires explicit
archive/sharding design; do not silently remove old operation IDs.

For queued operations, check existing operationId/requestHash first: a lost
acknowledgement still returns duplicate after a new release. Reject reused IDs
with different content. Then check ID+outputVersion+reviewRound, criteriaVersion,
baseRevision and review fields. Save the review and terminal result in one
blob/tree/commit, whose single parent is the read snapshot commit. Preserve
`base_tree`; alter only state path. Advance the branch with `force:false`.
A sibling commit after another reviewer/producer advances the branch cannot
fast-forward. Reload and re-evaluate instead of overwriting. At most three
attempts; 409/422 retries require a demonstrably advanced branch. Authorization,
validation/spam/rate-limit and unknown/lost responses receive no blind retry or
acknowledgement. Failed attempts may leave unreferenced Git objects; only the
successfully advanced branch is canonical.

Applied, stale and conflict results remain durable for idempotency. New
outputVersion/round must start with `review:null,revision:0`; changed criteria
invalidate pending old checks. Producer must preserve operations and archive
old reviews, never relabel them as fresh. No publishing endpoint exists;
`publish_approved` is a human review decision only.

Sources: [Contents pinned refs and size limits](https://docs.github.com/en/rest/repos/contents),
[tree base preservation](https://docs.github.com/en/rest/git/trees),
[Git commits](https://docs.github.com/en/rest/git/commits),
[non-force references](https://docs.github.com/en/rest/git/refs),
[private blob APIs](https://docs.github.com/en/rest/git/blobs).

## Exact pending setup and user approvals

Proposed for parent approval; none executed:

1. Identify the already-owned, approved private repository and numeric ID.
   Approve independent `mobile-review/data` branch/namespace for hashed releases,
   assets and versioned reviews. No relay branch/queues, original sources or
   PC evaluation files are changed by this task.
2. Authorize one private GitHub App registration on the user's own account,
   Only on this account, Device Flow on, expiring tokens on, webhooks off.
   Approve installation on **only that selected repository**, acknowledging
   repo-wide Contents read/write and Metadata read. The chosen flow needs no
   private-key/client-secret generation or retrieval.
3. After implementing/reviewing native auth/Keystore/HTTPS transport, user
   personally completes official device login and app approval, issuing fresh
   app-specific access/refresh tokens. Approve protected on-device storage and
   rotation; never ask for tokens in chat. Network hosts are GitHub API and
   official GitHub login only.
4. Approve the first private release/asset/evaluation pilot upload; test actual
   Android login, download, offline edits, reconnect and conflicts. Add/test
   a PC export/import adapter against 0.3.16 separately. This code has not updated
   PC canonical ratings or connected feedback to learning/reproduction.
   Actual posting remains disabled and needs separate user approval.

If an existing approved GitHub App fits, verify it rather than registering
another. None is verified now. Existing repository authorization alone does
not authorize app registration, token issuance or new app grants under this
task's current no-credential-creation scope.

## Comparison and limits

| Choice | Useful here | Remaining complexity |
| --- | --- | --- |
| Private GitHub + device flow | Existing private storage, immutable assets/history; no separately hosted backend | App installation/consent, native token lifecycle, multi-call Git transactions, throughput/state growth limits, PC export/import |
| Existing approved HTTPS service | Directly fits current client contract; narrow review-only access/database CAS possible | Must actually exist with approved user auth, versioned assets and PC integration |

GitHub is reasonable for a modest personal pilot; a purpose-built service fits
more reviewers, updates and asset traffic better. GitHub has primary/secondary
rate limits including content creation limits. The adapter preserves pending
work on rate limiting. Production needs serialized/backed-off synchronization,
bounded asset downloads, conditional foreground polling and archival. Do not
promise unlimited/free hosting or background realtime delivery.
[Official rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

## Verification boundary

`test/github.test.mjs` uses an in-memory synthetic REST fixture only. It covers
disabled/public/wrong-ID/default/bridge rejection; pinned reads and PNG integrity;
stable duplicate/changed-ID payload rejection; lost ref response through the
existing sync client; concurrent producer/reviewer races; stale round/criteria;
explicit conflict; bounded retry; 401/422 handling; corrupt/oversized state.
No real GitHub authentication/API sync, Android installation, learning or posting
was tested. Existing preparation APK 0.1.1 is unchanged and still blocked.
