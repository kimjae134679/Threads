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

No image upload, key creation, security change, public reservation, public publication or recurring executor was performed by this task. The later authorized Cloudinary connection is now verified below.

## Supported next transfer

### One private image test without creating a host

The account owner can open the already-created test draft under the correct Threads channel in Buffer Publish > Drafts, choose Edit, attach the existing finished item's images from the PC in their exact original order, and select Save as Draft without setting a time or adding to queue.

Target: the existing Buffer test draft. No duplicate draft is needed. Cost: no new hosting subscription or plan change is requested; the operation uses the existing Buffer account. Disclosure: selected files are transferred to and stored by Buffer. Draft status prevents social publication; it is not a guarantee that every CDN file URL requires authentication.

After the save, get_post must verify the same ID, draft status, unchanged exact text, null dueAt/sentAt, expected media count and order. A provider media reference alone does not establish byte equality; the approved manifest hashes and source bytes still need verification before public delivery.

### API delivery for approved production versions

Use an existing explicitly approved stable HTTPS media destination if one can be verified. Otherwise the user must approve the precise storage account, destination/prefix, selected files, retention, public URL access and costs before any new hosting or permissions are created. Anyone with a public media URL can retrieve its bytes. Do not expose original input, review records or unrelated images. Signed URLs that may expire before publication and share/preview pages are unsuitable.

The user subsequently selected and explicitly authorized Cloudinary Free for one finished test item and the exact image versions personally passed in review. Paid plans, billing changes, source text, review records and unreviewed material remain excluded.

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

## Cloudinary connection verified — 2026-10-10 KST

The user explicitly authorized Cloudinary Free storage and public URL delivery for the existing finished test item and exact image versions personally passed in review. Paid plans, billing changes, original inputs, review records and unreviewed material remain excluded. No further authorization is needed for this agreed scope.

The official Cloudinary plugin is now exposed in this session. Read-only get_usage_details succeeded and reported Free with a 25-credit limit. Its zero usage/resource figures were last updated on 2026-10-08, so they do not establish current storage emptiness. A current list_images read succeeded with 60 image records and no continuation cursor, including main-sample. No listed asset was established as the authorized finished test image or a currently passed production version. Samples and screenshots must not substitute for the actual finished file.

The current official upload_asset tool accepts upload_request.file as a URL, local path or base64 string. The older hosted server's URL-only description does not constrain this plugin schema. This is supported input syntax, not proof that a particular PC path or chat attachment is accessible to the upload runtime. No file reference or actual finished PNG/JPG bytes have been received here. PC access remains unavailable and the exhausted connector must not be retried, reconnected or bypassed.

Proposed storage grouping remains buffer-delivery/test and buffer-delivery/passed. When the real file becomes accessible, preserve original bytes, format and order; use an opaque object identifier with overwrite=false, no transformation, no conversion and no automatic analysis. Verify the resulting versioned HTTPS delivery URL and original-byte equality before attaching it. Retain object/version/hash references privately; do not put source bytes, private titles, channel identifiers or credentials in this public note. Oversized assets or exhausted free capacity remain held without a paid upgrade.

A fresh Buffer read verified the existing test post as draft with zero assets, null dueAt/sentAt and sharedNow=false. Both intended channels remain connected and unlocked. A complete scheduled/sending read returned zero posts with hasNextPage=false. No image upload, draft edit, new draft, reservation or publication occurred in this follow-up.

Once the actual test image is accessible, upload that file under the existing consent, edit the existing Threads test draft with saveToDraft=true, preserve its exact text and required metadata, and omit mode/dueAt. Fetch the same provider ID afterwards and verify draft status, unchanged exact text, null dueAt/sentAt, expected image count/order and the verified media reference. The test remains excluded from public publishing.

Production delivery still requires the producer's frozen exact-version pass and ordered media/content handoff. Only those versions may enter the already-authorized KST slots, within actual provider limits and after reservation/duplicate checks. A connection, sample asset or text-only draft does not prove successful image delivery.

Sources:
- https://cloudinary.com/documentation/cloudinary_llm_mcp
- https://cloudinary.com/pricing
