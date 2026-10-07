# Android review implementation and verification

Goal: isolated Android review shell using the verified 0.3.16 ID/outputVersion/reviewRound contract. No PC source or actual ratings writes.

Architecture: Java WebView shell, packaged local UI, IndexedDB atomic state/outbox and hash-checked image cache. Pure JavaScript version/queue logic tested by Node. HTTPS adapter disabled in shipped configuration because no approved internet review service/authentication route exists. Existing debug signing key only; no new keys, accounts, privileged permissions setup, server, or exposed port. Ordinary Android INTERNET declaration is prepared within the user's requested APK scope.

1. Test first: outputVersion parity with desktop/post-review-store.cjs; score bounds; independent checks/decision; version and round isolation; offline persistence; stale response, revision conflict, duplicate operation and malformed manifest handling.
2. Implement core.js with immutable version keys, serial outbox, explicit conflict resolution. Topic derivation reuses desktop/review-workflow-model.cjs via generated shared asset. Never infer approval from score.
3. Implement IndexedDB state+asset cache, HTTPS transport contract and review UI. Show blocked online service, local pending and server confirmed separately. No publishing endpoint or automatic publish capability.
4. Build with installed SDK 36/java21 tools; sign with existing debug keystore after checking it exists; do not generate a signing identity. Inspect APK signature, manifest and packaged files.
5. Run Node contracts, isolated browser UI fixture at narrow/wide widths, record actual coverage and blockers. Test fixtures stay outside APK. Commit only mobile/android-review; push its own branch and compare remote HEAD.

Future service requires versioned manifest/criteria, same-origin HTTPS PNG assets with SHA256, operationId idempotency, baseRevision CAS and stale reviewRound rejection. It must adapt canonical desktop evaluations/progress without moving old scores to fresh outputVersion.
