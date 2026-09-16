# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 22:19 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Material change this run
Added `scripts/build-screenshot-intake-manifest.mjs`. It takes locally available ordered PNG/JPEG source screenshots, records their exact input order and real pixel dimensions, and emits an intake manifest without claiming OCR/vision, full-body completeness, rights, moderation, privacy clearance or publication. Crop state defaults to `NONE`; it only suggests manual review and never auto-masks privacy/PII. `publicationAllowed=false`, `publishOwner=04_REVIEW_PUBLISH` are hard-coded.

This closes a concrete intake gap before Source Package creation: source order/dimensions/provenance can now be recorded mechanically instead of being guessed. The manifest intentionally keeps `fullBodyCaptureStatus=pending`; a human/source verification step must establish completeness.

## Discovery state carried forward
Latest full discovery sweep: raw leads/results inspected **40+**, retained **5 C1**. No new discovery sweep was run in this implementation-focused pass.

Top retained from latest sweep:
1. `중국 1조 재산 아빠가 50살 연하 새부인 데리고 와서 개판난 가족` — https://theqoo.net/square/4143960806 — 108,618 views / 357 comments at observation; full public page body read, multiple images listed but bytes not acquired.
2. `“모은 돈 5천만원” 결혼하자던 남친, 알고 보니 재산 4억…“시험해봤다네요” 황당` — https://theqoo.net/square/4069701714 — 3,870 views / 36 comments; full public page body read.
3. `AITA “ being cruel” for telling my daughter that she will need to help pay back the money that I spent on her wedding` — https://www.reddit.com/r/AmItheAsshole/comments/1rpxgnz/aita_being_cruel_for_telling_my_daughter_that_she/ — score +9,412; full public post read.

Existing asset-acquisition priorities remain the strong Korean C1s plus `돈 때문에 결혼접을까 고민된다는 남자` with two publicly listed JPG attachments.

## Asset / publication truth
Full-post screenshots captured this run: **0**.
Actual source bytes acquired this run: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**.
No OCR/moderation/rights clearance/publication success is claimed.

## Verification truth
GitHub connector write succeeded for the new intake script. This environment did not expose a repository checkout/runtime shell or Chrome session, so `npm run check`, server smoke, and browser E2E were **not run** and are not claimed.

## Next concrete priority
1. Acquire actual complete screenshots/image bytes for the strongest Korean C1 through permitted public/manual capture.
2. Run the new manifest builder on those ordered files and verify order/dimensions/provenance.
3. Feed verified complete body assets into schema-v5 Source Package; do not substitute generated body cards.
4. Render 1080×1080 cover + complete original screenshots only and verify in Chrome.
5. Only verified source-backed output may become A1; only 04_REVIEW_PUBLISH may create P1.
