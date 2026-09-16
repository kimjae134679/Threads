# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 13:37 KST

## READ FIRST
Before work: `00_START_HERE/README.md` → this file → current `main`/recent commits → latest sequential ops note in `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Repo tip wins. Preserve `01_DISCOVERY → 02_EDITORIAL_SCORING → 03_PRODUCTION → 04_REVIEW_PUBLISH → 05_EXPERIMENTS_ACCOUNTS`; only 04 may publish.

## Latest Discovery refresh
Public search/index/page exploration screened **~47 materially distinct leads** across Korean-community-first queries and adjacent public search lanes. Restricted sources were not bulk crawled or bypassed. After dedupe, safety/comfort, story-potential and provenance filtering, **15 new candidate Markdown files** were retained under `data/candidates/`: **4 C1 + 11 C0**.

New C1: `당근 꿀 알바 하실분 구해용`, `결혼 전 vs 결혼 후 ㄷㄷㄷㄷㄷ`, `한중일 삼국마다 갈린다는 삼국지 최애케릭터.jpg`, `조선시대 부터 내려온 현피 전통`.

New C0 index leads: `승진 누락된 차장님이 퇴사를 안해`, `인생 망한 38살인데 인생상담 해줘라...`, `41세 비혼녀, 실제로 많이 듣는 말.`, `알뜰폰 개통했는데 이상한 문자가 온 디시인`, `말 못알아듣는다고 팀장이 강제로 헤드셋을 벗겼습니다.`, `허경환이 나이 들고 제일 후회한다는 것...`, `여행 유튜버의 현실`, `팁을 거절하는 종업원`, `아들 여친을 본 엄마 표정.mp4`, `연돈카레 제보한 디시인`, `얼마예요 묻자 거지취급하는 업체`.

Strongest newly verified C1 is `당근 꿀 알바 하실분 구해용`: observed 3,328 views / 0 recommendations / 14 comments, three source images indicated, but image body not read and bytes not acquired. `결혼 전 vs 결혼 후` has visible 10 comments / 5 recommendations and a short visible text punchline plus two images; view count was not reliably visible in the same observation and was not invented.

## Production state inherited
Automatic cover renderer remains in `app/source-intake.js`: N ordered original screenshots/media → one locally derived 1080×1080 cover + N faithful source slides. Export still requires `fullBodyCaptureStatus=complete`.

## Asset / publication truth
Full-post screenshots captured this Discovery run: **0**.
Actual source bytes acquired: **0**.
Completed real source-backed carousel: **NO**.
All newly retained candidates are A0/P0; `publicationAllowed=false`. No OCR/moderation/rights/publication success claimed.

## Next concrete priority
1. Resolve the strongest C0 workplace/relationship leads to exact public individual URLs and C1 only when provenance is verified.
2. Acquire the complete ordered original image set for `당근 꿀 알바` or another strong C1.
3. Feed one complete source set into the auto-cover intake and produce the first real 1080×1080 cover + full-post carousel.
4. Verify dimensions/readability/order in Chrome when browser tooling is available.
5. Continue Korean-community-first high-volume Discovery; no grouped JSON in `data/` root; keep P0 until 04 confirms actual publication.