# Upload Studio handoff

별도 브랜치: feature/upload-studio-offline-20261009
검토용 Draft PR: https://github.com/kimjae134679/Threads/pull/10

## 실행
Node.js 24 이상. upload-studio/START.ps1 또는 저장소 루트에서 node upload-studio/server.mjs 실행 후 http://127.0.0.1:4387.
기본 제작 자료 경로 D:\\A_KJ\\AI\\Projects\\Threads\\자료. 다른 자료 폴더는 --material-root 또는 START.ps1 -MaterialRoot로 지정한다. 원본 제작/평가 파일은 읽기만 한다.

## 실제 구현
공통 긴 문안 편집, 첫 줄 [ 제목 ], 글마다 독립 플랫폼·시각·이미지 순서, Instagram/Threads 나란한 미리보기, 원본 ID·동일 버전 계산, 현재/과거 제작 평가 표시, 로컬 대기·승인·취소·중단·재시도·재시작 복구. 새 버전 자동 게시/대기 없음. 현재 게시 승인은 dry-run 전용이다.
출처 접두 정리는 title-normalization.mjs와 TITLE_NORMALIZATION_CONTRACT.md에 분리했다. 표지 작업의 공유 파일을 수정하지 않았다. 원제목/원출처/URL/ID/버전과 본문 인용은 보존한다.
기존 threads.mjs·instagram.mjs·publication-journal.mjs를 변경 없이 vendor에 보존하고 격리된 dry-run으로 재사용한다.

## 검증 증거
실제 Chromium 화면 3개는 evidence/에 있다. 캡처 커밋·테스트 자료 성격·외부 요청 0회는 evidence/provenance.json에 기록했다. 디자인 시안 PNG를 실제 화면 증거로 사용하지 않았다.
검증된 코드 60e4342e4188f8bf781536e5ba865f94663dc80e의 Node/저장소 check: https://github.com/kimjae134679/Threads/actions/runs/37931437796 (Upload Studio 38항목, 저장소 전체69 suites).
실제 브라우저 검증: https://github.com/kimjae134679/Threads/actions/runs/37931437809 (긴 문안1019자/재열기/미리보기/글별대상·로컬시각/대기검색·일괄취소/원제작읽기전용/미저장복구/CSP하실제크롭).
실행 ZIP: https://github.com/kimjae134679/Threads/actions/runs/37931437809/artifacts/11615993856 (artifact 안 upload-studio-portable.zip을 풀어 실행).
마지막 리뷰의 출처 접두 뒤 이미 괄호로 감싼 제목 예외도 별도 회귀 검사로 수정했고 최신 PR check에서 다시 검증한다. 중대 리뷰 지적은 남아 있지 않다.

## 확인하지 못한 부분과 다음 승인 대상
PC 실행 도구 실패로 D:의 실제 자료·기존 설치본·로컬 .agents/skills는 직접 재확인하지 못했다. 원격 저장소 AGENTS/04/contracts와 실행 지침 및 테스트용 제작 계약은 확인했다. 따라서 사용자 PC 설치/실제 자료 연결 성공을 주장하지 않는다.
이 결과는 계정 미연결의 작동 프로그램이다. 실제 게시, 외부 예약, 로그인/OAuth, 추가 권한·키·토큰 생성, 외부 이미지 전송은 실행하지 않았다. 비밀값을 읽거나 로그로 출력하지 않았다.
실제 연결을 별도 요청할 때 정확한 플랫폼·계정/Meta 앱·로그인 경로/최소 publishing 권한/필요한 앱 검토와 접근 수준/공개 HTTPS JPEG 저장 위치 및 공개 범위/권리/최종 게시 승인을 확인한다. Instagram 개인계정은 공식 게시 지원 대상이 아니며 프로페셔널 계정이 필요하다. 기존 Instagram 경로는 Facebook Page 연결을 요구하는 Facebook Login/Graph 방식이다. Threads 최소 범위는 threads_basic, threads_content_publish. 토큰은 서버의 안전 저장소에만 연결한다.
우선순위는 현재 이미지 콘텐츠의 Instagram 이미지·캐러셀, Threads 일반 본문·이미지다. 다른 플랫폼은 adapter 경계만 준비했으며 긴 텍스트 첨부/자동 분할은 구현하지 않았다.
