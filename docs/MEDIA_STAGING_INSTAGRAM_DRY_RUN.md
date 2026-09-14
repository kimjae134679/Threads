# Media staging + Instagram Feed/Carousel dry-run

Updated: 2026-09-15 KST

This layer prepares approved 1080×1080 rendered images for a future official Instagram Feed/Carousel connector. It does **not** publish and does not claim that Meta can reach a configured URL until an actual official-provider validation observes that fetch.

## Safety boundary

The publishing chain remains:

`01 DISCOVERY -> 02 EDITORIAL_SCORING -> 03 PRODUCTION -> 04 REVIEW_PUBLISH -> 05 EXPERIMENTS_ACCOUNTS`

Only 04 may initiate publication. Staging does not clear rights, privacy, moderation, OCR, safety or human-approval gates.

## Staging configuration

`media-staging.mjs` uses two operator settings:

- `PUBLIC_MEDIA_BASE_URL`: a public HTTPS origin that will serve staged media, for example `https://media.example.com`.
- `MEDIA_STAGING_ENABLED=1`: separate explicit enable switch.

Capability states:

- `public-origin-required`: no valid public HTTPS origin is configured.
- `live-disabled`: origin is configured but staging is not enabled.
- `ready-to-validate`: origin + explicit enable switch are present.

A configured origin alone is **not reachability proof**. Returned assets remain `staged-unverified` and `externalReachabilityVerified:false`.

Staging accepts only PNG/JPEG/WebP base64 data URLs, at most 10 assets, at most 5 MiB each. Server-generated UUID filenames are used; arbitrary local filesystem paths are never accepted.

Each staged image is bound to the exact approved candidate revision that produced it. The server writes a private sidecar metadata record containing the staged UUID, candidate id, `publishApproval.basisUpdatedAt`, media index/type/size and staging time. Before Instagram dry-run, the server reopens that metadata and requires both candidate id and approval basis to match the currently approved candidate. Therefore:

- a different candidate cannot reuse another candidate's staged URL;
- editing and re-approving a candidate invalidates reuse of an older staged render;
- missing or mismatched staging metadata fails closed;
- public media responses never expose the private sidecar metadata.

This binding is separate from external reachability. An approval-bound staged asset can still be `staged-unverified` until an official provider actually fetches/validates it.

## Instagram dry-run configuration

`instagram.mjs` intentionally refuses to guess a current Graph API version or permission list. The operator must explicitly provide:

- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_USER_ID`
- `INSTAGRAM_GRAPH_API_VERSION` in `vN.N` form
- `INSTAGRAM_REQUIRED_SCOPES`

`INSTAGRAM_MEDIA_LIVE_ENABLED=1` is a separate future live-validation switch.

Capability states:

- `credential-required`
- `live-disabled`
- `ready-to-validate`

The current implementation is dry-run only: `livePublishImplemented:false`. It creates a request plan for one IMAGE or up to 10 CAROUSEL images and records `externalCalls:0`. No upstream publication call is made.

## Provider URL and approval-binding rule

Instagram dry-run media URLs must pass the staged-media checks:

- origin must exactly match `PUBLIC_MEDIA_BASE_URL`;
- path must be `/media/staged/<server-generated-uuid>.<png|jpg|webp>`;
- no query or fragment is accepted;
- the staged asset must still exist together with its private sidecar metadata;
- metadata candidate id must equal the current candidate id;
- metadata approval basis must equal the current `publishApproval.basisUpdatedAt`.

This prevents a dry-run from silently switching to arbitrary third-party media URLs, another candidate's output, or an image rendered before the most recent approval.

## Current server integration

`server.mjs` delegates the bounded media routes through `media-publish-routes.mjs`:

- `GET /api/media-staging/capabilities`
- `POST /api/media-staging/stage`
- `GET /media/staged/<server-generated-id>`
- `GET /api/instagram/media/capabilities`
- `POST /api/instagram/media/dry-run`

Both staging and Instagram dry-run require the existing full `validateApprovedCandidate()` gate. The dry-run reports `publicationOwner: 04_REVIEW_PUBLISH` and `livePublicationAttempted:false`. No staging action or dry-run is allowed to trigger a publication endpoint.

## Remaining validation

The Node server regression covers approved stage -> bounded GET -> Instagram dry-run, foreign-origin rejection, stale human approval rejection, different-candidate reuse rejection and old-render reuse after a newly approved revision. A fresh Chrome E2E of the staging/dry-run UI path is still required when the authorized Windows browser machine is online. No browser result or real Instagram provider fetch should be inferred from the server tests.
