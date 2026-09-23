# NEXT RUN HANDOFF

## 🔴 LATEST USER OVERRIDE — 2026-09-24 — 후보 파일 선택 → 자동 evidence 불러오기 / 스크린샷 기본 경로 폐지

이 항목이 아래의 오래된 Source-cut/screenshot 지시보다 우선한다.

### 1) 프로그램 기본 입력 방식
- 사용자가 `data/candidates/*.md` 같은 **후보 파일 하나를 선택하면**, 프로그램이 그 파일의 `sourceUrl`/provenance/evidence 정보를 읽고 필요한 자료를 자동으로 불러오는 흐름을 기본으로 한다.
- **웹페이지 전체 스크린샷 캡처를 기본 제작 방식에서 제외한다.** 기존 screenshot/cut 기능은 호환·비상용으로만 보관하고 새 기본 경로에서는 자동 실행하지 않는다.
- 기본 흐름은 `후보 파일 선택 → 제목/본문/댓글/본문 이미지 로드 → 새 커뮤니티 양식으로 재구성 → 미리보기 → PNG/ZIP`이다.
- 후보에 로컬 evidence bundle이 연결돼 있으면 웹을 다시 긁지 말고 **로컬 TXT/JSON/이미지 폴더를 우선 사용**한다.
- evidence가 부족하지만 정확한 public `sourceUrl`이 있고 공개·허용 접근이 가능하면 그때만 누락된 제목/본문/댓글/본문 이미지를 보충한다.
- 로그인, CAPTCHA, anti-bot, paywall, robots, access-control을 우회하지 않는다. 막히면 정확한 blocker를 기록한다.

### 2) 앞으로 소재 탐색/정보 수집 시 반드시 남길 bundle
각 소재는 단순 후보 Markdown 한 장으로 끝내지 말고 **소재 폴더 하나(bundle)** 로 남긴다.

권장 구조:
```
data/candidate-bundles/<candidateKey>/
  candidate.md
  content.txt
  comments.txt
  manifest.json
  media/
    001.<ext>
    002.<ext>
    ...
```

- `candidate.md`: 기존 후보 메타/평가/provenance/status.
- `content.txt`: **실제 글 제목 + 공개 본문 내용**. 본문 문단 순서를 보존한다.
- `comments.txt`: **실제 공개 댓글 중 콘텐츠에 쓸 만한 댓글**을 원문 문장 그대로 선별해 저장한다.
- `media/`: **게시글 본문 안에 실제 삽입된 이미지/미디어만** 저장한다.
- `manifest.json`: `candidateKey`, exact `sourceUrl`, actual title, body/comments acquisition 상태, media 목록/순서/본문 삽입 위치, 실제 관찰 수치, acquisition 시각, blocker, `A1=false`, `P1=false`, `publicationAllowed=false`를 기록한다.

### 3) 댓글 수집 규칙
- 다음부터 정보 탐색 시 댓글을 일부러 건너뛰지 않는다.
- 공개·허용 범위에서 읽을 수 있는 댓글을 직접 확인하고, **콘텐츠에 쓸 만한 댓글만** `comments.txt`에 남긴다.
- 댓글을 못 읽었으면 꾸며내지 말고 `댓글 미확인/접근 불가`와 blocker를 기록한다.
- 닉네임/프로필/날짜/좋아요/댓글 수는 재구성 출력의 기본 데이터로 쓰지 않는다.
- 편집기 댓글 출력은 실제 댓글 문장만 사용하며 프로필 아이콘, 닉네임, 날짜, 좋아요, 댓글 수, 댓글쓰기 입력창을 새로 만들지 않는다.

### 4) 본문 이미지 수집 규칙
- 앞으로 정보 탐색 시 **본문 이미지도 제목/본문/댓글과 함께 수집**한다.
- 광고, 배너, 로고, 프로필/아바타, UI 아이콘, 추천·관련글 썸네일, 트래킹 픽셀은 제외한다.
- 공개·허용 방식으로 직접 다운로드 가능한 경우 원본 파일을 `media/`에 저장한다. **스크린샷으로 대신 만들지 않는다.**
- 원문 등장 순서대로 `001`, `002`… 번호를 부여하고 각 이미지가 어느 문단 뒤에 있었는지 `manifest.json`에 기록한다.
- 다운로드가 허용되지 않거나 실패하면 파일을 꾸며내지 말고 원본 URL/존재/순서/blocker만 기록한다.
- 편집기는 bundle의 `media/` 파일을 그대로 읽어 본문 문단 사이에 넣을 수 있어야 한다.

### 5) 제목 정리 규칙
- 실제 게시글 제목만 남긴다.
- 사이트/게시판 chrome인 `웹진 인벤 :`, `웹젠 인벤 :`, `- 오픈이슈갤러리`, `- 자유게시판` 및 동등한 prefix/suffix는 제거한다.
- 실제 작성자가 제목 본문에 직접 넣은 문구인지 불확실하면 임의 삭제하지 말고 검토 상태로 둔다.

### 6) 편집기 출력 규칙
- **표지 제목 방식은 현재 방식 그대로 유지한다.**
- 본문은 새 커뮤니티 게시판 양식으로 재구성한다.
- 본문 텍스트는 `content.txt`/verified evidence의 실제 글을 사용한다.
- 본문 중간 이미지는 `media/`의 실제 본문 이미지를 원문 순서/위치대로 넣는다.
- 댓글은 `comments.txt`의 실제 댓글 문장만 사용한다.
- 댓글 페이지에는 위/아래 여백을 충분히 둔다.
- screenshot mode는 기존 호환·비상용 기능으로만 남기고 **기본값/자동 경로에서 사용하지 않는다.**

### 7) discovery / sequential automation
- 앞으로 소재 탐색은 **제목만 찾아 후보화하는 것으로 끝내지 않는다.**
- 가능한 public/permitted 범위에서 **제목 + 본문 + 쓸 만한 댓글 + 본문 이미지**를 한 실행에서 최대한 같이 확보한다.
- C1 exact source verification 후 같은 실행에서 확보 가능한 body/comments/media evidence를 bundle에 채운다.
- missing evidence를 추정하지 않는다.
- source asset이 없는데 요약 카드/SVG/가짜 본문으로 대체하지 않는다.
- 기존 candidate Markdown은 index/status 용도로 유지하고, 실제 편집기에 필요한 원문 evidence는 bundle에 별도로 보존한다.
- 이 변경은 evidence acquisition/편집 입력 개선이며 A1/P1 또는 실제 게시 승인이 아니다.
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
