# NEXT RUN HANDOFF — Threads AI Content Monetization Lab

Updated: 2026-09-14 KST

## Read this first

Inspect current `main` and recent commits first, then read the latest sequential operations-hub note. Repository tip always wins over stale handoff text. Do not stop at planning.

Current verified implementation checkpoint:

- implementation tip: `980106eb8b2e36e8b0a13c248e838baf1a0d7380`
- GitHub Actions run `34825571520`: **SUCCESS**
- package: `0.21.0`
- latest operations note: `028-sol.md`

## Role chain / non-negotiable gates

`01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`

- 04 alone owns final publication.
- hard Audience Comfort BLOCK cannot be human-approved.
- REVIEW approval is bound to the current Comfort scan signature; stale review fails closed.
- unknown rights remain non-publishable.
- image privacy review is bound to exact image identity and stale review fails closed.
- never fake API success, metrics, moderation, OCR, face detection, privacy masking, credentials, or live publishing.

## P1–P5

Materially complete for the current browser/session architecture:

- multi-platform Source Registry with connected / connected-when-credentialed / manual-only / planned states
- theme-lane discovery, observed-vs-inferred evidence, dedupe/same-story grouping, risk/source filters
- Audience Comfort BLOCK/REVIEW + audit
- bulk selection/group/tag/editorial handoff
- Community Card Factory 1080×1350 + real manual drag rectangle privacy masks
- Content Warehouse READY/HOT/EVERGREEN + provenance/history/freshness/review/asset/queue eligibility

Do not bulk crawl Blind/DCInside; public search/index metadata + user URLs/screenshots/manual capture only.

## P6 official publishing capability

Substantially implemented, live remains fail-closed:

- direct official Threads text publisher
- optional Buffer publisher; accepted Buffer jobs are not canonical publications until actual delivery can be verified
- official Threads IMAGE/CAROUSEL capability model and dry-run endpoint/UI
- 1 HTTPS image => IMAGE dry-run; 2–20 HTTPS images => CAROUSEL dry-run
- local canvas/blob assets are not represented as hosted/public URLs
- no current human approval => server rejects
- no token => credential-required
- live media remains disabled unless explicitly enabled server-side
- dry-run audit records are not represented as publication success

No live media publish has been claimed.

## Real browser E2E already observed

Installed Chrome + Playwright against the actual app/server verified before P7 expansion:

- feature bootstrap `ready`
- candidate add + discovery normalization
- Viral Finder / Audience Comfort / Warehouse rendering
- official media capability status
- zero page errors
- Community Card capture-image build
- real mouse drag creating one privacy rectangle
- explicit image privacy review
- privacy gate allowed, capture 1/reviewed 1/mask 1
- download gate enabled

## P7 Scheduler / Queue — expanded through provider targets + audit

Current feature folder: `app/features/publish/scheduler/`.

Existing behavior retained:

- only Warehouse `queueEligibility()` items enter planning
- HOT priority + theme/source/format spacing
- RUNNING / PAUSED / STOPPED
- up/down manual reorder
- visible schedule reasons
- `지금 게시` routes only to `04 REVIEW_PUBLISH`; it never directly calls an external API

New in package `0.21.0`:

- explicit target providers: `threads-direct` and `buffer`
- unknown/invalid provider values fail safely to `threads-direct`
- provider choice is scheduling metadata only; final publication owner remains `04_REVIEW_PUBLISH`
- per-item bounded scheduler audit, latest 100 entries
- scheduler-control bounded history for pause/resume/stop/replan/provider-target changes
- item audit records manual reorder, provider changes, blocked post-now attempts and post-now routing
- each audit entry records owner `04_REVIEW_PUBLISH`
- UI shows selected target provider and change-record counts
- no provider target selection itself is represented as publication success

Regression now covers provider normalization/selection, owner audit, invalid-provider fallback, and 100-entry audit bounding in addition to HOT ordering, spacing, manual reorder and HOLD exclusion.

## Validation

Meaningful commits this run:

```text
2dfd5801cd38668a15f48037b80c5a5ddd6c863c  Add scheduler provider targets and audit model
74c289083d1080f976e66bc77f6fd7bdc199de14  Test scheduler provider targets and audit history
ac7d468013a0b8180ef6660e352d654040d2805a  Add scheduler provider choice and audit trail
980106eb8b2e36e8b0a13c248e838baf1a0d7380  Bump scheduler audit workflow version
```

GitHub Actions run `34825571520` completed **SUCCESS**. Workflow includes JavaScript syntax, full regression suite, targeted scheduler regression and local server smoke.

## Browser limitation in this run

The authorized remote Windows machine was offline during this run. Therefore the new P7 provider selector / pause-resume-stop / reorder / post-now UI was **not** newly claimed as browser-E2E verified. Re-run it as soon as the browser-capable machine is reachable.

## Next priority

1. Fresh Scheduler Chrome E2E: plan render, provider select, pause/resume/stop, reorder, audit count updates, and `지금 게시` routing to 04 with no external publish.
2. Add Buffer delivery-status sync only against a verified official/current Buffer API query shape; never invent a status API. Until actual sent/delivered status is verified, Buffer acceptance remains delivery audit, not canonical publication.
3. Finish P6 real external response/error audit separation where useful; credentials/scopes absent => fail closed.
4. Then P8 DB/server persistence, migrations/versioning, scheduler audit persistence, and multi-account experiment/profile state. Never commit plaintext secrets.

## Mandatory execution loop

1. Read current main + recent commits + this file + latest operations note.
2. Repair red tip CI before expansion when feasible.
3. Implement substantive work.
4. Run syntax/regression/server smoke + targeted tests; claim green only when observed.
5. Commit/push meaningful changes.
6. Remove temporary/cache/probe junk.
7. Write the next sequential note under `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`.
