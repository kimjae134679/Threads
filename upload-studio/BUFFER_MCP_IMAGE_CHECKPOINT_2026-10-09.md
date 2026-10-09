# Buffer MCP image delivery checkpoint — 2026-10-10 (KST)

Observed provider snapshot: 2026-10-10 around 03:06 KST. Results below describe that checkpoint, not a continuous live monitor.

Role: 04_REVIEW_PUBLISH. This is an operational checkpoint, not a completed live image integration.

## Observed results

- The connected Buffer MCP exposes list, get, create and edit post tools.
- One authorized text-only test draft was created and then independently fetched. The provider returned draft, null dueAt, null sentAt and an empty assets list.
- A complete list_posts read for the selected two channels returned only that test draft, with hasNextPage=false. No existing post media URL was available in that snapshot.
- The test draft is excluded from publication and refill. Its ID and exact text remain in the private task result, not this public repository.
- Buffer schema introspection exposes ImageAssetInput.url and ordered AssetInput entries. No upload mutation was exposed.
- The official hosting guide explicitly states that there is no API file upload endpoint. Media URLs must be direct, public, unauthenticated and stable through publication.
- upload-studio/local-assets.mjs stores original bytes locally by SHA-256. production-input.mjs imports ordered manifest images after checking their hashes and production version.
- upload-studio/BUFFER_CONTRACT.md describes an offline adapter. MCP account connection does not enable the local application's send routes.

## Execution blockers

The local execution tool failed during process setup. The authorized Desktop Commander connector reported its monthly usage limit and explicitly instructed no retry or reconnect. No PC directory, local manifest, image bytes, existing storage configuration or current local branch was successfully read in this checkpoint.

The review task read also failed, so the actual frozen approved-version handoff has not been received. Generated output, historical scores, imported files and offline preview approval must not be substituted for the user's current exact-version pass.

No image upload, new host, bucket, key, security change, public reservation, public publication or recurring executor was performed. Existing hosting availability is unknown; it was not proved absent.

## Supported next transfer

### One private image test without creating a host

The account owner can open the already-created test draft under the correct Threads channel in Buffer Publish > Drafts, choose Edit, attach the existing finished item's images from the PC in their exact original order, and select Save as Draft without setting a time or adding to queue.

Target: the existing Buffer test draft. No duplicate draft is needed. Cost: no new hosting subscription or plan change is requested; the operation uses the existing Buffer account. Disclosure: selected files are transferred to and stored by Buffer. Draft status prevents social publication; it is not a guarantee that every CDN file URL requires authentication.

After the save, get_post must verify the same ID, draft status, unchanged exact text, null dueAt/sentAt, expected media count and order. A provider media reference alone does not establish byte equality; the approved manifest hashes and source bytes still need verification before public delivery.

### API delivery for approved production versions

Use an existing explicitly approved stable HTTPS media destination if one can be verified. Otherwise the user must approve the precise storage account, destination/prefix, selected files, retention, public URL access and costs before any new hosting or permissions are created. Anyone with a public media URL can retrieve its bytes. Do not expose original input, review records or unrelated images. Signed URLs that may expire before publication and share/preview pages are unsuitable.

No storage vendor or paid plan has been selected in this checkpoint.

## Required live handoff and verification

Receive the actual review producer contract before implementing its parser. Minimum information to agree with that producer includes the existing item ID, immutable production/review version, explicit current user pass, exact platform caption/tags, ordered image hashes and file references, destination channel and a fingerprint covering the approved content. These are integration requirements, not a claim that a new schema has already been accepted.

Changed text, hashtags, image bytes or image order requires review again. Unreviewed, changed, rejected and discarded items remain held. Do not auto-approve the collection.

Use Asia/Seoul slots every 30 minutes, per platform, within [08:00,11:00), [12:00,14:00), [17:00,21:00). This yields 18 candidate slots per day per platform. Exclude past and occupied slots, fetch every provider page, respect the account's actual capacity and request budget, and retain remaining passed versions in order. A schedule is not evidence of publication.

Persist a reservation and duplicate fence before a write. Unknown outcomes require reconciliation by provider reads, not a second create. Retry only explicitly failed operations after a duplicate check and with a bounded policy. Record provider ID, scheduled/sent/error status, verified external link and sanitized failure cause. Never journal credentials or complete private captions in this public repository.

## Verification boundaries

This checkpoint changes documentation only. No local code or producer data was modified. Local HEAD/origin equality and a clean PC worktree cannot be verified while PC access is unavailable. The GitHub commit and workflow status are checked separately after the documentation write; do not claim tests passed before those results exist.

## Official references

- https://developers.buffer.com/guides/hosting-media.html
- https://developers.buffer.com/examples/create-image-post.html
- https://support.buffer.com/articles/attaching-images-videos-and-other-media-to-your-posts-eudySt0TnS
- https://support.buffer.com/articles/saving-and-scheduling-draft-posts-CBLXg1yFXp
