# 현재 안내 — 0.3.19 / 실제 전체 목록 작은 창 읽기 검증

현재365글·3073장과 review-20261008-paper-density 회차를 그대로 유지합니다. 평가·메모·본 기록·회차 포인터는 초기화하지 않았고 수정 전후 파일 해시가 같습니다. 표지/본문 PNG를 재제작하지 않았습니다. 작은창760×650(실제콘텐츠744×611)에서 단일본문386.8→616.8px, 세로읽기430→650px입니다. 기본으로목록을 접고 글 목록 열기/접기로 전체365글을 볼 수 있습니다. 원문 제목 전체 버튼으로 최장113자 원제를 클릭해 모두 확인합니다. 전체1084항목/365출력/3073PNG를 복사한 설치 사본과 격리 프로필, 실제 설치0.3.19 읽기 전용 실행으로 검증했습니다.

평가: D:\A_KJ\AI\Launchers\Threads 게시글 평가.lnk
비교·검증: D:\A_KJ\AI\Projects\Threads\자료\04_검수\2026-10-08_전체재제작검증\small-viewer.html

저장/공동잠금/회차전환 소스는 수정하지 않았습니다. 모바일 별도브랜치와 merge하지 않았고 PC자료 계약은 그대로입니다. 버전메타데이터는0.3.19이며 review userData는 기존0.3.18 경로를 유지합니다. 자세한 범위는 docs/FULL_COLLECTION_SMALL_VIEWER_2026-10-08.md. 아래는 이전 작업 기록입니다.

---

검증 증거: qa-local/full-viewer-small-20261008/snapshot-proof.json, before/full-viewer-layout.json, final-installed/full-viewer-layout.json, actual-install-proof.json. 격리 검사에서는 설치 실행 파일·UI리소스는 동일하고 검증용 audit와 userData 경로만 QA 사본에 계측했습니다. 실제 자료07/06/포인터 SHA를 보존했습니다. 소수 fixture 검증은 추가 회귀검사이며 전체 검증 근거는 위365글입니다.

변경코드: app/source-cut-post-review.html/.css/.js, test/review-paper-density.cjs. 설치버전: package.json, desktop/package.json, desktop/package-lock.json. post-review-store/review-release/atomic-file/mobile source 변경0. 표지 아래 여백은 추가 재제작 없이 디자인 선택 대상으로 남겼습니다. 통합소통 r5의 최신 앱 경로는0.3.19이며 요청/코드/설치/허브버튼/중앙공유 단계를 분리합니다.
