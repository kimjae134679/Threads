# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 18:14 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Latest material implementation
Repo-tip inspection found `app/card-story-model.js` still automatically ran cover/title text through the legacy PII redactor and declared image masking required. That contradicted the binding source-first rule that the observed original title is the default cover text and privacy masking is user-directed only.

Fixed on current main in commit `cee4152b`:
- source-backed slide-1 title now comes from `item.title` rather than an editorial hook override;
- source carousel title/source fields use non-redacting cleanup only;
- automatic screenshot masking and automatic PII mutation are explicitly disabled in storyboard privacy metadata;
- manual privacy review/masking remains available and required as a review gate;
- storyboard validation now rejects a reference-square package if automatic privacy mutation is enabled.

Legacy `redactPII` remains available only for non-source editorial surfaces; it is no longer applied to source-backed carousel title/body policy.

## Latest Discovery state
Most recent discovery pass inspected roughly **40+ raw leads/search results** and retained **3 C1** candidates. Top: `임대아파트 사는 여친과 결혼문제` (Ppomppu exact public page; 20,103 views observed; full text body read; full comments not read). `급여담당하는 직방덬들 있어? 공제내역 계산하는 거 말이야` had 48 views / 6 comments observed. `내가 홍콩 보내줄게.jpg` had 1,670 observed views and one attached image, but image body was not read and remains `본문 미확인`.

## Asset / publication truth
Raw candidate leads/results in latest discovery: **40+**.
Retained count: **3 C1**.
Full-post screenshots captured: **0**.
Actual source bytes acquired: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**.
Candidates remain A0/P0 and `publicationAllowed=false`; rights/privacy/human review gates remain. Only 04_REVIEW_PUBLISH may publish.

## Verification truth
The model change was committed through GitHub. This run did not have a repository runtime shell/browser, so `npm run check`, server smoke, and Chrome E2E are **not claimed**. No OCR, moderation, rights clearance, credentials, delivery, source acquisition, or publication success is claimed.

## Next concrete priority
1. Acquire actual complete source screenshot/image bytes for the strongest accessible candidates through permitted public/manual capture paths.
2. Verify the complete body sequence before Source Package intake; keep `ASSETS_PENDING` until every required body asset exists.
3. Runtime-test the source-title/manual-privacy change when a shell is available.
4. Render and Chrome-verify the first real source-backed 1080×1080 carousel before any A1 consideration.
