# Offline Upload Studio Implementation Plan

> For agentic workers: execute inline in the isolated upload-studio folder. The user's current instruction authorizes implementation and prohibits live operations and shared cover/review edits.

Goal: a usable local editor with long text, adjacent Instagram/Threads previews, durable local saves and queue/dry-run flows.
Architecture: Node 24 loopback server, atomic JSON state with revision conflicts, browser editor, pure domain contract; credential-free worker calls pinned existing official dry-run planners, existing PublicationJournal records local dry-runs only.
Tech: Node built-ins, plain HTML/CSS/ES modules; no npm dependencies.
Spec: latest delegated user instruction 2026-10-09, design v2 queue retained.

Constraints:
- No title input or timezone selector. Labels use source IDs/title only internally. Caption has no trim/truncation.
- Per-post caption/tags, targets and local planned time remain independent; UTC instant + original offset are stored.
- No account connection/login/OAuth, token read, external image fetch/upload, live publication, provider scheduling or payments.
- New version/content/order/settings invalidate approval. Missing source/rights/current review blocks approval. New version never enqueues itself.
- Keep all state/assets/journal under upload-studio/.local, distinct from other projects. No shared production modifications.
- Read remote AGENTS/04/contracts. Local .agents/skills inaccessible due helper failure; remote recursive tree has no .agents.
- Generated PNGs are never used as app screenshots.

1. Domain and persistence
Create domain.mjs, store.mjs, test/domain-suite.mjs, test/node.test.mjs.
Test first: long text exact preservation; independent settings; scheduled local offset -> UTC; optimistic conflicts; approval invalidation on order/edit/version; fail closed on missing source/rights/current review; idempotent enqueue; no auto-run on due dates; crash -> reconciliation.
Run pure suite in JS evaluator, Node disk/concurrency tests through repository CI. Expected failures before implementation.

2. Existing adapter/journal reuse
Create vendor copies of unmodified threads.mjs, instagram.mjs, publication-journal.mjs pinned to source blob SHAs; planner-worker.mjs and adapter.mjs.
Test workers receive empty environment, preserve ordered images/caption, deny network and never call publishing functions. Test PublicationJournal dry-run replay and ambiguous failures, keeping results out of publications.

3. Local server
Create server.mjs, local-assets.mjs. Validate loopback host/origin, body limits, exact allowlisted fields, revision conflicts; asset bytes stored by hash locally; no external image URLs rendered/fetched.
Integration test actual HTTP edit/restart/order/dry-run/cancel, blocked live endpoints, local-only asset download and fail closed.

4. Editor UI
Create public/index.html, studio.css, studio.js, icons.mjs.
Large common caption editor, right small multi-platform controls and local timing; beside composer platform previews with native-layout distinctions (IG media before caption, Threads text before media), real local images, caption expansion/order/ratio controls.
Keep queue stages/search/filter/sort/checks/cancel/retry. Real history stays empty without actual publication; dry-run history labeled separately.
Autosave serial queue and recovery backup. Import/export selected production bundle and local images only.

5. Verification/delivery
Create README, START.ps1, sample-bundle.json, test wrapper root test/upload-studio.test.mjs. Verify fresh pure tests and CI regression + actual loopback smoke. Attempt genuine browser rendering only through supported environment; report if unavailable.
Commit/push only added isolated files to feature branch, create draft PR, attach it; deliver actual code paths and test evidence. Do not replace the installed cover/review app.
