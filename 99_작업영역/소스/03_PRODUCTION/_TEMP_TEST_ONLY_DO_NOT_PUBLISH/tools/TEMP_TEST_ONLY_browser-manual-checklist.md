# TEMP TEST ONLY — Browser E2E Manual Checklist

> DO NOT PUBLISH. This checklist validates only the isolated TEMP review prototype.
> It does not grant rights clearance, A1, P1, or production approval.

## Target
`TEMP_TEST_ONLY_review-screen.html`

## Required pass sequence
1. Open the TEMP review screen in a real browser through a local/static HTTP server so ES modules load normally.
2. Confirm the red `TEMP TEST ONLY · DO NOT PUBLISH` warning is visible before any action.
3. Keep the bundled synthetic fixture text; do not paste third-party full body text for this check.
4. Click `TEMP 모델 생성`.
5. Verify the status contains `TEMP=true` and `publicationAllowed=false`.
6. Verify text-only input produces a text cover with no generated-image fallback and no blur.
7. Verify content cards begin at Slide 2.
8. Click `TEMP 승인본으로 고정` and confirm the approval panel explicitly says it is not real publication approval.
9. Click `JSON 다운로드`; expected filename: `TEMP_TEST_ONLY_DO_NOT_PUBLISH_APPROVED_conversion.json`.
10. Open a fresh page/session and restore that downloaded JSON with the file input.
11. Verify the same approved snapshot is reflected and `publicationAllowed=false` remains enforced.
12. Negative test: alter a copy so `publicationAllowed=true` or `temporaryTestOnly=false`; restore must be refused.

## Evidence to record before marking stages 13–15 complete
- browser name/version
- execution timestamp
- downloaded filename
- slide count and first slide index
- round-trip equality result
- negative-test rejection result
- optional screenshot only if it contains synthetic fixture data; keep it under `_TEMP_TEST_ONLY_DO_NOT_PUBLISH/`

## Current status
`NOT_EXECUTED_IN_REAL_BROWSER`

The Node synthetic round-trip already passed, but that is not evidence of browser click/download/fresh-page restore behavior. Keep stages 13, 14, and 15 PARTIAL until the sequence above is actually executed.
