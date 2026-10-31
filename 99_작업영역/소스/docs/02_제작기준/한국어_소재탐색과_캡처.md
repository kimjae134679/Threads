# Korean community discovery priority and screenshot handoff

## Current product goal

Priority order for the current build:

1. Korean community discovery first: DCInside, Blind, FMKorea, TheQoo, Instiz, Clien, Ruliweb, Inven, Ppomppu, Arca Live, NAVER/Daum cafes.
2. Convert verified posts into square feed media for **Instagram feed/carousel + Threads**.
3. Reuse the same source package to create a separate **1080x1920 MP4** for **Instagram Reels + YouTube Shorts**.
4. Publish only from `04_REVIEW_PUBLISH` after rights/privacy/safety/human approval.

## How people usually automate this in practice

There is no single reliable universal scraper. Real systems combine several routes:

- official APIs for discovery/publishing where available;
- search-engine/public-index discovery for titles, links, dates and visible reaction counts;
- browser automation for public pages that allow normal browser access;
- commercial scraping/data providers for sites they support;
- manual screenshots or saved media for login-walled/restricted communities;
- OCR/vision only after an image/screenshot has been legally obtained.

The important engineering point is to normalize all of those into one `Source Package` instead of pretending every source is scraped the same way.

## DCInside / Blind

These remain high-priority **discovery** sources, but not blind bulk-crawl sources.

- DCInside terms explicitly restrict crawling without prior permission except where robots policy allows it.
- Blind terms explicitly prohibit crawling/scraping/data extraction without permission.
- Therefore the automated route is: public search/index metadata -> candidate ranking -> URL/manual screenshot acquisition.
- If a normal public page is available and a permitted browser capture can be made, use it. Do not add anti-bot/login bypass logic.

The UI marks these and other Korean communities as `primary-korean` so they appear first in the source matrix and candidate chips.

## If the user gives screenshots

Yes: screenshots are enough for most of the production path. One or more screenshots plus, ideally, the source URL become an `ASSETS_CAPTURED` package.

Automatable steps after upload:

1. read visible text using vision/OCR;
2. segment the screenshot into post text / attached image / UI chrome;
3. propose crop regions and remove obvious browser/app chrome;
4. detect likely usernames, faces, phone numbers, email addresses and other private data as **review suggestions**;
5. require a human privacy confirmation instead of claiming OCR/masking is perfect;
6. create the 1080x1080 feed package:
   - slide 1: first real image blurred/darkened + large hook;
   - slide 2+: real screenshots/images in chosen order;
7. write the caption and source/provenance manifest;
8. send to 04 for approval and Instagram/Threads publishing;
9. later feed the same verified assets/copy to the vertical-video renderer for Reels/Shorts.

What screenshots cannot magically recover:

- images or text that were never visible in the screenshot;
- the rest of a long thread that was not captured;
- reliable engagement counts that are cropped out;
- source authenticity if no URL/context is available;
- rights/consent that cannot be inferred from pixels.

If a post spans multiple screens, accept multiple screenshots and preserve their order.

## Source Package contract

Each selected post should end up as:

- source URL/platform/community;
- title/text excerpt;
- actually observed reaction metrics only;
- ordered captured assets;
- screenshot/image provenance;
- privacy mask rectangles + review state;
- rights/safety/comfort state;
- square-feed render manifest;
- vertical-video render manifest (later);
- caption;
- human approval snapshot.

## Video target

Reels/Shorts are not square-image exports. The vertical renderer must generate a real MP4 with:

- 1080x1920 scenes;
- source image pan/zoom/crop rules;
- timed hook/captions;
- optional TTS;
- optional music only from an allowed source/library;
- duration and scene timing;
- thumbnail/cover;
- final human review.

Publishing targets:

- Instagram feed/carousel: official Instagram publishing API once a professional account/OAuth setup is ready.
- Threads: official Threads API.
- Instagram Reels: official Instagram Reel publishing flow after the video renderer exists.
- YouTube Shorts: YouTube Data API video upload after the video renderer exists.
