# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-17 06:16 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Material work this run — screenshot completeness guard
Updated `scripts/plan-screenshot-normalization.mjs` so screenshot sourceSequence must now be contiguous and begin at 1. Previously `1,3` or a sequence beginning at `2` could pass as strictly increasing, which could silently normalize an incomplete original-post screenshot set. The planner now rejects missing first/middle source screenshots before producing a 1080×1080 plan. Existing no-stretch containment, body-crop prohibition, verified/manual UI-chrome crop only, user-directed privacy masking, `publicationAllowed=false`, and 04-only publishing remain intact.

## Discovery baseline carried from latest completed discovery run
- raw inspected: 40+
- retained: 7 C1
- top candidates: `하이닉스 37억 몰빵 풀매수`, `협의이혼시 이런 경우는 재산분할 어떻게해?`, Reddit SIL Europe-trip wedding-gift reversal
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel: NO
- A1/P1: 0

No new discovery metrics are claimed in this implementation run.

## Test truth
Repository change was made through GitHub contents access. This runtime did not provide an executable checkout/Node/Chrome path, so targeted Node tests, `npm run check`, server smoke and browser E2E were not run and are not claimed passing.

## Next concrete priority
1. Continue Korean-first high-volume discovery while prioritizing exact individual URLs and story value.
2. Acquire complete original-post screenshots/source media for `하이닉스 37억 몰빵 풀매수`, `주식으로 8천날림`, `[인증] 하루 5.2억 손실, 한 달 15억 손실`.
3. Run screenshot intake → contiguous normalization planner; any missing first/middle screenshot must block the package.
4. Crop UI chrome only after manual/verified bounds; never crop body text and do not automatically privacy-mask.
5. Build 1080×1080 cover + complete original screenshot carousel and Chrome-verify before A1. Only `04_REVIEW_PUBLISH` may create P1.
