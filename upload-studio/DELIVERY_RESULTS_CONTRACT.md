# Buffer delivery results contract (schema 1)

Buffer is the sole writer of `.local/final-review-results/`. Upload Studio reads receipts and projects delivery state without writing receipts, review decisions, or publication state. Calling `readDeliveryResults(localRoot)` supplies the trusted `.local` root; the reader only visits its fixed `final-review-results/*.json` directory.

Each JSON file contains one object:

```json
{
  "schema": 1,
  "postId": "production-id",
  "outputVersion": "current-output-version",
  "fingerprint": "64-lowercase-hex-sha256",
  "platform": "instagram",
  "providerPostId": "provider-confirmed-id",
  "status": "sent",
  "externalUrl": "https://provider.example/post",
  "providerVerifiedAt": "2026-10-09T12:00:00.000Z",
  "publishedAt": "2026-10-09T12:00:00.000Z",
  "scheduledAt": null,
  "recordedAt": "2026-10-09T12:00:00.000Z"
}
```

`platform` is `instagram` or `threads`; `status` is `draft`, `scheduled`, `sending`, `sent`, or `error`. IDs and versions are nonempty, trimmed strings of at most 512 characters without control characters. The fingerprint is SHA-256 of the UTF-8 `finalReviewStatus(post).basis`, using the live post after all edits and tag/title migrations.

`recordedAt` is required. Date fields use ISO 8601 timestamps with seconds and an explicit timezone. Optional fields may be omitted or null. `scheduled` requires a valid `scheduledAt`. A `sent` receipt requires a nonempty `providerPostId`, valid HTTPS `externalUrl` without credentials, query parameters, or fragments, and valid `providerVerifiedAt` and `publishedAt`. Buffer must verify those fields against the provider; local draft creation or scheduler acceptance is never sent evidence. The consumer validates structure, not provider authenticity. It performs no network verification or clock comparison.

Buffer should replace one deterministic file per post/version/fingerprint/platform, using a temporary non-JSON file and an atomic rename to avoid partial receipts. Separate versions must never overwrite each other's evidence. No path from a receipt is opened. The reader rejects symlinks (including directory ancestors), nonregular JSON files, invalid UTF-8, malformed records, files over 16 KiB, and more than 2,000 JSON files. Over 2,000 JSON files rejects the entire directory with no records, so an unread newer result cannot leave an older sent result showing completion. A missing directory yields `{records:[],warnings:[]}`; rejected input yields warnings and cannot establish completion.

`deliveryResultsProjection(stateOrPosts, records)` returns an array for `payload.finalReview.deliveryResults`:

```js
{
  postId, outputVersion, fingerprint,
  deliveryStatus, selectedPlatforms, completedPlatforms,
  platforms: {
    instagram: {
      status, completed, providerPostId, externalUrl,
      providerVerifiedAt, publishedAt, scheduledAt, recordedAt
    }
  }
}
```

Only selected platforms appear. Missing platform evidence has `status:"pending"`, `completed:false`, and null evidence fields. Records must match the current post ID, output version, and fingerprint exactly. For a platform, the latest valid `recordedAt` wins regardless of directory order; conflicting records with the same instant produce `error` with no completion or link.

All selected platforms completed yields `posted`; a nonempty subset yields `partially_posted`. Otherwise precedence is `error`, `sending`, `scheduled`, `pending`. No targets yields `pending`. Only completed platforms expose `externalUrl` or `publishedAt`. Human final review decisions remain entirely separate: factual matching delivery evidence does not grant, restore, erase, or change a passed/hold/discard/revise decision. Older version/fingerprint evidence never completes a new revision.
