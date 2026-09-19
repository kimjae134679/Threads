# NEXT RUN HANDOFF

Updated: 2026-09-19 14:17 KST

## AUTOMATION-SPECIFIC OVERRIDE — DISCOVERY ONLY
For the separate `Threads 소재 발굴` automation, the user's explicit instruction wins: **01_DISCOVERY only**. Do not enter 02_EDITORIAL_SCORING, 03_PRODUCTION, 04_REVIEW_PUBLISH, or 05_EXPERIMENTS_ACCOUNTS. Do not capture/download source media, render, run Chrome E2E, publish/schedule, or modify existing production artifacts. Keep A0/P0 and `publicationAllowed=false`.

## Latest discovery-only state — batch 211
- Korean-community-first public search inspected approximately 50+ visible raw results/leads across Blind and broader prioritized-domain queries. NAVER Cafe, Clien and Instiz were blocked by robots and were not bypassed; weak/no-result community queries were not padded.
- Retained 15 new C1 records in canonical `data/candidates/`, each with an exact individual public Blind URL.
- Strong examples: `부모가 소개팅 장소를 사전답사`, `가족 빚 갚는 남친이 주변 사람 밥·대리비까지 부담`, `돈 많이 가져오는 며느리를 원해 결혼 반대`, `10년 못 본 친구가 갑자기 결혼식 축가 부탁`, `내가 10만원 냈는데 4인가족이 와서 5만원 축의`.
- Every new record preserves exact observed title separately, only observed metrics, body/comment read state, and exact provenance/acquisition status. Partial observations are marked BODY_PARTIAL rather than inferred complete.
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
