# NEXT RUN HANDOFF

Updated: 2026-09-17 16:35 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 is cover only (one image + original title/hook, unchanged by default). Slide 2+ are ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summarized/interstitial/CTA body cards. UI chrome crop only when body is preserved. Privacy masking is user-directed only. Missing real source assets means `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → 1080x1080 contain/no-stretch normalization → strict source-backed carousel plan → strict carousel-plan validation. `build-source-backed-carousel-plan.mjs` enforces COVER_ONLY slide 1 and ORIGINAL_POST_SCREENSHOT slide 2+, contiguous source order/provenance, no body crop, no automatic privacy masking, `publicationAllowed=false`, publish owner `04_REVIEW_PUBLISH`. `validate-source-backed-carousel-plan.mjs` independently rejects missing/reordered body slides, mixed capture URLs, missing provenance, stretch/body-crop policy violations, missing forbidden editorial-card classes, or publish-gate drift before a renderer can consume the plan.

## Latest Discovery refresh
Discovery refresh at 2026-09-17 16:35 KST:
- raw inspected: 40+ public search/index/page leads across Korean-community-first searches; restricted/robots-blocked sources were not bypassed
- retained: 5 new C1_A0_P0 after dedupe/story/safety/access filtering
- new exact-title candidates:
  - Blind `가족 끼리 엮인 빚 상담해주세요..` — family debt / 16% loan burden; body partially read; 302 views / 11 comments observed
  - Blind `첫만남에 돈얘기 꺼냈던 황당 소개팅녀` — first-date salary/financial-control questions; full body read; 950 views / 1 like / 32 comments
  - Blind `결혼을 앞둔 남자친구의 주식 빚 숨겨줘야할까?` — second investment accident, ~50M KRW stock debt before marriage; body partially read; 4,054 views / 86 comments
  - Blind `한 주식에 몰빵했는데 아직은 두렵지 않네` — 50M loan + 20M card loan all-in, source account images present; full body read; 3,479 views / 5 likes / 13 comments
  - Blind `결혼 주선자 사례 X, 청첩장 못 받음. 축의금 해야돼?` — introducer not invited / 300k–600k gift conflict; full body read; 4,072 views / 2 likes / 41 comments
- top candidates this run: `한 주식에 몰빵했는데 아직은 두렵지 않네`, `결혼을 앞둔 남자친구의 주식 빚 숨겨줘야할까?`, `결혼 주선자 사례 X, 청첩장 못 받음. 축의금 해야돼?`
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## Asset truth
All five new candidates remain `ASSETS_PENDING / C1_A0_P0 / publicationAllowed=false`. The leveraged-stock candidate's public page visibly references two attached account images, but the actual image bytes/screenshots were not acquired, so it remains A0. No OCR/moderation/rights/publication success is claimed.

## Next highest-priority work
1. Acquire a permitted complete screenshot sequence for a strong Korean C1, prioritizing the leveraged-stock candidate because source account images are visibly present, or another strong full-body Korean candidate.
2. Run intake → explicit completeness verification → normalization → strict carousel plan → independent validator on real bytes.
3. Render first real 1080x1080 cover + full-post screenshot carousel and inspect in Chrome.
4. Continue Korean-first high-volume discovery/ranking; target 40–80 raw and 15–30 retained when genuinely usable coverage permits.
5. Run targeted tests + `npm run check`/server/browser E2E when an executable checkout becomes available.
