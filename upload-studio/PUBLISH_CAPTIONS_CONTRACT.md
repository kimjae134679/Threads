# Platform-authored caption contract
Producer writes `publish-captions.json` inside each current outputFolder using a temporary file and atomic rename. Uploader reads only. Missing captions remain awaiting-authored-captions; invalid/current-version-mismatched files hold that post without blocking other posts.

```json
{"schema":"threads-publish-captions-v1","postId":"producer-id","outputVersion":"canonical-current-version","sourceFingerprint":"producer-fingerprint","originalTitle":"immutable original title","sourceUrl":"https://example.invalid/original","publicationTitle":"Clean publication title","platformCaptions":{"instagram":"[ Clean publication title ]\n\nSource-grounded conflict paragraph.\n\nEvents paragraph.\n\nActual ending paragraph.","threads":"Brief source-grounded core and twist preserving context."}}
```

Instagram: exact first line `[ title ]` (one inner space each), followed by 3–5 natural article paragraphs. Threads: distinct brief core/twist. No invented events or endings. Identity/version/fingerprint/original title/source URL must match current status row. Sidecar authorship never grants rights, user review or publication approval.

State fields: `platform_captions.instagram/threads`, `platform_caption_edited.instagram/threads`, `production_caption_version`, `production_caption_status`, `publication_title`. Producer updates refresh pristine fields only; direct user edits (including deliberate blanks) survive same/new version refresh and export/restore. Changed authored input invalidates old review and dry-run approval. New production never queues or publishes.

Legacy `caption` remains the Instagram alias; legacy caption-only edit API writes both fields for compatibility. New UI and adapters use a selected platform explicitly.

Local scheduling: Asia/Seoul; 08:00–11:00, 12:00–14:00, 17:00–21:00; 30 minute default; start inclusive/end exclusive. 18 slots each platform, Instagram image/Reels share its slots. Queue registration order; overflow explicit; no automatic external scheduling or publication.
