# Installed Windows build — 2026-09-20

Code commit: `592434f25d783d96ecb6ef3c19410a3497f958af`. Native smoke and Windows x64 packaging passed on this exact code. The packaged app was launched and its process was responsive with the editor window title; the desktop shortcut and packaged history module were verified.

- Launch: desktop shortcut `원문 컷 편집기.lnk`.
- Installed EXE: `C:\Users\user\AppData\Local\Programs\ThreadsCutEditor\app\Threads Cut Editor.exe`.
- Final ZIP: `C:\Users\user\AppData\Local\Programs\ThreadsCutEditor\Threads-Cut-Editor-0.1.0-Windows-x64.zip`.
- ZIP SHA-256: `95F4F65F3D41485C06675627AAC54560A5154462CEBE246B5F5E47C1730B9BD7`.
- Reproducible source: the same Programs folder's `source` directory; verification report: `verification-report.json`.
- The standard per-user Programs folder avoids elevation; configured `C:\Program Files\_My\AI` was absent. Existing projects were not moved. Moving the app requires updating the desktop shortcut target/working directory; keep EXE resources together. User references are separate under Electron userData and can be opened with the editor button.
- Owned smoke profile, test screenshots and setup probe were removed. Final ZIP/app/source/report retained; remote connection service left running.
- Verification: full local check 50 suites / 153 syntax files before final refinements, focused history/syntax checks afterward, GitHub Actions syntax passed on the code commit; actual Windows 18000px/3-tile capture, public HTTPS capture, editor import, spacing/opinion/font preset and private source/hash/JSONL persistence passed.
- Remaining: user review of real post outputs, 04 review handoff, future automation from approved examples. No automatic training, Canva integration or external publication. Both existing PRs stay unmerged. User reference images/logs are not in GitHub.

---

# Final desktop verification — user additions

Native Windows smoke passed on device KJW using the actual Electron app: 18000px controlled page -> three continuous PNG tiles, live https://example.com/ capture, app-button capture -> editable source, per-page spacing and opinion text, Cut Gothic 800 preset, private reference JSONL/source hashing. Remote Node is v24.16.0. Smoke uses a separate temporary userData profile, not real user presets/reference folders.

Final refinements preserve the initial import before later edits, flush committed gestures/input changes into the log, retain the first preset selection, and flush the latest private reference before closing the app. Final packaging, installation and shortcut launch passed; see the entry above. Local full regression prior to these refinements: 50 suites / 153 JS syntax files; focused history checks remain passing.

---

# Latest user additions — padding, opinions, presets and reference logs

User added six image references, requested spacing around crops, own opinion text, discovery-time intermediate copy, licensed selectable fonts/weights/presets, and edit logs for future automation. Instagram UI in references is not the target.

- Added page-specific padding/background/minimum height and before/after authored text. Original crop proportions are preserved. Presets store styles, not opinion text.
- Fonts: bundled OFL Noto Sans KR derivatives 400/900 and renamed Nanum derivative Cut Gothic 800. Regular Cut Gothic upload was rejected and excluded, not retried. UI lists actual bundled weights. Glyph validation avoids authored text falling back to unverified fonts.
- New Discovery instruction/template + repo parser + source-intake handoff preserve location/opinion/evidence drafts. No existing candidates fabricated or rewritten.
- Original coordinates, normalized ratios, cuts, title/style/layout changes and user-stated reasons are logged. Private desktop reference folders retain source bytes/hashes and append-only JSONL plus final state. Explicit approved-example flag resets on edits. No automated training or publication.
- Local full check: 50 suites / 153 JS syntax files. Windows runtime verification is in progress; the initial hidden capture window stalled, so source capture now opens a visible sandboxed window. A smoke fixture Content-Type was corrected. Do not claim final native success until the final verification entry below.
- App source is being staged in C:\Users\user\AppData\Local\Programs\ThreadsCutEditor\source, using the standard per-user Programs path without elevation; the configured Program Files AI root is absent. No existing project folders moved.
- User uploads and generated examples are not committed. Native smoke uses an isolated test profile; remove that test profile after verification. Canva remains deferred.

---

# Latest URL capture / desktop update

User requested: enter a link, capture the page and open it in the editor; replace direct HTML-file usage with an app. Scope is source capture plus existing 03 editor only, no autonomous discovery or publication.

- Added isolated Electron desktop entry, explicit HTTPS capture, bounded scrolling and continuous screenshot tiles, progress/cancel, automatic atomic editor import. Existing crop/title/ZIP/project behavior remains.
- Windows x64 ZIP build uses pinned Electron 44.4.3 and electron-builder 26.15.3, separate desktop dependencies. No server/API keys are required for the desktop editor.
- Baseline bc9cac17. Local full regression: 48 suites passed before desktop smoke script addition. Windows build and real desktop smoke are being verified; do not infer installation or runtime success from code alone.
- Guide: docs/SOURCE_CUT_DESKTOP.md. Login/CAPTCHA/private endpoints/restricted DCInside and Blind automation are not bypassed. Infinite/virtual scrolling may require manual capture.
- Work folder: /workspace/scratch/7dc461d71eca/Threads. Connected Windows app directory selected under the standard per-user LocalAppData Programs location; exact installed state will be recorded after validation. The requested Program Files _My AI root does not exist on this connected PC; no elevation is requested and existing folders are not moved.

---

# Latest production update — 2026-09-20

The user approved the source-cut editor and requested clearer split-line guidance, long-source scrolling, thicker title outlines and word color emphasis. Canva is explicitly deferred. This is authorized 03 production work; the unrelated Discovery handoff below remains preserved.

Baseline: `eddbc9d49df2aa74fdc48e901aa925b28761d32c`; review branch `codex/audit-reliability-20260919`, PR #1.

- Added `app/source-cut-editor.html`, CSS, editor script, pure model and ZIP writer. Existing source intake opens the editor with same-origin file/text/title handoff.
- Virtual viewport supports scroll/zoom, region movement/resizing and edge auto-scroll. Absolute source coordinates preserve split positions. Split labels identify the preceding/next page, with jump/edit/delete controls.
- Default outline 8px (2–20px), literal comma-separated highlighted words and editable colors. No image blur or shadow. Original automatic renderer remains separate.
- Project JSON includes original images and editable settings. Restore validates source dimensions and resets completeness confirmation. ZIP contains cover/body PNGs plus source-cut manifest. No reverse write to legacy Source Package approvals or actual publication.
- Local full check after reconciling main `bc255bd`: 47 suites / 142 JavaScript syntax checks; focused same-origin handoff and model regressions passed. Native Canvas + DOM doubles exercised the real editor script through scroll/zoom, cuts, styles, project restore and ZIP output; independent ZIP read passed. HTTP routes 200. Browser/Windows E2E remains unverified. No new source acquisition or C/A/P changes.
- User guide: `docs/SOURCE_CUT_EDITOR.md`. An actual ZIP-produced cover was visually inspected locally using 12px outline; default remains 8px. The user-derived preview image was excluded from the public PR after automatic approval review rejected its external disclosure.
- Next: real browser interaction/download review on the user's runtime; connect review assets only after that. Do not resume Canva unless requested.
- Merge reconciliation preserves current main Discovery/candidate sync/WebP work. The production renderer replaces the older duplicate no-blur implementation; Node >=24 and automatic test discovery are retained with package version 0.42.3.
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

## 2026-09-21 02:25 KST — hourly two-lane run
- Queue refreshed from all current `data/candidates`: 1,193 candidates; C0 442 / C1 751 / A0 1,193 / A1 0 / P0 1,193 / P1 0.
- Candidate lane processed exactly one next unprocessed key: `260916_자취하지마세요` (current rank 45 after refresh). Ppomppu official 자취포럼 listing verifies exact title `자취하지마세요`, post number `21310`, date 2026-08-26. Canonical individual URL is recorded as `https://www.ppomppu.co.kr/zboard/view.php?id=alone&no=21310`; automated individual-page fetch returned 403, so no body/assets were claimed. Logical C1, A0/P0, blocker `BLOCKED_SOURCE_ASSET_BYTES`.
- TEMP lane: added `webp-intake-prototype_TEMP_TEST_ONLY.mjs` and `stage9_webp_native_intake_TEMP_TEST_ONLY.json` under the existing `260921_입주청소하러갔다가_TEMP_TEST_ONLY` folder. It reads original WebP natively without transcoding and verified 600x871 / 39,288 bytes / SHA-256 `37de18cc8d8ea30768d297f065db267846578b05573fe45a10374aadb771d1c6`. Prototype only; canonical intake support/A1/P1 unchanged.
- No publish, P1, rights/privacy/safety approval, OCR/vision claim, or live metrics.

Updated: 2026-09-21 02:16 KST

## 01_DISCOVERY latest
- Latest discovery-only run reviewed 40+ raw/search leads and retained 3 new C1 candidates: `친구 결혼하면 원래 멀어지는건가 싶은 후기`, `돈 잘 버는 친정오빠가 부모님에게 금전적으로 야박하게 구는게 꽁기한 후기`, `쿠팡 계약직 3주차 후기`.
- Restricted sources were not bypassed; all new candidates remain A0/P0 and publicationAllowed=false.

## Sequential candidate lane
- Queue refreshed from every current `data/candidates` markdown file after pulling main: 1,190 candidates total; the 2 newest 260921 candidates are included.
- Processed exactly one next unprocessed filename-order key: `260916_입주청소하러갔다가`.
- Exact source was already verified at `https://www.inven.co.kr/board/webzine/2097/2728192` (post ID `2728192`).
- Public direct source media was actually downloaded without login/bypass: WebP, 39,288 bytes, SHA-256 `37de18cc8d8ea30768d297f065db267846578b05573fe45a10374aadb771d1c6`.
- Candidate remains C1/A0/P0: the canonical screenshot-intake script currently supports PNG/JPEG dimensions only, so WebP cannot yet be persisted through the verified intake path. No A1/P1 or rights/moderation claims were made.
- Do not re-evaluate older blocked entries unless their unblock condition changes. Continue with the next unprocessed filename-order key next run.

## TEMP TEST ONLY lane
- Added `03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/260921_입주청소하러갔다가_TEMP_TEST_ONLY/stage9_webp_intake_blocker.json` plus the real source WebP only inside that TEMP_TEST_ONLY folder.
- Running the real stage-9 intake exposed a concrete blocker: `build-screenshot-intake-manifest.mjs` rejects WebP because dimension parsing is PNG/JPEG-only; stage 10 was therefore not run.
- `temporaryTestOnly=true`, `publicationAllowed=false`, approvedVersion=null, executionEligible=false; no blur/generated fallback and no fabricated conversion.
- Exact unblock: add provenance-preserving WebP intake/dimension support (without pretending a transcode is original bytes), then rerun stage 9 before UI-chrome review.

## Publication ownership / safety
Only `04_REVIEW_PUBLISH` may publish or mark P1 after human rights/privacy/safety approval. No real publishing or metrics collection was performed.
