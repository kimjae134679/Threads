# NEXT RUN HANDOFF

Updated: 2026-09-17 11:38 KST

## Start here
Repo tip wins. Preserve the role chain:
`01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`.
Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success and never store plaintext secrets.

## User-facing format is binding
- Old black-background text-only Demo Showcase/storyboard is regression/developer material only.
- Slide 1: cover only, one image + original post title/hook; original title unchanged by default.
- Slide 2+: original source screenshots in order, covering the FULL original post body.
- No summarizing/paraphrasing/rewriting/dropping body text in the carousel.
- UI/browser chrome may be cropped only if body content is preserved.
- No automatic explanatory/summary/reaction/CTA cards between screenshots.
- No automatic privacy masking. User-directed masking only.
- Source-attached media should remain in the source sequence where relevant.
- If real screenshots/source assets are unavailable, remain `ASSETS_PENDING`; never synthesize body cards.
- Square carousel target: 1080×1080. Vertical video is a separate 1080×1920 renderer; never stretch square cards.

## Current screenshot-intake implementation
`scripts/build-screenshot-intake-manifest.mjs` records ordered screenshot sequence, dimensions, byte length, SHA-256, exact public capture URL, observation time and explicit acquisition state. `scripts/plan-screenshot-normalization.mjs` validates sequence/provenance and plans 1080×1080 no-stretch normalization. UI-chrome crop remains manual/verified; body crop and automatic privacy masking remain forbidden.

## Latest Discovery baseline
Discovery refresh at 2026-09-17 11:38 KST:
- raw inspected: 40+ public search/index leads across Korean-community-first multi-lane queries plus Reddit/other public lanes; restricted sources were not bypassed.
- retained as new candidate files: 4 C1_A0_P0.
- top new candidates:
  1. Blind `이혼 고민 (빚쟁이인 나...백수 남편)` — exact public URL; observed 조회수 24K / 댓글 260; 코인빚 6,400만원 + 장기 미취업 배우자 + 추가 금전/집안 갈등.
  2. Blind `자꾸 빚 내서 미국주식 사자는 남편` — exact public URL; observed 조회수 1,078 / 댓글 11; 약 2억원 투자, 그중 약 1억원 회사대출, 배우자 병원대출까지 받아 테슬라/엔비디아/비트코인 추가매수 제안.
  3. Blind `헤어지는게 맞을까..?` — exact public URL; observed 조회수 610 / 댓글 14; 재산보다 큰 빚으로 코인/선물/주식 투자, 절반 손실 및 약속 위반 뒤 결혼 5개월 신뢰 붕괴.
  4. Blind `빚 숨기고 결혼한 남편` — exact public URL; observed 조회수 117 / 댓글 5; 기존 빚 외 휴대폰 경품 뽑기 중독 추가빚 1,800만원 고백과 임신/결혼 갈등.
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Material repo changes: four individual Markdown candidates added under `data/candidates/`; no grouped discovery JSON was created. Exact URLs and only same-snapshot visible metrics were recorded. All remain `ASSETS_PENDING`, A0/P0, `publicationAllowed=false`; rights/privacy/human review remain required and only 04_REVIEW_PUBLISH may publish.

No source screenshot bytes were acquired. No OCR/vision/moderation/rights/publication success is claimed. Executable checkout/Node/Chrome were unavailable through the current connector surface, so npm check/server smoke/browser E2E were not executed or claimed.

## Next highest-priority work
1. Acquire permitted full-post screenshot sequences for the four strongest Korean C1s above, starting with the 24K/260-comment crypto-debt marriage conflict.
2. Feed real ordered files through screenshot intake with truthful acquisition state.
3. Manually verify full-body coverage, normalize no-stretch/UI-chrome-only, and produce first real cover + source-screenshot carousel.
4. Inspect actual 1080×1080 output in Chrome.
5. Continue Korean-first high-volume Discovery in parallel without filler.
