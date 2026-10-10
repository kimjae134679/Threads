# 제작 완료 결과 자동 연결·보관

운영 앱에 `auto-production-link.json`이 활성화되면 서버가 시작할 때와 실행 중 15초마다 새 제작 완료 결과를 확인한다. 브라우저에서 가져오기 버튼을 누르지 않아도 작동하고, 앱 재시작 시 같은 버전을 중복 연결하지 않는다. 앱이 종료된 동안에는 처리하지 않으며 다음 실행에서 다시 확인한다.

입력은 기존 `ProductionInput`의 자료/06_자동 제작 결과/status.json 및 설정된 세로 제작 실행 폴더의 `work/checkpoints/*.json`이다. 후자는 `CheckpointProductionInput`으로 읽으므로 아직 설치된 제작 목록에 승격되지 않은 패키지 결과도 연결할 수 있다. 등록하지 않은 새 패키지 폴더는 자동 탐색하지 않는다. 제작기가 새 실행 폴더를 사용할 경우 동일한 입력 계약을 유지하고 `checkpoint_roots`에 그 실행 폴더를 등록해야 한다.

완료 입력은 다음 조건을 모두 만족해야 한다.

- 제작 상태가 generated/already_done이고 intakeAuditPassed=true, renderedPages와 이미지 수가 일치한다.
- integrity-audit.json의 ok=true, issues=[]이며 이미지 파일명과 순서가 연속으로 대응한다.
- 각 원본 PNG의 실제 SHA-256·MIME·1080×1440 크기를 확인한다. 한 장은 8 MiB 이하여야 한다.
- 패키지 체크포인트는 state=complete, ID와 versionLinks의 새 버전이 productionVersion(changed)와 일치해야 한다. 파일 목록의 해시를 실제 바이트로 확인하고 출력 경로가 등록된 실행 폴더 안에 있어야 한다.
- 복사 전후 제작 버전과 체크포인트가 같고, 저장 직전 앱의 해당 글 버전·revision도 같아야 한다. 실행/재조정 중인 글은 대기한다.

확인 실패는 대기로 기록하고 기존 글과 사용자 판정을 바꾸지 않는다. 글/이미지/원문을 외부로 보내지 않는다. 기존 제작 결과가 다시 현재 목록을 덮지 않도록 설치 시 baseline의 ID·버전 쌍을 고정한다.

새 결과 연결 시 해당 글의 이전 버전, 검토 메모, 판정, 변경 이력과 이미지 바이트를 `.local/replaced/auto-production/<key>/`에 보관한다. 새 결과는 미검토이며 원문·권리·안전 상태도 재확인이 필요하다. 사용자가 수정한 문안, 태그, 선택 계정과 플랫폼 설정은 보존한다. 다른 글의 판정을 초기화하지 않는다. 원본 제작 폴더와 외부 플랫폼 결과 파일은 수정하지 않는다.

현재 목록이나 복구용 state.backup.json 등에서 참조하는 이미지는 이동하지 않는다. 참조가 사라진 이전 이미지만 해시를 확인한 보관 폴더로 옮긴다. 완료 상태와 처리한 ID·버전은 로컬 state에 기록해 재시작 중복을 막는다.

설정은 `.local/auto-production-link.json`의 schema=1, enabled, interval_ms, baseline, checkpoint_roots이다. 새 설정 파일은 게시 승인이나 계정 권한을 부여하지 않는다. 상태는 GET `/api/production/auto-status` 및 `.local/auto-production-link-status.json`에서 확인하고 화면 하단에 켜짐/확인 대기를 표시한다. 실제 게시·예약 API는 기존처럼 잠겨 있다.

검증: `node upload-studio/test/node.test.mjs`, `node upload-studio/test/final-review-browser.test.mjs`. 자동 연결 테스트는 시작 후 완료 감지, 실제 파일 검증, 보관, 실패 시 기존 판정 유지, 사용자 편집 충돌, 재시작 중복 방지, 복구 파일의 이미지 보존과 패키지 체크포인트 입력을 다룬다. 외부 미디어 전송은 0회다.
