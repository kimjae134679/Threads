# NEXT RUN HANDOFF

Updated: 2026-09-19 13:17 KST

## AUTOMATION-SPECIFIC OVERRIDE — DISCOVERY ONLY
For the separate `Threads 소재 발굴` automation, the user's explicit instruction wins: **01_DISCOVERY only**. Do not enter 02_EDITORIAL_SCORING, 03_PRODUCTION, 04_REVIEW_PUBLISH, or 05_EXPERIMENTS_ACCOUNTS. Do not capture/download source media, render, run Chrome E2E, publish/schedule, or modify existing production artifacts. Keep A0/P0 and `publicationAllowed=false`.

## Latest discovery-only state — batch 209
- Public Korean-community-first search inspected approximately 50+ visible raw results/leads across Blind, TheQoo and broader prioritized-domain queries. NAVER Cafe search access was blocked by robots and was not bypassed; several other community-domain queries returned weak/no usable public results and were not padded.
- Retained 15 new C1 records in canonical `data/candidates/`. Most are exact individual Blind pages; TheQoo records are explicitly marked repost provenance rather than original-source provenance.
- Strong examples: `결혼 직전 전재산 2억5천을 여동생 계좌로 빼놨습니다`, `신용대출 1억에 집담보까지 몰래 주식… 손실 80% 넘었습니다`, `대출 꽉 찼는데 카드론까지 받아 돈 빌려달라는 남편`, `입사 이틀 만에 청첩장 받았는데 그 직원은 그달 퇴사했습니다`, `주식빚 갚아줬는데 각서 쓰고도 또 5천만원 대출했습니다`.
- Every new record preserves exact observed title separately, only observed metrics, body/comment read state, and exact provenance/acquisition status. Partial long-body observations are marked BODY_PARTIAL rather than inferred complete.
- No screenshots, media downloads, OCR/moderation, production, rendering, Chrome E2E, publishing or scheduling were performed. All new records remain A0/P0 and `publicationAllowed=false`.

## Sequential-candidate lane — latest prior state
- Processed exactly one next historical candidate: `260916_결혼식5만원인간관계`.
- Fresh public search confirms the exact Blind title `결혼식 해보니까 오지도 않고 5만원만 보내는 사람들 많더라` exists. Exact individual Blind post URL/shortlink was NOT resolved.
- Result remains `BLOCKED_PROVENANCE`; A0/P0 and `publicationAllowed=false`.

## Queue refresh truth
- Discovery continues adding candidates, so canonical `data/candidates` is larger than the stored sequential queue.
- Available large-directory/recursive connector responses can truncate. Do not fabricate unseen identities to force a full rewrite. Rebuild only from complete enumeration.

## Publication ownership / safety
Only **04_REVIEW_PUBLISH** may actually publish or mark P1. Human rights/privacy/safety approval remains required.

## Next discovery automation run
Continue new Korean-community-first discovery plus exact-source verification of useful existing C0 candidates. Aim for 40–80 raw / 15–30 retained when public coverage supports it. Do not enter production even if the material pool is large.
