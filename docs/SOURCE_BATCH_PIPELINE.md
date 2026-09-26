# 원문 일괄 수집·이미지 변환 — 2026-09-27

## 현재 연결

npm start 후 http://127.0.0.1:4173/app/source-batch.html 을 엽니다. 원본 폴더 선택에서 저장된 HTML, 원문 그대로의 TXT/JSON, 같은 폴더의 첨부 이미지를 한 번에 선택하고 결과 저장 폴더를 고릅니다. Chrome/Edge의 폴더 저장 기능을 쓰면 한 건씩 ZIP을 기록해 큰 작업도 순차 진행합니다. 중지하면 처리 중인 한 건이 끝난 뒤 멈춥니다. ZIP마다 원본 파일, 원문 제목·본문·선별 댓글, 원본 이미지, 변환 PNG, manifest를 함께 저장합니다.

TXT 입력은 [TITLE], [BODY], [COMMENTS] 섹션을 사용합니다. 본문 내 이미지 위치는 [IMAGE:파일명] 한 줄로 표시하고 그 파일을 같은 폴더에 둡니다. 댓글의 공개 좋아요 수가 있으면 [+123] 댓글 원문 형식으로 기록합니다. 댓글이 없음을 확인한 경우에만 [COMMENTS] 아래 NONE을 적습니다. JSON은 schema=threads-verbatim-source-v1, title, body, verbatim=true, comments 배열, 댓글이 없음이 확인되면 commentsStatus=none 을 사용합니다.

HTML은 저장된 게시글 본문 DOM에서 텍스트·이미지 위치와 인기 반응 수치를 추출합니다. HTML DOM과 실제 화면의 공백·줄바꿈이 다를 수 있으므로 자동 제작 이미지는 만들되 needs_verbatim_check로 표시합니다. 본문 이미지가 폴더에 없으면 needs_media, 인기 댓글의 점수/베스트 근거가 없으면 needs_comment_ranking, 댓글 유무를 확인할 수 없으면 needs_comment_check입니다. 원문과 대조된 TXT/JSON·필요 이미지·댓글 상태가 충족되고 PNG가 생성된 경우에만 converted입니다. URL만 담은 기존 후보 요약이나 Jev 점수는 원문처럼 취급하지 않습니다.

이 단계의 변환은 로컬 파일 제작입니다. C/A/P 등급과 게시 승인·실제 게시를 변경하지 않습니다. 원문 전문과 이미지 바이트는 ZIP에만 두고 GitHub에는 업로드하지 않습니다. 파일에 없는 사실이나 댓글을 만들어 채우지 않습니다.

## 기존 저장소 정리

data/_system/source-material-inventory.json은 2026-09-25 00:17 KST의 main 커밋 8f959cef의 경로를 기준으로 전부 분류한 경로 인덱스입니다. 본문 검증이나 변환 완료 목록이 아닙니다.

| 구분 | 수 | 처리 |
| --- | ---: | --- |
| 기존 후보 Markdown | 1,570 | 원본/이력 보존, 원문 없는 것은 needs_source |
| Discovery 보조 후보 메모 | 13 | 기존 후보와 중복 가능성 표시 후 대조 |
| 과거 원자료 묶음 | 31개 파일 | 원본 이력으로 보존, 정리본의 대체 원문으로 사용 금지 |
| Demo/field-test 메타 | 5개 파일 | 실제 후보·게시 성과와 분리 |
| Jev 평가 JSON | 953 | 후보 판단 참고값으로만 유지 |
| 100개 묶음 | 13 | 생성된 색인으로 유지, 원문 대체 금지 |
| Discovery 정리 폴더 | 12 | 내용·이미지·댓글 실물 검증 필요 |
| 이전 정리 폴더 | 9 | 중복 ID를 같은 소재의 별도 버전으로 표시 |
| 임시 제작 폴더 | 35 | 테스트 기록으로 격리, 실제 변환 완료 수에 넣지 않음 |
| 기존 Source Package 폴더 | 1 | 자산 이력 보존, 이번 변환과 구분 |

두 위치의 정리 폴더는 21개이지만 중복 ID blind-cn6hnlfx, blind-ftu7d1tv, inven-3290621이 있어 고유 ID는 18개입니다. 앞선 handoff의 “19 unique”와 실제 트리 숫자가 일치하지 않으므로 ID 연결을 재검토합니다. 기존 파일 삭제·이동·상태 승격은 하지 않았습니다. 인덱스 확인: node scripts/inventory-existing-materials.mjs. 재생성: node scripts/inventory-existing-materials.mjs --write.

## 검증 범위와 남은 연결

핵심 분류·인기 댓글 순위·원문 TXT 파서 검사: node --test test/source-batch-core.test.mjs. 실제 Chrome/Edge 대량 폴더 저장과 사이트별 HTML 구조·첨부 이미지 다운로드는 사용자 환경에서 검수해야 합니다. 저장 HTML에 연결된 외부 이미지는 HTML만으로 확보하지 못하므로 같은 폴더에 넣어야 합니다. URL만 넣으면 HTML·이미지·댓글을 자동으로 저장하는 연동과 PR #1의 Windows 화면 통합은 아직 없습니다. 새 경로는 페이지 스크린샷 대신 텍스트와 원본 이미지를 카드로 그립니다.

기존 후보·보조 메모 1,583개를 data/_system/source-work-queue.json에 대기열로 기록했습니다. Jev 파일명 연결은 953건, manifest의 명시적 legacyCandidate 경로로 연결된 정리 폴더 기록은 6/21건입니다. 나머지 15개 폴더가 무관하다는 뜻은 아니고 명시적 경로 연결이 없어 재대조가 필요합니다. 변환 완료로 확인된 건수는 0입니다. 대기열 확인: node scripts/build-source-work-queue.mjs. 갱신: node scripts/build-source-work-queue.mjs --write.

기존 1,570개 중 정확한 원문과 이미지·댓글 데이터가 없는 항목은 이 프로그램을 돌려도 converted가 되지 않습니다. 이미 수집한 후보를 순차 재확인해 원문 TXT/JSON과 원본 이미지를 채우고 ZIP 상태를 검수한 뒤에만 변환 완료 수로 셉니다.
