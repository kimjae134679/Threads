# Reference-first media pipeline

## Non-negotiable visual contract

The default feed output follows the user-supplied reference direction rather than an AI-invented card style.

- Feed canvas: **1080x1080** (near-square/square).
- Slide 1: use the **first real source image** as a full-bleed background, blur/darken it heavily, then place one large hook headline over it.
- Slide 2+: show the **real captured/source images** in selected order. Preserve the source image with `contain`; a blurred duplicate may fill empty margins, but the foreground source image must not be silently cropped.
- Generated imagery is **not a fallback** in the default pipeline.
- Text-only explainer cards are not inserted automatically between the source images in the reference profile.
- The first selected source image is reused: blurred on slide 1, unblurred as the first source slide.

## What can and cannot be automated reliably

Do not promise universal social-media scraping. The production flow must distinguish acquisition modes.

1. `official-api`: use the platform's official API where it can legally return or publish the required media.
2. `public-source-page`: capture media only from a public source page that permits the access path and keep source URL/provenance.
3. `manual-capture`: user/browser supplies screenshots or files when automated collection is unavailable, unstable, or disallowed.
4. `metadata-only`: keep title/link/visible engagement only; production remains blocked until source media is actually acquired.

Blind/DCInside and similarly restricted sources stay manual/public-index only. Do not build a generic anti-bot bypass or arbitrary URL scraper.

## Required pipeline states

`DISCOVERED -> SOURCE_VERIFIED -> ASSETS_PENDING -> ASSETS_CAPTURED -> RIGHTS_REVIEW -> PRIVACY_REVIEW -> RENDER_READY -> RENDERED -> HUMAN_APPROVED -> PUBLISH_READY`

Missing source images, unknown rights, unresolved privacy masks, or missing human approval must fail closed.

## Rendering architecture

Current browser Canvas is sufficient for the square feed renderer and manual privacy rectangles. Keep rendering deterministic: real source image + CSS/Canvas blur + headline typography. Do not call image-generation models for the default card path.

A later server renderer can use Sharp/Canvas for reproducible batch renders. Do not add that dependency until browser output and asset acquisition are stable.

## Platform targets

### Threads

Current target: text, image, and image carousel packages. Official Threads API publishing uses media containers and `threads_publish`; media URLs must be publicly reachable by Meta at publish time. Live publishing remains owned by `04_REVIEW_PUBLISH`.

### Instagram feed / carousel

Instagram feed/carousel is now a first-class target for the same 1080x1080 package. Publishing must use the official Instagram API for a professional account and OAuth/content-publish permissions. Never automate login with a saved Instagram password.

A public media staging layer is required because Meta fetches media from public URLs. Implement this as a provider-neutral storage adapter (for example R2/S3-compatible storage) rather than committing generated assets to GitHub as the publishing transport.

### Instagram Reels (later)

Reels require a **separate 1080x1920 video renderer**, not a stretched square carousel. The future video package should reuse the same verified source assets/caption but produce timed 9:16 scenes, subtitles, music/voice policy, and an MP4 artifact. Official Reel publishing is a separate media-container flow.

### YouTube Shorts (later)

Shorts also use a separate 1080x1920 MP4 target. Upload through YouTube Data API/OAuth using resumable video upload. Do not call a square-image carousel a Short.

## Media staging contract

Before any Meta/YouTube publish adapter runs, the renderer produces a package manifest:

- `sourceUrl`
- `sourcePlatform`
- `observedEngagement` (visible/verifiable only)
- ordered `sourceAssets[]`
- asset acquisition mode and original source page
- rights/privacy review state per asset
- `feedSquare[]` PNG outputs
- future `verticalVideo` MP4 output
- caption/copy
- human approval snapshot

Publishing adapters receive only approved rendered artifacts and publicly reachable media URLs, never raw passwords.

## Field-test evidence rule

A field-test candidate may be promoted only when the source URL and every recorded engagement value are freshly re-observed in the current run or are backed by an already stored primary/public evidence record. If either cannot be reproduced, keep it metadata-only or remove it; never preserve a numeric value just because an older handoff mentioned it. Source media stays `ASSETS_PENDING` until the actual files are acquired through an allowed adapter or manual capture.
