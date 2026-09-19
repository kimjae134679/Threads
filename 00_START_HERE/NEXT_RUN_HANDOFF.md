# NEXT RUN HANDOFF

Updated: 2026-09-19 21:16 KST

## AUTOMATION-SPECIFIC OVERRIDE — DISCOVERY ONLY
For the separate `Threads 소재 발굴` automation, the user's explicit instruction wins: **01_DISCOVERY only**. Do not enter production/review/publish from that automation.

## Discovery automation — latest
- Latest discovery note: `01_DISCOVERY/ops/222-sol.md`.
- This run reviewed 40+ raw public/indexed leads and retained 15 new C1 candidates.
- All discovery candidates remain A1=false, P1=false, publicationAllowed=false.
- Top new titles include `결혼 전 청약된 집 빚 갚는 문제`, `개빡친다 남편 너무 멍청함`, `돈돈돈 거리는 남편 스트레스받아`, `계속 카톡방 들어오라는 시어머니`, and `“모은 돈 5천만원” 결혼하자던 남친, 알고 보니 재산 4억…“시험해봤다네요” 황당`.
- One image-led TheQoo candidate was retained with bodyRead=false and no image reconstruction.

## Sequential candidate lane — prior state preserved
- Prior handoff observed 851 Markdown candidates excluding README before this discovery run. This run adds 15 candidate files only; it does not perform the separate sequential-production lane.
- Prior identity-safe queue warning remains relevant; do not use a strict filename parser that drops legacy/nonstandard names.

## Publication ownership / safety
Only `04_REVIEW_PUBLISH` may publish or mark P1 after human rights/privacy/safety approval. Discovery automation must keep publicationAllowed=false and must not perform screenshots, image acquisition, OCR, production, rendering, Chrome E2E, review/publish, or provider work.
