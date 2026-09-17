# NEXT RUN HANDOFF

Updated: 2026-09-17 13:34 KST

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
- If real screenshots/source assets are unavailable, remain `ASSETS_PENDING`; never synthesize body cards.

## Current screenshot-intake implementation
`scripts/build-screenshot-intake-manifest.mjs` records ordered screenshot evidence and starts full-body completeness pending. `scripts/verify-screenshot-intake-complete.mjs` only accepts a non-empty contiguous source sequence and explicit `HUMAN_REVIEW` or `USER_CONFIRMED`, then records `VERIFIED_COMPLETE`. `scripts/plan-screenshot-normalization.mjs` rejects anything not explicitly verified complete. publicationAllowed remains false and only 04 may publish.

## Latest Discovery baseline
Discovery refresh at 2026-09-17 13:34 KST:
- raw inspected: 40+ public/index/search leads across Korean-community-first and secondary Reddit lanes; weak market/news/filler excluded.
- retained as new candidate files: 3 total — 2 C1_A0_P0 + 1 C0_A0_P0.
- top retained: Blind `황당 면접 후기` (4,000 views / 5 likes / 13 comments; exact public URL and full body read), Blind `직장내괴롭힘 피해 직원을 징계한 회사` (1,012 / 6 / 10; exact public URL and full body read; heightened defamation/privacy review), Blind `나 똥차 타는데 소개팅 태우러간다했네..` (19K / 16 / 165 observed on public index only, so C0; body not verified).
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Korean-first discovery was refreshed using public search/index/pages only; no login, anti-bot bypass or bulk crawling. Candidate files remain one Markdown file per candidate under `data/candidates/`. Exact individual URL was required for C1; index-only lead stayed C0. No screenshot/OCR/moderation/rights/publication success is claimed.

## Next highest-priority work
1. Resolve exact individual URL/full body for the high-response C0 `나 똥차 타는데 소개팅 태우러간다했네..` and other strong Korean index leads.
2. Acquire permitted full-post screenshot sequences for strongest Korean C1 candidates.
3. Run intake → explicit completeness verification → normalization on real source bytes.
4. Build the first real cover + full-post screenshot 1080×1080 carousel and inspect it in Chrome.
5. Continue Korean-first high-volume discovery/ranking alongside acquisition; do not substitute weak filler for volume.
