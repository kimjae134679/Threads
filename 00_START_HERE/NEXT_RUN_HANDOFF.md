# NEXT RUN HANDOFF

Updated: 2026-09-17 19:52 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → strict source-backed carousel plan → validator.

## This run — Discovery refresh
Started from current README, handoff, main/recent commits and ops `144-sol.md`.

Public search/index/page exploration inspected raw 40+ leads across Korean-community-first queries plus Reddit fallback. Restricted sources were not bulk crawled or bypassed. Clien/Instiz search surfaces were robots-blocked and were not bypassed. Retained 9 genuinely usable new C1 candidates, each as one Markdown file under `data/candidates/`; no grouped discovery JSON was created.

Top retained:
1. Blind `이혼 고민 (빚쟁이인 나...백수 남편)` — https://www.teamblind.com/kr/post/%EC%9D%B4%ED%98%BC-%EA%B3%A0%EB%AF%BC-%EB%B9%9A%EC%9F%81%EC%9D%B4%EC%9D%B8-%EB%82%98%EB%B0%B1%EC%88%98-%EB%82%A8%ED%8E%B8-DbRE4niW — 24K / 댓글260.
2. Blind `맨날 사고치는 남편` — https://www.teamblind.com/kr/post/%EB%A7%A8%EB%82%A0-%EC%82%AC%EA%B3%A0%EC%B9%98%EB%8A%94-%EB%82%A8%ED%8E%B8-TwPZyVip — 7,226 / 댓글65.
3. Blind `협의이혼시 이런 경우는 재산분할 어떻게해?` — https://www.teamblind.com/kr/post/%ED%98%91%EC%9D%98%EC%9D%B4%ED%98%BC%EC%8B%9C-%EC%9D%B4%EB%9F%B0-%EA%B2%BD%EC%9A%B0%EB%8A%94-%EC%9E%AC%EC%82%B0%EB%B6%84%ED%95%A0-%EC%96%B4%EB%96%BB%EA%B2%8C%ED%95%B4-NkMQz02Z — 1,581 / 댓글19.
4. Blind `결혼 전 청약된 집 빚 갚는 문제때문에 너무 싸움이 커진다..` — 174 / 댓글9, 최신 공개 노출.
5. Blind `코로나 이후 자산 변화 현타 심함` — 자산 3~4억→빚 1억→재축적 4천만원 코인선물 청산의 사람 중심 투자 실패 서사.

Also retained: `배우자 빚 회생 신청`, `친동생 결혼 축의금 질문`, `결혼 비용및 축의금 정산 의견 차이`, `결혼준비중인데 상대방부모님께 이정도 지원될까?`.

## Asset truth
Full-post screenshots captured this run: 0. Actual source bytes acquired: 0. Real source-backed carousel produced: NO. New candidates are C1_A0_P0 and remain `ASSETS_PENDING / publicationAllowed=false`. A1/P1: 0. Rights/privacy/human-review gates remain; only 04_REVIEW_PUBLISH may publish.

## Next
1. Continue Korean-community high-volume discovery; favor fresh exact individual URLs and diversify beyond marriage/debt when strong material appears.
2. Acquire one permitted complete screenshot sequence for the strongest C1 (`이혼 고민...` or `맨날 사고치는 남편`) using public/manual capture path without access-control bypass.
3. Run source-first chain on real bytes and render/inspect first real 1080x1080 carousel.
4. Execute regression tests plus `npm run check`/server smoke/Chrome E2E when executable checkout is available.
