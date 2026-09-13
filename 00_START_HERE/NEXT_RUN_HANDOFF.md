# NEXT RUN HANDOFF — Threads AI Content Monetization Lab

Updated: 2026-09-14 KST

## Read this first

This file is the execution handoff for the recurring development run. Do not stop at planning. Inspect the current repository state, continue implementation, test it, fix failures, and leave the next handoff after meaningful changes.

Current baseline observed before this handoff:

- latest main commit: `f75005f24a79d7910b7cd3afc1b3844625840dd5` — `Document theme lanes and multi-platform discovery`
- newer discovery structure already documents theme lanes and multi-platform source states.
- operations-hub history through `T-0008-ai-content-monetization/016-sol.md` records Audience Comfort hard BLOCK/REVIEW categories and Community Card text PII masking.
- Do not assume 016 is the repository tip; always inspect current `main` first because later scheduled/manual runs may have advanced it.

## Mandatory execution loop

1. Pull/read current `main` and latest handoff before editing.
2. Check recent commits so work is not repeated or reverted accidentally.
3. Implement the next substantive backlog item in order. Do not only write plans/reports.
4. Run syntax/regression/server smoke tests relevant to the change.
5. Fix failures before considering the run complete when reasonably possible.
6. Perform a real public discovery test when useful, using sources that permit access or public search/index metadata. Record realistic examples, reactions/engagement when actually visible, deduplication, and why each candidate is strong/weak.
7. Never bulk-crawl sources whose terms do not permit it. In particular, DCInside/Blind must remain manual/user-URL/screenshot/public-index-metadata paths unless a compliant source method is established.
8. Never fake API success, live publishing, metrics, credentials, or moderation results.
9. Preserve approval, rights, safety, and human-review gates.
10. Commit/push meaningful changes and update the operations-hub handoff with exact completed work, test results, blockers, and the next priority.
11. Remove temporary build/cache/probe artifacts; leave only useful source, fixtures, docs, and final outputs.
12. If genuinely no useful actionable work remains, say so explicitly instead of inventing tasks.

## Architecture / role boundaries that must remain

`01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`

- 01 finds and packages candidates; it does not publish.
- 02 owns fact/source evaluation, scoring, and content angle approval.
- 03 transforms approved briefs into platform-ready drafts/assets without inventing new facts.
- 04 owns final safety/rights/human approval and actual publication.
- 05 owns experiment/account strategy and performance interpretation.
- `A10 Unknown rights` assets are not publishable until rights are resolved and re-reviewed.

## Remaining backlog — execute in this order unless current main already completed an item

### P1. Viral Finder

Goal: bulk discovery of already-proven public/trending/high-engagement posts and topics.

Continue toward:

- multi-source adapters/registry with explicit `connected / connected-when-credentialed / manual-only / planned` states
- bulk candidate import
- engagement evidence fields that distinguish observed metrics from inferred interest
- normalization across source types
- robust deduplication / same-story grouping
- theme/source filters
- source-risk display
- realistic public discovery fixtures/tests

Do not manufacture engagement counts. Search/index metadata can be used when direct compliant access is unavailable, but must be labeled as discovery metadata rather than a fetched post body.

### P2. Audience Comfort / unpleasant-content filter

Existing direction from 016:

Hard BLOCK includes graphic gore/violence, animal abuse, sexual violence/exploitation, graphic self-harm, doxxing, and strongly gross/unpleasant visual material. Non-graphic violence/death/sexual-warning/harassment cases may route to REVIEW instead of automatic publication.

Continue toward:

- UI reason chips for BLOCK/REVIEW
- confidence/override audit trail where a human can review false positives without bypassing final safety gates
- batch filtering before production
- tests for Korean/English phrasing and mixed-text edge cases
- image privacy/discomfort review must not pretend OCR/vision masking succeeded when it has not

### P3. Bulk candidate review / multi-select

Need a fast workflow for large candidate pools:

- select all / visible / group
- multi-select approve/reject/hold/tag
- duplicate-group actions
- bulk move to editorial scoring
- blocked-item reason visibility
- keyboard-friendly / large-list usability

### P4. Community Card Factory

Turn selected stories into `1080x1350` card/carousel packages.

Required package behavior:

- hook card
- cleaned/cropped excerpt cards
- privacy masking
- emphasis/highlight treatment
- reaction/summary cards
- ending card / CTA where appropriate
- export manifest that records source/rights/review state

Existing text PII masking should remain. Images with possible faces/usernames/phone numbers must stay flagged until actually masked/reviewed. Next high-value implementation is a manual drag-rectangle privacy mask before final PNG export, not a fake automatic success flag.

### P5. Content Warehouse

Implement/finish a durable workflow for approved reusable content buckets:

- `READY`
- `HOT`
- `EVERGREEN`

Include provenance, status history, expiry/freshness, theme/format tags, rights/review state, assets, and queue eligibility.

### P6. Official image/carousel publishing support

Use official platform APIs only where available/allowed. Keep provider capability states explicit.

- text/image/carousel capability detection
- dry-run / validation mode
- fail closed when credential/scope/human approval is missing
- preserve publication request/response/error audit data without exposing secrets
- never claim a post succeeded unless the official API actually returned a successful result

### P7. Scheduler / queue

Required behavior:

- HOT priority
- spacing between similar topics/formats
- pause
- stop
- post now
- queue re-ordering / visible reason for scheduling choices
- avoid repetitive adjacent themes/formats
- final publication still passes 04 approval/safety/rights gates

Implement theme/format spacing before adding unnecessary complexity.

### P8. Later persistence / multi-account

Only after the earlier workflow is substantially complete:

- DB/server persistence
- migration/versioning strategy
- multi-account configuration
- per-account experiment/profile state
- credential references must not be committed in plaintext

## Real discovery run requirement

When current public examples can materially test the pipeline, collect several compliant/publicly accessible examples and push them through the real candidate model:

- source/platform
- public URL or indexed reference
- observed date/time if available
- actual visible engagement metrics only when verifiable
- theme/lane
- dedupe key/group
- comfort/safety result
- strength/weakness notes

Strong candidates should be strong because there is concrete evidence of engagement, current interest, useful discussion potential, or proven cross-platform resonance — not because the model merely says they are viral.

## Blockers policy

Do not ask the user for passwords, secrets, or posting credentials. If live publishing requires credentials/scopes or a human approval step, record the blocker and continue all non-blocked implementation/testing. A blocked publisher must remain fail-closed.

## Testing expectations

At minimum after meaningful implementation changes:

- repository syntax/check command(s)
- regression tests relevant to the changed module
- local server smoke test
- targeted tests for new behavior

If CI exists, confirm its result when possible. Do not report green unless actually observed.

## Handoff target

After meaningful work, create/update the next sequential note under:

`kimjae134679/project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`

The note must contain:

- baseline commit read
- files/features changed
- exact behavior added/fixed
- tests run + result
- real discovery examples tested, if any
- blockers
- next priority in the backlog
- new Threads commit SHA(s)

This handoff file may also be updated if the backlog/state materially changes so the next scheduled run can start immediately.