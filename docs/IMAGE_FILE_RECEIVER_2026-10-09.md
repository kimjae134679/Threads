# 지원 파일 수신 → 단건 표지 합성

이 변경은 이미 지원 경로로 전달된 PNG 파일을 받는 Threads 수신기다. 생성 도구의 메모리 데이터, base64, data URL을 파일로 복원하지 않는다. 새 생성 원본의 자동 전달은 아직 미연결이며 이 수신기만으로 완전 자동화가 완료됐다고 하지 않는다.

## 소유 파일과 실행

- `desktop/image-file-receiver.cjs`: 검증·원본 저장·중복 방지·실패 재개·합성 결과 검증.
- `desktop/image-file-receive.cjs`: 로컬 요청 JSON을 받는 Node CLI.
- `desktop/package.json`: 두 모듈을 다음 패키지에 포함하도록 등록. 라이브 0.3.26에는 수신기를 새로 설치하지 않았다.
- `test/image-file-receiver.test.mjs`: 실제 파일 저장과 오류·중복·재개 검사.
- ProjectBridge/통합 관리 프로그램의 코드·설정·큐·기존 프로세스는 수정하지 않았다. 해당 작업은 다른 담당자가 소유한다.

기존 Node 24와 기존 설치 0.3.26을 사용한다. 의존성 설치, 새 API 키, 계정, 서버, 네트워크·보안 설정을 요구하지 않는다.

```powershell
node 'REPO_ABS\desktop\image-file-receive.cjs' 'RECEIVE_REQUEST_ABS.json'
```

브릿지 담당자는 기존 인증된 `start_process`에 위 argv와 전용 cwd, 시간 제한, 자원 키를 전달하고 실제 processId의 종료 결과를 확인한다. 새 공용 큐 형식이나 영구 연결 권한이 필요하지 않다. 긴 작업을 시작 접수만으로 완료 처리하지 않는다.

## 파일 전달 인터페이스

요청 schema는 `threads-image-file-receive-v1`이다. 요청 JSON은 로컬 파일, 최대 64 KiB이며 CLI 인수는 절대 경로다.

|필드|계약|
|---|---|
|postId / requestId|각각 1~80자 영숫자·하이픈·밑줄. requestId는 생성 요청의 안정적인 ID이며 재실행 때 유지|
|storageRoot|호출자가 소유한 별도 저장 루트의 절대 경로. 원본 자료·설치·평가 폴더를 선택하지 않음|
|source.path|지원 경로로 실제 전달된 로컬 PNG 절대 경로|
|source.sha256 / sizeBytes / width / height|생성 도구가 반환한 원본 bytes 기준 값. 수신 파일의 실제 값으로 대신 고쳐 불일치를 숨기지 않음|
|source.transport|kind: supported_local_file 또는 library_materialized_file, reference: 실제 전달 근거/파일 참조|
|generation.promptSha256|실제로 생성에 사용한 프롬프트 hash|
|generation.tool|name, model, modelEvidence. 모르면 model과 modelEvidence 모두 null|
|generation.generatedAt|확인된 생성 시각 또는 null. 수신 시각을 생성 시각으로 쓰지 않음|
|compose (선택)|검토된 단건 제작 JSON의 requestFile, 실제 설치 실행파일 executable, 고정된 executableSha256|
|retryCheckpointSha256 (선택)|같은 합성 요청이 held인 경우 명시적 재시도할 현재 수신 체크포인트 hash|

단순 이미지 URL이나 Library 이름은 로컬 파일이 아니다. Library라면 공식 파일 전달로 먼저 materialize하고 실제 file/library ID·version을 전달 근거에 유지한다. 수신기는 Library 로그인·다운로드·생성을 대신하지 않는다. 호출자는 지원된 공급자가 이 파일을 실제로 넘겼다는 증거를 소유해야 한다.

PNG는 최대 12 MiB, 각 변 4096px 이하, 압축 해제 raster 72 MiB 이하이며 interlace=0을 지원한다. 서명·IHDR·청크 CRC·IEND·압축 데이터 길이·행 필터·실제 치수를 확인한다. 다른 이미지 형식·인터레이스 형식은 변환하지 않고 보류한다. 원격 UNC·장치명·ADS·symlink/junction·경로 탈출을 거절한다. 이 검사는 개인 작업 폴더의 파일 일관성 보호이며 다른 로컬 Windows 계정에 대한 보안 경계가 아니다.

## 저장과 재개

저장 경로는 `storageRoot/postId/requestId/original.png`, `receipt.json`, `checkpoint.json`이다. receipt는 원본의 위치·hash·크기·치수·생성 메타데이터와 `pending_asset_and_layout_review`를 기록한다. 원문 사용권·장면·얼굴/손·배치·게시 검토를 자동 승인하지 않는다.

새 파일은 임시 파일에 쓰고 fsync한 뒤 hard link로 원자적으로 공개한다. 기존 원본·receipt는 덮어쓰지 않는다. 같은 요청과 같은 원본이면 재사용하며 requestId를 다른 이미지/프롬프트/전달 근거에 재사용하면 request_conflict다. 원본이나 receipt가 변조됐으면 원본을 새로 덮어쓰거나 재생성하지 않고 held다.

원본 저장 뒤 receipt 저장 전에 실패해도 다음 호출은 저장된 원본 hash를 확인해 이어간다. receipt는 저장됐지만 체크포인트가 중단됐으면 원본·receipt를 바꾸지 않고 체크포인트만 복구한다. 수신된 파일이 보존됐다면 원래 임시 전달 파일이 없어져도 이어갈 수 있다.

`storageRoot/.receiver-locks/postId--requestId.lock`은 수신부터 합성 검증까지 유지한다. 동시 호출은 skipped_running이다. 죽은 락을 자동 탈취하지 않는다. 브릿지의 등록된 프로세스 소유권·실제 상태와 producer 락을 확인한 뒤 담당자가 조치한다. 원자적 hard link를 지원하지 않는 파일시스템은 성공으로 바꾸지 않고 보류한다.

## 검토 계약과 0.3.26 합성

compose를 생략하면 received 또는 already_received다. 이는 표지 완료가 아니다. 검토 담당자는 이미 존재하는 imageRequirements 형식을 이용하여 원본·실제 프롬프트 receipt·원문 근거·권리·장면·crop/safeArea를 연결한다. staging에 자산을 복사할 때도 수신 원본 hash와 동일해야 한다. 수신기는 manifest의 권리 플래그나 imageRequirements 상태를 임의로 ready로 올리지 않는다.

compose가 있으면 기존 loadBatchInput을 실행하여 정확히 한 개의 검토된 cover 자산이 수신 원본 hash·프롬프트·tool·생성 시각에 결합되는지 확인한다. 미완료 generationRequests/held/seen은 기존 규칙대로 멈춘다. 실행파일 bytes hash도 대조하고 출력·work가 수신 원본 폴더와 겹치면 거절한다.

그다음 실행파일의 `--image-production-request=ABS_JSON` 경로를 숨김 실행한다. 종료 0만으로 완료 처리하지 않는다. producer 체크포인트에서 실제 packaged 0.3.26, 실행파일, postId, 입력 fingerprint, 요청 경로, 본문 보존, 대표 QA 여부를 확인한다. 모든 결과 PNG·ZIP·제작 계획 hash와 1080×1080 표지·전체 원제를 검증해야 complete다. 같은 완료 요청은 결과 hash를 재확인하고 already_done으로 반환한다.

CLI 종료 코드는 received/complete/already_received/already_done=0, held=2, skipped_running=3이다. stdout JSON의 state로 단계를 구분해야 하며 종료 0을 항상 표지 완료로 취급하면 안 된다. 합성 실패의 동일 요청은 명시적인 retryCheckpointSha256 없이는 다시 실행하지 않는다.

## 실제 검증과 남은 상류 구간

예약은 이미 마련된 한 글 작업 큐를 사용한다. 원문 읽기와 이미지 필요성 검토는 진행할 수 있지만, 원본 자동 전달의 실제 파일·hash 증거와 부모 통합 완료 증거가 모두 갖춰지기 전에는 generation/composition claim을 열지 않는다. 기존 30분 예약을 추가 생성하거나 수정하지 않았다.

한 글 작업의 단계는 `계획 검토 → 필요 시 생성 → 지원된 원본 전달 → 수신 검증 → 이미지·배치 검토 → 표지 합성 → 실제 결과 검증 → 검토 대기`다. 이미지가 불필요한 글은 별도 완성 글씨형 경로로 보낸다. 원문 관련 이미지와 권리 검토된 외부 이미지가 있으면 생성보다 우선한다.

|상태|예약 담당자 처리|
|---|---|
|received / already_received|원본 저장만 완료. 이미지·권리·배치 검토와 ready 계약이 필요|
|complete / already_done|별도 결과의 검증까지 완료. 큐에 결과 경로·hash를 남기고 검토 대기|
|skipped_running|같은 작업 실행 중. 새 생성이나 중복 프로세스를 시작하지 않음|
|held|원인·기존 체크포인트·다음 조치를 기록. 저장 실패를 재생성으로 보상하지 않음|

실패 보류 기록은 `{postId, requestId, state:"held", reason, checkpoint, nextAction, regenerationRequested:false}`다. 상류 작업 락은 단일 글 claim부터 완료/보류 기록까지 유지하고, 이 수신기의 락과 producer 전역 락은 각 실행 구간의 동시 처리를 막는다. 수신기 성공을 신규 생성·원본 자동 전달 성공으로 대신 기록하지 않는다. 실제 게시와 현재 리뷰 등록은 기존 사람 검토 단계에 남긴다.

수신기 17건·표지 합성 9건·설치 패키지 4건의 핵심 테스트가 통과했다. 독립 검토에서 발견한 두 재개/완료 검증 문제를 수정한 뒤, 설치 0.3.26의 기존 완료 결과를 다시 검증했다. producer 체크포인트 hash와 표지·본문 bytes는 그대로이며 반복 호출은 already_done이다. 이 검증을 위해 새 이미지를 생성하거나 본문을 다시 렌더하지 않았다.

완료 검증은 실제 slide 목록·본문 장수·기존 본문 PNG bytes·기존 본문 계획을 대조한다. 제목도 originalTitle만 믿지 않고 실제 title operations와 geometry를 원문 제목 정책에 대조한다.

2026-10-09 KST, task16의 `receiver-qa-20261009`에서 기존 task10 A 원본을 지원 로컬 파일 입력으로 받았다. 저장 원본 hash는 `3d1c229c65c1930ae1b038f7dc42a4fc5c8d618b95692557892cb70289b1637a`와 같고 실제 설치 0.3.26이 표지 한 건을 출력했다. 표지 hash는 `a1a520cb1340c7815515492b4f241984cc7cddb88477d37f1326794a6f5e9fd9`, 본문은 14장 보존이다. 같은 요청은 already_done이며 최초 생산 체크포인트 hash를 유지했다. 이는 이미 본 글의 representativeOnly QA이며 신규 소재 공급이나 새 생성 저장 성공이 아니다.

버스 글 source-be8fbf58dc2254의 원본은 별도 상태다. 기본 생성 도구의 결과에는 image_url만 있고 local path/file ID가 없다. 원본 기준은 1,959,246 bytes, 1254×1254, SHA256 `581de4306ef954defffb02447c126fe9dee59c87a26950df83bffd2c945a5026`이다. 같은 시각의 Library 후보는 196,702 bytes로 원본과 크기가 다르며 채택하지 않았다. 원본의 지원된 전달 참조는 아직 확보되지 않았다.

공식 Library 다운로드 도우미의 동반 파일을 같은 스킬에서 확보했지만 이 로컬 실행 환경에서 Library prepare_materialize 호출을 사용할 수 없다고 반환했다. Library 조회 API 자체는 성공했고 후보 메타데이터를 받았다. 지원 원본 파일의 미제공과 로컬 도우미의 연결 미지원은 구분한다. 확인하지 않은 후보 byte hash나 원본 다운로드 성공을 주장하지 않는다.

새 버스 원본의 실제 수신 요청도 실행했으며 파일 미도착으로 source_unavailable/held, regenerationRequested=false다. 수신 원본 PNG·표지·ready 계약은 만들어지지 않았다. 사용자가 표시 이미지를 직접 저장하는 임시 대안은 이 상류 연동의 자동화 완료 근거가 아니다.

부모/JEV 담당자에게 필요한 것은 생성 공급자가 실제 file/attachment ID와 원본 metadata를 반환하고, 지원된 파일 전달기로 동일 bytes를 전용 로컬 경로에 놓는 인터페이스다. 메모리 base64를 브릿지 명령으로 포장해 복원하는 방식은 연결하지 않는다. 이 원본의 파일/SHA가 확인되기 전 supported_gpt_save_verified와 ready gate는 false를 유지한다. 기존 30분 예약은 새로 만들거나 수정하지 않았다.
