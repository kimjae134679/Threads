# Buffer publisher

Optional publishing adapter inspired by the same core workflow used by the direct Threads API path:

```text
approved content
→ final human confirmation
→ Buffer queue / custom schedule / share now
→ local Buffer delivery record
```

## Why this exists

The app already has a direct official Threads API publisher. Buffer is **not a replacement**. It is an optional scheduling/delivery layer that can offload queue timing and connected-account delivery when the user prefers that workflow.

## Security

- `BUFFER_API_KEY` stays server-side only.
- `.env` and `config/buffer.local.json` are gitignored.
- The browser sees connector status and channel metadata, never the API key.
- `/api/buffer/publish` reuses the same server-side candidate approval + Safety Gate validation as the direct Threads publisher.
- The UI performs a second final confirmation immediately before creating the Buffer post.

## Setup

1. Connect a Threads channel in Buffer.
2. Set `BUFFER_API_KEY` in the local environment.
3. Start the app.
4. In the connector box, use **Buffer Threads 채널 찾기** and select the target Threads channel.
5. The selection is stored locally in `config/buffer.local.json`, or set `BUFFER_THREADS_CHANNEL_ID` to override it.

## Supported modes

- `addToQueue` — add to the next Buffer queue slot.
- `customScheduled` — schedule a specific future instant; the browser converts local input to ISO/UTC before sending.
- `shareNow` — immediate delivery request.

The backend adapter also supports Buffer's `metadata.threads.thread` payload shape. Current UI intentionally sends a single approved post only; it will not silently split a >500-character approved draft. Explicit multi-post approved draft state should be added before threaded publishing is exposed in the UI.

## Local state

A Buffer request is recorded under:

```text
item.bufferDeliveries[]
```

This is an external delivery/scheduling record, not yet a canonical Threads `publication` record. A future Buffer status sync can promote confirmed sent posts into `item.publications[]` after their actual delivery state is verified.

## Files

- root `buffer.mjs` — server-side Buffer GraphQL adapter
- `buffer-publish-model.js` — pure browser request/record logic
- `buffer-publisher.js` — connector/channel setup and approval-queue UI
- `buffer-publisher.css` — feature styles
- `test/buffer-adapter.test.mjs`
- `test/buffer-publish-model.test.mjs`
