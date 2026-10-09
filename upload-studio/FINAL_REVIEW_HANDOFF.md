# Final review and approved-input handoff
This program handles last manual review and local handoff. Collection, caption
writing and blank-image generation belong to upstream work. Buffer scheduling
belongs to a separate uploader task. No network publishing route is enabled.

## Review screen
The post list is on the left, image preview in the centre and caption editing
on the right. Internal hashes/IDs are hidden from visible headings and rows.
Use the current image controls to move earlier/later, exclude from composition
or undo. Producer files and local image bytes are never deleted by these actions.

Discard (폐기), revise (수정), and pass (통과) are saved with the current output
version, exact content/configuration basis, timestamp and revision. Legacy scores
never create final passes. Caption, tags, image order/composition, version or
settings changes invalidate pass. History and full backup recovery also require
a fresh final verdict. Existing producer evaluations remain separate metadata.

Existing missing tags receive conservative common/topic suggestions once.
User tags and deliberate topic edits are preserved. Future upstream bundles
carry their prepared captions, common tags, two topic tags and Threads topic;
review does not rewrite incoming article content or generate new source media.

## Local HTTP contract
POST /api/final-review {post_id, decision, expected_revision} uses post revision.
GET /api/state projects final_review_status for filters and current list badges.
GET /api/final-review/handoff previews only current valid passes.
POST /api/final-review/handoff {expected_revision} uses state revision and writes
an immutable manifest. Save operations refresh a local snapshot while holding
the store lock; startup reconciles after a crash. Handoff errors do not undo saved
user text. Do not consume an older manifest when current state is newer.

## Dedicated filesystem boundary
Review owns <studio-root>/.local/final-review-handoff/handoff.<revision>.<id>.json.
Manifests are append-only. They contain postId/outputVersion, final approval
time and fingerprint, exact platform captions/tags, ordered asset hashes,
absolute local asset paths, selected platforms and independent safety blockers.
Approved public image URL is null when none exists; local paths are not public
URLs. No new storage service or public media upload is created here.

The separate uploader writes its own results under
<studio-root>/.local/final-review-results/ and must never alter review state,
producer files or approved manifests. It must read the highest current revision,
compare .local/state.json revision and final review fingerprint immediately
before acting, and rehash local images. Missing/stale/revoked/nonpassed content
is blocked. A final review pass is not new public hosting or scheduling consent.
Source, rights, platform constraints and the uploader's explicit approval remain
independent checks. Provider result IDs/URLs belong to uploader result files.

## Verification
New domain tests cover invalidation, version changes and history recovery.
HTTP tests cover refresh/restart, current export, stale CAS and full backup restore.
Real Chromium tests cover visible layout, buttons, image exclusion/undo, filters,
navigation/reload and blocked nonpassed queue input. Windows CI covers bounded
sharing retries and concurrent stale-lock CAS. CI must pass on the exact commit
before applying a new PC build. The installed PC build is reported separately.
