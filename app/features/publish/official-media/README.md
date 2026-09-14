# Official media publisher

Purpose: keep official image/carousel preparation inside `04 REVIEW_PUBLISH` without bypassing rights, privacy, safety, or current human approval.

Current scope:
- Threads image/carousel dry-run remains available from the approval queue.
- Instagram Feed/Carousel now has a 04-only staging + dry-run panel on currently approved candidates.
- the UI reads staging and Instagram capability state from server endpoints; it does not infer credential validity.
- staging accepts only the currently visible 1080×1080 Card Factory canvases for the same open candidate, maximum 10.
- canvases are converted to PNG data URLs and sent to `/api/media-staging/stage` only after current approval is confirmed.
- successful staging is displayed as `staged-unverified` with the exact approval basis and `externalReachabilityVerified:false`.
- Instagram dry-run accepts only URLs returned by that approval-bound staging step.
- dry-run records the request plan and `publicationOwner: 04_REVIEW_PUBLISH`; it performs no live publication.

Fail-closed rules:
- no current human publish approval => controls are absent/server rejects requests.
- wrong candidate, stale approval revision, missing render, non-square render, or more than 10 canvases => staging is blocked.
- staging requires an enabled public HTTPS staging origin, but configuration alone never proves external reachability.
- missing Instagram credentials remain visible as `credential-required`; dry-run plan construction does not claim credential validation.
- no live Meta publication path is enabled by this UI.

No password, access token, or plaintext secret belongs in client state or this feature. Provider secrets remain server-only.
