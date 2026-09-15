# NEXT RUN HANDOFF — Threads Source-First Build

Updated: 2026-09-16 KST

## Mandatory startup rule
Every run MUST begin by reading this file, inspecting current `main`/repo tip and recent commits, then reading the latest sequential note under `kimjae134679/project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/`. Determine current instructions, unfinished concrete work and blockers before changing anything. **Repo tip wins over stale handoffs.**

Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`; only 04 may publish. Rights/privacy/Audience Comfort/current human approval fail closed. Never fabricate API/OCR/moderation/engagement/rights/credentials/delivery/publication and never persist plaintext secrets.

## Mandatory discovery record + naming contract
Every collected candidate MUST contain its exact observed title and exact canonical/public source URL. A title without an exact URL is only an unverified lead and MUST NOT be promoted as a normal candidate. Engagement observations must remain tied to their observation timestamp/source snapshot.

Use a state-visible name for candidate/content artifacts:
`YYMMDD_C{0|1|2}_A{0|1}_P{0|1}_<short-title>`

- `C0`: discovered lead only; provenance/body/comments may still be incomplete.
- `C1`: exact source URL/provenance verified and required source observations recorded.
- `C2`: selected/cleared as a production candidate subject to the remaining explicit rights/privacy/human gates.
- `A0`: no real source-backed user-facing asset set generated.
- `A1`: real source screenshot/image-backed carousel/content asset set actually generated.
- `P0`: not actually published.
- `P1`: actual publication success was observed/verified by `04 REVIEW_PUBLISH` only. Queueing, dry-run, API intent or provider readiness never qualifies as P1.

Keep the same C/A/P fields inside structured records; do not rely on filenames alone. When state changes, rename/update consistently rather than leaving a misleading state prefix.

## Current state
Package `0.42.1`. Source Package intake accepts ordered real screenshots/images with post/continuation/media/comment roles and exports source-backed 1080×1080 PNG slides: first real image hook, evidence assets in source order using contain over blurred background, then CTA. No generated replacement imagery and no provider/publication side effect.

Current main advanced after the previous validation repair with `0684db0` (`Add high-volume Korean community candidate pool`). That batch contains 35 ranked Korean-community leads, but its candidate records do not contain exact source URLs/public-page references. Several records also claim BODY_READ/COMMENTS_READ and engagement values. `data/discovery-provenance-quarantine-2026-09-16-0217.json` therefore fail-closes the whole batch for editorial promotion/production/publication until each candidate is re-observed against an exact public URL or user-provided source capture. Under the new naming contract these remain effectively `C0_A0_P0` leads.

## Discovery taste
Early discovery should be high-volume and Korean-community first. Prefer funny/absurd true stories, workplace/dating/family conflict, money/gifts/debt/lottery, embarrassing misunderstandings, strong reversals and instantly debatable situations. For stocks/crypto/investing, do NOT prioritize ordinary market/price/rate/stock news. Prefer human stories where investing caused a major outcome: huge gain/loss, leverage/debt disaster, absurd mistake, verified dramatic account result, relationship/family/work conflict, or a strong reversal. Never invent the gain/loss or engagement evidence.

## Discovery volume truth
Raw candidate records inspected from the quarantined high-volume batch: **35**. Retained as verified/promotable in that run: **0** because the batch lacks per-candidate traceable source references. The prior ranking is preserved only as a lead list, not as verified evidence. Do not quote its engagement values as canonical until re-observed.

Top leads worth re-verifying first because their story/image progression appears strongest from the lead metadata: TheQoo wedding-photo story, Blind breakup/engagement stories, Blind public-servant 4M-loan request, TheQoo food/visual humor, Ppomppu large property-tax story. These are leads only; source body/comments/metrics must be re-observed before promotion.

## Validation truth
Previous authorized Windows run: `npm run check` PASS, exit 0; ffmpeg/ffprobe vertical regression PASS at 1080×1920 H.264/yuv420p/30fps. No code path changed in the provenance-quarantine run, so those tests were not falsely claimed as rerun. Browser E2E and actual square PNG download dimensions were not executed in that run.

## Real source-backed result
**NOT YET A COMPLETED USER-FACING SET.** No new lawfully reusable/user-provided Korean-community screenshot set was acquired. The 35 high-volume leads remain `ASSETS_PENDING` / `C0_A0_P0`, and the entire 0128 batch is additionally provenance-quarantined. Text-only demos do not count.

## Next priority
1. Re-verify the strongest high-volume leads against exact public URLs/index pages; record exact title + URL, observation time, only actually visible metrics, body/comments read truth and asset availability. Promote to C1 only after provenance is real.
2. Prefer a visually strong Korean-community post whose source screenshot/image can be compliantly captured; otherwise keep `ASSETS_PENDING`/A0.
3. Feed a permitted/user-provided screenshot set through screenshot intake and visually verify the 1080×1080 source-backed carousel in Chrome, including exact PNG dimensions and readable non-destructive evidence framing. Set A1 only after actual generation.
4. Run targeted tests + `npm run check` + server smoke/browser E2E when the user-visible path changes.
5. Keep publication blocked until rights/privacy/current human approval pass; only 04 may publish. Set P1 only after actual publication success is observed.
6. After square quality is proven, use the same Source Package for the separate 1080×1920 Reels/Shorts renderer without stretching square cards.

## Mandatory end-of-run handoff
After every meaningful run, update this file and create the next sequential ops-hub note. Record baseline and resulting Threads commit SHA(s), changed files/features, raw/retained discovery counts, exact titles+URLs for retained candidates, tests actually run/results, browser E2E actually observed, acquired source assets, `ASSETS_PENDING`, blockers, next concrete priority, and whether any A1/P1 state was genuinely reached. Do not report tests, CI, publication or asset acquisition that was not actually observed.
