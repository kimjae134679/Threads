# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-17 08:15 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Material work this run — source evidence survives normalization
Updated `scripts/plan-screenshot-normalization.mjs` so normalization can no longer silently discard screenshot provenance recorded by intake. Before planning 1080×1080 output it now requires the manifest's exact public `sourceUrl`, matching `orderedAssetCount`, per-asset SHA-256, positive byte length, matching `captureUrl`, acquisition state and provenance. Duplicate hashes are rejected. The normalization plan now carries SHA-256, byte length, capture URL, acquisition state and provenance for every ordered screenshot.

Existing rules remain: sourceSequence must be contiguous from 1; body crop is forbidden; UI-chrome crop is manual/verified-suggestion only; privacy masking is user-directed only; CONTAIN_NO_STRETCH preserves the complete source image; full-body completeness/OCR/moderation/rights/publication are never inferred.

No publication/provider action was attempted.

## Discovery baseline carried forward
Latest useful Discovery refresh inspected 40+ raw leads and retained 4 (3 C1 + 1 C0). Top source-acquisition targets remain:
1. `하이닉스 37억 몰빵 풀매수`
2. `주식으로 8천날림`
3. `[인증] 하루 5.2억 손실, 한 달 15억 손실`
4. C0 `SK하이닉스 약 70억원 투자 후 약 18억원 평가손실 인증 lead` — resolve exact original DCInside URL before C1.

## Verification truth this run
- material repo change: YES — normalization now validates and preserves source evidence
- raw candidate count: 40+ (latest Discovery baseline; no new discovery claimed this production run)
- retained count: 4 (3 C1 + 1 C0; latest Discovery baseline)
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0
- `npm run check`: not run (GitHub connector runtime; no executable checkout)
- server smoke/browser E2E: not run; changed path is CLI/data pipeline, not user-visible UI

All candidates remain `publicationAllowed=false`, A0/P0, rights/privacy/human review gated, with 04_REVIEW_PUBLISH-only publication.

## Next concrete priority
1. Continue Korean-first high-volume discovery, especially funny/workplace/reversal lanes.
2. Acquire complete original-post screenshots/source media for the top three C1 investment stories; do not fabricate body cards.
3. Run intake → normalization and verify the carried provenance/hash fields on an executable checkout.
4. Run `npm run check` when executable checkout is available.
5. Build 1080×1080 cover + complete original screenshot carousel only after real source bytes exist; Chrome-verify before A1.
