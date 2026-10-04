# Threads 자동 제작 — 현재 작업 인수인계

문서 기준: 2026-10-04 KST. 현재 코드는 원격 main과 이 문서의 Git 이력을 확인합니다. 과거 대화 요약을 현재 구현 상태로 취급하지 않습니다.

## 현재 결과

Windows 프로그램 0.3.3, 제작 규칙 2026-10-04.3을 구현·빌드·설치했습니다. 입력 1,084건 중 검수 전 결과 398건·3,209 PNG, 보류·제외 686건, 처리 실패 0입니다. 실제 게시 확인은 0입니다. 재실행은 새 제작 0·건너뜀 398입니다.

레퍼런스 수준을 사용자가 만족했다고 확인한 상태는 아닙니다. 사진·민트·흰 바탕·캡처·설명형 형식과 일정 비율 조판을 구현했고 대표 결과를 직접 확인했습니다. 398건 전체의 파일·원문 연속성 감사는 통과했지만 전 장의 의미·권리·표현을 사람이 검수한 상태는 아닙니다.

현재 구현·검증·실행 안내의 원본은 [Windows 프로그램 안내](../docs/SOURCE_CUT_DESKTOP.md), 레퍼런스 관찰은 [Instagram 가이드](../docs/INSTAGRAM_REFERENCE_GUIDE.md)입니다. 이전 0.3.1 결과 수 417/2,886을 현재 수치로 쓰지 않습니다.

## 사용자의 품질 기준

- 저장한 실제 원문과 사진·화면·댓글을 사용하고 마지막 내용까지 보존합니다.
- 메뉴·UI·링크만 있는 문자열을 본문으로 만들지 않습니다. 없는 사실·댓글·사진을 만들지 않습니다.
- 사진 비율, 큰 제목, 읽을 수 있는 본문, 문장·말풍선 경계, 원문 순서와 불필요한 중복 제거가 중요합니다.
- 의미 없는 긴 캔버스·큰 여백·배경 흐림·사진 위 본문 가림을 피합니다.
- AI가 실제 앱과 실제 결과를 보고 반복 개선해야 합니다. 테스트만 통과했다고 만족을 주장하지 않습니다.
- 원본과 Known-Good를 보존하고 최신 결과·실행 위치·검수·게시 여부를 분명히 표시합니다.

## 이번 변경

0.3.3은 계획 단계에서 읽은 이미지를 렌더 단계에서 재사용합니다. 한 번의 제작에서 픽셀 분석과 레이아웃 계산을 반복하지 않습니다. 보관은 한 계획·3,200만 픽셀 이내이며 렌더 후 해제합니다. 원문 ZIP 해시, 제작 계획 버전, 검수 조건은 매번 확인합니다. 이미지 분석 변경은 이미지 첨부 후보의 캐시만 무효화하므로 텍스트 후보를 불필요하게 재생성하지 않습니다. 제목 수동 조절을 선택해야 위치·크기 입력이 활성화됩니다.

app/source-page-plan.js는 본문 52px·안전 여백 72px, 문단·문장 단위 배치, 질문과 답변의 동반 배치, 빈 줄 기준의 전체 캡처 분할을 수행합니다. 일반 세로 사진은 한 장에 담습니다. 실제 경계가 없으면 선별 필요로 보류합니다. 사진 표지에는 하단 그라데이션을 사용하며 캡처는 별도 제목 표지 뒤에 원본을 표시합니다.

app/source-batch-image-analysis.js는 밝은/검은/회색 바탕의 글 캡처, 빈 줄과 바깥 여백을 픽셀로 분석합니다. OCR 또는 의미 모델이 아닙니다. 전체 편집 판단을 자동으로 해결했다고 쓰지 않습니다.

원문 영상·오디오·임베드가 존재하면 짧은 설명만 렌더링하는 누락을 막습니다. 실제 영상 후보 source-a963076f1ab1d7에서 이 오류를 발견하고 needs_media로 보류하도록 수정했습니다.

원문 선별 화면은 자동 형식 선택, Instagram 4:5·3:4, 제목 크기·위치 직접 조절, 기존 폰트·프리셋을 지원합니다. 작업 정보/editorial-plan.json의 실제 사용 영역·분할 좌표를 지정할 수 있습니다. 규칙 변경과 계획 변경은 캐시 무효화에 포함됩니다.

sourcePublishedAt, sourceCheckedAt, collectedAt, generatedAt을 구분합니다. 원문 게시일을 임의로 수집일로 채우지 않습니다. 검수와 실제 게시 상태도 별도입니다.

## 실제 PC와 저장소

| 용도 | 위치 |
|---|---|
| 프로그램 저장소 | https://github.com/kimjae134679/Threads |
| 안정 코드 폴더 | C:\KJ\Github\Threads |
| 사용자 전체 자료 | C:\Users\user\Desktop\Threads Cut Editor 자료 |
| 바탕화면 바로가기 | C:\Users\user\Desktop\Threads Cut Editor.lnk |
| 현재 실행본 | 자료\03_배포 설치파일\현재 버전\Threads-Cut-Editor-0.3.3-Windows-x64\Threads Cut Editor.exe |
| 실제 입력 | C:\Users\user\source\repos\Threads-program-inputs\data\runtime\program_inputs |
| 최신 결과 | 자료\06_자동 제작 결과\현재 결과\제목__ID |
| 상태 목록 | 자료\06_자동 제작 결과\status.json·status.csv·자료 목록.html |
| 이전 Known-Good 실행본 | 자료\03_배포 설치파일\현재 버전\Threads-Cut-Editor-0.3.1-Windows-x64 |
| 주 소통 기록 | project-operations-hub/04_COMMUNICATION/threads/T-0008-ai-content-monetization/THREAD.md |

01_후보 기록은 Junction입니다. 실제 원본을 삭제하거나 이동하지 않습니다. 원본 1,084건과 AAA 레퍼런스는 보존했습니다. runtime·제3자 이미지·캡션·로그인 정보는 공개 Git에 넣지 않습니다. 입력 checkout은 별도 저장소가 아니라 Threads의 다른 checkout입니다.

기존 바탕화면 실행 동선과 C:\KJ\Github\Threads를 유지한 설치 위치 예외입니다. C:\Program Files\_My\AI로 이유 없이 기존 안정 프로젝트를 옮기지 않았습니다. 새 의존성·유료 도구 설치는 없습니다. 격리 개발 checkout은 Codex 회차 작업 폴더에서 만들었습니다.

허브 원본 checkout은 PhoneLoL 작업 브랜치를 보존합니다. 관련 문서만 별도 checkout의 최신 main에서 갱신하며 reset하지 않습니다. 이 문서에 일시적인 PID나 자기 자신의 커밋을 고정하지 않습니다.

## 검증과 한계

64개 회귀 suite, 실제 Electron 원문 선별·자동 제작 UI smoke, 설치 실행본의 version=0.3.3 / rule=2026-10-04.3 / 이미지 분석·형식 선택·수동 제목 조절 로딩이 통과했습니다. 전체 398건·3,209장의 텍스트 보존·이미지 연속성·크기·범위·URL 제외·PNG 해시 감사 오류 0입니다.

보류는 원문 176, 접근 422, 주소 56, 이미지·영상 15, 선별 12, 소재 제외 5입니다. 이번 전체 처리는 저장 원문만 사용했으며 네트워크 보완을 새로 수행하지 않았습니다. 안전한 분할 경계를 찾지 못한 6건은 선별 12건에 포함됩니다. 이런 자료를 임의로 잘라 제작 완료로 처리하지 않습니다.

최종 ZIP SHA-256: 44958d6d97cc1bfe9a8d909a26b33cd34febb897b7b4948253389fc0acdf45b4. 배포 앱의 주요 ASAR 코드와 렌더러는 검증 코드와 바이트 일치합니다. root 웹 앱 버전과 desktop 실행본 버전은 별개입니다.

로컬 sandbox의 py 런처는 설치 Python을 찾지 못했습니다. 연결된 실제 Windows 사용자 환경에서 전체 suite를 실행해 통과했습니다. PowerShell 파일에 한글 경로가 있으면 Windows PowerShell 5용 UTF-8 BOM을 사용합니다. GUI 실행본은 Start-Process -Wait로 종료 코드를 확인합니다. 숨긴 창의 capturePage는 UnknownVizError가 날 수 있어 실제 창을 표시한 뒤 캡처했습니다.

## 레퍼런스 근거와 다음 작업

전체 자료 ZIP은 인스타_레퍼런스_전체자료_2026-10-04.zip입니다. 7계정×6게시물=42건, 원본 이미지 200파일/193서로 다른 SHA, 전체 장 확보 40건·부분 자료 2건입니다. 별도 관찰 영상 프레임 1장과 AAA 원본 22장도 구분합니다. humor_saul은 접근 불가였으며 humor_ssul과 같은 계정으로 취급하지 않습니다. 미전달 1탭 URL을 임의로 만들지 않습니다. 모든 200 원본의 SHA를 재확인했습니다.

reference-production-rules.json은 분석 때의 제안 문서이며 런타임 설정 파일이 아닙니다. 구현된 규칙은 실제 app/source-page-plan.js와 desktop/folder-batch.cjs입니다.

후속 작업은 실제 생성 이미지에서 읽기 순서·모바일 크기·마지막 장을 확인하고, 보류 자료의 원본과 사용 영역을 확보하는 것입니다. 원본 좌표를 실제로 읽어 editorial-plan.json에 근거를 남깁니다. 실제 게시·권리·개인정보·성과는 04_REVIEW_PUBLISH와 05_EXPERIMENTS_ACCOUNTS에서 별도 승인·기록합니다. 자동 게시하거나 P1을 올리지 않습니다.

검정 배경·노란 말풍선 원본에서 사진 오인을 확인하고 평탄 배경과 반복 글줄 근거가 있을 때 캡처로 분류하도록 고쳤습니다. 픽셀 분석 버전은 2026-10-04.4입니다. 바깥 여백도 행·열 전체가 공백일 때만 줄여 희미한 끝 문자를 보존합니다. 원문 ZIP·PNG 해시·본문 전체·이미지 연속성·가로 경계·PNG 높이를 실제 파일로 검사합니다.


## 대화와 자료의 비공개 백업

2026-10-05 KST, 사용자가 다른 대화 백업을 요청해 제공한 9개 링크의 추출 텍스트를 보존했습니다. 이 중 게시글 수익화_02와 _03은 아래 파일로 바로 읽을 수 있습니다.

- [게시글 수익화_02 추출본](https://github.com/kimjae134679/KimJae-Project-Backups/blob/main/conversations/05-threads-02.md)
- [게시글 수익화_03 추출본](https://github.com/kimjae134679/KimJae-Project-Backups/blob/main/conversations/07-threads-03.md)
- [대화별 상황·전체 백업 범위](https://github.com/kimjae134679/KimJae-Project-Backups/blob/main/BACKUP_STATUS.md)
- [원래 전달한 대화·레퍼런스 ZIP과 관련 파일 백업](https://github.com/kimjae134679/KimJae-Project-Backups/releases/tag/snapshot-20261005-remaining)

비공개 계정 권한이 필요합니다. 키·토큰을 제외했으며 대화 원문을 공개 Threads 저장소에 복제하지 않았습니다. 공유 추출본은 실제 모든 채팅 첨부나 미제공 대화의 전체 내보내기와 같지 않습니다. 게시글 수익화_01의 별도 원문은 제공 목록에 없으므로 전문 보존 여부는 미확인입니다. 이번 백업 정리에서 앱 기능·원본 자료·제작 결과를 변경하거나 실제 게시하지 않았습니다.
