# Legacy Discovery → Current C/A/P State Migration

Updated: 2026-09-16 KST

This file prevents old records from being mistaken for current verified/produced/published content. It is an interpretation/migration layer; it does **not** fabricate missing URLs, rights, engagement, OCR/moderation or publication evidence.

## Current canonical state name
`YYMMDD_C{0|1|2}_A{0|1}_P{0|1}_<short-title>`

## Mapping rules

| Legacy evidence | Current interpretation |
|---|---|
| title but no exact traceable URL | `C0` |
| exact public URL + provenance/required observation actually recorded | at least `C1`, subject to the record's real evidence |
| selected production candidate with prior editorial evidence | `C2` only when the selection/clearance is actually recorded; rights/privacy/human gates still apply |
| `ASSETS_PENDING` | `A0` |
| text-only Demo Showcase/storyboard | `A0` for real-source user-facing output purposes |
| real source screenshot/image-backed user-facing set actually generated | `A1` |
| draft/queue/schedule/dry-run/provider-ready | `P0` |
| actual publication success verified by 04 | `P1` |

## Known legacy groups

### `kr-high-volume-2026-09-16-0128`
- 35 lead records.
- Titles and old engagement/state claims exist, but exact per-candidate public URLs do not.
- Current safe interpretation: **all `C0_A0_P0`** until individually re-observed.
- `data/discovery-provenance-quarantine-2026-09-16-0217.json` is authoritative for the fail-closed restriction.
- Do not delete the old observations; label them unverified legacy observations and do not quote them as canonical evidence.

### `discovery-2026-09-16-0037-kst`
- Records include exact public URLs and titles.
- They may be mapped candidate-by-candidate under the current C contract, but do not infer C2/A1/P1 merely because a URL exists.
- Items with `ASSETS_PENDING` remain A0.
- No publication is inferred; `publicationAllowed=false` remains authoritative.
- Finance candidate `ppomppu-stock-truthsocial-436664` is low priority under current taste because it is market/geopolitical reaction rather than a human story of a major investing outcome.

### Old `demo-showcase-*`
- Developer/regression material only.
- Black/text-only demos are not satisfactory user-facing source-backed content and must not be counted as A1.

### Other older `discovery-batch-*`, curated and queue records
- Preserve original raw records for audit/history.
- Do not bulk rewrite uncertain historical evidence into stronger states.
- When a candidate is touched again, migrate it into the current structured contract with exact title, exact URL, observation timestamp, evidence truth and C/A/P fields.

## Filename migration policy
Do not rename every historical raw file just to make the tree look new; that would destroy useful chronological/audit references and create noisy commits. Instead:
1. keep historical raw snapshots immutable where possible;
2. use this migration layer to interpret them;
3. all newly created or actively promoted candidate/content artifacts use the current state-visible naming contract;
4. when an old candidate is re-observed, create/update its current canonical record with the new name/state rather than pretending the historical snapshot already met the new contract.

## Publication invariant
Only `04_REVIEW_PUBLISH` can create a verified `P1`. No legacy record may be upgraded to P1 without actual publication evidence.
