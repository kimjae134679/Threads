# FORMAT PLAYBOOK — 실제 제작 형식

이 문서는 `02_EDITORIAL_SCORING`에서 승인된 사실과 각도를 어떤 실제 콘텐츠 형식으로 만들지 결정하는 제작 규칙이다.

`03_PRODUCTION`은 사실을 새로 만들지 않는다. 포맷/표현/시각화만 담당한다.

## 최우선 바인딩 규칙 — Source Screenshot Carousel

커뮤니티/Threads/Instagram 등 **원문 게시물을 소재로 만드는 기본 carousel**은 아래 규칙이 다른 과거 F08 예시보다 우선한다.

1. **Slide 1 = COVER ONLY.** 이미지 1장 + 원문 게시물 제목/훅 텍스트만 둔다.
2. Cover 문구는 기본적으로 **원문 제목 그대로** 쓴다. 원문 제목 안의 강한 구절을 그대로 발췌하는 것은 허용하지만, 별도 요청 없이 선정적으로 재작성하지 않는다.
3. **Slide 2부터 끝까지 = 원문 게시물 screenshot을 원래 순서대로.**
4. 원문 본문은 전부 포함한다. 여러 화면이면 순차 screenshot을 충분히 확보해 한 문장도 요약·축약·재작성·누락하지 않는다.
5. 플랫폼/브라우저 UI chrome은 crop 가능하지만 실제 게시물 내용은 crop하지 않는다.
6. 설명 카드, 요약 카드, 반응 카드, CTA 카드, 재작성 story card를 screenshot 사이에 자동 삽입하지 않는다.
7. privacy/PII 후보를 자동 masking하지 않는다. 수동 masking 도구는 유지할 수 있으나 실제 변경은 사용자 지시가 있을 때만 한다.
8. 게시물 자체 첨부 이미지/미디어가 있으면 screenshot/source sequence의 일부로 보존한다. 생성 이미지로 대체하지 않는다.
9. Cover 이미지는 source media, 사용자 제공 이미지, 별도 생성 이미지 등 case-by-case로 결정하며 아직 하나의 방식으로 고정하지 않는다.
10. 실제 screenshot/media가 없으면 `ASSETS_PENDING`; 가짜 body card를 만들지 않는다.

### 원문 형식 기록 — 세 개만 사용

Discovery/Source Package의 형식 분류는 복잡하게 나누지 않는다.

- `글` — 텍스트 중심이며 콘텐츠 이해에 필요한 원문 이미지가 없음.
- `이미지` — 글 본문에 첨부 이미지/사진/뉴스 캡처 등이 같이 있음. 원문 글과 이미지를 함께 가져온다.
- `이미지 포스팅` — 이미지/카드/슬라이드/스크린샷 자체가 본문의 중심. 전체 이미지/슬라이드를 원래 순서대로 가져온다.

`TEXT_ONLY`, `TEXT_WITH_INLINE_IMAGE`, `CAROUSEL_SOURCE`, `SCREENSHOT_POST`, `NEWS_CARD_POST`, `MIXED_MEDIA_POST` 같은 세부 taxonomy는 더 이상 새 후보/Source Package에 사용하지 않는다.

원문에 자체 이미지/뉴스 캡처/여러 슬라이드가 있으면 텍스트만 떼어 저장하지 않고, 원문 screenshot 및 첨부 이미지 순서를 Source Package에 함께 보존한다.

### Screenshot Intake가 해야 하는 일

- ordered screenshot intake
- UI-chrome crop suggestion
- 원문 순서 보존
- 1080×1080 canvas 안에서 contain/letterbox 방식의 dimension normalization
- source URL / observation / screenshot order provenance 보존
- body completeness 확인용 수동 checklist

Screenshot Intake가 자동으로 해서는 안 되는 일:

- 본문 요약/재작성
- 본문 일부 생략
- 자동 privacy masking
- OCR 성공을 실행 없이 주장
- 원문 대신 생성 이미지/body card 삽입

## 공통 제작 원칙

1. 첫 화면/첫 문장만 봐도 주제가 이해되어야 한다.
2. 외부 사실을 새로 만들지 않는다.
3. 동일 Source Package에서 Instagram/Threads용 1080×1080 패키지를 먼저 만들고, 이후 별도 1080×1920 MP4 renderer가 Reels/Shorts를 만든다.
4. square carousel을 세로 영상으로 단순 stretch하지 않는다.
5. 모든 제작물에는 `content_format`, `hook_type`, `cta_type`과 provenance를 기록한다.

## F08 Source Screenshot Carousel — 기본형

```text
Slide 1  Cover: source/선택 이미지 + 원문 제목
Slide 2  Original post screenshot #1
Slide 3  Original post screenshot #2
...
Slide N  Original post screenshot #N (본문 끝까지)
```

본문 screenshot 사이에 editorial card를 넣지 않는다. 원문이 한 화면이면 Slide 2 한 장으로 끝날 수 있다. 원문이 12화면이면 필요한 12화면을 모두 포함한다.

## 기타 포맷

기존 text explainer, checklist, chart, original card, screen recording, short video 등은 **자체 제작 콘텐츠나 독립 분석물**에 계속 사용할 수 있다. 하지만 타인의 원문 게시물을 carousel로 재현하는 작업에서는 위 Source Screenshot Carousel 규칙이 우선한다.

## Short Vertical Video

동일 Source Package를 사용하되 1080×1920 전용 renderer에서 별도로 구성한다. 원본 square carousel을 늘려 쓰지 않는다. source media가 필요한 경우 실제 확보된 asset만 사용한다.

## Hook Taxonomy

`H01 Breaking`, `H02 Why`, `H03 Number`, `H04 Contrarian`, `H05 Problem`, `H06 Result-first`, `H07 Story`, `H08 Comparison`, `H09 Curiosity`, `H10 Question`을 실험 기록에 사용할 수 있다. 단 Source Screenshot Carousel cover에서는 taxonomy보다 **원문 제목 보존 규칙이 우선**한다.

## CTA Taxonomy

`C00 None`, `C01 Reply question`, `C02 Save / remember`, `C03 Share`, `C04 Profile / follow`, `C05 Link click`, `C06 Try product/tool`, `C07 Blog/newsletter`, `C08 Next post / series`.

Source Screenshot Carousel 본문 사이에는 CTA를 자동 삽입하지 않는다.

## Source Asset Taxonomy

```text
A01 Original text
A02 Original photo
A03 Original video
A04 Original screenshot
A05 Original chart/card
A06 Official source excerpt/screenshot
A07 Licensed asset
A08 Public domain / permissive asset
A09 External material used for commentary
A10 Unknown rights
```

rights 상태는 사실대로 기록한다. 확인되지 않은 권리를 임의로 승인 처리하지 않는다.

## Draft Package

```text
candidate_id
account_id
hypothesis_id
variant_id
platform
content_format
original_title
cover_text
source_format            # 글 / 이미지 / 이미지 포스팅
source_asset_type
source_url
source_screenshots[]     # ordered
full_body_capture_status # complete / partial / pending
ui_crop_status
normalization_status
media_files
source_refs
rights_notes
production_notes
```

`04_REVIEW_PUBLISH`만 실제 게시 여부를 결정한다.
