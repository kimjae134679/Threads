# NEXT RUN HANDOFF

Updated: 2026-09-19 08:24 KST

## AUTOMATION-SPECIFIC OVERRIDE — DISCOVERY ONLY
For the separate `Threads 소재 발굴` automation, the user's explicit automation instruction wins: **01_DISCOVERY only**. Do not enter 02_EDITORIAL_SCORING, 03_PRODUCTION, 04_REVIEW_PUBLISH, or 05_EXPERIMENTS_ACCOUNTS. Do not capture/download source media, render, run Chrome E2E, publish/schedule, or modify existing production artifacts. Keep A0/P0 and `publicationAllowed=false`.

## Latest discovery-only automation batch
- The 08:19 discovery run recorded 15 new C1 Markdown candidates in canonical `data/candidates/` after the historical 583-entry queue snapshot.
- Exact observed titles/provenance remain separate from content-facing titles. No discovery-only result implies A1/P1.

## Sequential-candidate lane — current
- This run processed exactly one next historical unprocessed candidate: `260916_6만원도난오해`.
- Exact public Bobaedream page verified: `https://www.bobaedream.co.kr/view?No=1032069&code=best&vdate=`; title `나 진짜 안 훔쳤다니까요? 6만원 때문에 생긴 일`.
- Direct page observation at this run showed 조회 15,256 / 추천 207 / 댓글 16. Public propagation index also links Bobaedream as the first source and a later Ruliweb repost.
- The substantive post is image-centric. The page exposes the image element but its contents were not treated as read/verified source bytes, so no story details were inferred. Candidate is logically C1 provenance-verified but remains A0/P0 and blocked on permitted real source-image inspection plus rights/privacy/defamation/human review.
- Previously blocked candidates remain blocked because their recorded unblock conditions did not change.
- Queue refresh truth: the stored JSON still has 583 entries, while the immediately preceding discovery handoff records 15 new canonical `data/candidates` files (598 observed total). Progress records this delta. Do not invent missing queue identities from truncated API output; regenerate the queue only from a complete directory enumeration.
- Next historical candidate after blocked/processed entries is expected to be `260916_98년생여자생퇴사`, subject to a complete queue regeneration preserving filename-ascending order.

## TEMP TEST ONLY conversion lane
- `03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/` remains strictly isolated with `temporaryTestOnly=true`, `publicationAllowed=false`.
- Added `tools/TEMP_TEST_ONLY_review-screen.html`, a TEMP-only browser review prototype using synthetic fixture text. It wires the existing in-memory adapter to slide inspection, Blob JSON download, and file restore. Restore continues to reject non-test/publishable models.
- Stage 14 is now PARTIAL and stage 13 remains PARTIAL: wiring exists, but actual browser click/download/fresh-page restore execution has not yet been verified.
- No third-party full body was persisted in this test screen. Canonical `04_REVIEW_PUBLISH` remains untouched.
- Next TEMP unit: execute this TEMP screen in a real browser environment and verify download → fresh-page restore; then proceed toward approval/runtime-reflection only inside TEMP isolation.

## Publication ownership / safety
Only **04_REVIEW_PUBLISH** may actually publish or mark P1. Human rights/privacy/safety approval remains required. No automation may infer approval from discovery, provenance, or TEMP tests.
