# Buffer MCP image delivery checkpoint — 2026-10-10 (KST)

Observed provider snapshot: 2026-10-10 around 03:06 KST. Results below describe that checkpoint, not a continuous live monitor.

Role: 04_REVIEW_PUBLISH. The private image delivery test succeeded in the latest follow-up below. Production publishing still awaits a verified exact-version review handoff.

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

The current official upload_asset tool accepts upload_request.file as a URL, local path or base64 string. The older hosted server's URL-only description does not constrain this plugin schema. This is supported input syntax, not proof that a particular PC path or chat attachment is accessible to the upload runtime. A later handoff resolved an existing user-attached PNG as a candidate for the one private test. It is not established as the latest passed production version. PC access remains unavailable and the exhausted connector must not be retried, reconnected or bypassed.

Proposed storage grouping remains buffer-delivery/test and buffer-delivery/passed. When the real file becomes accessible, preserve original bytes, format and order; use an opaque object identifier with overwrite=false, no transformation, no conversion and no automatic analysis. Verify the resulting versioned HTTPS delivery URL and original-byte equality before attaching it. Retain object/version/hash references privately; do not put source bytes, private titles, channel identifiers or credentials in this public note. Oversized assets or exhausted free capacity remain held without a paid upgrade.

A fresh Buffer read verified the existing test post as draft with zero assets, null dueAt/sentAt and sharedNow=false. Both intended channels remain connected and unlocked. A complete scheduled/sending read returned zero posts with hasNextPage=false. No image upload, draft edit, new draft, reservation or publication occurred in this follow-up.

Once the original candidate image is visually verified and a supported transfer is completed, upload that file under the existing consent, edit the existing Threads test draft with saveToDraft=true, preserve its exact text and required metadata, and omit mode/dueAt. Fetch the same provider ID afterwards and verify draft status, unchanged exact text, null dueAt/sentAt, expected image count/order and the verified media reference. The test remains excluded from public publishing.

Production delivery still requires the producer's frozen exact-version pass and ordered media/content handoff. Only those versions may enter the already-authorized KST slots, within actual provider limits and after reservation/duplicate checks. A connection, sample asset or text-only draft does not prove successful image delivery.

Sources:
- https://cloudinary.com/documentation/cloudinary_llm_mcp
- https://cloudinary.com/pricing

## Existing attachment transfer check — 2026-10-10 KST

The resolved candidate was read through Library, and its fixed file reference was passed to prepare_materialize. The preparation succeeded but returned workspace_path=null and a short-lived HTTPS GET download URL with no extra request headers. The exact private Library/file identifiers and transfer URL are retained privately and are omitted here.

The image read returned an image asset pointer and extracted caption/OCR; this execution environment did not receive renderable pixels. Original visual inspection has therefore not been completed here. No local file was created, and no unsupported PC access was attempted.

Cloudinary's exposed upload schema supports URL input, so an original-byte remote ingestion route is a candidate without assuming the remote service can read a PC path. The URL has not been submitted to Cloudinary in this checkpoint. Library helper requirements still govern any local materialization. No successful upload, new asset URL, draft image edit or current-version production approval is claimed.

## Private image delivery test succeeded — 2026-10-10 KST

The parent execution environment materialized and visually inspected the same resolved Library candidate. It confirmed an actual finished cover image rather than a UI screenshot. This satisfied the requested original visual check. The older attachment remains test-only and is not an established current passed production version.

A fresh Library transfer preparation returned a HTTPS GET download URL with no extra request headers. The official Cloudinary upload_asset tool successfully ingested that URL into the approved test storage group. The target public object was checked absent before upload, overwrite=false was supplied, and no transformation, conversion, OCR, analysis or new credential was requested. Neither a PC path nor the parent's cloud filesystem path was submitted as a remote-server-local file.

An independent Cloudinary get_asset_details read confirmed the same asset and version: PNG, 1,615,694 bytes, 1080 by 1080 pixels, public upload delivery, zero derived assets. These match the Library source metadata. Cryptographic source-versus-delivery byte equality has not been independently checked; matching byte counts and dimensions are not a hash comparison.

The existing Buffer test draft was then edited with the verified versioned HTTPS image URL, unchanged text, saveToDraft=true and no mode/dueAt. No duplicate post was created. An independent get_post read verified the same draft, exactly one image, unchanged text, matching media source URL, null dueAt/sentAt, sharedNow=false and isCustomScheduled=false. A complete scheduled/sending read for both intended channels still returned zero posts and hasNextPage=false.

Exact source identifiers, Cloudinary asset/object/version references, image URL, and Buffer post ID are retained in the private task evidence. This public document contains no private title, image link, account identifier or credential. No payment, plan change, public social reservation or public social publication occurred.

The one private test is complete. Production delivery remains held until the review producer supplies explicit user-passed immutable versions with exact captions/tags, ordered source image references/hashes, destination channels and duplicate fences. The test image must never enter the production refill queue.

## Production export contract located; live input pending — 2026-10-10 KST

The existing FINAL_REVIEW_HANDOFF.md, final-review.mjs and review-handoff.mjs were read at commit cfd612387f34ab691c1bdf7e31c34578ada8bdc2. The producer contract is now concrete; this task did not implement a new parser or modify the review application. A review-task read failed with a Codex app request error. No actual latest passed manifest, its media bytes or supported live-state read path was supplied to this task, so no production upload or reservation was attempted.

Review owns <studio-root>/.local/final-review-handoff/handoff.<revision>.<id>.json and exposes GET /api/final-review/handoff for current preview. POST /api/final-review/handoff with expected_revision writes the immutable manifest in the review program. The actual installed studio root and accessible transfer route must be reported by that owner; a Windows local_file is not readable merely because a cloud service accepts path syntax.

The required existing manifest fields are:
- schema, type, state_revision, handoff_id, generated_at, review_statuses and eligible_post_ids.
- posts[].postId, outputVersion, approval.status=passed, approval.reviewedAt and approval.fingerprint.
- Exact posts[].captions by platform; tags.common/topic/legacy/threads_topic; platforms, media_format and media_contract.
- Ordered posts[].images with order, sha256, mime, local_file and approved_image_url. Null URLs require delivery of the original image bytes through an accessible approved route.
- Source/safety/review/blockers sufficient to evaluate the independent constraints. These private payloads must not be committed to the public repository or uploaded to image storage.
- consumer_contract with state_file, require_live_revision_and_fingerprint, require_asset_hash_and_mime, results_directory and revalidation requirements.

Before each production upload or provider write, the uploader must have a supported fresh read of the actual state revision, handoff identity, eligible IDs/current approval fingerprints, and the original ordered image SHA-256/MIME. A stale immutable export or historical pass is insufficient. Do not concatenate exported tags onto captions that already contain the final hashtags or silently rewrite caption content.

Transfer the manifest and every referenced original image through a private supported file/Library route, retaining fixed file identities/versions and their mapping to each ordered hash. Separately supply the accessible read-only current-state route and the review-owned installation/export root. Public GitHub is for sanitized operational documentation, not production captions, review records, image bytes or account identifiers.

Uploader results belong to <studio-root>/.local/final-review-results/; they must not modify review state or immutable manifests. Result persistence needs an accessible owned destination before live execution. Keep the provider ID, object version/hash mapping, planned KST time, status, failure cause and verified link there. The existing direct user consent already covers approved Cloudinary Free delivery and the agreed Buffer scheduling scope; the pending requirement is verifiable data/access, not another consent request.

The private single-PNG Threads test remains complete and excluded from production. Multi-image delivery, Instagram delivery and production sequential scheduling have not yet been tested or completed.
