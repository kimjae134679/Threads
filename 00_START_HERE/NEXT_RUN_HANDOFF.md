# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-17 07:14 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Material work this run — screenshot pipeline verification gate
`package.json` now includes `scripts/plan-screenshot-normalization.mjs` in `npm run syntax`. This closes a verification gap where the new source-order/full-post normalization planner could change without being parsed by the repository's normal `npm run check` path. Planner behavior remains: sourceSequence must start at 1 and remain contiguous, square output is 1080×1080 CONTAIN_NO_STRETCH, body crop is forbidden, UI-chrome crop is manual/verified-suggestion only, and privacy masking is user-directed only.

No publication/provider action was attempted. No OCR/moderation/rights/asset/publication result was inferred.

## Verification truth this run
- material repo change: YES (`package.json` syntax gate)
- targeted static verification encoded in normal check path: YES
- `npm run check` actually executed in this connector-only runtime: NO; do not claim pass
- server smoke: not run (no executable checkout)
- browser E2E: not run (no executable checkout; no user-visible renderer change this run)

## Latest Discovery baseline (from preceding 06:39 run)
- raw inspected: 40+
- retained: 3 C1
- top candidates from that run: `6년만에 하는 인증`, `빚 그리고 결혼 어떻게해야할까`, `상대방 부모님 빚.. 결혼 괜찮을까요?`
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel: NO
- A1/P1: 0

All candidates remain subject to `publicationAllowed=false`, rights/privacy/human review gates and 04_REVIEW_PUBLISH-only publication.

## Next concrete priority
1. Continue Korean-first high-volume discovery, especially funny/workplace/reversal lanes alongside money/marriage.
2. Acquire complete original-post screenshots/source media for `하이닉스 37억 몰빵 풀매수`, `주식으로 8천날림`, `[인증] 하루 5.2억 손실, 한 달 15억 손실`.
3. On an executable checkout run `npm run check`; do not mark it passed until actually executed.
4. Run screenshot intake → contiguous normalization planner; missing first/middle screenshot must block the package.
5. Crop UI chrome only after manual/verified bounds; never crop body text and do not automatically privacy-mask.
6. Build 1080×1080 cover + complete original screenshot carousel and Chrome-verify before A1. Only `04_REVIEW_PUBLISH` may create P1.
