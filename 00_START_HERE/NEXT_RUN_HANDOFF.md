# NEXT RUN HANDOFF

## 2026-09-21 06:30 KST — latest two-lane state
- Read current main handoff, queue/progress, TEMP README/progress, and T-0008 `254-sol.md` before work.
- Current queue snapshot is 1,202 candidates (C0 442 / C1 760 / A1 0 / P1 0), generated at 05:25 KST. A discovery-only run at 06:18 added 3 new candidate files after that snapshot, so queue regeneration is now required before trusting live totals. This run did not falsely rewrite counts without a complete deterministic queue rebuild.
- Processed exactly one next unprocessed filename-order key from the current queue: `260916_진짜집구하는거개토나온다` (rank 49).
- Public Blind recommendation/search evidence verifies the exact title, snippet `아니 돈은 둘째치고 매물이 너무 없어서`, and masked author display `삼성전자 · 힘*******`; however no exact individual Blind URL/stable post ID resolved. Result: `BLOCKED_PROVENANCE`, C0/A0/P0. Unblock only when an exact individual Blind URL/stable post ID or another trustworthy unique identifier for the same post becomes publicly resolvable without login/access-control bypass.
- TEMP lane added only `03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/260921_진짜집구하는거개토나온다_TEMP_TEST_ONLY/stage9_primary_source_gate_TEMP_TEST_ONLY.json`; `temporaryTestOnly=true`, `publicationAllowed=false`, `approvedVersion=null`, `executionEligible=false`. No body/comments/source bytes/screenshots/OCR/vision/moderation/rights clearance/A1/P1 fabricated.

## Queue refresh requirement
- The 06:18 discovery handoff explicitly reports 3 new C1 candidates after the 1,202 snapshot. Next run must rebuild `candidate-program-queue.json` from every current `data/candidates/*.md` excluding README before selecting the next key, and synchronize `candidate-program-progress.json.queueRefresh` to that rebuilt queue. Do not infer C0/C1 totals merely from the +3 note; parse the current files.

## Previous TEMP state to preserve
- `260916_입주청소하러갔다가` retains SHA-256-pinned original WebP (600x871, 39,288 bytes, SHA-256 `37de18cc8d8ea30768d297f065db267846578b05573fe45a10374aadb771d1c6`); stage 10 remains `BLOCKED_REAL_VISUAL_REVIEW_INPUT`.

## Publication boundary
Only `04_REVIEW_PUBLISH` may publish or mark P1 after human rights/privacy/safety approval. No real publishing or metrics collection was performed.
