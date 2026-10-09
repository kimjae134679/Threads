# Buffer delivery contract (offline preparation)
Reviewed 2026-10-09. This module makes no network calls and reads no keys.
It is an extension of the existing upload planner, not a live connection.

## Supported scope
Instagram single images and ordered carousels up to 10, and reviewed real Reels
videos. Threads uses the actual cover title as its body, with its topic in the
separate metadata field. The existing conservative Threads limit is 20 images.
Original local media and captions remain in the producer and Upload Studio.
Nothing is cropped, truncated, uploaded or scheduled by this adapter.

The Buffer API uses GraphQL at https://api.buffer.com with Bearer authentication.
Its stable CreatePostInput supports ordered assets, automatic scheduling and
customScheduled/dueAt. Instagram metadata type is post or reel (carousel is an
ordered asset array under post, not an invented carousel type). The returned
Post exposes status, dueAt and externalLink. Draft/awaiting approval, scheduled,
sent and error are distinct; an accepted scheduled post is not publication.

## Public media is a separate approval
Buffer's API takes public direct URLs, not native file uploads. A URL must remain
reachable through publication, have no login requirement or blocking CORP/bot
protection, and not expire. Google Drive/Dropbox share URLs and temporary signed
URLs are unsuitable. This module accepts only declared verified stable HTTPS
URLs without credentials/query/hash and never probes or creates storage.
A future authorized storage layer must verify bytes, ordered asset hashes,
format, public reachability and retained lifetime. No host or bucket is created.
The Buffer website's own file picker is a different UI path; this API adapter
does not emulate it or access browser sessions.

## Approval and queue safety
Preview is read-only: POST /api/buffer/preview with post_id, expected_revision
and options {platform, channel_id, due_at, media}. The response includes exact
caption, ordered media, account/channel/date, blockers and a stable approval
basis. GET /api/buffer/status accurately reports the local API as disconnected.
All other /api/buffer POST operations are disabled. No publication approval UI
or live transport is enabled by this implementation.

Dry-run approval is insufficient. approveBufferPlan is a future integration
transition for explicit user approval of the exact reviewed preview. A changed
caption, source, image order, version, channel or due date invalidates that basis.
Source/rights/current user review and inactive production hold gates still apply.
Producing/importing a new version never approves, reserves or sends it.

Use StateStore.mutate with reserveBufferPlan to atomically persist the duplicate
fence before any future authorized request. CAS rejects simultaneous changes.
Refill uses a complete recently fetched provider snapshot plus pending local
reservations, accounting for existing posts in Buffer created by other tools.
At most 10 per channel; refill only vacated slots, never all 186 originals.
Queue snapshots must include every page and the selected channels. Concurrent
changes made directly in Buffer can race a local snapshot; provider limits and
fresh rechecks remain necessary in a future live executor.
Duplicate fences survive restart and version changes. An interrupted reserved
attempt becomes reconciliation. Unknown response/timeouts and partial GraphQL
success never retry blindly. No documented provider idempotency guarantee was
found; a local key is not sent as an invented API field or header.
Known provider IDs, statuses and valid destination URLs are retained; raw
upstream messages, headers, captions and credentials are not journaled.
Provider drafts requiring approval cannot be reported as scheduled or sent.
Rejected/failed records remain held for human resolution; no auto retry is
enabled.

## Free request budget
Free: 1 key, 100 requests/15 minutes, 250/24 hours, 3000/30 days, rolling windows.
bufferRequestBudget tracks this client's local timestamps. Other tools share
the personal-key pool, so future execution must also consume provider RateLimit,
RateLimit-Policy and Retry-After headers; local counts alone cannot prove quota.
Use batched filtered queue/status reads and deliberate refill runs. No polling
timer, scheduler, API key creation or connection setup is installed.

## Integration boundary still pending
A live executor, secure credential configuration, provider channel authorization,
public storage, external queue reads, and actual publishing require explicit
authorization and separate implementation/verification. No live API behavior or
real media publication was tested. Unit tests exercise documented response
fixtures and persisted state transitions only.

Official sources:
- https://support.buffer.com/articles/using-buffers-api-GtIYIQilz5
- https://support.buffer.com/articles/troubleshooting-buffers-api-VgBuQXUCDI
- https://support.buffer.com/articles/scheduling-posts-4Qdld7giAZ
- https://developers.buffer.com/guides/posts-and-scheduling.html
- https://developers.buffer.com/guides/hosting-media.html
- https://developers.buffer.com/guides/api-limits.html
- https://developers.buffer.com/reference.html
