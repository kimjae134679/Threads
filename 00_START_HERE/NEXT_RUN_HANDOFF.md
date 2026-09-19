# NEXT RUN HANDOFF

Updated: 2026-09-20 06:15 KST

## AUTOMATION-SPECIFIC OVERRIDE — DISCOVERY ONLY
For the separate `Threads 소재 발굴` automation, the user's explicit instruction wins: **01_DISCOVERY only**. Do not enter editorial scoring, production, review/publish, or experiments/accounts from that automation.

## Discovery automation — latest
- Latest discovery-only ops note: `01_DISCOVERY/ops/240-sol.md`.
- Raw lead review: 40+ Korean-community-first public/indexed leads; retained 15 new C1 candidates.
- Top new titles include `밑에 파혼 후기가 있어서.. 세 번 파혼한 후기`, `모순이 집 가서 결혼허락 받은 썰`, `친구가 나를 질투하는 것 같은 후기`, `자소서에 교육내역 날짜 잘못 입력한채로 제출했는데 어떡하지?`, `사소한 것에 크게 서운한 후기(스압)`, `[판] 아마 나때문에(?) 시동생 파혼당함 (?)`.
- All retained candidates remain A1=false, P1=false, publicationAllowed=false. Reposts were labeled as repost provenance; ambiguous/unobserved metrics and image state were not invented; comments were not claimed read and poster allegations were not promoted to verified facts.
- Next discovery run: continue finding new material and verifying exact provenance only; do not advance candidates into production even if the pool is sufficient.

## Sequential candidate/TEMP lane — latest
- Latest sequential/TEMP note: `01_DISCOVERY/ops/239-sol.md`.
- Queue refresh retried, but `data/candidates` connector enumeration is still truncated. Do not overwrite the 836-entry canonical queue from an incomplete identity list; prior observed-current count remains 866.
- Processed exactly one next unprocessed stored filename-order candidate: `260916_MZ신입9개월느낀점`.
- Exact individual Inven source verified: `https://www.inven.co.kr/board/webzine/2097/2727901`, post ID `2727901`, author/time `Earth / 2026-09-15 07:22`, same-page observation 조회 14,154 / 추천 14 / 댓글 46.
- The post is image-centric. Actual image bytes/OCR/vision were not acquired, so no image-body claims were invented. Logical C1 provenance only; A0/P0 and publicationAllowed=false remain.
- TEMP actual 8-slide output remains at `03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/260916_2026회사별느낌/TEMP_TEST_ONLY_actual-output-v1/`.
- Added `TEMP_TEST_ONLY_review-bundle-manifest.json`, defining the exact ordered v1 review bundle and fail-closed restore contract. This is stage-13/14 wiring only, not approval or a claimed browser roundtrip.
- Stage 15 remains BLOCKED pending human TEMP-version selection and direct OS-download -> fresh-page restore -> digest-equality observation. Stage 16 remains DISABLED. No real candidate state is upgraded by TEMP tests.

## Publication ownership / safety
Only `04_REVIEW_PUBLISH` may publish or mark P1 after human rights/privacy/safety approval. Restricted sources must not be bypassed; no missing body/comments/metrics/screenshots/media/OCR/rights/moderation state may be invented.
