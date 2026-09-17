# NEXT RUN HANDOFF

Updated: 2026-09-18 00:16 KST

## Start here
Repo tip wins. Preserve `01 DISCOVERY → 02 EDITORIAL_SCORING → 03 PRODUCTION → 04 REVIEW_PUBLISH → 05 EXPERIMENTS_ACCOUNTS`. Only `04_REVIEW_PUBLISH` may publish. Never fabricate API/moderation/OCR/rights/metrics/credentials/delivery/publication success or store plaintext secrets.

## User-facing format is binding
Slide 1 cover only; slide 2+ ordered ORIGINAL POST SCREENSHOTS covering the FULL body. No rewritten/summary/interstitial/CTA body cards. UI-chrome crop only with body preserved. Privacy masking is user-directed. Missing real source assets = `ASSETS_PENDING`.

## Current source-first implementation
Screenshot intake → explicit HUMAN_REVIEW/USER_CONFIRMED completeness verification → non-destructive UI-chrome crop suggestion/review → reviewed crop gate → 1080x1080 contain/no-stretch normalization → independent normalization validator → strict source-backed carousel plan → strict carousel validator.

## This run — production validation hardening
Started from current handoff, current main/recent commits and latest ops `153-sol.md`; repo tip treated as authoritative. Material repo change: hardened `scripts/validate-source-backed-carousel-plan.mjs` so the final carousel gate independently rejects malformed or duplicated source screenshots even if an upstream validation step is accidentally skipped. It now verifies SHA-256 format/uniqueness, exact source URL consistency, 1080x1080 target, positive integer source/scaled geometry, non-negative integer padding, exact 1080 closure, centered contain geometry, per-slide `USER_DIRECTED_ONLY` privacy policy, binding body policy, source order and no-body-crop/no-stretch requirements. Publish ownership remains `04_REVIEW_PUBLISH` and `publicationAllowed=false`.

## Discovery status
This implementation run inspected **0 raw leads** and retained **0 new candidates**. Most recent completed Discovery refresh inspected **40+ raw leads** and retained **15** candidates. Top recent candidates remain Blind `결혼 1년정도 됐는데, 남편이 빚투로 2억5천 빚을 만들었어요...`, `시댁`, `남편이 빚을 숨기고 친정부모님 지원금으로 갚았어요.`, plus the strongest Reddit debt/wedding-conflict fallbacks.

## Asset truth
Full-post screenshots captured this run: **0**. Actual source bytes acquired: **0**. Real source-backed carousel produced: **NO**. A1/P1: **0**. Candidates remain `ASSETS_PENDING / publicationAllowed=false`; rights/privacy/human-review gates remain and only 04_REVIEW_PUBLISH may publish. No OCR/moderation/rights/publication success claimed.

## Verification truth
The validator was updated directly through GitHub-connected source operations. No executable checkout/browser session was available in this run, so targeted runtime tests, `npm run check`, server smoke and Chrome E2E were not executed and are not claimed. Static review was performed against the current builder contract.

## Next
1. Acquire permitted ordered full-post screenshots for the strongest Korean candidates, starting with the 2.5억 빚투 / 시댁 / 친정지원금 숨긴빚 stories.
2. Run real bytes through intake → completeness verification → crop review/gate → normalization → validator → strict carousel builder/validator.
3. Render first real 1080x1080 cover + full-original-post screenshot carousel and inspect in Chrome.
4. Keep A0 until actual source-backed user-facing assets exist; keep P0 until 04 verifies real publication.
