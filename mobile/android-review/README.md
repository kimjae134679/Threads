# Threads Android 리뷰 준비판 0.1.1

사용자 설치용 준비 APK이며 자동 수신이 완성된 앱은 아닙니다. Android 8(API26) 이상, target SDK36. **기존에 승인된 인터넷 리뷰 서비스 URL과 사용자 인증 경로가 확인되지 않아 실제 자동 수신·서버 동기화는 미연결입니다.** 앱을 설치해도 실제 게시글 목록은 빈 상태입니다. 일반 Android `INTERNET` 선언은 사용자 요청 범위에서 포함했으며, 이 선언 자체가 금지돼 막힌 것은 아닙니다. 사용자에게 파일 넣기나 새 계정·토큰 만들기를 요구하지 않습니다.

승인된 서비스를 연결하기 위한 HTTPS 연동 코드와 제작본별 점수(1–10)·메모·버전된 기준 체크·수정 필요/보류/게시 승인 기록, IndexedDB 오프라인 큐·명시적 충돌 선택을 구현했습니다. 서버 반영 확인은 응답을 받아 operationId/revision을 검증한 경우에만 표시합니다. 실제 게시 API는 없습니다.

## 검증 및 설치 구분

- 소스/계약: PC0.3.16 SHA `887eb1abffa378f7d7156bc8d0ecdb7126316686`에서 분리.
- APK 빌드: 기존 JDK21, SDK36.0.0/Android36 도구만 사용. Gradle 다운로드나 추가 설치 없음.
- 서명: 이미 있던 Android debug 서명키 재사용, 새 key/keystore 생성 없음. 키 파일은 APK/소스 전달본에 없음. 검토용 서명이며 Play Store 배포용 서명은 아님.
- 계약/단위 테스트: `node --test mobile/android-review/test/*.test.mjs`.
- 화면: 임시 127.0.0.1 서버 + 전용 pipe headless Chrome + 격리 프로필. 실제 앱 UI와 IndexedDB를 사용하며 합성 fixture만 사용.
- Android 실제 설치/기기 화면: 연결 기기·AVD 이미지가 없어 미검증.
- 실제 인터넷 수신/서버 평가 동기화: 미실행·차단.
- 실제 게시: 미구현·비활성.

## 로컬 빌드

저장소 루트에서 `& .\mobile\android-review\build.ps1`. 출력은 `mobile/android-review/build/Threads-Review-0.1.1.apk`. 기존 `$env:USERPROFILE\.android\debug.keystore`가 없으면 키를 만들지 않고 중단합니다. Java SDK, Android SDK 경로가 다른 PC에서는 `-Sdk`와 `-ExistingKey`를 지정합니다.

`build-assets.mjs`는 검증된 `desktop/review-workflow-model.cjs`를 그대로 읽어 자동 카테고리 함수를 번들에 넣습니다. UI 테마는 시스템 명암 설정을 따릅니다. 실제 PNG 렌더링은 PC가 만든 이미지 원본을 순서대로 표시하고 해시를 검사합니다. 모바일에서 원본을 재제작하지 않습니다.

## 다음 단계

기존 승인된 인터넷 서비스·사용자 인증이 먼저 필요합니다. 서비스가 준비되면 `SERVICE_CONTRACT.md`에 따라 서버 adapter와 기존 인증을 검증하고 serviceConfig/CSP/Android network allowlist를 같은 서비스로 제한해 연결해야 합니다. 일반 INTERNET 선언은 이미 포함했지만 현재 serviceConfig는 미설정이며 WebView 네트워크 로드도 비활성입니다. 인증값과 endpoint 설정 UI는 포함하지 않습니다. 백그라운드 동기화는 구현하지 않았고, 준비 코드는 앱을 연 동안 및 재연결 시 확인합니다. 가장 작은 선택지와 사용자 조치는 `CONNECTION_HANDOFF.md`에 있습니다.

PC 뷰어·원본·사용자 평가·제작 목록·공유 bridge는 이번 변경 대상이 아닙니다. 모바일 평가는 서버 adapter가 PC canonical 평가/진행 저장 계약으로 연결하기 전까지 실제 PC 학습 데이터에 반영되지 않습니다.
