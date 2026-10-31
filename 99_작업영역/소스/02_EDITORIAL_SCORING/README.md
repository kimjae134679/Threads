# 02 — EDITORIAL & SCORING / 조사·정리·점수

## 목적

01에서 들어온 후보를 **실제로 다룰 가치가 있는 콘텐츠 주제인지 검증하고, 제작자가 바로 만들 수 있는 편집 브리프**로 바꾸는 역할이다.

## 입력

`01_DISCOVERY`의 Candidate Packet.

## 이 파트가 하는 일

- 공식/독립 출처로 사실 확인
- 왜 지금 뜨는지 정리
- 확인된 사실과 미확인 주장 분리
- 저작권·개인정보·명예훼손 위험 초벌 정리
- 콘텐츠 각도 1~3개 제안
- 신선도 / 상승 속도 / 독자 적합도 / 새 가치 여지 / 수익 연결성 평가
- 제작 우선순위 점수 계산
- `ready / research / skip` 판단
- 추천 플랫폼과 포맷 제안

## 하지 않는 일

- 최종 Threads 글이나 영상 대본을 완성하지 않는다.
- 조회수를 위해 확인되지 않은 내용을 사실처럼 강화하지 않는다.
- 03 제작자가 마음대로 쓸 수 있도록 원문 복사본을 넘기지 않는다.
- 실제 게시하지 않는다.

## 점수 원칙

자동 신호와 사람 판단을 구분한다. 데이터가 없으면 점수를 꾸며내지 않는다.

현재 기본 신호:

```text
freshness
velocity
audience_fit
originality_room
revenue_fit
```

점수는 **게시 전 우선순위**일 뿐 성공 예측 확률이 아니다. 게시 후 실제 성과는 05가 별도로 판단한다.

## 출력 — Approved Content Brief

```text
candidate_id
editorial_status       ready / research / skip
score
score_basis
why_now
verified_facts[]
claims_to_verify[]
sources[]
risk_notes
recommended_angles[]
recommended_platforms[]
recommended_formats[]
target_audience
content_promise        이 콘텐츠를 보면 무엇을 얻는가
must_include[]
must_not_claim[]
asset_rules[]
reviewed_at
```

`ready`로 넘기려면 최소한 왜 지금 뜨는지, 확인된 사실, 출처가 있어야 한다.

## 완료 기준

03 제작자가 추가 조사를 핑계로 새 사실을 만들어낼 필요 없이, **브리프 안의 검증된 사실만 가지고 콘텐츠를 만들 수 있는 상태**면 끝이다.
