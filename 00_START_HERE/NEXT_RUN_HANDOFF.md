# NEXT RUN HANDOFF

Updated: 2026-09-19 10:26 KST

## AUTOMATION-SPECIFIC OVERRIDE — DISCOVERY ONLY
For the separate `Threads 소재 발굴` automation, the user's explicit instruction wins: **01_DISCOVERY only**. Do not enter 02_EDITORIAL_SCORING, 03_PRODUCTION, 04_REVIEW_PUBLISH, or 05_EXPERIMENTS_ACCOUNTS. Do not capture/download source media, render, run Chrome E2E, publish/schedule, or modify existing production artifacts. Keep A0/P0 and `publicationAllowed=false`.

## Latest discovery-only batch
- The latest separate discovery run retained 16 new C1 candidate records from public Korean-community-first searches.
- Sources included Blind plus explicitly labeled TheQoo/Inven repost/secondary provenance.
- All discovery additions remain C1_A0_P0 with `publicationAllowed=false`; no source media was acquired.

## Sequential-candidate lane — latest state
- Processed exactly one next historical unprocessed candidate: `260916_개물림견주주장`.
- The candidate record had only a generic indexed claim and no exact individual source URL.
- Fresh public searches did **not** resolve a trustworthy exact source/event; returned material was generic dog-bite liability/background rather than evidence for this specific incident.
- Result: `BLOCKED_PROVENANCE`. Do not merge unrelated dog-bite incidents or infer the event.
- Unblock only when an exact individual source URL, distinctive source title/quote, or equivalent provenance identifier becomes publicly available.
- C0/A0/P0 and `publicationAllowed=false` remain. No source media was acquired and no publish action occurred.

## Queue refresh truth
- Stored queue remains the old 583-entry snapshot and is stale; canonical `data/candidates` was already observed at 614 before further discovery additions.
- Recursive tree output is truncated in the current connector, so do not fabricate unseen identities to force a full queue rewrite.
- Continue the known historical filename prefix safely and rebuild the full queue when complete enumeration becomes available.

## TEMP TEST ONLY conversion lane — latest state
- Added `03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/tools/TEMP_TEST_ONLY_browser-manual-checklist.md`.
- This fixes the evidence gate for stages 13–15: real browser/static HTTP execution, synthetic fixture only, TEMP warning visible, build, TEMP approval snapshot, JSON download, fresh-page restore, same approved snapshot reflection, and rejection of tampered publishable models.
- Existing Node synthetic round-trip passed previously, but it is not counted as browser click/download evidence.
- Stages 13–15 remain PARTIAL until actual browser execution evidence is recorded.
- `temporaryTestOnly=true` and `publicationAllowed=false` remain mandatory. Real publishing/metrics remains DISABLED.

## Publication ownership / safety
Only **04_REVIEW_PUBLISH** may actually publish or mark P1. Human rights/privacy/safety approval remains required.

## Next sequential run
- Skip existing blockers unless their unblock condition changed.
- Continue to the next known unprocessed filename after `260916_개물림견주주장`.
- TEMP lane: execute the isolated browser checklist only when an actual browser environment is available; otherwise advance another safe small TEMP-only unit without pretending execution occurred.

## Next discovery run
Continue new Korean-community-first material discovery and exact-source/provenance verification under the discovery-only override. Do not enter production.
