# NEXT RUN HANDOFF

Updated: 2026-09-17 10:18 KST

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
`scripts/build-screenshot-intake-manifest.mjs` records ordered screenshot sequence, PNG/JPEG dimensions, byte length, SHA-256, exact public capture URL and observation time. Duplicate bytes are rejected. `--acquisition-state` is required and limited to `USER_PROVIDED`, `MANUAL_CAPTURE`, or `BROWSER_CAPTURE`; manifest/assets preserve the supplied acquisition truth. It does NOT infer full-body completeness, source relationship, rights, privacy, OCR/vision, moderation, or publication.

`scripts/plan-screenshot-normalization.mjs` requires a non-empty ordered manifest, sequence 1..N with no gaps/duplicates, unique source hashes, matching capture URLs, dimensions/provenance/acquisition state, and plans 1080×1080 no-stretch normalization. Crop remains manual/verified UI-chrome-only; body crop and automatic privacy masking remain forbidden.

Both screenshot-intake scripts are now part of the normal `npm run syntax` / `npm run check` syntax gate. This run added the previously missing `build-screenshot-intake-manifest.mjs` entry so intake changes cannot silently bypass the default syntax check.

## Latest Discovery baseline
Discovery refresh at 2026-09-17 09:35–09:48 KST:
- raw inspected: 40+ public search/index leads across Korean-community-first queries plus Reddit/other public lanes; restricted sources were not bypassed.
- retained as new candidate files: 17, all C1_A0_P0.
- Korean retained: 14 Blind C1 + 3 Reddit C1.
- top candidates: Blind `어쩌다 괴물이 되어버렸을까...`; Blind `죄의식이 낮은건가?`; Blind `이혼이 답인데 자식이 너무 맘에 걸린다`; Blind `축의금 문화, 결혼 문화 10년내 다바뀔 듯`; Reddit wedding-support escalation.
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

## This run
Material repo change: `package.json` syntax gate now checks `scripts/build-screenshot-intake-manifest.mjs` as well as the normalization planner. Commit `f1e3b2747632db63149a3ebf0978d0c63392df1b`.

No source screenshot bytes were available through this connector run, so full-post screenshots remain 0 and no source-backed carousel was produced. No OCR/vision/moderation/rights/publication success is claimed.

Executable checkout/Node/Chrome were not available through the current connector surface, so `npm run check`, server smoke, and browser E2E were NOT executed or claimed.

## Next highest-priority work
1. Acquire real full-post screenshots for strongest Korean C1s through permitted public/manual/browser paths.
2. Feed real ordered files through `build-screenshot-intake-manifest.mjs` with truthful acquisition state.
3. Manually verify full-body coverage, then normalize with no-stretch/UI-chrome-only rules.
4. Produce the first real cover + full-post screenshot carousel and inspect it in Chrome.
5. Continue high-volume Korean-community discovery in parallel; retain quality rather than filler.
6. Only after source-backed user-facing quality works, continue provider/publishing work.
