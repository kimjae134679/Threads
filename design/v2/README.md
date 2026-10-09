# Upload desktop design v2

Design review only. No publishing, scheduling, login, OAuth, account creation, tokens, API calls, or external image transfer is implemented.

## Interactive HTML

Open [../upload-desktop-v2.html](../upload-desktop-v2.html) locally. Top navigation separates per-post settings, platform preview, queue, and publication history. Hash entry points are #settings, #preview, #queue, and #history.

- Select a post; its platform selections, example account choices, timing/timezone, common caption/tags and platform overrides are independent.
- Switch preview between selected Instagram and Threads, navigate image order, expand captions, and change ratio/crop.
- Filter/search/sort the queue, select rows, and cancel/retry simulated items. An ambiguous-response example locks retry.
- Filter/search/sort history and expand per-platform results. example.invalid links are intercepted and never opened.
- First-comment/reply inputs explicitly show unsupported by the current tool.
- Version, image order, source/rights/review gaps and idempotency information sit in collapsed detail panels.
- All data is in memory; reload resets the examples. No durable backend storage.

## Review images

01-post-settings.png, 02-platform-preview.png, 03-upload-queue.png, 04-publication-history.png are generated design proposals, NOT captures of the HTML. They share the design system but can differ in text, spacing, thumbnails and example times. The HTML is authoritative for interactions.

Version 1 HTML and PNG are preserved. This revision adds separate v2 artifacts. Existing production, cover/review and unfinished offline backend files are untouched.

## Validation

Inline JavaScript syntax passed. Executed pure fixture/helper checks passed for post isolation, common-caption inheritance, independent override retention, multi-platform selection, single-image fixture, queue stages, partial-result history and dummy URLs. Source has connect-src 'none' and contains no network-request APIs or external assets. These are source/helper checks, not a browser interaction or pixel-layout test.

Actual HTML rendering could not be verified: local file navigation was refused by the browser policy; the shell helper is unavailable; Desktop Commander reported its monthly limit. No bypass or repeated limit retries were attempted. Library retained the v2 HTML (53,874 bytes). Library identity metadata is recorded separately; native metadata helper was unavailable.
