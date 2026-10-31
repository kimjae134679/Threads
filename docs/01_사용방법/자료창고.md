# Content Warehouse

## 목적

Draft 또는 Community Card가 만들어진 콘텐츠를 바로 게시하지 않고 창고에 쌓아두고, HOT/EVERGREEN 우선순위와 승인 상태를 한 화면에서 관리한다.

## 자동 입고 범위

다음 중 하나가 있으면 Warehouse에 표시한다.

- Threads Draft
- Community Card Factory storyboard

별도 복제본을 만드는 것이 아니라 후보 데이터를 원본으로 보여준다.

## 상태

```text
게시 가능    Safety Gate + 현재 내용 기준 사람 게시 승인 완료
승인 필요    Safety Gate는 통과했지만 게시 승인이 없거나 stale
Safety 검토  제작물은 있지만 Gate 미완료
차단         Audience Comfort 차단
```

## 운영 메타데이터

각 콘텐츠에 다음을 저장할 수 있다.

```text
bucket       hot / evergreen
priority     1~5
status       active / hold
notBefore    이 시각 이후에만 게시 후보
expiresAt    이 시각 이후에는 사용하지 않음
note         운영 메모
```

이 데이터는 콘텐츠 본문을 바꾸는 값이 아니므로 Warehouse 설정을 바꾸는 것만으로 기존 사람 게시 승인을 stale 처리하지 않는다.

## Queue 우선순위

현재 queue model은 다음을 반영한다.

1. Safety/승인 완료 여부
2. HOLD 여부
3. notBefore / expiresAt
4. HOT 우선
5. priority 1~5
6. HOT의 유효기한이 가까우면 추가 우선
7. 동률이면 오래 대기한 콘텐츠를 약간 우선

실제 자동 게시 Scheduler는 아직 연결하지 않았다. 현재 Warehouse는 **어떤 완제품이 지금 게시 가능한지와 다음 우선 후보가 무엇인지 결정하는 staging layer**다.

## 다음

- Scheduler가 Warehouse queue를 읽어 시간 슬롯 배정
- 같은 소재/포맷 연속 게시 방지
- HOT은 유효기한 전에 우선 소진
- 전체 정지/개별 보류/지금 게시
- 이미지/캐러셀은 외부에서 접근 가능한 asset URL이 준비된 뒤 공식 API publisher와 연결
