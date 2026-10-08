# PC 모바일 교환 실행 진입점 — 2026-10-08

PC0.3.19의 명시 실행 진입점은 Threads Cut Editor.exe --pc-review-run --pc-review-config=<절대경로> 이다. 기본 action은 cycle이며 recover→공급→응답 가져오기를 한 번 수행한다. supply가 confirmed/noop인 경우만 import한다. waiting/pending/blocked/conflict를 전체 성공으로 바꾸지 않는다. 결과는 stateRoot/pc-review-results/<UUID>.json에 fsync된 별도 파일로 남긴다. 시작된 실패도 민감한 오류를 제거해 결과에 기록한다. canonicalMergeApproved=false인 import/recover는 provider 접근 전 disabled로 끝난다.

설정이 없거나 enabled/dataTransferApproved가 false이면 비활성이다. 평소 --review-only 경로·0.3.19 version·기존 평가 userData0.3.18은 유지한다. 명령 모드에는 평가창·단일 인스턴스 잠금·기존 평가 프로필을 사용하지 않는다. 실제 인증값이나 온라인 설정은 생성하지 않았다.

## 설정과 인증 공급자

설정 파일은 비밀 없는 JSON이며 schemaVersion1, enabled/dataTransferApproved/canonicalMergeApproved, materialRoot/allowedMaterialWorkspace/stateRoot/allowedOutputRoot, criteria/repository, 선택 completionPolicy/intakeEvidence, credentialProvider/writerFleet를 사용한다. 알 수 없는 필드(예: token)는 거절한다. 원본·state·export 경로가 겹치거나 symlink/junction인 경우 거절한다. 전용 private review repository와 격리 branch 계약을 유지한다. 실제 materialRoot·repository·권한은 별도 승인·설정 대상이다.

credentialProvider의 실제 CLI 형식은 {mode:'verified-module',id,module,allowedWorkspace,sha256,executionApproved:true}. 공식 GitHub 인증 수단에 연결할 승인된 adapter만 명시적으로 지정한다. 1MiB 이하·단일 링크·허용 경계·SHA256을 검증한 파일 bytes 자체를 data-URL ESM으로 실행한다. 검증 후 원래 경로를 다시 읽지 않는다. self-contained ESM이며 node: builtin 이외의 의존 import와 dynamic import는 지원하지 않는다. 임의 plugin 탐색, env/gh token/vault 자동 조회, 저장된 인증값 찾기는 없다.

Adapter는 createPcCredentialProvider({repository,providerId})를 export하고 {contract:'pc-review-credential-provider-v1',getAccessToken}를 반환한다. getAccessToken은 {repository,purpose:'private-review-data'}를 받아 이미 승인된 공식 인증 session의 접근값을 연결하는 인터페이스다. PC transport만 이 callback을 필요할 때 호출하고 값은 config/결과/로그에 저장하지 않는다. 이 인터페이스의 mock을 검증했으며 실제 인증 session에는 접속하지 않았다. 외부 provider 코드의 기능 자체를 sandbox한다고 주장하지 않는다. 실행할 코드·hash·의존 경계는 명시 승인 대상이다.

API 시험은 createPcReviewRunner({providers,fetchImpl,inspectWriters}).runOnce({config,action:'cycle'})의 registered provider를 주입한다. 배포 명령에는 registry를 자동 채우지 않는다. missing provider는 blocked로 처리한다. 출처가 확인되지 않은 key/token 대체 방법을 사용하지 않는다.

실제 merge 설정은 writerFleet={materialRoot,canonicalWriterSha256,writers:[{executablePath,asarSha256}]}를 요구한다. 현재 실행 중인 Threads Cut Editor.exe만 경로와 ASAR·공동 writer 지문을 확인한다. 현재0.3.15처럼 공동 writer가 없는 앱은 block한다. 이 점검은 미래에 legacy 앱을 다시 실행하는 것을 막지 않으므로 운영 전에 모든 writer를 통합 앱으로 전환해야 한다. 외부 adapter 실행이나 원격 호출 전에 material/state/export 경계와 fleet를 점검한다.

## 짧은 원본 잠금과 공급

stateRoot 저널은 전체 cycle을 직렬화한다. 공급은 짧은 canonical 읽기로 metadata/listing과 각 PNG를 확인하고 별도 scratch snapshot을 만든다. 원본 bytes·출력 SHA·평가 버전은 보존한다. 파일 복사·export·긴 네트워크 대기는 원본 잠금 밖에서 실행해 PC 저장을 막지 않는다. 응답의 원격 조회는 원본 잠금 밖에서 읽으며, 실제 import merge와 recovery만 기존 공동 canonical writer·CAS·회차 검증으로 보호한다. export가 끝나면 scratch는 검증된 자체 namespace에서 정리하며 export·journal·transaction·결과·원본은 보존한다.

commit/ref 요청 전후에 최신 완료 증거·회차를 확인한다. 회차가 바뀌면 confirmed로 처리하지 않는다. ref가 이미 전송된 이후라면 원격 rollback 없이 pending/ref_update_in_flight 증거를 남긴다. 옛 회차 mobile event는 새 회차/제작버전 평가에 적용되지 않는다. snapshot 이후 PC 편집은 모바일 import 충돌로 보존한다.

## 검증과 남은 실제 설정

합성 회귀 시험은 기본비활성0callback, 한 cycle 공급/import/restart, PC충돌 결과보존, secret field 거절, exact provider bytes/hash, 민감한 factory 오류 제거, missing provider/fleet mismatch, 미승인 import/recover disabled, 시작된 실패 결과를 검증한다. Binding은 공급과 응답 조회 대기 중 PC 저장·원본 snapshot bytes/정리·PNG변조0전송·회차 변경 전/중 차단을 검증한다. 전체365글3073장 실제 복사본과 fake credential/메모리 Git transport의 oneentry 결과는 qa-local/mobile-canonical-20261008/one-entry-* 증거에 기록한다. 실제 운영 평가에 mobile event를 쓰지 않았다.

원격 전송을 켜려면 전용 repository/App/선택권한/공식 사용자 동의, 실제 provider adapter·hash·비밀 없는 경로/기준 설정, 모든 writer 전환, 수정 adapter+review-limits를 포함한 Android APK 재빌드와 기기 pilot이 필요하다. 이는 승인·설정·배포 검증 단계이며 실행 진입점/인증 인터페이스/공급 잠금 분리 코드는 준비돼 있다. 예약 작업·실제 게시·추가 결제는 이 진입점에 없다.

이전 단계 근거: docs/CANONICAL_PC_MOBILE_INTEGRATION_2026-10-08.md (초기 공동 writer 설치와 그때의 미완료 사항은 역사 기록). 최신 commit/SHA·실제 설치·전체 복사본 증거는 최종 보고와 QA final proof를 따른다.
