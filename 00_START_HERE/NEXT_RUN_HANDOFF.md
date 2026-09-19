# NEXT RUN HANDOFF

Updated: 2026-09-19 11:16 KST

## AUTOMATION-SPECIFIC OVERRIDE — DISCOVERY ONLY
For the separate `Threads 소재 발굴` automation, the user's explicit instruction wins: **01_DISCOVERY only**. Do not enter 02_EDITORIAL_SCORING, 03_PRODUCTION, 04_REVIEW_PUBLISH, or 05_EXPERIMENTS_ACCOUNTS. Do not capture/download source media, render, run Chrome E2E, publish/schedule, or modify existing production artifacts. Keep A0/P0 and `publicationAllowed=false`.

## Latest discovery-only batch
- Public Korean-community-first search pass inspected approximately 50+ visible raw leads/results across Blind, TheQoo and searches targeting FMKorea/DCInside/Ruliweb/Ppomppu/Inven/Arca/NAVER/Daum cafe. NAVER Cafe robots restriction was not bypassed.
- 17 genuinely usable, non-duplicate C1 candidates were retained after filtering. One discovered duplicate (10-year-no-contact wedding song request) was immediately removed because it was already represented in the previous batch.
- Strong new examples: `결혼 이틀 전, 남친 아버지 개인회생을 알았습니다`, `신혼 선물로 플스5 사줬더니 주7일 게임합니다`, `빚 몇억 들고 온 의사 남편인데 시어머니는 더 부잣집 갈 수 있었다네요`, `나는 4천, 남친은 1천… 사랑하지만 결혼은 못 하겠습니다`, `축의금 10만원에 KTX 9만원… 월급 220이면 너무 큰가요?`.
- All retained records are C1_A0_P0 with exact individual public URLs, observed title, observation state and `publicationAllowed=false`. No source media was acquired.

## Sequential-candidate lane — latest state
- Processed exactly one next historical unprocessed candidate: `260916_개물림견주주장`.
- The candidate record had only a generic indexed claim and no exact individual source URL.
- Fresh public searches did **not** resolve a trustworthy exact source/event; returned material was generic dog-bite liability/background rather than evidence for this specific incident.
- Result: `BLOCKED_PROVENANCE`. Do not merge unrelated dog-bite incidents or infer the event.
- Unblock only when an exact individual source URL, distinctive source title/quote, or equivalent provenance identifier becomes publicly available.
- C0/A0/P0 and `publicationAllowed=false` remain. No source media was acquired and no publish action occurred.

## Queue refresh truth
- Stored queue remains the old snapshot and is stale while canonical `data/candidates` continues growing.
- Do not fabricate unseen identities to force a full queue rewrite.

## TEMP TEST ONLY conversion lane — latest state
- Historical non-discovery work only; do not touch it during the discovery automation.
- `temporaryTestOnly=true` and `publicationAllowed=false` remain mandatory. Real publishing/metrics remains DISABLED.

## Publication ownership / safety
Only **04_REVIEW_PUBLISH** may actually publish or mark P1. Human rights/privacy/safety approval remains required.

## Next discovery run
Continue new Korean-community-first material discovery and exact-source/provenance verification under the discovery-only override. Prefer fresh story-rich leads, dedupe against existing candidates, and do not enter production.