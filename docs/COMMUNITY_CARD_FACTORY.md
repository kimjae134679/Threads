# Community Card Factory — MVP

## 목적

Viral Finder에서 고른 실제 소재를 **1080×1350 카드/캐러셀 완제품 초안**으로 빠르게 바꾼다.

현재 단계는 텍스트 스토리보드 + 사용자가 선택한 로컬 원문 캡처를 Canvas에 합성하는 MVP다.

## 입력

후보 상세에서 다음 값을 사용한다.

- 제목 / 훅
- Research Bundle의 확인된 사실
- 왜 지금 뜨는지 / 후속 맥락
- 대표 반응
- 마지막 질문/결말
- 출처 라벨
- 필요하면 사용자가 선택한 원문 스크린샷 파일

## 자동 구성

`현재 자료로 자동 채우기`는 후보와 Research Bundle을 읽어 다음 구조를 만든다.

```text
1. Hook
2. 원문 캡처 0~10장 (선택한 경우)
3. 핵심 내용
4. 후속/반전/맥락
5. 대표 반응
6. 마지막 질문/결말
```

내용이 없는 카드는 자동으로 생략한다.

## 실제 렌더링

브라우저 Canvas를 사용해 1080×1350 PNG를 만든다.

템플릿:

- Dark Viral
- Paper Story
- Signal News

각 카드에서 개별 PNG를 저장하거나, 현재 생성된 카드를 순서대로 모두 저장할 수 있다.

Manifest JSON에는 후보 ID, 원문 URL, 템플릿, 카드 스토리보드와 원문 캡처 파일명만 기록한다.

## 원문 캡처 처리

`원문 캡처 추가`로 로컬 이미지 파일을 최대 10개까지 선택할 수 있다.

중요:

- 캡처 파일 바이트는 localStorage/GitHub에 저장하지 않는다.
- 브라우저 세션의 Object URL로만 렌더링한다.
- 새로고침 후에는 캡처 파일을 다시 선택해야 한다.
- 현재 MVP는 OCR 기반 개인정보 자동 마스킹을 완료했다고 간주하지 않는다.
- 실명/닉네임/얼굴/전화번호/회사 내부정보 등은 게시 전에 사람이 확인해야 한다.

## 안전 장치

Viral Finder의 Audience Comfort가 `BLOCK`인 후보는 Card Factory에서 미리보기를 생성하지 않는다.

카드 스토리보드 변경은 candidate `updatedAt`을 갱신하므로 이미 게시 승인을 받은 뒤 수정했다면 기존 승인이 stale 처리된다.

기존 Rights/Safety Gate와 사람 게시 승인은 그대로 유지한다.

## 저장 필드

```text
item.cardFactory.schemaVersion
item.cardFactory.template
item.cardFactory.capture
item.cardFactory.storyboard
item.cardFactory.captureImageNames
item.cardFactory.imagePersistence = session-only
item.cardFactory.updatedAt
```

## 다음 단계

1. 원문 캡처 crop/마스킹 편집기
2. 자동 PII 후보 감지 보조 (사람 확인 유지)
3. 완성 PNG를 Content Warehouse 자산으로 영속 저장
4. Threads/Instagram 이미지·캐러셀 공식 게시 연결
5. Scheduler가 Warehouse의 승인 자산을 시간표에 따라 발행
