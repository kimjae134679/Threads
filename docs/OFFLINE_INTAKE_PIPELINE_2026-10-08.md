# 신규 원문 → 제작 → 새 리뷰 회차

이 명령은 로컬에 제공한 원문만 처리합니다. 다운로드·로그인·실제 게시·예약·AI 생성은 하지 않습니다. 01소재탐색 입력을 02검증선별, 03제작, 04검수 대기 등록까지 연결합니다. 05성과학습과 게시 승인은 사용자 판단입니다.

실행 예시(Windows PowerShell):

~~~powershell
& 'C:\Program Files_My\Necessary\Node.js\node.exe' 'D:\A_KJ\AI\Workspace\Threads\review-improvements-20261008-Sol\desktop\intake-pipeline-cli.cjs' --input 'D:\A_KJ\AI\Projects\Threads\신규 원문 입력' --work 'D:\A_KJ\AI\Workspace\Threads\offline-intake' --material 'D:\A_KJ\AI\Projects\Threads\자료' --electron 'C:\KJ\Github\Threads\desktop\node_modules\electron\dist\electron.exe' --activate
~~~

입력 경로는 실제 제공 원문이 있을 때 만드세요. 이 작업에서 빈 신규 폴더나 새 예약을 만들지는 않았습니다. --activate를 빼면 검증된 staging까지만 준비합니다. 같은 명령은 체크포인트를 읽어 재개하며, URL/내용 중복과 변경 없는 제작 결과를 건너뜁니다. 새 성공 결과가 없으면 현재 점수·메모·본 기록·회차 포인터를 그대로 유지합니다. 제작 오류 보류 재시도는 --retry-held입니다. --stop-after N은 안전한 중단·재개 검증 옵션입니다. --test-fixtures는 작업 폴더 안의 격리 리뷰 루트만 허용하며 실제 자료에 쓸 수 없습니다.

각 입력 하위 폴더에는 source.json과 필요한 media/파일을 둡니다. 입력·작업·실제 자료는 분리합니다. 최소 구조:

~~~json
{
  "schema": "threads-verbatim-source-v1",
  "verbatim": true,
  "title": "원제 전체",
  "body": "제공한 원문 전체",
  "comments": [],
  "sourceUrl": "https://example.com/original",
  "intake": {
    "schema": "threads-offline-intake-v1",
    "id": "new-source-id",
    "provenance": {"kind": "user_provided", "reference": "제공한 원본 파일/허가 근거"},
    "bodyStatus": "complete",
    "commentsStatus": "none",
    "rights": {"status": "user_owned", "evidence": "실제 권리 확인 근거"},
    "safety": {"status": "reviewable", "reviewedBy": "실제 검토자"},
    "media": [],
    "cover": {"variant": "paper"}
  }
}
~~~

위 권리·검토 값을 사실대로 작성해야 합니다. 허가 없는 공개 웹 원문은 제작하지 않습니다. provenance.kind=public_web, rights.status=unknown/reference_only인 경우 사용자가 제공한 referenceSummary와 원출처 포인터만 연구 후보로 보존합니다. 요약을 자동 만들어 빈 본문을 대체하지 않습니다. licensed_commercial은 실제 허가 근거를 요구합니다. 본문 부족·누락 이미지·안전 미검토·제작 오류는 각 원인과 원본을 남겨 보류합니다. 실패한 교체는 기존 제작물을 제거하지 않습니다.

이미지는 본문 독립 줄 [IMAGE:파일명.png]으로 위치를 지정하고 intake.media에 name/sha256/rightsStatus/evidence를 기록합니다. 사진 표지는 cover.variant=photo와 mediaName을 지정하고 같은 원본 매체의 권리·해시를 확인합니다. 새 사진/숫자/사건/반응은 생성하지 않습니다. 댓글은 제공 순서와 좋아요 0도 보존합니다. commentsStatus는 none/provided_subset/complete 중 실제 상태입니다.

원문/댓글/이미지 순서, 출력 PNG·ZIP 해시, 규격, 제작 규칙, 작업 중 원본 변경을 검증한 완료 글만 등록합니다. 디스크·권한·렌더러 오류는 실행 실패로 중단하며 새 회차를 활성화하지 않습니다. 제작·리뷰 교체 잠금과 점수/메모/진행/포인터의 CAS 검사를 사용합니다. 새 회차는 옛 평가를 별도 보존하고 점수·본 기록을 새 제작물에 복사하지 않습니다. 바뀌지 않은 글의 탈락·보류 결정은 이유와 이전 근거를 유지하며 안 본 적격 글 랜덤에서 제외합니다.

평가 화면: D:\A_KJ\AI\Launchers\Threads 게시글 평가.lnk
현 제작물: D:\A_KJ\AI\Projects\Threads\자료\06_자동 제작 결과\자료 목록.html
격리 실행 증거: qa-local/intake-e2e-20261008/final-lifecycle-proof.json (TEST_ONLY 자료)

앱 설치·통합 허브 등록·실제 버튼 검증·중앙 공유는 서로 다른 단계입니다. CLI 구현과 로컬 검증이 통합 허브 설치 완료를 뜻하지 않습니다.
