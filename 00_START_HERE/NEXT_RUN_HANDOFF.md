# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 03:33 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## This run — fresh exact-URL discovery sweep
Started from prior handoff state after direct Korean-source reverification. Public/index search covered Blind, DCInside index, Inven, TheQoo/Ppomppu/Ruliweb/FMKorea/Arca search attempts, Reddit and YouTube queries. Search quality was uneven across sources; no anti-bot/login bypass or restricted-source bulk crawl was used.

Created `data/260916_C1_A0_P0_discovery_0333.json` with **31 raw inspected leads / 10 retained exact-URL candidates / 21 rejected or deprioritized**. Every retained record has exact observed title, exact public URL, observation time, only visible metrics, body/comments read truth, source-media observation, hook, story progression, weakness, acquisition state and fail-closed rights/privacy/human gates.

### Top retained
1. Blind `결혼 한달 남았는데 파혼..` — https://www.teamblind.com/kr/post/%EA%B2%B0%ED%98%BC-%ED%95%9C%EB%8B%AC-%EB%82%A8%EC%95%98%EB%8A%94%EB%8D%B0-%ED%8C%8C%ED%98%BC-8b4ol727 — observed 1,846 views / 53 comments; body read; ASSETS_PENDING.
2. Blind `파혼 해야 할까요..` — https://www.teamblind.com/kr/post/%ED%8C%8C%ED%98%BC-%ED%95%B4%EC%95%BC-%ED%95%A0%EA%B9%8C%EC%9A%94-24j6ob7m — observed 1,043 views / 45 comments; body read; ASSETS_PENDING.
3. Blind `결혼 돈 문제` — https://www.teamblind.com/kr/post/%EA%B2%B0%ED%98%BC-%EB%8F%88-%EB%AC%B8%EC%A0%9C-x4bfqs7m — observed 201 views / 5 comments; body+comments read; ASSETS_PENDING.
4. Blind `예단은 어느정도 해야해?` — https://www.teamblind.com/kr/post/%EC%98%88%EB%8B%A8%EC%9D%80-%EC%96%B4%EB%8A%90%EC%A0%95%EB%8F%84-%ED%95%B4%EC%95%BC%ED%95%B4-hmur4vk7 — observed 309 views / 21 comments; body read; ASSETS_PENDING.
5. Blind `파혼` — https://www.teamblind.com/kr/post/%ED%8C%8C%ED%98%BC-iscybzlg — observed 148 views / 2 likes / 4 comments; body+comments read; ASSETS_PENDING; contains derogatory language so Audience Comfort editing/review required.
6. Inven `여친이 삐졌을때 하지말아야하는 행동` — https://www.inven.co.kr/board/webzine/2097/2727900 — observed 5,573 views / 2 recommendations / 11 comments; real image visible on source page but not captured; rights UNKNOWN.
7. Inven `당신의 첫 휴대폰은 이 중에 몇 번?` — https://www.inven.co.kr/board/webzine/2097/2727902 — observed 4,859 views / 2 recommendations / 55 comments; real image visible but not captured; rights UNKNOWN.

Also retained: Inven `남자친구에게 선물을 주는 일본인 여자친구`, Blind `여자친구 생일선물 안주는`, Blind `결국엔 이렇게 30대 마지막 연애가 끝났다`.

Explicitly excluded: a Blind post containing death-wish/self-harm language; sexual/body-focused candidate; ordinary stock-tax question; generic FIRE/investment advice; repetitive political item. Investment lane remains human-consequence-first; no ordinary market/rate/stock-news candidate was retained.

## State truth
All new retained candidates are `C1_A0_P0`, `publicationAllowed=false`, rights UNKNOWN and human review required. No source screenshot/image file was captured into Source Package, so A1 was not reached. No publication occurred.

## Real source-backed result
**Still not complete.** Inven source images were visibly observed on public pages, but no asset file was actually acquired. No 1080×1080 carousel was generated or Chrome-verified. All remain ASSETS_PENDING/A0.

## Best next asset targets
1. Inven `여친이 삐졌을때 하지말아야하는 행동` — visual-first, current, simple reveal structure; first verify original image provenance/rights.
2. Inven `당신의 첫 휴대폰은 이 중에 몇 번?` — visual + 55 comments; strong participation CTA, but original image provenance required.
3. Blind `결혼 한달 남았는데 파혼..` — strongest fresh story progression; needs compliant/manual screenshot intake rather than bypassing Blind controls.

## Validation truth
Data/docs only changed. Runtime code did not change, so npm/browser/ffmpeg tests were not rerun or claimed. No OCR/moderation/API/publication result is claimed.

## Commits this run
- `9fb12cf9774923ff5869d29aefe173ec7adacf5a` — fresh exact-URL Discovery batch

## Next concrete priority
Continue toward 40–80 raw coverage across more Korean sources when search indexing permits, but do not pad weak duplicates. More importantly, acquire one compliant real source image/screenshot set from a top C1 candidate, run screenshot intake → Source Package → 1080×1080 carousel → actual Chrome dimension/readability verification, and only then mark A1. Only 04 may ever set P1 after actual publication success.
