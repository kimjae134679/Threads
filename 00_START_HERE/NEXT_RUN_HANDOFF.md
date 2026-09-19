# NEXT RUN HANDOFF

Updated: 2026-09-19 13:29 KST

## AUTOMATION-SPECIFIC OVERRIDE — DISCOVERY ONLY
For the separate `Threads 소재 발굴` automation, the user's explicit instruction wins: **01_DISCOVERY only**. Do not enter 02_EDITORIAL_SCORING, 03_PRODUCTION, 04_REVIEW_PUBLISH, or 05_EXPERIMENTS_ACCOUNTS. Do not capture/download source media, render, run Chrome E2E, publish/schedule, or modify existing production artifacts. Keep A0/P0 and `publicationAllowed=false`.

## Latest discovery-only state — batch 209
- Public Korean-community-first search inspected approximately 50+ visible raw results/leads across Blind, TheQoo and broader prioritized-domain queries. NAVER Cafe search access was blocked by robots and was not bypassed; several other community-domain queries returned weak/no usable public results and were not padded.
- Retained 15 new C1 records in canonical `data/candidates/`. Most are exact individual Blind pages; TheQoo records are explicitly marked repost provenance rather than original-source provenance.
- Strong examples: `결혼 직전 전재산 2억5천을 여동생 계좌로 빼놨습니다`, `신용대출 1억에 집담보까지 몰래 주식… 손실 80% 넘었습니다`, `대출 꽉 찼는데 카드론까지 받아 돈 빌려달라는 남편`, `입사 이틀 만에 청첩장 받았는데 그 직원은 그달 퇴사했습니다`, `주식빚 갚아줬는데 각서 쓰고도 또 5천만원 대출했습니다`.
- Every new record preserves exact observed title separately, only observed metrics, body/comment read state, and exact provenance/acquisition status. Partial long-body observations are marked BODY_PARTIAL rather than inferred complete.
- No screenshots, media downloads, OCR/moderation, production, rendering, Chrome E2E, publishing or scheduling were performed. All new records remain A0/P0 and `publicationAllowed=false`.

## Sequential-candidate lane — latest state
- Processed exactly one next historical candidate: `260916_결혼식축의금5만원논쟁`.
- Exact public individual Inven source resolved: `https://www.inven.co.kr/board/webzine/2097/2728407`, title `결혼식 해보니까 오지도 않고 5만원 내는 사람 많더라`, displayed author `치킨`, posted `2026-09-16 07:15`.
- Fresh observation: views 6,148 / recommendations 2 / comments 31. The substantive body is image-centered; exposed body text is only a dot, so image contents were not inferred or transcribed.
- Logical provenance is C1, but source asset acquisition remains blocked pending a permitted real image/asset. A0/P0 and `publicationAllowed=false` remain.

## TEMP TEST ONLY conversion lane — latest state
- Added `03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/tools/title-suggestion-input-guard.js` for item 12.
- Title suggestion input is refused unless exact source provenance is verified and verified source text is supplied. It carries the TITLE_STYLE_GUIDE constraints: preserve exact observed title separately, use only verified facts, do not invent numbers/quotes/motives/crimes, prefer 18–34 chars, one core conflict.
- This does not generate/publish a title by itself. Actual title UI wiring remains pending. Browser harness execution evidence also remains pending; items 13–15 stay PARTIAL.
- TEMP invariants remain `temporaryTestOnly=true`, `publicationAllowed=false`.

## Queue refresh truth
- Discovery continues adding candidates, so canonical `data/candidates` is larger than the stored sequential queue (last safely observed 614 vs stored 583).
- Available large-directory/recursive connector responses can truncate. Do not fabricate unseen identities to force a full rewrite. Rebuild only from complete enumeration.

## Publication ownership / safety
Only **04_REVIEW_PUBLISH** may actually publish or mark P1. Human rights/privacy/safety approval remains required.

## Next sequential run
- Skip blocked candidates unless their recorded unblock condition changed.
- Next known historical filename-order candidate is `260916_결혼잘사는부부특징` unless a complete queue rebuild proves an earlier unseen candidate.
- TEMP: connect title-suggestion UI only through the verified-input guard, or obtain actual browser harness PASS evidence in a real browser/static HTTP environment. Do not claim browser completion without observed evidence.

## Next discovery automation run
Continue new Korean-community-first discovery plus exact-source verification of useful existing C0 candidates. Aim for 40–80 raw / 15–30 retained when public coverage supports it. Do not enter production even if the material pool is large.
