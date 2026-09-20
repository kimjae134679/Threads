# Latest production update — 2026-09-20

The user approved the source-cut editor and requested clearer split-line guidance, long-source scrolling, thicker title outlines and word color emphasis. Canva is explicitly deferred. This is authorized 03 production work; the unrelated Discovery handoff below remains preserved.

Baseline: `eddbc9d49df2aa74fdc48e901aa925b28761d32c`; review branch `codex/audit-reliability-20260919`, PR #1.

- Added `app/source-cut-editor.html`, CSS, editor script, pure model and ZIP writer. Existing source intake opens the editor with same-origin file/text/title handoff.
- Virtual viewport supports scroll/zoom, region movement/resizing and edge auto-scroll. Absolute source coordinates preserve split positions. Split labels identify the preceding/next page, with jump/edit/delete controls.
- Default outline 8px (2–20px), literal comma-separated highlighted words and editable colors. No image blur or shadow. Original automatic renderer remains separate.
- Project JSON includes original images and editable settings. Restore validates source dimensions and resets completeness confirmation. ZIP contains cover/body PNGs plus source-cut manifest. No reverse write to legacy Source Package approvals or actual publication.
- Local full check: 46 suites; focused same-origin handoff and model regressions passed. Native Canvas + DOM doubles exercised the real editor script through scroll/zoom, cuts, styles, project restore and ZIP output; independent ZIP read passed. HTTP routes 200. Browser/Windows E2E remains unverified. No new source acquisition or C/A/P changes.
- User guide: `docs/SOURCE_CUT_EDITOR.md`. An actual ZIP-produced cover was visually inspected locally using 12px outline; default remains 8px. The user-derived preview image was excluded from the public PR after automatic approval review rejected its external disclosure.
- Next: real browser interaction/download review on the user's runtime; connect review assets only after that. Do not resume Canva unless requested.
- Workspace: `/workspace/scratch/7dc461d71eca/Threads` on Linux. No Windows installations or relocations. Windows AI installation-root policy not applicable.

---

# Latest cover sizing update — 2026-09-19 KST

The user explicitly requested full-bleed image covers, automatic canvas adjustment for awkward source dimensions, and a complete progress/remaining-work list. This continues the authorized 03 production work in the review PR; unrelated Discovery remains scoped to its own handoff below.

- Baseline: `db1ee73c93d65992f6eea6d74c3c43c5972d7f6c`; branch `codex/audit-reliability-20260919`, PR #1.
- Cover width stays 1080px; height follows the first source aspect ratio, bounded to 608–1350px for readable headlines. The image fills every edge without stretching or blur. Extreme source ratios are cropped on the cover only; body pages retain the complete source. All pages in one set share the same dimensions.
- Headline bottom scales to about 83% of height, with responsive font size and the existing 2px outline. Text-only remains 1080×1350.
- Preview canvas dimensions, CSS, package metadata, status and download label now follow actual output dimensions.
- Tests cover six image proportions, mixed-size sources, complete source coverage and adaptive export integration. Native Canvas image example: 1080×673; text example: 1080×1350. No browser/Windows or actual Instagram upload result is claimed.
- Full checklist: `docs/PRODUCTION_PROGRESS.md`. No acquisition, C/A/P promotion or external publication in this change. Existing original assets are untouched.
- Next: review output and exercise one candidate in the real browser through export and restoration, then connect Source Package to 04 asset review.
- Workspace remains `/workspace/scratch/7dc461d71eca/Threads`; Linux review checkout, no Windows installation/move.

---

# Current user-approved production direction — 2026-09-19 KST

User reviewed 22 uploaded Instagram screenshots and an initial cover mockup. The next request explicitly authorizes implementation: raise the title, remove blurred styling, use a thin outline, and support text-only originals. These instructions supersede older exact-title-only and image-required production rules.

## Implemented in the review branch

- Source intake now composes a sharp original screenshot or source text with a lower gradient and a large white headline. Title block bottom: 1120px in a 1080×1350 output; black outline: 2px; image blur and text shadow: zero.
- Editable cover headline with explicit line breaks; original candidate title preserved. Long headlines are fitted to 2–3 lines or rejected instead of truncated.
- Text-only source packages preserve up to 20,000 original characters, paginate the full text and do not fabricate screenshot acquisition. Text input is restricted to source format `글`.
- One shared canvas renderer produces both preview and export. Every exported page is previewed. Local regular/black Korean fonts are bundled with OFL.
- Candidate switching and fresh-session restoration preserve saved headline/text/settings. Changed content invalidates previews and existing publication approval through the existing save callback.
- Source-image bytes remain session-local. Text and metadata are included in existing JSON backup/persistence.

## Verification

`npm run check`: 45 suites passed locally (Node 24). New checks cover headline line breaks/position/outline, complete text pagination, source-text package gates, candidate isolation, edited-headline persistence and stale-export invalidation. DOM handlers use doubles; two actual 1080×1350 PNGs were rendered with the production canvas module via the installed native canvas runtime and visually inspected. This is not browser E2E. Cloud Browser could not reach the local app in this session; Windows interaction/downloads remain unverified. No external publication.

Examples: `docs/examples/source-cover-image.png` and `source-cover-text.png`. These are rendering examples, not newly acquired/approved candidates. No C/A/P promotion.

## Next

User reviews the actual app outputs. Then verify browser interaction and download on the user's runtime. Long screenshot splitting currently preserves aspect ratio with overlap; semantic paragraph/scene boundaries and automatic Instagram UI removal are not implemented. Connect approved Source Packages to 04 assets only after output review.

## Concurrent main work preserved

Main advanced to `89e800400a7aecb4f88b16cf947168e9f3f17c45` while the review PR was open. Its newly added homecam provenance candidate is preserved. It remains `PROVENANCE_PENDING`: the exact original Nate Pann URL and full original body were not recovered. That Discovery work does not supersede the current production request.

Workspace: `/workspace/scratch/7dc461d71eca/Threads`. No Windows software was installed or moved. The Windows `C:\Program Files\_My\AI` installation policy is not applicable to this Linux review checkout.

---

# NEXT RUN HANDOFF

## Current task

The user requested a review of unverified accumulated work across Threads and its operations hub. This supersedes the earlier discovery-volume backlog. Read `docs/AUDIT_2026-09-18.md` before resuming.

Baseline: `50bbcade9ca8b67a54139b1406fcee3a2fe997b4`. Concurrent documentation-only main updates through `7676292fe9ace5bcd777ba01d00b6a92ca2b12ca` are preserved. The earlier worker's Windows verification remains in `docs/run-verification-2026-09-19-0116.md`; it is not a Windows test of this patch. Repository tip and PR check results remain authoritative.

## Changes

- Node 24 runtime contract; automatic discovery of all syntax checks and regression suites.
- Static file and local API request boundaries; strict publish validation and durable request deduplication.
- Concurrent JSON save protection, explicit revision requirement, client conflict/namespace race fixes.
- Source intake now measures image dimensions, binds images to candidates, supplies acquisition evidence, invalidates changed previews, persists metadata and exports aspect-preserving slices.
- Source-image stream limits and body timeout.
- Rendered-file plans now have a distinct type and a required source URL. Existing six PNGs were not changed.

## Verification

Local `npm run check` passed all 44 suites on Node.js 24.19.0. Added behavioral tests cover HTTP boundaries, concurrent saves, publication replay and ambiguous responses, persistence UI responses, source intake and real carousel PNG fidelity. Check the PR for final local/CI outcomes.

Actual browser interaction remains unverified: the available cloud browser blocked the local app URL with ERR_BLOCKED_BY_CLIENT. Source intake DOM-handler tests use image/canvas doubles. Video regression tests render real FFmpeg output. No real account publication, credential changes, new discovery, OCR, moderation, automated masking or rights approval occurred.

## Preserve

Keep the role chain and human publication gate. The user approved short, large editable cover headlines over original screenshots or original text, with a raised position and a thin black outline; no blur. Preserve the original candidate title separately. Body slides preserve original screenshot order or the full user-provided text. Keep all original assets and raw discovery evidence. Do not mark A/P states from tests, queue entries or development previews.

Existing first source package: `data/source-packages/theqoo-3826792703/`. Its six-file rendered output is structurally verified, but full visual/user approval and publication are still separate.

## Next concrete work

1. Verify one real candidate in the user's browser from file selection to PNG downloads, including switching candidates and restoring a backup.
2. Connect Source Package assets to 04 review/publish using candidate identity, file hashes and approval revision. The old Card Factory staging path is separate today.
3. Only after user review, validate one account's actual publish/insights round trip. Do not expand discovery volume or platform integrations as a substitute for this work.

## Environment

Validation checkout: `/workspace/scratch/7dc461d71eca/Threads` (isolated Linux). No Windows installations, user-data moves, launcher changes or remote-device operations. The Windows AI installation-root policy has no new installation to record for this run.


---

# Parallel main handoff preserved at fc914705

The following is the concurrent Discovery workstream's handoff, preserved verbatim. The production implementation above was explicitly requested in this chat and is delivered in an unmerged review PR. It does not authorize unrelated workstreams to resume production.

# NEXT RUN HANDOFF

Updated: 2026-09-19 KST

## CURRENT USER OVERRIDE — DISCOVERY ONLY
Until the user explicitly changes this again, work on **01_DISCOVERY / 소재 발굴 only**.

Do NOT continue 02_EDITORIAL_SCORING, 03_PRODUCTION, 04_REVIEW_PUBLISH, or 05_EXPERIMENTS_ACCOUNTS work. Do NOT capture screenshots, download source media, build/crop/normalize carousels, render images/video, run publishing/provider work, or modify existing production assets. Existing role ownership remains intact and only 04_REVIEW_PUBLISH may ever publish.

## Discovery operating rule
Korean-community first: Blind, DCInside, FMKorea, TheQoo, Instiz, Ruliweb, Ppomppu, Clien, Inven, Arca, NAVER/Daum cafes, then public Threads/Instagram/Reddit/YouTube/news.

For each useful run, when coverage allows:
- inspect roughly 40–80 raw leads;
- retain roughly 15–30 genuinely usable candidates after dedupe/safety/access/story filtering;
- prioritize funny/absurd true stories, workplace conflict, dating/marriage arguments, money/gifts/debt/lottery, family drama, embarrassing misunderstandings, reversals, relatable annoyance, and posts that trigger instant opinions;
- do not rank by views alone.

Restricted sources must not be bulk crawled or accessed by bypassing login/anti-bot controls.

## Canonical material location
The main material pool is **`data/candidates/`**. One candidate = one Markdown file.

Current repository inventory checked on 2026-09-19:
- total candidate files: **580**
- 2026-09-16: C0 66 / C1 149
- 2026-09-17: C0 8 / C1 199
- 2026-09-18: C0 3 / C1 155

A newer one-off discovery record also exists under `01_DISCOVERY/candidates/`, but new discovery should be normalized into `data/candidates/` rather than creating another parallel pool.

For each retained candidate record source, exact/public URL if actually verified, exact observed title, observation time, only visible metrics, whether full body/comments were actually read, whether source images/screenshots are known to exist, why it is usable, and exact provenance/acquisition state. Exact individual public source = C1; only index/list provenance = C0. Do not invent body text, metrics, rights, OCR/moderation, assets, or publication state.

## Existing production assets
Existing source packages/carousels are historical work only. Leave them untouched while this DISCOVERY ONLY override is active.

## Latest discovery truth
Latest full high-volume useful Discovery on record: **40+ raw / 15 retained C1**. A later Korean-community refresh recorded **29 raw / 10 retained**. The focused Nate Pann provenance search was 3 raw / 1 corroborated and was not a full discovery pass.

Recent notable material includes:
- 우리집 홈캠을 보고 계셨던 시어머니.
- 너무 많이 먹는 남편 ㅠㅠ
- 아이이름 짓는데 술집여자 같다는 남편
- 결혼 승낙 받자마자 탈모인거 밝힌 남편..
- 나몰래 대출받은 남편
- 주식중독 남편.. 대출 막는법 있을까?
- 친구 결혼 2만달러 대출
- 카지노 잭팟 약혼녀 빚
- 코인 대출 남편
- 파혼 뒤 결혼비용 상환 요구
- 형 결혼식 800달러 선물 취소
- 호텔 결혼 축의금 얼마

## Next
Only continue high-volume material discovery and exact-source/provenance verification. Keep adding strong candidates to `data/candidates/`. Do not turn any candidate into screenshots, carousels, videos, or publications unless the user later explicitly reopens production.
