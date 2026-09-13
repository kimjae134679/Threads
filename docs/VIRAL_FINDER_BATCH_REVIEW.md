# Viral Finder / Batch Review

## 목적

한 번에 많은 소재를 발견한 뒤 **이미 반응이 있는 것 + 사람이 보기 부담스럽지 않은 것**만 추려서 사용자가 여러 개 선택하고 제작 단계로 넘기기 위한 작업대다.

## 현재 구현

앱 상단에 `VIRAL FINDER / BATCH REVIEW` 패널이 추가된다.

- 최신 실제 발견 묶음 가져오기
- 전체 후보 바이럴 점수 재계산
- 추천 후보 전부 선택
- 여러 후보를 동시에 `조사 대기 / 제작 후보 / 패스` 처리
- 불쾌감 차단 후보 일괄 패스
- URL/제목 중복 제거 표시
- `STRONG / CANDIDATE / REVIEW / BLOCK / LOW` 분류

## 점수 구성

현재 1차 휴리스틱은 다음 신호를 사용한다.

```text
popularity      조회/좋아요/공유 반응
conversation    댓글/참여율 신호
sourceStrength  순위/반응 규모
freshness       최근성
cardability     제목·유형·후속자료 기준 카드화 가능성
```

이 점수는 사실성이나 권리 허가 점수가 아니다. 선정 이후 기존 Research/Safety Gate를 그대로 통과해야 한다.

## Audience Comfort

조회가 높아도 아래처럼 사용자가 보기 부담스러운 방향은 우선 차단한다.

- 동물 학대
- 고어/참수/토막/시체/심한 유혈
- 잔혹 영상
- 성폭력/아동 성착취
- 자살 영상/사진
- 신상털이

폭행/사망/살인/괴롭힘 등은 주의 신호로 잡고 사람이 한 번 더 확인한다.

`BLOCK` 후보는 Batch Review에서 선택할 수 없다.

## 실제 발견 feed

`data/viral-discovery-latest.json`

이 파일은 원문 전체/이미지/영상 복제 저장소가 아니다.

저장하는 것:

- 원문 URL
- 발견 제목/편집 요약
- 공개적으로 확인된 반응 메타데이터
- 발견 시각
- 커뮤니티/출처
- 자동수집 가능 여부
- 수동 원문 확인 필요 여부

앱의 `최신 실제 발견 묶음 가져오기` 버튼이 이 파일을 Inbox로 가져온다.

스케줄/AI 작업은 이후 이 JSON을 갱신할 수 있다. 사이트 약관상 자동 수집이 금지된 소스는 본문을 대량 크롤링하지 않고 검색 인덱스 메타데이터/사용자 제공 URL·스크린샷을 사용한다.

## 다음 구현

1. 공개/허용 소스 adapter 확대
2. 커뮤니티 원문 수동 Capture Packet
3. 선택 후보의 story structure 추출
4. Community Card Factory
5. Content Warehouse
6. 이미지/캐러셀 공식 게시
7. Scheduler
