# NEXT RUN HANDOFF

Updated: 2026-09-18 01:19 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → independent normalization validator → strict source-backed carousel plan → strict carousel validator.

## This run — implementation
Started from current handoff, current main/recent commits and latest ops `155-sol.md`; repo tip treated as authoritative. Material change: hardened `scripts/build-screenshot-intake-manifest.mjs` source provenance intake so exact-public source URLs now fail closed for private/local IPv6 forms as well as the existing IPv4/local/credential/secret-bearing URL checks. Newly rejected forms include IPv6 unspecified/loopback, unique-local `fc00::/7`, link-local `fe80::/10`, and IPv4-mapped private/loopback/link-local addresses. This prevents a source package from recording a local/private endpoint as public provenance while leaving screenshot bytes/order/body handling unchanged.

Role chain, `publicationAllowed=false`, `publishOwner=04_REVIEW_PUBLISH`, `USER_DIRECTED_ONLY` privacy masking, no OCR/vision inference, and full-body human verification remain unchanged.

## Discovery/asset truth
Discovery raw candidate count this implementation run: **0**. Retained: **0**. Most recent completed Discovery remains **40+ raw / 15 retained**; strongest recent candidates remain Blind `이거 어떻게 복수해줄까요?ㅠㅠ`, `결혼 주선자 사례 X, 청첩장 못 받음. 축의금 해야돼?`, `JW메리어트 호텔 결혼 축의금 얼마나?`, `임신 막달 남편 격일 회식 이해가 가는지`, `축의금 때문에 친구한테 섭섭한데..`.

Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. Existing candidates remain `ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human-review gates remain and only 04_REVIEW_PUBLISH may publish.

## Verification truth
GitHub source update completed at commit `44246027e915998b88cb9f870d2bb6c64104e960`. No executable checkout/browser session was available in this run, so targeted runtime fixtures, `npm run check`, server smoke and Chrome E2E were not run or claimed. The modified script remains included in the repository's standard `npm run syntax` gate.

## Next
1. Acquire permitted ordered full-post screenshots for the strongest Korean candidates.
2. Run real bytes through intake → completeness verification → crop review/gate → normalization → validator → strict carousel builder/validator.
3. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
4. Keep A0 until actual source-backed user-facing assets exist; keep P0 until 04 verifies real publication.
