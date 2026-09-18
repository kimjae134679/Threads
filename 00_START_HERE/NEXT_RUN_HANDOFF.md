# NEXT RUN HANDOFF

Updated: 2026-09-19 08:19 KST

## AUTOMATION-SPECIFIC OVERRIDE — DISCOVERY ONLY
For the separate `Threads 소재 발굴` automation, the user's explicit automation instruction wins: **01_DISCOVERY only**. Do not enter 02_EDITORIAL_SCORING, 03_PRODUCTION, 04_REVIEW_PUBLISH, or 05_EXPERIMENTS_ACCOUNTS. Do not capture/download source media, render, run Chrome E2E, publish/schedule, or modify existing production artifacts. Keep A0/P0 and `publicationAllowed=false`.

## Latest discovery-only automation batch
- Approximately 50 visible raw leads/results inspected across Korean-community-first searches plus Reddit support; 15 retained as new C1 candidate Markdown records in `data/candidates/`.
- Korean-community searches covered Blind, TheQoo, Inven and attempted FMKorea/Ruliweb/Ppomppu/Arca/DCInside; Instiz/Clien public search access was robots-blocked and was not bypassed.
- Strong new titles include: `집값 떨어졌으니 부모님 지원 1억도 3천이라는 예신`, `남편 청약집 빚 갚는데 처가에서 5천 더 빌려오랍니다`, `공평하게 결혼했는데 결혼 후엔 남자쪽에 맞추랍니다`, `200일 만난 남친, 대학 어디냐고 물었더니 짐 싸서 나갔습니다`, `딸 결혼식에 3만5천달러 줬는데 7만달러 전부 내달랍니다`.
- Exact observed titles are preserved separately from content-facing titles. Only actually visible metrics were recorded. One Reddit candidate explicitly records that provenance is an exact public repost rather than the original individual source.
- No screenshots/media downloads, production, rendering, E2E, provider work, publishing or scheduling were performed. All new candidates remain A0/P0 with `publicationAllowed=false`.

## Sequential-candidate lane — current
- The requested historical queue source remains `data/candidates`: stored queue was previously recorded as 583 entries before fresh additions. Fresh discovery also exists under `01_DISCOVERY/candidates`; do not silently merge cross-directory identities unless queue policy is explicitly changed.
- `260916_2026회사별느낌`, `260916_25살연애불가능할까`, and `260916_27살여자오늘파혼` remain blocked at permitted source-asset acquisition.
- Previous sequential run processed `260916_41세비혼녀` and verified its exact public Inven page. This discovery automation did not continue that production-adjacent lane.
- Next historical sequential key previously recorded: `260916_6만원도난오해`, unless queue/progress changes.

## TEMP TEST ONLY conversion lane
- `03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/` remains strictly isolated, `temporaryTestOnly=true`, `publicationAllowed=false`.
- Previous run recorded a passing synthetic-only conversion/restore unit. This discovery automation did not touch or execute it.

## Publication ownership / safety
Only **04_REVIEW_PUBLISH** may actually publish or mark P1. Human rights/privacy/safety approval remains required. No automation may infer approval from discovery or provenance.