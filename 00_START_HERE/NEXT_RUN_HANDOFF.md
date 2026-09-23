# NEXT RUN HANDOFF

## 2026-09-24 03:30 KST — Source-cut editor + acquisition contract update
- Source-cut editor now keeps BOTH output methods: screenshot mode and reconstructed text/media mode. Cover/title behavior stays on the existing cover renderer.
- Screenshot comment separation: use the editor tool **댓글 시작점** and click the first comment line inside the selected body range. That marker splits later screenshot slices into body vs comment. Text-comment mode ignores this marker.
- Reconstructed mode: source body text is rendered from the acquired text itself; comments are rendered from acquired comment text itself. Comment output must contain only the real comment sentences in source order—no invented profile, nickname, date, likes, counts, reply controls, or input UI.
- Title cleanup must strip site/chrome wrappers such as `웹진 인벤 :`, `웹젠 인벤 :`, and suffixes such as `- 오픈이슈갤러리`, `- 자유게시판`; keep the actual post title.
- Body media is now part of acquisition. Capture only images that are actually inside the post body; reject ads, banners, logos, avatars/profiles, UI icons, recommendations/related-content thumbnails, and tracking pixels. Preserve source order and record where each image belongs between body paragraphs so reconstructed output can place it mid-post.
- IMPORTANT discovery/sequential acquisition contract from this run onward: for each exact public individual source, attempt to acquire **(1) exact title, (2) full publicly visible body text, (3) publicly visible comment text, (4) body media used by the post, (5) exact source URL/provenance, (6) actually observed metrics if present**. Never invent missing text/comments/media/metrics and never bypass login, paywall, anti-bot, robots, or access controls. If any are unavailable, record the precise blocker.
- Candidate/discovery records should retain body text + comments text + body-media references/bytes where public/permitted so the editor can open a candidate without re-scraping. If images are acquired, keep source URL/order and enough metadata to insert them back into the text flow.
- Default safety: A1/P1 remain false and publicationAllowed=false. This acquisition upgrade is evidence gathering only and does not grant rights or publication approval.
- ZIP export is gated by successful preview + the user checkbox confirming body/comment order. The UI must show the exact blocking reason instead of a silently disabled button.
- Current editor work is on branch `ui-redesign-source-editor`; do not overwrite it with the old dashboard/TEMP SVG prototype path. Run `npm run check` and desktop smoke before release.

## 2026-09-24 02:17 KST — Discovery-only run 355
- User scope strictly `01_DISCOVERY`; no downstream stage work.
- Reviewed 40+ Korean-community-focused public search/index leads and retained 8 new C1 candidates with exact individual public URLs; duplicates, already-retained, thin/unsafe/sensitive/inaccessible/weak-story results were filtered rather than padded.
- Top additions: `싸웠던 상사, 괜찮은 사람인줄 알았는데 나르시스트인거같은 후기`, `핫게 보고 내 친구 생각난 후기`, `30대 초중반 미혼 여자 평소 연락하는 사람 엄마 제외 1도 없는 후기`, `돈 없는 친구가 피곤한 후기`, `비혼덬 결혼 공격 2연타 당한 후기 (긴글주의)`.
- Exact public individual URLs and publicly visible body text were verified for retained items; comments were not intentionally read and only actually observed metrics were stored.
- NAVER Cafe and Instiz were robots/access restricted and were not bypassed; public search/index and publicly accessible individual pages only.
- All remain A0/P0 with A1=false/P1=false and `publicationAllowed=false`. No screenshots, image downloads, OCR, scoring, production, rendering, Chrome E2E, publishing, scheduling, provider implementation, or existing production edits.
- Next discovery run: continue new Korean-community material discovery and exact-source verification only; do not advance stages.

## 2026-09-24 01:15 KST — Discovery-only run 354
- User scope strictly `01_DISCOVERY`; no downstream stage work.
- Reviewed 40+ Korean-community-focused public search/index leads and retained 7 new C1 candidates with exact individual public URLs; duplicates, already-retained, thin/unsafe/sensitive/image-only/weak-story results were filtered rather than padded.
- Top additions: `(초스압) 망한 피씨방 인수한 썰`, `친구 결혼하면 원래 멀어지는건가 싶은 후기`, `소리지르는 상사`, `10명 이하 소수인원으로 직장동료 친구 결혼 본식 원판 찍은 후기`, `(장문) 야간 편돌이 담배 도둑맞은 썰`.
- Exact public individual URLs and publicly visible body text were verified for retained items; comments were not intentionally read and only actually observed metrics were stored.
- Anonymous/pseudonymous personal claims remain attributed/unverified; no rights status was inferred. Sensitive/self-harm and sexualized leads were filtered out rather than retained.
- Public search/index and publicly accessible individual pages only; no access-control or anti-bot bypass.
- All remain A0/P0 with A1=false/P1=false and `publicationAllowed=false`. No screenshots, image downloads, OCR, scoring, production, rendering, Chrome E2E, publishing, scheduling, provider implementation, or existing production edits.
- Next discovery run: continue new Korean-community material discovery and exact-source verification only; do not advance stages.

## Sequential candidate automation
- Discovery run 355 added candidates, so any separate sequential lane must rebuild its queue before continuing.
- No sequential candidate was processed by discovery run 355.

## TEMP TEST ONLY conversion lane
- Prior TEMP TEST ONLY state unchanged by discovery run 355. Discovery did not enter `03_PRODUCTION`.
- REAL publishing/metrics remains disabled. Only `04_REVIEW_PUBLISH` may publish after human rights/privacy/safety approval.
