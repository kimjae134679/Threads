# Optional Buffer publishing path

Reference workflow reviewed: DevDesign column `Claude Code로 Threads 발행 자동화하기 (원고 작성부터 예약까지)`.

Useful ideas adopted:

- keep content creation and publishing as separate responsibilities;
- keep human topic selection and final pre-publish confirmation;
- store API secrets outside Git;
- keep a durable record of external post IDs/status;
- let a dedicated publishing service own queue/custom scheduling when useful;
- for threaded posts, the first post must exist both as top-level `text` and the first item in `metadata.threads.thread`.

The Buffer-specific request shape was checked against Buffer's current official GraphQL API documentation before implementation.

## Project decision

The direct official Threads API publisher remains the primary low-level path. Buffer is an **optional adapter**, not a hard dependency.

```text
Approved Draft
  ├─ Direct Threads API
  └─ Buffer API
       ├─ addToQueue
       ├─ customScheduled
       └─ shareNow
```

Both paths stay behind the existing Research review, Draft approval, Rights/Safety Gate and current human publish approval.

## Configuration

Secret:

```text
BUFFER_API_KEY
```

Optional direct channel override:

```text
BUFFER_THREADS_CHANNEL_ID
```

Otherwise the app can query the authenticated Buffer account for connected Threads channels and store the selected non-secret channel metadata in:

```text
config/buffer.local.json
```

That file and `.env` are gitignored.

## Current limitations

- No live Buffer E2E is claimed until the user's Buffer API key/channel are actually connected and a real request is verified.
- Current approval-queue UI sends one approved Threads post. It deliberately refuses >500 characters instead of auto-splitting after approval.
- The backend adapter already supports explicit `metadata.threads.thread`; expose it only after Draft Studio stores a reviewed multi-post sequence as first-class approved content.
- Card/carousel media needs a stable externally reachable asset URL or a proper upload/hosting step before Buffer image publishing should be enabled.
- `item.bufferDeliveries[]` is a scheduling/delivery record. Confirmed sent posts should be synced before becoming canonical `item.publications[]` metrics records.
