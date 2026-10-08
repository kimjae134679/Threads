# 별도 표지 제작 설치 0.3.26

0.3.25에서는 새 합성 스크립트가 파일에는 포함돼도 `cut-editor` 허용 목록에 없었고, desktop 모듈이 설치본에서도 저장소의 `../app`을 찾았다. 0.3.26은 `source-batch-image-composition.js`를 허용하고 `editorRoot()`로 설치본의 `resources/editor`와 개발 저장소의 `app`을 구분한다. batch 모델, ZIP 도구, 단건 렌더 HTML이 같은 경로를 쓴다.

설치 실행파일은 `--image-production-request=ABS_REQUEST.json`을 받으면 리뷰·편집기 부팅 전에 표지 제작기로 들어간다. 요청 JSON·원본·기존 결과는 읽고, 요청의 별도 output/work 폴더에만 결과·프로필·락·체크포인트를 쓴다. 네트워크 요청은 차단한다. 일반 실행과 리뷰 UI 코드는 기존 동작을 유지한다. 설치 버전만 0.3.26으로 구분하며 package-lock의 루트 버전도 맞췄다. 의존성 변경이나 다운로드는 없다.

## 설치와 복구 경로

- 새 설치: `D:\A_KJ\AI\Applications\ThreadsReview\0.3.26\Threads Cut Editor.exe`
- 기존 설치/복구: `D:\A_KJ\AI\Applications\ThreadsReview\0.3.25\Threads Cut Editor.exe --review-only`
- 기존 canonical 평가 링크와 `자료/프로그램 실행.lnk`는 0.3.25 연결을 유지한다. 새 리뷰 회차 활성화나 사용자 점수 이동은 하지 않았다.
- 재현 가능한 빌드 후보: `C:\Users\user\Documents\Codex\2026-10-08\task-16\installation-candidate-0.3.26\win-unpacked`

한 글씩 제작하는 설치 명령은 다음 형식이다. `REQUEST_ABS.json`은 기존 [단건 요청 계약](COVER_COMPOSITION_2026-10-08.md#한-글-제작-명령)을 따른다. 실제 신규 글에는 `representativeOnly:false`, 최신 reviewProgress와 검토 완료된 이미지 선택 계약이 필요하다.

```powershell
$process = Start-Process -FilePath 'D:\A_KJ\AI\Applications\ThreadsReview\0.3.26\Threads Cut Editor.exe' -ArgumentList @('--image-production-request=REQUEST_ABS.json') -WindowStyle Hidden -Wait -PassThru
if ($process.ExitCode -ne 0) { throw '표지 제작 보류: 체크포인트 확인' }
```

## 변경 부분의 확인

기존 전체 검사는 반복하지 않았다. 패키지 테스트 4건, 변경 파일 구문 및 diff 검사를 통과했다. 수정 전에는 새 스크립트 404, flattened 모듈의 ENOENT, 단건 요청의 일반 부팅 진입을 재현하는 3건이 실패했고 수정 후 통과했다.

빌드 후보 127개 파일을 새 폴더에 복사한 뒤 SHA256으로 일치를 확인했다. 기존 0.3.25의 126개 파일은 모두 그대로다. 리뷰 UI/loader와 본문 모델 5개는 기존 설치와 줄바꿈 정규화 내용 hash가 같다. 기존 실행 링크 2개, 운영 status/평가/진행/회차와 대표 글 원본 결과 파일도 그대로다. 이 확인은 실제 설치 실행 뒤 다시 대조했으며 작업 중 운영 자료를 쓰지 않았다.

2026-10-09 08:18 KST에 실제 D의 설치 실행파일이 QA 단건을 정상 종료했다. 체크포인트의 runtime은 packaged=true, version=0.3.26, 실제 D 실행 경로와 `resources/editor`를 기록한다. 이미 준비된 task10 A의 원본 hash `3d1c229c65c1930ae1b038f7dc42a4fc5c8d618b95692557892cb70289b1637a`가 새 source ZIP에 포함된다. 신입 글 전체 제목과 정사각형 1080×1080 표지가 출력됐고, 표지 hash는 이전 검증본 `a1a520cb1340c7815515492b4f241984cc7cddb88477d37f1326794a6f5e9fd9`와 같다. 본문 PNG 14개와 본문 계획은 기존 결과와 동일하다. producer 락은 해제됐다.

이 호출은 `representativeOnly:true`인 설치 연결 QA다. 이미 본 글을 신규 소재로 공급하지 않았고 새 이미지를 생성하지 않았다. 새 출력은 현재 리뷰에 등록하지 않았으며 게시 승인이 아니다. 일반 편집기나 리뷰 창을 사용자에게 표시했다는 실행 근거로 주장하지 않는다.

근거는 task16의 `installation-before-0.3.26.json`, `installation-after-0.3.26.json`, `installed-single-cover-verification-0.3.26.json`, `installed-cover-request-0.3.26.json`, `installed-cover-0.3.26.log`, `installed-cover-qa-0.3.26/work/checkpoints/source-c17d392921074a.json`이다. 추가 설치 보완은 원격 60d1cdd와 구분하여 인계하며 이 문서를 저장한 시점에는 아직 추가 push하지 않았다.

## 생성 저장과 ready gate

글별 staging은 `task-16/scheduler-handoff/inputs/<글ID>`이고, 생성 원본은 그 안의 `작업 정보/generated-media/<basename>.png` 등에 저장한다. 계약은 `작업 정보/image-requirements.json` 또는 manifest의 동일 imageRequirements이며 두 표현이 다르면 보류한다. 원본·receipt·프롬프트 hash, 권리 근거, 실제 장면 증거와 배치를 검토한 후 ready 자산으로 연결한다. 결과는 `scheduler-handoff/results/<글ID>/<fingerprint>`, 락·체크포인트는 요청 work 폴더를 쓴다.

저장된 ready gate와 config는 이 설치 과정에서 바꾸지 않았다. 실제 설치 단건 성공은 `cover_consumer_integrated`의 근거로 쓸 수 있으나 config의 file/SHA attestation 등록은 부모가 한다. `parent_work_complete`, `documents_integrated`, 현재 지원된 GPT 생성·저장 성공 증거 `supported_gpt_save_verified`도 등록 전이다. 예전 생성 파일이나 설치 성공을 현재 생성·저장 성공으로 대신하지 않는다. 예약·생성 공급자는 활성화하지 않았다.

각 글에는 최신 및 과거 미열람 확인, 정확한 본문·인용 근거, 관련 원본/외부 자산 검토와 권리·개인정보 clearance, 이미지 필요 여부, 원제 전체와 강조 구절, 생성이 필요할 때만 근거 장면·프롬프트, 실제 원본 파일/hash/receipt, 얼굴·손·행동을 보호하는 safeArea/crop 검토가 필요하다. 권리나 원문이 미완료면 text fallback으로도 우회하지 않는다. 환골탈태 글 계획은 기존 rights/privacy/formal-source 보류를 유지한다.
