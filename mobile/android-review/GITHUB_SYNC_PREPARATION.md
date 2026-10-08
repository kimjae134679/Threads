# GitHub synchronization preparation

Superseded current implementation status: APK 0.1.2 bundles the GitHub adapter and
native device-flow/HTTPS/Keystore preparation. Both activation approvals remain
false; public client/repository identifiers are unset; no actual registration,
authentication/key/token/grant/upload/sync has occurred.

A dedicated NEW private review-data repository separate from bridge/PC command
repositories is mandatory. Contents permission is repository-wide. A separate
branch inside a bridge repo is not acceptable.

See [CONNECTION_ACTIVATION.md](CONNECTION_ACTIVATION.md) for the exact user approval
steps, implemented native paths, token protection, disabled current build and
verification limits. See [SERVICE_CONTRACT.md](SERVICE_CONTRACT.md) for ID/version/
round/criteria/operationId/revision rules and [PC_EXCHANGE.md](PC_EXCHANGE.md) for
fixture-only read-only exports and proposal-only feedback imports.

Officially verified route: GitHub App user device flow plus device-origin refresh
without embedding client secret, selected dedicated repo Contents read/write and
Metadata read. Git data pinned snapshots + preserved base_tree + single-parent
commits + force:false keep concurrent publisher/reviewer changes from overwriting.
Durable operation request/hash/result permit retry and PC provenance verification.
Images are private Git blobs validated by SHA256/full PNG signature. Small state
limit is8MiB; >1MB Contents metadata selects the exact pinned Git blob;
assets25MiB; capacity overflow blocks instead of pruning IDs.
New outputVersion/round is blank; previous reviews/history retained separately.

GitHub is practical for a small personal pilot without a separate paid backend.
It still needs app registration/selected-repo installation/user consent, native
runtime verification, dedicated private publisher and approved PC merging.
An existing approved HTTPS service would fit the client contract directly with
narrow review-only access; none has been verified here. No unlimited/free/realtime
hosting claim is made. API rate limiting preserves queued work and backs off.

Sources: [device flow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app),
[refresh secret exemption](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens),
[Contents](https://docs.github.com/en/rest/repos/contents), [trees](https://docs.github.com/en/rest/git/trees),
[refs](https://docs.github.com/en/rest/git/refs), [blobs](https://docs.github.com/en/rest/git/blobs),
[rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).
