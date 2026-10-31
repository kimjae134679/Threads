# EXPERIMENT MATRIX — 초기 계정/포맷 검증표

목적: 여러 계정과 포맷을 감으로 운영하지 않고 **무엇을 왜 시험했는지** 남긴다.

초기에는 표본이 적으므로 절대 기준으로 성공/실패를 단정하지 않는다. 같은 플랫폼·같은 계정 또는 유사 cohort 안에서 비교한다.

---

## 1. 초기 3개 실험 계정

### TH-A — Hot / Issue

가설:
`빠른 이슈 + 왜 뜨는지 한 단계 더 설명`이 단순 속보보다 engagement/reply를 높인다.

주요 지표:
- views
- engagement rate
- replies
- shares/reposts/quotes
- profile/follower growth

### TH-B — Useful / Product / Money

가설:
`기능 나열`보다 `누구에게 어떤 선택이 맞는지`를 보여주는 비교/실사용 콘텐츠가 click/conversion을 높인다.

주요 지표:
- clicks
- conversions
- revenue
- saves/share proxy
- engagement rate

### TH-C — Internet Story / Culture

가설:
원문 사연 복제가 아니라 `쟁점 + 감정 + 질문 + 교훈`으로 재구성한 콘텐츠가 replies/shares를 높인다.

주요 지표:
- replies
- shares/reposts/quotes
- engagement rate
- follower conversion

---

## 2. 첫 30개 게시물 실험안

실제 계정이 하나만 준비된 경우 한 계정에서 먼저 10개만 돌리고, E2E가 안정된 뒤 다른 계정으로 확대한다.

### TH-A 10건

```text
2x F01 Text Hot Take
2x F02 Text Explainer
2x F06 Screenshot Evidence + Analysis
2x F07 Original Image Card
2x F11 Short Vertical Video
```

가능하면 같은 topic을 무리하게 여러 번 쓰지 말고 유사 난이도의 topic을 분산한다.

### TH-B 10건

```text
2x F03 List / Checklist
2x F08 Carousel
2x F10 Comparison Card
2x F12 Screen Recording Demo
2x F18 Case Study
```

### TH-C 10건

```text
2x F02 Text Explainer
2x F04 Question / Open Thread
2x F09 Meme / Relatable
2x F17 Personal/Failure Story 또는 공개 Case
2x F11 Short Video
```

개인 경험이 실제로 없는 경우 F17을 AI가 창작하지 않는다. 공개 사례 또는 다른 형식으로 대체.

---

## 3. Reply 실험은 별도 변수

Meta/Buffer 자료상 reply 활동이 중요하므로 post format과 섞어 해석하지 않는다.

각 account에서 기간을 나눠:

```text
R0  최소 reply 운영
R1  내 post 댓글에 적극 reply
R2  내 댓글 reply + niche 타계정에 유의미한 reply
```

를 기록한다.

자동 spam reply는 금지.

기록:
```text
reply_mode
own_replies_count
external_replies_count
reply_minutes_spent
```

---

## 4. Hook A/B

포맷 자체가 괜찮다고 판단되면 그 다음에 Hook을 바꾼다.

예:

```text
H02 Why
"이게 갑자기 뜨는 이유는 따로 있음"

H03 Number
"24시간 만에 X가 Y만큼 바뀜"

H04 Contrarian
"다들 A라고 하는데 실제로 중요한 건 B임"

H06 Result-first
"결론부터 말하면 B가 더 나았음"
```

한 번에 여러 변수를 바꾸면 무엇 때문에 달라졌는지 알 수 없으므로, 가능하면 `format 고정 → hook 1개 변경` 식으로 시험한다.

---

## 5. 이미지/스크린샷 실험

초기 비교:

```text
V0  Text only
V1  Original image card
V2  Own/official screenshot + analysis
V3  Short video
```

비교할 것:
- views
- engagement_rate
- replies/view
- share/view
- profile/follower conversion

`남의 viral screenshot 그대로`는 실험군에 넣지 않는다.

---

## 6. Carousel / Reels 역할 분리

Instagram 확장 시:

```text
Reels      신규 reach / discovery
Carousel   deeper engagement / save / share
```

한 포맷이 다른 포맷보다 절대적으로 좋다고 판정하지 않고 **목표 기준**으로 평가한다.

---

## 7. Short Video 실험 변수

```text
hook_1s
length_band: <=15s / 16-30s / 31-60s / 61-180s
visual_type: screen / card / camera / mixed
voice_type: none / human / synthetic
caption_density: low / medium / high
cta_type
```

YouTube에서는 raw views뿐 아니라:
- Engaged views
- chose to view vs swiped away
- subscribers gained
- comments
- revenue
을 같이 본다.

---

## 8. 계정 활성화 기준

planned account를 active로 바꾸려면:

```text
실제 handle 확인
로그인/소유 확인
공식 API 연결 또는 수동 게시 workflow 확정
계정 positioning 작성
primary metric 확정
첫 5~10개 test plan 확정
```

토큰/비밀번호는 Registry에 저장하지 않는다.

---

## 9. 초기 판정 규칙

현재 Experiment Lab 자동판정은 같은 플랫폼 cohort 기준:

```text
성과표본 < 5 → LEARN
상위 상대성과 → SCALE
중간 → KEEP
하위 → KILL
```

하지만 계정/포맷 분석에서는 최소한 다음을 따로 본다.

### Reach content
```text
views
non-follower discovery 가능 지표
follower gain
```

### Conversation content
```text
replies / views
shares / views
engagement rate
```

### Revenue content
```text
clicks
CTR 가능 시
conversions
conversion rate
revenue
revenue per 1k views
```

조회수가 높은데 매출이 없는 TH-B 콘텐츠를 `SCALE`로 자동 확정하면 안 된다.

---

## 10. SCALE 규칙

SCALE은 `똑같은 게시물 반복`이 아니다.

SCALE 예:
```text
잘된 구조: F10 comparison card + H06 result-first
↓
새 제품/새 주제에도 같은 구조를 적용
↓
3~5회 재검증
```

KEEP:
```text
한 변수만 바꿔 재시험
```

KILL:
```text
실패한 가설 기록
계정 전체 삭제가 아니라 포맷/훅/주제 가설 변경
```

---

## 11. 데이터 스키마 확장 목표

각 publication에 최종적으로:

```text
account_id
hypothesis_id
variant_id
content_axis
content_format
hook_type
cta_type
source_asset_type
originality_level
length_band
has_topic_tag
reply_mode
published_at
publish_hour
publish_weekday
platform_metrics
business_metrics
manual_decision
learning
next_action
```

을 남긴다.

이 구조가 있어야 `TH-A가 좋다` 수준이 아니라:

> TH-A에서 F07 image card + H02 Why hook + topic tag 조합이 text-only보다 replies/view가 좋았다.

처럼 실제 운영 지식이 쌓인다.
