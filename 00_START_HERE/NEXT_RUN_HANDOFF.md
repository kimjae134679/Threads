# NEXT RUN HANDOFF

Updated: 2026-09-17 12:35 KST

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
`scripts/build-screenshot-intake-manifest.mjs` records ordered screenshot evidence and starts with full-body completeness pending. `scripts/plan-screenshot-normalization.mjs` requires explicit `VERIFIED_COMPLETE` plus human/user verification before normalization. Existing source-order/provenance/no-stretch/body-crop/privacy rules remain binding.

## Latest Discovery baseline
Discovery refresh at 2026-09-17 12:35 KST:
- raw inspected: 40+ public/index/search leads across Korean-community, investment/debt, workplace, marriage/family and Reddit lanes; restricted sources were not bypassed.
- retained as new candidate files: 4 C1_A0_P0.
- new retained: Reddit `AITA for refusing to take out a loan to pay for my brother's wedding?` (+5,192 observed score), `AITA: broke sister won’t pay back rich brother` (+3,432), `AITA for not helping my sister pay for her wedding?` (+3,943), `AITA for not helping my sister pay for her wedding but helping our family go to the wedding?` (+547).
- Korean search produced public Blind material too, but no weak/filler item was retained merely to hit quota; one sensitive workplace-distress lead was deliberately not added.
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Created four individual human-readable candidate Markdown files under `data/candidates/`; no grouped discovery JSON was created. Exact individual Reddit URLs were observed and the visible same-observation score only was recorded. Full body was read for the four retained posts; comments were not read except where explicitly noted in the candidate. All remain `ASSETS_PENDING`, publicationAllowed=false, rights/privacy/human-review gated.

No source screenshot bytes were acquired, so no asset/carousel/OCR/moderation/rights/publication success is claimed.

## Next highest-priority work
1. Continue Korean-first discovery, especially exact public Blind/DC/FM/TheQoo/Instiz/Ruliweb/Ppomppu/Clien/Inven/Arca leads with stronger funny/absurd/workplace/dating/money reversals rather than generic advice posts.
2. Acquire permitted full-post screenshot sequences for strongest Korean C1 candidates.
3. Intake real ordered files with truthful provenance, verify full-body completeness, normalize no-stretch/UI-chrome-only.
4. Produce and visually inspect the first real cover + source-screenshot 1080×1080 carousel.
