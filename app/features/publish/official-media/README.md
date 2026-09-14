# Official Threads media publisher

Purpose: prepare official Threads API image/carousel publishing without bypassing review gates.

Current scope:
- capability state: `credential-required`, `live-disabled`, `ready-to-validate`
- single public HTTPS image dry-run
- 2–20 public HTTPS image carousel dry-run
- server re-validates the same approved candidate used by text publishing
- dry-run results are local audit records only; they are never presented as published posts

Fail-closed rules:
- no current human publish approval => server rejects dry-run
- non-HTTPS/private/local image paths are rejected
- no access token => live state remains credential-required
- even with a token, media live calls remain disabled unless explicitly enabled server-side
- Card Factory canvas/blob output is not treated as a hosted URL

No password or plaintext secret belongs in this feature. `THREADS_ACCESS_TOKEN` remains server-only.