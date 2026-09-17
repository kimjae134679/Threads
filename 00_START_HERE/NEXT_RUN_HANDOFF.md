# NEXT RUN HANDOFF

Updated: 2026-09-17 09:48 KST

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

## Latest Discovery baseline
Discovery refresh at 2026-09-17 09:35–09:48 KST:
- raw inspected: 40+ public search/index leads across Korean-community-first queries plus Reddit/other public lanes; restricted sources were not bypassed. Clien/Instiz robots restrictions were respected.
- retained as new candidate files: 17, all C1_A0_P0.
- Korean retained dominates this run: 14 Blind C1 + 3 Reddit C1.
- top candidates: Blind `어쩌다 괴물이 되어버렸을까...` (400만→8,000만→루나 -99.99%→대출 주식 재손실); Blind `죄의식이 낮은건가?` (몰래 대출·코인·돌려막기·남편/시어머니 개인회생); Blind `이혼이 답인데 자식이 너무 맘에 걸린다` (반복 비밀대출, 코인으로 보였으나 게임 현질 중독 반전); Blind `축의금 문화, 결혼 문화 10년내 다바뀔 듯` (85K views / 433 likes / 543 comments observed); Reddit wedding-support escalation ($1,000 intended vs $15,000 requested, +7,958 observed score).
- full-post screenshots captured: 0
- actual source bytes acquired: 0
- real source-backed carousel produced: NO
- A1/P1: 0

Other retained Korean C1s include `돈 안갚는 친구`, `첫만남에 돈얘기 꺼냈던 황당 소개팅녀`, `결혼 주선자 사례 X, 청첩장 못 받음. 축의금 해야돼?`, `시댁/처가 반찬 폭력`, `결혼 첫 명절 시댁/처가 일정문의`, `결혼식 하객 수`, `결혼 비용및 축의금 정산 의견 차이`, `부모님 결혼 반대`, `결혼준비할때 양가부모님 지원말야`, `코인 중독`, `결혼 전까지 소개팅 마니함`, `내가 프로불편러인가 봐줄래?`.

## This run
Material repo change: 17 individual human-readable Markdown candidate files were added under `data/candidates/`; no grouped discovery JSON was created in `data/`. Each file records the exact public URL, observed metrics only, body/comment read state, story evaluation, and truthful `ASSETS_PENDING`/A0/P0 state. `publicationAllowed=false` and rights/privacy/human-review gates are preserved.

No source screenshot bytes were acquired, so full-post screenshots remain 0 and no source-backed carousel was produced. No OCR/vision/moderation/rights/publication success is claimed.

Executable checkout/Node/Chrome were not available through the current connector surface, so `npm run check`, server smoke, and browser E2E were NOT executed in this discovery-only run.

## Next highest-priority work
1. Acquire real full-post screenshots for the strongest Korean C1s, starting with `어쩌다 괴물이 되어버렸을까...`, `죄의식이 낮은건가?`, `이혼이 답인데 자식이 너무 맘에 걸린다`, and existing `하이닉스37억몰빵` priorities, through permitted public/manual/browser paths.
2. Feed real ordered files through `build-screenshot-intake-manifest.mjs` with truthful acquisition state.
3. Manually verify full-body coverage, then normalize with no-stretch/UI-chrome-only rules.
4. Produce the first real cover + full-post screenshot carousel and inspect it in Chrome.
5. Continue high-volume Korean-community discovery in parallel; retain quality rather than filler.
6. Only after source-backed user-facing quality works, continue provider/publishing work.
