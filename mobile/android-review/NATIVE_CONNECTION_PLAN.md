# Native connection readiness implementation plan

> Agentic workers: use executing-plans task-by-task; tests precede implementation.

Goal: finish native GitHub device-login/Keystore and fixture-only PC exchange
readiness without creating a repository/app/credential/permission or connecting.
Architecture: dedicated private review repository only, separate from bridge
and command repositories. Pure Java device-flow controller with mock endpoint,
vault and clock; Android UI/HTTPS/Keystore adapters compiled but activation off.
Existing versioned GitHub adapter uses a narrow credential-free native API bridge.
Tech stack: installed JDK21/SDK36, dependency-free Java/JS, existing debug key.
Spec: latest parent request, GITHUB_SYNC_PREPARATION.md and SERVICE_CONTRACT.md.

Global constraints: no actual authentication/keys/tokens/grants/uploads, no PC
original/source/rating writes, no bridge repositories/queues/secrets, no tool
installation or publishing. APK must display prepared/disconnected truthfully.

- [x] Pure Java auth controller + JVM mock harness: disabled means zero endpoint
  or vault calls; official verification URL only; interval/slow_down/expiry,
  cancellation, error denial, access/refresh expiry and atomic refresh replacement.
- [x] Android native UI, bounded no-redirect HTTPS, token vault AES/GCM with
  AndroidKeyStore and profile-bound associated data. Constructor/read absent-file
  paths must not generate a key. Token save needs approved activation and a
  successful repository verification, exclusively outside WebView JavaScript.
- [x] Narrow bridge to api.github.com using native stored token; expose no auth
  endpoints/tokens and reject unapproved/default/public/bridge scopes. Render only
  locally packaged pages with frame/navigation/network loading denied.
- [x] PC export/import agent implements new pc modules and synthetic tests only;
  reuses read-only0.3.16 contracts, explicit new outputs, proposal-only imports.
- [x] Integrate prepared UI0.1.2; fresh Java compile/JVM mocks/JS contracts,
  synthetic narrow/wide browser QA, independent review. Build/sign with existing
  key, inspect permission/assets/signature, prepare delivery receipt and retain the
  same official Library APK/source identities. Real device/GitHub tests stay pending.
