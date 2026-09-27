# 03 — PRODUCTION / 콘텐츠 제작

## 목적

02에서 승인된 Content Brief를 각 플랫폼에 맞는 **실제 콘텐츠 초안/제작 패키지**로 바꾸는 역할이다.

실제 제작 형식은 [`FORMAT_PLAYBOOK.md`](FORMAT_PLAYBOOK.md)를 우선 참고한다. 2026 벤치마크 근거는 [`../docs/BENCHMARK_2026-09.md`](../docs/BENCHMARK_2026-09.md)에 있다.

## 입력

`02_EDITORIAL_SCORING`의 Approved Content Brief.

## 이 파트가 하는 일

- Threads 글 작성
- Shorts / Reels / TikTok용 훅·대본·온스크린 텍스트 작성
- Instagram Carousel 구성
- Blog 제목·본문 구조·SEO 질문 작성
- YouTube Long 제목·썸네일 문구·오프닝·구성 작성
- 필요 시 자체 제작 이미지/영상/그래픽 계획 작성
- 계정별 톤과 포맷에 맞게 표현을 변형
- `F01~F20` 콘텐츠 포맷, `H01~H10` 훅, CTA, 자산 출처, Reply 운영 모드를 실험 변수로 기록

## 하지 않는 일

- 검증되지 않은 새 사실을 추가하지 않는다.
- 02의 점수나 `ready/skip` 판단을 임의로 바꾸지 않는다.
- 원문을 문장만 살짝 바꿔 재작성하지 않는다.
- 타인 영상/이미지 사용권을 임의로 있다고 가정하지 않는다.
- 실제 게시하지 않는다.

## 중요한 규칙

같은 주제를 여러 계정에서 시험할 수는 있지만 **동일 문안을 계정 여러 개에 복붙하지 않는다.**

계정마다 실험 가설에 따라 최소 하나 이상 달라야 한다.

```text
타깃 독자
훅
콘텐츠 각도
길이
포맷
톤
CTA
시각 구성
```

스크린샷은 별도 포맷으로 관리한다.

- `F05`: 우리 own 자료/허가 자료 screenshot + commentary
- `F06`: 공식/필요한 증거 일부 + analysis
- 남의 viral post 전체를 조금 꾸며 재업로드하는 방식은 기본 포맷으로 쓰지 않는다.

`A10 Unknown rights` 자산은 앱에서도 실제 게시가 차단되며, 권리를 확인한 뒤 올바른 자산 분류와 Safety Gate 재검토가 필요하다.

선별한 원문과 정확한 이미지 위치/댓글 근거를 받은 뒤 제작합니다. `docs/SOURCE_BUNDLE_GUIDE.md`의 원문 ZIP을 입력으로 사용하며, 실제 본문 글·이미지 없는 단색 표지는 만들지 않습니다. 입력 ZIP의 선별 위치와 원본 파일 해시를 결과 ZIP에도 보존합니다.

## 출력 — Draft Package

```text
candidate_id
account_id
platform
content_format
variant_id
hypothesis_id
hook_type
cta_type
source_asset_type
reply_mode
has_topic_tag
hook
body_or_script
asset_plan
source_boundaries       사용 가능한 사실/자산 범위
fact_warnings[]
rights_warnings[]
manual_edits
draft_status            draft / reviewing / approved-for-review
created_at
updated_at
```

## 완료 기준

04가 사실/권리/정책 검수만 하면 게시 여부를 결정할 수 있을 정도로 **완성된 콘텐츠 후보**가 만들어져 있으면 끝이다.
