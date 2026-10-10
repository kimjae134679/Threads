# 세로 제작 결과의 보존 복사와 검토 경로 전환 계약

완성된 대표 4글·33PNG와 증분 195글·1885PNG를 합친 고유 199글·1918PNG를 등록된 자료 역할 안의 별도 보존 위치에 복사한다. 제작 소스는 `ec0cd894fa110c1c722bc24ca882ee90bf850c45`, 패키지는 `0.3.39-portrait.20261009.1`, ASAR SHA256은 `ff710505d85392245e16c8ae2be6b78df599283549d861ce3c21af0f3738ea59`다. 이는 제작 코드 버전이며 이번 문서 커밋과 구분한다.

파일 경로가 바뀌어도 PNG·원문 ZIP·preview ZIP·계획·자산·원본 checkpoint 바이트, fingerprint와 이전/새 outputVersion은 유지한다. 원본 폴더를 이동·삭제하지 않는다. 새 제작, 현재 결과 교체, 리뷰 판정 변경과 이전 평가의 새 버전 재사용은 이 작업에 포함되지 않는다.

## 로컬 계약 파일

실제 경로·글 제목·이미지·원문·평가 기록과 파일별 해시 목록은 비공개 로컬 자료에만 둔다. 공개 저장소에는 이 계약만 둔다.

| 파일 | 내용 |
|---|---|
| `delivery-pending.json` | 복사 시작 시점의 기록. 완료 증거로 사용하지 않는다. |
| `delivery-mapping.json` | 기존 `threads-portrait-render-mapping-v1`의 순서·버전·해시를 유지하고, `rows[].output`, `checkpoint`, `images[].file`, `source_bundle`을 새 보존 경로로 연결한다. `delivery.schema`는 `threads-portrait-delivery-v1`이다. |
| `file-inventory.json` | 각 원본/복사 파일의 `oldPath`, `newPath`, `bytes`, SHA256, 역할, 원본 보존 여부. 양쪽 raw bytes의 해시와 크기를 대조한다. |
| `absolute-reference-audit.json` | checkpoint, 계획·provenance JSON 및 원문/preview ZIP의 JSON에 있는 절대 경로의 JSON pointer와 새 경로 해결 결과. 과거 실행 파일 경로는 역사 기록으로 남긴다. |
| `recovery-map.json` | 이전/신규 checkpoint·output roots와 입력 경로의 prefix mapping. 기존 경로가 살아 있으며 검토 설정을 이전 경로로 되돌릴 수 있다. |
| `delivery-complete.json` | 완전 복사 뒤 생성하는 완료 표식. 계약 파일의 정확한 bytes·SHA256, 파일수·합계 bytes, checkpoint 4+195개, PNG 1918개, ZIP CRC 검증과 보류된 전환 단계를 기록한다. |

각 그룹은 `outputs/`, `checkpoints/raw/`, `checkpoints/relocated/`, `checkpoints/relocation-proofs/`로 나눈다. `raw`는 원본 checkpoint와 바이트가 같다. `relocated`는 `target` 및 실제 복사된 입력/출력의 절대 경로만 바꾸는 파생 checkpoint다. 각 relocation proof에는 원본·파생 checkpoint SHA, 이전/새 target과 `source-bundle.zip` 경로·SHA, selected input 경로, 버전 불변 확인을 둔다. 필요한 입력은 `inputs/<post-id>/`, 제작 요청·감사 기록은 `contracts/`, 과거 평가 스냅샷은 `preserved-evaluation/`에 보존한다.

복사된 계획과 ZIP 안의 역사 경로를 직접 바꾸면 결과 SHA가 달라지므로 이 파일들은 수정하지 않는다. `absolute-reference-audit.json`과 `recovery-map.json`이 해당 경로의 새 위치를 해결한다. `source_bundle`은 실제 새 output의 `source-bundle.zip`을 명시적으로 가리키며 `sourceBundleSha256`과 같아야 한다. 소비자는 원본 checkpoint를 복사본의 실행 checkpoint로 오인하지 않아야 한다.

원본 checkpoint의 `evaluationCarryForwardAllowed`는 과거 제작 당시의 기록이다. 이 작업에서 평가 재사용을 승인하는 근거가 아니다. 배달 계약의 `reviewTransition.evaluationReuseAuthorized`는 false이며 리뷰 담당은 새 버전의 새 평가로 시작한다.

## 역할 경계와 ready gate

제작 담당은 자신의 소스·출력 계약 및 파일별 SHA/path mapping을 전달한다. 공통 `project.catalog.json`, `PROJECT_PRESENTATION_RULES.md`, validator, Threads의 리뷰 담당 manifest/receipt와 현재 리뷰 설정은 수정하지 않는다. 공통 계약의 기대 커밋·실제 raw 파일 해시·미커밋 상태를 별개로 기록한다. 커밋 SHA가 같아도 미커밋 계약 파일을 그 커밋의 바이트로 취급하지 않는다.

검토 담당은 다음을 확인한 뒤 자신의 설정을 백업하고 CAS 및 realpath containment 검사를 통해 두 새 `checkpoints/relocated` roots로 전환한다.

1. `delivery-complete.json`의 계약 파일 SHA와 실제 로컬 바이트가 일치한다.
2. 고유 글 199개·순서·PNG 1918개·크기1080×1440·SHA·원문 ZIP SHA·버전 연결이 일치한다.
3. 각 checkpoint의 새 target과 매핑의 output, source bundle 파일 경로·해시가 같은 자료 역할 안의 정상 파일을 가리킨다.
4. 검토 설정 및 원본 출력과 사용자 편집 충돌을 확인하고, 이전 판정/평가를 새 버전에 가져오지 않는다.
5. 실제 소비·이미지 열기·전체 본문 뷰어·재시작 중복 방지·기존 플랫폼 결과 보존을 현재 코드에서 검증한다.

`delivery.readyForReviewPathTransition: true`는 제작 담당의 복사 계약이 준비됐다는 뜻이다. `activationAllowed`와 `publicationAllowed`는 false이고, `reviewConfigTransitionComplete`와 `controllerValidationComplete`도 별도다. 공통 컨트롤러의 source 역할 지정, expected commit/artifact pins, 현재 receipt 및 실제 idle 검증은 각 소유자가 마무리한다. lock 파일이 없다는 사실만으로 idle 상태를 선언하지 않는다. 이전 경로는 리뷰 전환 검증이 끝날 때까지 유지한다.

## 실패·복구

대상 위치가 이미 있거나 원본 pin이 불일치하거나 파일/디렉터리가 링크이면 복사를 보류한다. 기존 목적지를 덮어쓰거나 원본을 지우지 않는다. 복사 도중 원본 bytes가 바뀌면 보류하고 실패 기록을 남긴다. 부분 폴더는 완료 결과로 등록하지 않으며 임의 재시작 대신 완료 inventory와 실제 파일을 담당자가 대조한다. 검토 전환에 실패하면 해당 담당자가 보존한 이전 설정 및 `recovery-map.json`으로 되돌린다. 자료 복사 성공만으로 공유 큐 갱신·프로그램 재시작·API 설정·게시·예약을 실행하지 않는다.
