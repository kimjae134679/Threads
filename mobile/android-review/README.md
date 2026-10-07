# Threads Android 리뷰 준비판 0.1.2

빌드·서명 가능한 설치용 준비 APK입니다. 아직 실제 인터넷 동기화가 연결되지 않았습니다.
브릿지/PC 명령 저장소와 분리된 전용 비공개 리뷰 저장소 및 GitHub App 등록·설치·사용자
공식 로그인이 필요합니다. 현재 public 연결 설정은 비어 있고 승인 flag는 false여서
로그인·키/토큰 생성·업로드가 비활성입니다. 실제 게시 기능은 없습니다.

구현: 기존 PC0.3.16의 글ID/outputVersion/round 저장모델, PNG 렌더링과 카테고리 계약,
별점1–10/메모/기준 체크/수정필요·보류·게시승인, IndexedDB 오프라인 큐와 명시적 충돌
처리, 새 제작본의 이전 평가 격리. Native 공식 device-flow 화면/HTTPS/Keystore 보호,
credential-free review bridge와 GitHub adapter를 포함합니다. PC export/import는
read-only store + 새 명시적 출력 + trusted local baseline + 적용 제안만 제공합니다.

검증 구분: JVM/Node 계약 테스트와 합성 브라우저 화면390/800, 설치된 SDK/JDK 빌드·기존
debug key 서명은 검증합니다. Android 실제 설치/실행, 실제 Keystore/공식 로그인/실제
GitHub 글 수신·평가 동기화·PC 학습은 미검증입니다. 실제 자료·평가·PC 소스는 바꾸지
않았고 repo/app/key/token/permission도 생성하지 않았습니다.

- 정확한 사용자 승인·설정: [CONNECTION_ACTIVATION.md](CONNECTION_ACTIVATION.md)
- GitHub 준비 경로: [GITHUB_SYNC_PREPARATION.md](GITHUB_SYNC_PREPARATION.md)
- 서비스·버전 계약: [SERVICE_CONTRACT.md](SERVICE_CONTRACT.md)
- PC 교환과 trusted snapshot: [PC_EXCHANGE.md](PC_EXCHANGE.md)
- 검증 기록: [VALIDATION.md](VALIDATION.md)

Android8(API26)+/targetSDK36. 설치된 JDK21/SDK36.0.0만 사용합니다. 새 도구/계정/키 없이
기존 debug keystore가 있을 때만 빌드합니다. 키는 전달 묶음에 포함하지 않습니다.

```powershell
node --test mobile/android-review/test/*.test.mjs
node mobile/android-review/build-assets.mjs
node --check mobile/android-review/build/assets/bundle.js
& .\mobile\android-review\build.ps1
```

결과: `mobile/android-review/build/Threads-Review-0.1.2.apk`. 일반 INTERNET 선언은 포함하며
WebView의 직접 외부 네트워크 로드는 계속 차단됩니다. Native GitHub 통신도 승인·설정
없는 현재 빌드에서 차단됩니다. 활성화하려면 사용자 승인 후 public config를 지정하고
현재 소스를 재빌드합니다. 인증값을 채팅·APK·소스·웹 저장소에 넣지 않습니다.