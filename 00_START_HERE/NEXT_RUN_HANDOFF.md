# NEXT RUN HANDOFF

Updated: 2026-09-19 KST

## CURRENT USER OVERRIDE — DISCOVERY ONLY
Until the user explicitly changes this again, work on **01_DISCOVERY / 소재 발굴 only**.

Do NOT continue 02_EDITORIAL_SCORING, 03_PRODUCTION, 04_REVIEW_PUBLISH, or 05_EXPERIMENTS_ACCOUNTS work. Do NOT capture screenshots, download source media, build/crop/normalize carousels, render images/video, run publishing/provider work, or modify existing production assets. Existing role ownership remains intact and only 04_REVIEW_PUBLISH may ever publish.

## Discovery operating rule
Korean-community first: Blind, DCInside, FMKorea, TheQoo, Instiz, Ruliweb, Ppomppu, Clien, Inven, Arca, NAVER/Daum cafes, then public Threads/Instagram/Reddit/YouTube/news.

For each useful run, when coverage allows:
- inspect roughly 40–80 raw leads;
- retain roughly 15–30 genuinely usable candidates after dedupe/safety/access/story filtering;
- prioritize funny/absurd true stories, workplace conflict, dating/marriage arguments, money/gifts/debt/lottery, family drama, embarrassing misunderstandings, reversals, relatable annoyance, and posts that trigger instant opinions;
- do not rank by views alone.

Restricted sources must not be bulk crawled or accessed by bypassing login/anti-bot controls.

## Canonical material location
The main material pool is **`data/candidates/`**. One candidate = one Markdown file. New discovery belongs there rather than in a parallel pool.

For each retained candidate record source, exact/public URL if actually verified, exact observed title, observation time, only visible metrics, whether full body/comments were actually read, whether source images/screenshots are known to exist, why it is usable, and exact provenance/acquisition state. Exact individual public source = C1; only index/list provenance = C0. Do not invent body text, metrics, rights, OCR/moderation, assets, or publication state.

Candidate files should also include a concise **내용 확인 요약** when the public body was actually read, so the user can evaluate the premise quickly. Do not copy entire copyrighted posts into the repository; retain the exact public source URL for full-source review.

## Latest discovery truth
Latest discovery-only refresh (ops 190): approximately **20 visible raw leads/results inspected / 3 retained C1**. Coverage was below the desired 40–80 because prioritized community search access was partly blocked and weak/duplicate results were not padded.

New retained candidates:
- `[네이트판] ATM남편 된 것 같은데.. 이혼해야 할까요?`
- `반반결혼의 최후 (애로부부 캡쳐)`
- `[네이트판] 아침밥 때문에 결혼식하고 이혼`

Earlier notable material includes:
- 우리집 홈캠을 보고 계셨던 시어머니.
- 너무 많이 먹는 남편 ㅠㅠ
- 아이이름 짓는데 술집여자 같다는 남편
- 결혼 승낙 받자마자 탈모인거 밝힌 남편..
- 나몰래 대출받은 남편
- 주식중독 남편.. 대출 막는법 있을까?
- 친구 결혼 2만달러 대출
- 카지노 잭팟 약혼녀 빚
- 코인 대출 남편
- 파혼 뒤 결혼비용 상환 요구
- 형 결혼식 800달러 선물 취소
- 호텔 결혼 축의금 얼마

## Existing production assets
Existing source packages/carousels are historical work only. Leave them untouched while this DISCOVERY ONLY override is active.

## Next
Only continue high-volume material discovery and exact-source/provenance verification. Keep adding strong candidates to `data/candidates/`. Do not turn any candidate into screenshots, carousels, videos, or publications unless the user later explicitly reopens production.