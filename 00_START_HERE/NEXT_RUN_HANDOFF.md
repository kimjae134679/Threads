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
