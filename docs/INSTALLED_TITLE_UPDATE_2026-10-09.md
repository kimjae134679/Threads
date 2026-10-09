# .3 설치본으로 새 표지를 출력하고 현재 리뷰에 연결

사용자 승인에 따라 제작 엔진을 `0.3.27-cover.20261009.3`으로 일반 업데이트했다. tracked 소스 커밋 `55ecc2eb209e819ca567f5c9dcf625daf65ee2da`를 별도 빌드 폴더에 git archive로 복사하고, 복사본의 package와 lock 버전만 구분했다. 로컬 Electron 44.4.3 / electron-builder 26.15.3으로 빌드했다. 기존 리뷰 코드나 다른 작업자의 미커밋은 변경하지 않았다.

설치 실행파일은 `D:\A_KJ\AI\Applications\ThreadsProduction\0.3.27-cover.20261009.3\Threads Cut Editor.exe`다. 제작 엔진은 내부 단건 실행용이며 사용자 진입점은 기존 최신 게시글 리뷰다. 편집기 바로가기를 추가하지 않았다.

실제 원문 입력의 복사본에 직접 지정한 `editorial.titleStyle`만 적용했다. 각 요청에 원본 입력 위치·글 ID·제목·URL·기존 출력 폴더와 별도 결과·작업 폴더를 고정했다. 사용자가 직접 요청한 이미 본 세 글은 대표 검증 허용으로 실행했으며 새 추천 소재로 공급하지 않았다.

설치한 EXE의 `--image-production-request=<절대 요청 JSON 경로>`가 세 작업을 새로 완료했다. 각 체크포인트에 `packaged:true`, 실제 `.3` 버전·EXE 경로·입력 fingerprint·완료 시각·출력 해시를 기록한다. 이전 PNG를 새로 만들었다고 재표시하지 않았다. 실제 새 PNG 세 개가 모두 이전 결과와 다르다.

본문 계획과 PNG 23장, source ZIP의 원본 파일 바이트를 검증했다. 기존 현재 결과 세 폴더는 `05_이전 작업/표지 개별 수정/installed-title-update-20261009`에 보관한 뒤 새 출력으로 교체했다. 현재 status/pointer는 동일 리뷰 회차에서 갱신했고 평가·열람 파일은 보존했다. 현재 저장소 재조회에서 새 출력버전·이미지 해시를 확인했다.

설치된 리뷰 0.3.25의 모듈을 별도 읽기 전용 검증 창에서 사용해 새 표지 세 개의 로딩 종료·제목·1080 크기·출력버전·PNG 해시를 확인했다. 사용자 실제 창을 조작하거나 점수·열람 상태를 바꾸지 않았다.

새 결과 보기: 자료 폴더의 `06_자동 제작 결과/최신 지정 표지.html`. 사용자 안내에는 리뷰 열기와 최신 결과만 제공한다. 낡은 QA 6폴더, 낡은 비교/보류/탈락 진입점 3개, 내부 과거 QA 14개는 복구맵과 SHA를 남겨 보관했다. 총 23개 항목·8,971파일, 영구 삭제 없음. 원문·생성 원본·평가·현재 출력과 canonical 리뷰 링크는 유지했다.

최소 검증: 제목/합성 테스트 23개 통과, diff check 통과, 패키지 모듈/리뷰 자산 SHA 일치, 실제 설치 EXE 출력 세 건, 현재 리뷰 데이터 재조회, 설치 리뷰 모듈 로딩 세 건. 새 AI 생성·전체 재렌더·예약·새 계정/키/결제/권한·외부 업로드는 실행하지 않았다.

근거는 task16의 `installed-explicit-title-update-20261009/installation-and-input-proof.json`, `current-review-proof.json`, 각 work/checkpoints, `review-latest-installed-update-20261009/proof.json`, `CURRENT_LIST_CLEANUP_20261009.json`에 보관한다. 새 참조 Library 픽셀 접근은 HTTP 403이므로 직접 지정 구절 요청 외의 참조 디자인 일치 검증은 보류한다. 사용자 생성 이미지가 도착하면 해당 PNG만 실제 글 ID·원문 URL·출력버전·SHA와 연결한다.
