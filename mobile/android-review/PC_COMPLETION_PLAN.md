# PC connection completion plan

Goal: close missing release selection/incremental transport and feedback transaction code against PC0.3.16, using synthetic fixtures only. Parent explicitly authorized this scope on the current turn. Existing APK, PC source, real materials/ratings, accounts and bridge settings remain untouched.

Design: reuse exportRelease/publishPreparedRelease/prepareFeedbackImport and desktop version(row). A callable, default-disabled producer accepts trusted active pointer/report/delivery journal snapshots and read-only store. It selects only the currently active whole completed collection; it never falls back to an old round during an incomplete/failed transition. Hash-addressed transport skips confirmed identical data and verifies uncertain publication before retry. No timer, daemon or scheduled automation is created.

Feedback transaction: consume independently retained local provenance and pinned injected remote state, re-run prepareFeedbackImport against current canonical data under an exclusive lock, retain the exact previous bytes as immutable backup, and atomically replace a single canonical feedback JSON. Existing schemaVersion/recordType/reviewRound/evaluations remain PC-compatible; additive mobileImport metadata stores receipts/revisions and separate decision/check records in the same atomic commit. No workflow disposition or real posting action follows a score/decision. Crash recovery compares exact before/after hashes and preserves unexpected external changes.

Tasks:

- [x] Producer tests first: complete active pointer/report/journal; exclude missing/intermediate/failed rounds; hash-only delta; unchanged no-op; uncertain acknowledgement pinned verification; no duplicate commit; default-off and zero transport calls.
- [x] Producer implementation in pc/release-feed.mjs and test/pc-release-feed.test.mjs only; reuse existing adapters.
- [x] Feedback tests first: score/null/memo/checks/decision separation; exact ID/version/round; receipts replay; conflict preservation; backup bytes; atomic rename/failure/recovery; lock and source path safeguards; default-off.
- [x] Feedback implementation in pc/feedback-transaction.mjs and test/pc-feedback-transaction.test.mjs only; reuse prepareFeedbackImport, no actual PC store save.
- [x] Integrate pinned read/transport wiring as needed without real credentials or new scheduling. Add synthetic end-to-end proof across producer, mobile review and transaction.
- [x] Independent review, full regression, syntax/whitespace/security scan and activation limits. Commit/push confirmation is retained in the final external delivery receipt.
- [x] Source packaging recipe and synthetic evidence prepared. The final external delivery receipt records actual remote SHA and guarded Library replacement outcome; APK remains0.1.2 unchanged because all additions are PC-only.

Acceptance: exact0.3.16 current-round contract, no old-score copy to new outputs, no duplicate on lost response, no overwrite on conflict, backup+atomic+recovery tested. No actual user data read/write, transport, token, permission, repo creation, schedule or publishing executed. Final report must distinguish remaining configuration and real pilot from any still-unimplemented code.
