# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 02:34 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins over stale handoffs. Continue unfinished concrete work before inventing a new task.

Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish. Rights/privacy/Audience Comfort/current human approval fail closed. Never fabricate API/OCR/moderation/engagement/rights/credentials/delivery/publication or persist plaintext secrets.

## Latest discovery run
Added `data/260916_C1_A0_P0_discovery_0234.json` at Threads commit `1db77620525fd6e7d3f08097658a1159e60d7bf2`.

Fresh web search was broader than the retained set and included Korean-community/story/investing queries; weak, stale, unsafe and irrelevant results were discarded rather than padded into the batch. Five provenance-safe C1 records were retained because the exact page URL and title were actually observed. Where the page is a news report describing a Blind/community post, the record explicitly says it is a **secondary report**, not a directly observed Blind page. No direct-community engagement is invented.

Top retained story group is the Blind wedding-fund investment disaster, observed through two separate public reports and deduped into one `sameStoryGroup`:
1. `결혼자금 5500만원 주식으로 날렸다…"파혼 고민" 예비신부 눈물` — https://news.nate.com/view/20260807n06112
2. `5500만원 날리고 빚만 3000만원…"결혼 앞두고 급등주 탔다가 망했습니다"` — https://v.daum.net/v/20260807092254631

This matches current investment taste: human consequence, large loss, debt and marriage conflict—not ordinary market news.

Other retained:
3. `일하기 싫어서 푸는 우리 회사 썰` — https://www.inven.co.kr/board/lostark/6271/4061413 — direct Inven page; observed 52 views / 1 recommendation / 2 comments at the indexed snapshot; body read, comments not read.
4. `"임신이 무기냐" 10년 연애 끝 신혼집 명의 다툼에 파혼 위기` — https://www.insight.co.kr/news/570506 — secondary report; no engagement claimed.
5. `수년 만난 연인과 결혼 직전 파혼...“수십 년의 미래가 사라졌다” 먹먹한 고백` — https://www.insight.co.kr/news/572325 — secondary report; article explicitly uses an AI-generated illustrative image, therefore that image is NOT eligible as the required real source asset.

## State truth
All five retained records are `C1_A0_P0`: exact observed public page provenance exists, but no actual source screenshot/image set was acquired and no publication occurred. `publicationAllowed=false`, rights UNKNOWN, privacy/human review required.

The older `kr-high-volume-2026-09-16-0128` 35 records remain quarantined C0 leads because exact per-candidate URLs were missing. Do not reuse their old metrics as canonical until re-observed.

## Real source-backed result
**NOT YET COMPLETED.** No new source screenshots/images were captured in this discovery run. All new candidates remain `ASSETS_PENDING`; A1 and P1 were not reached.

## Next concrete priority
1. Try to locate/verify the direct original public/community page for the wedding-fund 55M stock-loss story without bypassing Blind controls. If direct access is unavailable, retain the secondary provenance and seek permitted/manual/user screenshot intake rather than pretending the article image is the original asset.
2. Acquire one compliant real screenshot/image set from a strong Korean candidate; prioritize visual/story progression.
3. Screenshot intake → Source Package → 1080×1080 carousel → Chrome verification; only then A1.
4. Continue high-volume Korean discovery, but every normal candidate must have exact title+URL. URL-less leads stay C0/quarantine.
5. Only 04 may ever mark P1 after actual publication success.

## Validation truth
This run changed Discovery JSON/handoff only, not runtime code. No npm/browser/ffmpeg run is claimed. Last actual known runtime validation remains the prior authorized Windows `npm run check` PASS and vertical ffmpeg/ffprobe PASS.
