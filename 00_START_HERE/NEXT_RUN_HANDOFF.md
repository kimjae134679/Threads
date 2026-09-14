# NEXT RUN HANDOFF — Threads AI Content Monetization Lab

Updated: 2026-09-14 KST

## Read this first

Inspect current `main` and recent commits first, then read the latest sequential operations-hub note. Repository tip always wins over stale handoff text. Do not stop at planning.

Current verified implementation checkpoint:

- implementation tip: `bc3b63c0eea4a6472605a4887e9772dee839bdb3`
- GitHub Actions run `34822773130`: **SUCCESS**
- package: `0.20.0`
- latest operations note: `027-sol.md`

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

## P6 official publishing capability — substantially implemented, live still fail-closed

Current main contains:

- direct official Threads text publisher
- optional Buffer publisher, with Buffer delivery records kept separate from canonical publications until actual sent status can be verified
- official Threads IMAGE/CAROUSEL capability model and dry-run endpoint/UI
- 1 HTTPS image => IMAGE dry-run
- 2–20 HTTPS images => CAROUSEL dry-run
- local canvas/blob assets are not pretended to be hosted/public URLs
- no current human approval => server rejects
- no token => credential-required
- live media remains disabled unless explicitly enabled server-side
- dry-run audit records are not represented as publication success

No live media publish was claimed.

## Real browser E2E observed before the P7 commit

Installed Chrome + Playwright against the actual app/server successfully verified:

- feature bootstrap `ready`
- candidate add
- discovery normalization
- Viral Finder / Audience Comfort / Warehouse rendering
- official media capability status
- zero page errors
- Community Card capture-image build
- real mouse drag creating one privacy rectangle
- explicit image privacy review
- privacy gate allowed, capture 1/reviewed 1/mask 1
- download gate enabled

## P7 Scheduler / Queue — NEW

Current main now includes `app/features/publish/scheduler/`:

- `scheduler-model.js`
- `scheduler.js`
- `scheduler.css`

Behavior:

- only Warehouse `queueEligibility()` items enter planning, preserving Comfort/Safety/rights/privacy/current-human-approval gates
- HOT priority preserved
- configurable base slot + same-theme/source/format spacing
- visible schedule reasons (`hot-priority`, `manual-order`, spacing reasons, queue-priority)
- manual up/down reorder
- RUNNING / PAUSED / STOPPED state in localStorage
- `지금 게시` routes the item to `04 REVIEW_PUBLISH`; it does not directly call an external API and cannot bypass final human confirmation
- scheduling metadata does not alter approved content bytes/text

Targeted regression `test/scheduler-model.test.mjs` covers HOT ordering, spacing, manual reorder and HOLD exclusion.

## Validation

Final checkpoint:

```text
bc3b63c0eea4a6472605a4887e9772dee839bdb3
```

GitHub Actions run `34822773130` completed **SUCCESS** after syntax/regression + local server smoke.

The first scheduler CI attempt failed only because a VM-realm array was compared directly with `deepStrictEqual`; the assertion was corrected by normalizing IDs into the host realm. Production logic was not weakened.

## Next priority

1. When a browser-capable machine is reachable, run fresh Scheduler browser E2E: plan render, pause/resume/stop, reorder, and `지금 게시` routing to 04 without external publish.
2. Add durable scheduler audit/history and provider target choice (direct Threads vs Buffer) while keeping 04 final publication ownership.
3. Add Buffer delivery-status sync before any accepted Buffer job can be promoted to canonical publication.
4. Finish useful P6 external response/error audit separation; credentials/scopes absent => fail closed.
5. Then P8 DB/server persistence, migrations/versioning, and multi-account experiment/profile state. Never commit plaintext secrets.

## Mandatory execution loop

1. Read current main + recent commits + this file + latest operations note.
2. Repair red tip CI before expansion when feasible.
3. Implement substantive work.
4. Run syntax/regression/server smoke + targeted tests; claim green only when observed.
5. Commit/push meaningful changes.
6. Remove temporary/cache/probe junk.
7. Write the next sequential note under `project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`.
