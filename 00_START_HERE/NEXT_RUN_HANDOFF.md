# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-17 03:33 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Discovery refresh this run
Korean-community-first public search/index exploration inspected **raw 40+ leads/results** across Blind and searches aimed at DCInside, FMKorea, TheQoo, Ruliweb, Ppomppu, Inven, Arca plus international/social lanes. Restricted sources were not bypassed. After dedupe/story/safety/access filtering, **10 new C1 candidates** were retained as one Markdown file per candidate in `data/candidates/`.

Retained exact titles:
1. `결혼 한달 남았는데 파혼..` — Blind — 1,846 views / 1 like / 53 comments observed.
2. `부모님 결혼 반대(나는 남자)` — Blind — 16K views / 138 comments observed.
3. `남친 부모님 결혼 반대` — Blind — 2,658 views / 33 comments observed.
4. `부모님 결혼 반대` — Blind — 1,794 views / 9 comments observed; fortune-telling + income/support dispute.
5. `결혼 첫 명절 시댁/처가 일정문의` — Blind — 3,044 views / 4 likes / 60 comments observed.
6. `파혼 경험 있는 사람이랑 연애` — Blind — 1,144 views / 11 comments observed.
7. `결혼 진행 괜찮을까요` — Blind — 236 views / 16 comments observed.
8. `결혼 반대할 정도야?` — Blind — 1,075 views / 7 comments observed.
9. `결혼 반대 관련 조언 부탁드려요` — Blind — 1,371 views / 26 comments observed.
10. `30대 여자 직장 상사 선물 추천 부탁드림` — Blind — 2,145 views / 1 like / 20 comments observed; comfort review needed because one public comment contains an adult-product joke.

Top acquisition priority from this refresh: `결혼 한달 남았는데 파혼..` → `부모님 결혼 반대(나는 남자)` → `결혼 첫 명절 시댁/처가 일정문의`, while previously strong `주식으로 8천날림` and `[인증] 하루 5.2억 손실, 한 달 15억 손실` remain high priority.

## Candidate recording truth
Each retained item is `C1_A0_P0` with exact public individual URL and observation-time metrics only where actually visible. Candidate files record whether body/comments were read and source-asset state. No new grouped discovery JSON was created in `data/` root. Public third-party bodies were summarized rather than copied wholesale.

## Asset truth
Full-post screenshots captured this run: **0**.
Actual source bytes acquired: **0**.
Completed real source-backed carousel: **NO**.
A1/P1 created: **0**.
All new candidates remain `ASSETS_PENDING`, `publicationAllowed=false`; rights/privacy/human review gates remain. No OCR/moderation/rights/publication success was inferred.

## Existing implementation state
`scripts/plan-screenshot-normalization.mjs` remains the current normalization path: ordered 1080×1080 `CONTAIN_NO_STRETCH`, no body crop, UI-chrome crop manual/verified only, privacy masking user-directed. Previous `npm run check` failure remains unresolved in `test/source-package.test.mjs` fixture under the stricter acquired-provenance/source-dimensions contract; do not claim the suite passes.

## Next concrete priority
1. Acquire complete original-post screenshots/source media for `주식으로 8천날림`, `[인증] 하루 5.2억 손실, 한 달 15억 손실`, then `결혼 한달 남았는데 파혼..` and `부모님 결혼 반대(나는 남자)`.
2. Preserve every body screen in order; crop UI chrome only, never body text; no automatic privacy masking.
3. Run screenshot intake + normalization planner and verify order/dimensions/hash/provenance.
4. Build 1080×1080 cover + complete original screenshot carousel and Chrome-verify before A1. Only `04_REVIEW_PUBLISH` may create P1.
