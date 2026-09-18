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

Keep the role chain and human publication gate. Cover uses the exact original title; body slides use original screenshots in order. Keep all original assets and raw discovery evidence. Do not mark A/P states from tests, queue entries or development previews.

Existing first source package: `data/source-packages/theqoo-3826792703/`. Its six-file rendered output is structurally verified, but full visual/user approval and publication are still separate.

## Next concrete work

1. Verify one real candidate in the user's browser from file selection to PNG downloads, including switching candidates and restoring a backup.
2. Connect Source Package assets to 04 review/publish using candidate identity, file hashes and approval revision. The old Card Factory staging path is separate today.
3. Only after user review, validate one account's actual publish/insights round trip. Do not expand discovery volume or platform integrations as a substitute for this work.

## Environment

Validation checkout: `/workspace/scratch/7dc461d71eca/Threads` (isolated Linux). No Windows installations, user-data moves, launcher changes or remote-device operations. The Windows AI installation-root policy has no new installation to record for this run.
