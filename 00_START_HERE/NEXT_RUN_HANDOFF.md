# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 20:17 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Material change this run
`app/source-package.js` advanced to schema v5. Screenshot crop suggestions remain automatable, but an applied crop now requires an explicit `cropDecision`: `USER_CONFIRMED` or `VERIFIED_UI_ONLY`. `cropApplied` with the default `NONE` is rejected, and a crop decision without an actual applied crop is also rejected. This prevents suggestion-only UI-chrome crops from silently becoming destructive body crops. No automatic privacy masking was added.

## Discovery state carried from latest completed discovery run
Raw leads/results inspected: **40+**.
Retained: **5 C1**.
Top candidates: `파혼후 결혼비용 상환갈등`, `시댁에 결혼사진 안줌`; existing Korean asset priority remains `돈 때문에 결혼접을까 고민된다는 남자` because an exact public URL and two listed JPG attachments were observed previously.

## Asset / publication truth
Full-post screenshots captured: **0**.
Actual source bytes acquired: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**.
Candidates remain A0/P0 / `ASSETS_PENDING`; `publicationAllowed=false`. No OCR/moderation/rights clearance/publication is claimed.

## Verification truth
This run changed runtime code through GitHub contents writes. The available automation environment did not expose a checkout/runtime shell or Chrome session, so `npm run check`, server smoke, and browser E2E were **not run and are not claimed**. The change was committed directly to current main as `510dc54f` before this handoff update.

## Next concrete priority
1. Continue Korean-community-first high-volume discovery when public/index coverage is stronger.
2. Acquire actual complete screenshots/image bytes for a strong Korean C1 through permitted public/manual capture.
3. Feed real assets into schema-v5 Source Package with ordered provenance/dimensions and explicit crop decisions only when a crop is actually applied.
4. Render 1080x1080 cover + complete original screenshots only, then verify actual output in Chrome.
5. Only verified source-backed output may become A1; only 04_REVIEW_PUBLISH may create P1.
