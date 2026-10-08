# PC·모바일 공동 저장 통합 검증 — 2026-10-08

PC 0.3.19 공동 잠금 빌드를 기존 설치 경로에 보존 설치했다. 실제 운영 자료는 1084항목·365출력·3073PNG, 현재 회차는 review-20261008-paper-density다. 운영 평가·검토 진행·회차·상태·완료 journal을 초기화하지 않았다. 실제 모바일 평가를 운영 자료에 합치거나 온라인 전송하지 않았다.

## 변경 범위

- 시작 PC HEAD/원격: 8ba9bab95047c148c187ed5a63a4ef29e0e354b4, codex/review-workflow-20261008, clean.
- 비교 모바일 준비판: codex/android-review-20261008, ee66964edf6d74723bc557469ae6a1f5d4ea1910.
- 공동 writer, PC store/migration/release, 명시 호출 교환·transaction·feed·binding과 관련 테스트만 선별했다. Android Java/auth/UI/APK 전체를 merge하지 않았다. 기존 작은 창 UI 파일은 바꾸지 않았다.
- PC 저장·방문·보류/탈락·복원·평가 migration·새 회차 activation이 같은 root writer를 사용한다. 07 전체를 보관할 때 mobile import transaction sidecar와 이전 pointer도 보존한다.
- verified-intake의 실제 표지 수정 회차는 CLI의 intake 폴더 형식과 다르므로 intakeEvidence에 명시적 sourceRoot를 지원한다. 허용 경계, 비중첩, no-link, sourceStatus SHA, 모든 출력 row identity, 완료 증거와 fatal 검사를 유지했다.
- 설치 ASAR에 공동 writer를 포함하고 resources/pc-review에 PC 교환 모듈과 의존 파일 19개를 포함했다. version과 review userData 경로는 기존 0.3.19/0.3.18을 유지한다.

## 실제 규모에서 발견·수정한 문제

실제 최대 PNG는 3,655,846 bytes였다. 반복 base64 정규식이 V8 stack overflow를 일으켜 전체 공급을 막았다. PC 이미지/회복 경로와 모바일 adapter의 검사를 선형 alphabet·padding 검사로 바꾸고 4MiB 합성 PNG로 재현·수정 검증했다.

실제 전체 목록은 repository metadata 포함 1,806,272 bytes로 기존 1,000,000-byte 제한을 넘었다. state는 8MiB, PNG 총량은 1GiB로 제한하며 개별 PNG 25MiB·asset count 5000은 유지한다. exporter는 unique SHA마다 총량을 파일 생성 전에 검사한다. 보존 PNG는 남은 예산과 25MiB 중 작은 값으로, 경계·단일 링크·파일 identity를 확인해 읽는다. 더 작은 호출 예산은 허용하며 protocol 상한을 넘기는 요청은 거절한다. 한도를 초과한 미래 회차는 명시적 보관 설계가 필요하다.

1MB 초과 Contents metadata의 encoding:none은 요청한 commit에 고정된 정확한 blob SHA로 읽는다. byte size와 Git blob hash를 검증한다. 임의 download URL이나 움직이는 branch로 우회하지 않는다. 초과·변조는 쓰기 전에 거절한다.

## 검증 증거

관련 syntax 및 기존 전체 87개 test suite 통과. 선별 PC 모바일 141개 테스트, 기존 모바일 Git adapter 11개 테스트 통과. 4MiB PNG 및 1MB 초과 ledger는 변경 전 실패를 확인했고 변경 후 통과했다. 새 공개 test/helpers에는 합성 fixture만 있다. 실제 자료 복사본·평가·QA 증거는 Git에 넣지 않았다.

qa-local/mobile-canonical-20261008/actual-EH3OFj/final-proof.json:

- 운영 자료를 read-only로 복사한 전체365출력·3073PNG 공급 confirmed, 새 binding 재공급 noop.
- 실제 app adapter의 합성 event → bound import committed, receipt dedupe, PC 편집 충돌, recover 통과.
- 큰 ledger의 contents-none → 정확한 blob fallback 강제 검증.
- PC 저장·mobile import·activation 3프로세스, CAS 거절 후 갱신 CAS 전환, 전체07 transaction sidecar·이전 pointer 보관, 새 회차·같은 회차 새 제작버전 점수 격리 통과.
- Windows dead-owner/reclaimer 20회×3프로세스, journal 작성 후 장애(before_preserved)·atomic rename 후 장애(committed) 복구 통과.
- 과거86평가 raw copy와 보호 파일8개의 원본 SHA 보존. 과거 점수를 새 제작물로 이동하지 않았다.

첫 실패 증거 actual-9ubLCQ는 보존했다. 전체 복사본 시험 후 보강한 exporter 합산 예산과 보존 파일 bounded-read는 최신 회귀 테스트로 별도 검증했다. 최종 설치본은 최신 소스와 hash가 같으므로 초기 시험에 없던 보강도 포함한다.

qa-local/mobile-canonical-20261008/actual-install-proof.json:

- D:/A_KJ/AI/Applications/ThreadsReview/0.3.19 실제 packaged 실행, read-only 운영 자료1084항목·365출력·현재점수0·메모0 확인.
- 실제 보호 파일5개 SHA 불변. 34개 ASAR CJS·외부19개 PC resource·UI hash가 소스와 일치.
- 이전0.3.19는 0.3.19-before-canonical-2026-10-08T01-12-48-012Z에 보존.
- 기존0.3.15 앱 프로세스는 종료하지 않았다. 기존 평가 바로가기 경로·회차·userData 경로 유지.

## 사용 경로

평가: D:/A_KJ/AI/Launchers/Threads 게시글 평가.lnk

프로그램: D:/A_KJ/AI/Applications/ThreadsReview/0.3.19/Threads Cut Editor.exe --review-only

실제 제작물: D:/A_KJ/AI/Projects/Threads/자료/06_자동 제작 결과

기존 전체/표지/작은 창 검증: D:/A_KJ/AI/Projects/Threads/자료/04_검수/2026-10-08_전체재제작검증/index.html 및 small-viewer.html

모바일 PC 모듈: 설치 resources/pc-review/mobile/android-review/pc/pc-binding.mjs의 createBoundPcReviewPipeline. 기본 disabled이며 실제 값·인증 정보·자동 실행 등록은 없다.

## 남은 개발·운영 단계

권한 승인과 온라인 기기 시험만 남은 상태는 아니다. 실제 동기화용 PC 호출 진입점과 승인된 인증 공급자 연결, 경로/기준 설정이 아직 없다. 상용 동기화의 설치·버튼·예약 작업을 구현한 것으로 해석하면 안 된다. 이번 작업은 기본 비활성 callable 모듈과 공동 writer가 설치된 상태다.

최초 전체 공급은 mock API에서도 83.133초였고 현재 공급 과정은 canonical barrier를 유지한다. 다른 writer의 lock 획득 제한은30초이므로 실제 online 공급 중 PC 저장 지연/거절 가능성이 있다. live 활성화 전에 안정된 snapshot staging과 전송을 분리하거나 명시적인 작업/재시도 UX를 구현·검증해야 한다. 임의로 lock을 제거하거나 평가를 덮어써서 해결하면 안 된다.

모든 실제 writer를 공동 잠금 빌드로 전환해야 한다. 현재 열린0.3.15는 통합 writer가 아니다. ASAR·외부 resource 모듈은 파일 잠금은 공유하지만 재진입 AsyncLocalStorage는 별개다. 외부 pipeline을 ASAR 잠금 안에서 await하지 말고 직접 호출해야 한다.

Android는 부모 준비판에 이번 adapter 변경과 새 app/review-limits.js를 반영해 APK를 재빌드하고 설치 파일 포함·Native HTTPS/Keystore·기기·인증·충돌을 검증해야 한다. 기존 APK를 수정 완료로 표현하지 않는다. 별도 전용 private repository/App/선택권한/공식 사용자 동의/실제 merge pilot 승인은 이 작업에서 수행하지 않았다. 운영 D 자료에 실제 mobile event를 합치지 않았다.

지정 _통합소통에는 같은0.3.19 진입점과 별도 준비 상태를 추가 기록한다. 통합프로그램의 코드·설치·버튼과 중앙 공유는 별도 확인이 필요하며 hub 코드는 수정하지 않았다. 원격 SHA와 종료 checkout 상태는 최종 Git proof/최종 보고에 남긴다.
