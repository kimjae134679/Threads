# Review workflow implementation — 2026-10-08

Goal: connect actual views, automatic topics, unseen eligible selection and reversible triage to the existing installed review flow while preserving evaluations and every original output.

Approved design: keep 평가 기록.json untouched by workflow changes. Store progress separately in 검토 진행.json keyed by article ID + outputVersion (including review round). Mark a view only after the full-size image loads, never for thumbnails or prefetch. Missing outputs stay outside random selection. Restore a rejected or held output without deleting its sources or ratings. Automatic topic labels are routing hints for an initial single account and later topic-based account experiments, not factual or publish approval.

Files:
- desktop/review-workflow-model.cjs: topic rules and eligibility.
- desktop/post-review-store.cjs: serialized atomic progress, dispositions and random API.
- desktop/post-review-service.cjs / post-review-preload.cjs: guarded IPC.
- app/source-cut-post-review.*: topic/status/seen filters, random, restore, start-at-cover and durable position.
- test/review-workflow.test.mjs: real file persistence and version/eligibility regression.
- desktop/review-workflow-smoke.cjs: hidden Electron fixture with the real image loader and close/reopen.
- desktop/package.json / main.cjs: packaged module and review-only entrypoint.
- test/rendered-carousel.test.mjs: same-volume temporary fixture to preserve the relative-source contract on Windows.

Steps:
- [x] Run new persistence test red against baseline.
- [x] Implement the minimal store/model and connect guarded IPC and UI.
- [x] Run related tests, whole syntax/regression and git diff --check.
- [x] Run real hidden Electron UI: full image view versus thumbnail; filters; random; held/rejected restore; score/note and close/reopen.
- [x] Package a new version beside 0.3.15, preserve original data, inspect real launch and paths.
- [ ] Commit only changed code/test/docs, push and verify remote SHA.

Constraints: no publishing, scheduling, personal-account activity, credentials, bridge/worker changes, other project code, deletion of original materials or copying old scores to a new production revision. Viewer-only changes preserve the active production round. Content changes require a separately audited full new production delivery.
