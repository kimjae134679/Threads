# Final review and separate verdict file
The program reads producer results and maintains a local review copy. Collection,
caption writing, image creation and Buffer delivery belong to separate stages.
Producer manifests and original media remain read-only.

## Screen and decisions
The post list is left, preview centre and captions right. Current image controls
move/exclude/restore composition without deleting source or vault images.
Decisions are unreviewed, hold (보류), discard (폐기), revise (수정) and passed (통과).
Only an explicit current passed record is eligible for the separate uploader.
Existing scores and imports never grant a pass.

Caption, tags, image bytes/order/composition, settings and output-version changes
invalidate pass. History recovery does not revive a former pass. Internal notes
are separate from captions/tags: saving a note preserves content fingerprint,
output version and current verdict. Legacy review notes remain readable and
explicitly clearing a note stays cleared. Notes and decisions survive navigation
and restart.

## Minimal decision file
Review owns <studio-root>/.local/final-review-decisions.json. Startup and saves
refresh it with the existing file-atomic writer. No extra shared project lock
or Buffer state is introduced. It contains only:
- schema and the review-copy revision;
- posts: postId, outputVersion, fingerprint, decision, reviewedAt, note,
  noteUpdatedAt.

All current rows may appear so unreviewed notes are preserved. A consumer selects
only decision=passed, verifies exact live version/fingerprint and current pass,
and rejects a stale or negative file revision. Hold/revise/discard/unreviewed
are excluded. Notes are internal review data and never enter a social caption.

Example fields (illustrative only):
```json
{"schema":1,"revision":1,"posts":[{"postId":"example-post","outputVersion":"example-version","fingerprint":"<SHA-256 of current content basis>","decision":"hold","reviewedAt":"2026-10-09T12:00:00.000Z","note":"Recheck this image","noteUpdatedAt":"2026-10-09T12:00:00.000Z"}]}
```

## Review copy and existing approved-input package
<studio-root>/.local/state.json contains the review copy and composition edits.
Internal notes and verdict metadata do not modify the producer's originals.
The existing append-only compatibility packages remain under
.local/final-review-handoff/handoff.<revision>.<fingerprint>.json.
They provide exact reviewed platform captions/tags, ordered image hashes/MIME,
absolute vault paths and selected platforms for current passes. Public URL is
null when none has been separately approved.

GET /api/final-review/handoff returns current eligible identities. A latest
package path is exposed only when its revision and fingerprint match live state.
Durable verdict/notes and the minimal decision file are saved before the editing
API returns. Full image verification/export runs outside that save lock, coalesces
pending changes, and reports pending while the current package is not ready.
Explicit POST /api/final-review/handoff rejects a changed revision and awaits a
fully verified current package. It does not transfer image bytes or publish. Immediately
before delivery, the uploader compares live state revision and approval
fingerprint, and rehashes images. An old package is not a current approval.

Buffer owns its separate .local/final-review-results/ delivery records, IDs,
statuses, sanitized failures and verified URLs. The read-only consumer is defined
in DELIVERY_RESULTS_CONTRACT.md. A verified sent receipt must have an exact
current output version/fingerprint, provider post ID, public HTTPS post URL,
provider verification time and actual publication time. All selected platforms
completed shows 게시완료; a subset shows 일부게시; scheduled shows 예약됨.
Draft and sending never count as published. Human verdict remains separate. It must not write producer
files, review state, notes, verdict files or approved packages. Existing source,
rights, provider constraints and authorized media delivery remain independent.
No account, credential, host or scheduled job is created by review.

## Local editing API and validation
POST /api/posts/<id> with patch.review_note and expected_revision saves a note;
the server records its update time. POST /api/final-review takes post_id,
decision and expected_revision; the screen also sends the displayed output
version and content basis to reject an unseen update.

Existing missing tags receive conservative suggestions once without replacing
user tags. Future prepared captions/tags are preserved.
Domain/HTTP tests cover notes, hold, current verdicts and version recovery;
real Chromium tests cover navigation/reload, image controls and decoded
transitions. CI must pass on the applied code commit. PC installation and
observed user decision counts are reported separately.

## Title formatting and preview interaction
Decorative outer brackets and their inner spacing are removed only from title
first lines. Body brackets and producer originals are preserved. A one-time
review-copy migration records affected post IDs and previously passed IDs;
actual changed content invalidates the old pass and requires fresh user review.
Legacy notes remain readable; an explicitly cleared, timestamped note stays empty.
The centre preview keeps decoded image nodes across transitions. Native dots
navigate slides; the local heart toggle is decorative and never calls a provider
or changes the review content fingerprint. Verdict clicks show pending feedback
before save finishes, while the confirmed verdict changes only after durable save.

## Private handoff boundaries
A local Windows path is not a remote media URL. Use supported private file
transfer for the exact approved original bytes, retaining fixed file identity,
ordered SHA-256 and MIME. A successful Library metadata create or text read is
not evidence that another environment downloaded image bytes. If supported
original-byte transfer fails, report that blocker and hold publication.
A final user pass never automatically verifies source, rights or independent
safety checks. Local account/public-media blockers are distinct from provider
connection state. Never truncate or split images to evade a platform constraint.
