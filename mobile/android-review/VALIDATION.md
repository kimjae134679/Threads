# Android review preparation 0.1.1 validation — 2026-10-08

Baseline PC checkout and origin/codex/review-workflow-20261008 were both `887eb1abffa378f7d7156bc8d0ecdb7126316686`. Independent worktree `C:\Users\user\Documents\Codex\2026-10-08\task-5\mobile-worktree`, branch `codex/android-review-20261008`. PC reproduction changes were already present in the original checkout and were not edited/staged by this task.

## Completed evidence

- Verified desktop `post-review-store.cjs.version(row)` parity using the same canonical fields/image hashes/round.
- 15 new Node contracts pass; plus 2 desktop baseline regression suites pass (17/17). Red tests captured before implementing versioning/queue and before correcting reviewer findings.
- Existing project JavaScript syntax check: 237 files pass. Generated APK bundle syntax separately checked.
- Installed Chrome headless with dedicated pipe/isolated profiles: 390px + 800px widths, truthful empty/service-blocked state, cached fixture image, all 10 scores, Unicode memo, criterion, approval confirmation dialog, held state, IndexedDB save/reload, conflict with both records, explicit rebase, new outputVersion blank state, no horizontal overflow. Fixture-only; no actual ratings/posts read or written by UI test.
- Independent review identified unseen revision/criteria relabeling and lost-response retry issues. Regression tests reproduced both, corrections passed; independent rereview found no remaining Critical/Important issues. `syncReviews` is confirmed inside the final APK bundle.
- APK built using installed JDK21 + SDK build-tools36.0.0/android36 (`aapt`, `javac`, `d8`, `zipalign`, `apksigner`), no downloads/SDK/Gradle setup. Existing Android debug key used, no signing identity created.
- APK v2/v3 signature verification passed. Manifest: API26 minimum / SDK36 target, versionCode2/versionName0.1.1, debuggable false, backup false, cleartext false; only ordinary `android.permission.INTERNET` declared. This normal declaration is within the user's explicit Internet APK request; no privileged/runtime grant or network/security setup is performed. APK contents limited to manifest, three UI assets, classes.dex and signature metadata. No fixtures, raw posts, user ratings, token/key file or bridge secrets.
- Final prepared APK: **21,010 bytes**, SHA256 **e2fd5845d8e57458e352010ecf5d103edd7926a4ef96d1d6a420267a12fdbc31**.
- Private personal Library delivery is tracked outside this public source tree. No private Library identifiers or credentials are included here. Windows POSIX xattrs are unsupported; private identity sidecars retain returned Library versions without claiming xattrs were applied.

## Explicit limits

- Actual Android installation/launch/WebView rendering **not verified**: no connected device or configured AVD/system image. Browser tests verify the packaged web UI, not Android system integration.
- Actual Internet posts/assets receive and PC evaluation synchronization **unconnected and not executed**: no existing approved HTTPS review endpoint or app-user authentication route is available in the inspected environment. Existing PC server and ProjectBridge are loopback-local services, not an Internet review API. Ordinary Android INTERNET declaration is prepared; it is not the cause of missing online service/authentication. Current endpoint configuration is empty and actual network loads remain disabled. No bridge/service/config/security/port changes.
- Publishing **not implemented**. Approval is a distinct review intent tied to one outputVersion/round, not a platform action. No publication ID is generated.
- APK is signed for private review with the existing debug key, not a production store-release signing setup.
- Scope clarification confirmed source/test commits may be pushed to the existing Threads branch after checking they contain no actual source posts, evaluations, private delivery identifiers or credentials. No APK public release, raw material/ratings upload or new public deployment is authorized/performed. Remote commit SHA verification is recorded in the private delivery receipt and final handoff.
- JDK emitted expected Java8-target deprecation warnings; build exit0 and signature verification confirmed success.
- In-app browser connection timed out. No repeat/DC quota attempts. Headless Chrome used an isolated profile; synthetic loopback server stopped after QA.
- Parent cross-thread early message could not deliver because the source thread was not found by the local thread API; final delegated result supplies the findings.

## Server work required separately

Versioned manifest/criteria and same-origin hash-checked PNGs; existing approved per-user authentication; atomic operationId deduplication/CAS/baseRevision; rejection of old round/version/criteria; adapter into separate PC canonical evaluation/progress files. Mobile code/documentation only; no PC schema/server changes deployed. See SERVICE_CONTRACT.md and CONNECTION_HANDOFF.md for the smallest user choice: supply an already-used HTTPS service address/login method without secrets, or confirm none exists and let the parent seek a concrete separate hosting/auth approval.

## Commands

```powershell
node scripts/check-syntax.mjs
node --test test/post-review-store.test.mjs test/bulk-review-model.test.mjs mobile/android-review/test/*.test.mjs
node mobile/android-review/build-assets.mjs
node --check mobile/android-review/build/assets/bundle.js
node mobile/android-review/test/browser-server.mjs
# Use emitted 127.0.0.1 URL only:
node mobile/android-review/test/browser-qa.mjs http://127.0.0.1:PORT
& .\mobile\android-review\build.ps1
git diff --check
```
