# Prepared review service contract (not deployed)

No approved Internet service/authentication exists as of this implementation. These interfaces are proposed adapter contracts, not existing PC endpoints. This branch changes no PC server or evaluation file.

## HTTPS read: GET /v1/review/manifest

```json
{
 "schemaVersion": 1,
 "reviewRound": "current-round",
 "criteria": {"version":"criteria-1","items":[{"id":"readable","label":"Readable body"}]},
 "entries": [{
   "id":"canonical-post-id", "title":"Original title", "topic":"work", "topicLabel":"Work",
   "category":"automatic", "outputVersion":"64 lowercase hex SHA256",
   "reviewRound":"current-round", "revision":0,
   "images":[{"url":"/v1/review/assets/opaque-id.png","sha256":"64 lowercase hex SHA256","label":"Cover"}],
   "review":null
 }]
}
```

`outputVersion` exactly equals desktop `post-review-store.cjs.version(row)`: SHA256 UTF-8 JSON `[sourceFingerprint,outputSha256,ruleVersion,imageSha256Array,...reviewRoundIfPresent]`. It is not a title/date proxy. IDs and production hashes/round come from the current canonical release. New outputVersion/reviewRound yields no prior scores. No previous review should be relabeled as current.

`review` is null only when no current review exists, otherwise `{score:1..10|null,note:string,checks:{criterionId:boolean},decision:unreviewed|needs_revision|held|publish_approved}`. Criteria have their own version. Mobile edits use the revision and criteriaVersion actually displayed, even if newer data arrives while editing. Topic/category is server-derived using existing canonical workflow; fallback topic reuses verified desktop classification.

## HTTPS write: POST /v1/review/operations

```json
{
 "operationId":"UUID", "id":"canonical-post-id", "outputVersion":"current-version-hash",
 "reviewRound":"current-round", "baseRevision":0, "criteriaVersion":"criteria-1",
 "kind":"review", "payload":{"score":8,"note":"Review note","checks":{"readable":true},"decision":"held"},
 "deviceId":"app-local-random-id", "createdAt":"ISO8601"
}
```

Successful response: `{operationId,status:"applied"|"duplicate",revision:N}`. Server must persist operationId, full request hash and result atomically with the canonical write. Identical replay returns the original result; different payload reusing the same ID is rejected. Lost POST responses retry the same ID before loading a manifest so duplicate acknowledgement can recover without a false conflict. Server deduplication is required; client tests cannot prove a deployed server implements it.

CAS mismatch response (409): `{operationId,status:"conflict",revision:N,review:currentReviewOrNull}`. Preserve both server and local payloads. User selects server state or rebases their latest pending local state into a fresh operationId with the server revision. Same-key pending edits are blocked while a conflict is unresolved.

Changed post/round/criteria response (409): `{operationId,status:"stale",revision:N}`. Old operation is archived and never written to a new production version. Never use last-write-wins or silently migrate scores. Authentication failures return non-success (401/403); no local operation is marked confirmed.

## Assets/security/publishing

Assets are PNG <=25 MiB, same service origin via `/...` relative paths; SHA256 checked before IndexedDB caching. TLS only; no redirects, credentials omitted in the current generic adapter. Real user authentication must use an already approved service mechanism; no secret is bundled. CSP and Android allowlist must be narrowed to the approved service during authorized activation. The prepared APK declares ordinary INTERNET access; serviceConfig is unset and actual WebView network loads remain disabled. Missing service/authentication, not a prohibition on this normal Android declaration, is the real online blocker.

The adapter must preserve existing separate canonical score/note and review-progress contracts. `publish_approved` records a human review decision tied to this artifact; it is not a platform publication, does not create a publication_id and cannot bypass fact/rights/privacy/platform/final-account approval checks. There is no publishing route in this client.
