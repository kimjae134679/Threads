# 프로그램 자료 사용 안내

## 현재 입력과 실행

프로젝트 루트/START/.39.1/화면 이동은 [사용 안내](../프로젝트_사용안내.md), 실제 집계·검증은 [현재 인수인계](NEXT_RUN_HANDOFF.md)를 따릅니다. 현재 출력/읽기 canonical은 후보 하나의 **단일 TXT**입니다. 파일명 원키·기존 ID는 유지하고 원 MD와 같은 후보를 이중 집계하지 않습니다.

사람 영역의 원문 링크·정리한 표시제목·내용·Instagram/Threads 실제 전체 문안+태그와, 후행 기존 codec JSON을 같은 파일에서 읽습니다. 필드/권리·C/A/P·형식은 [데이터 계약](../data/README.md)이 단일 권위입니다. 원제·원 URL·본문/댓글·이미지 순서·SHA·출력 버전·reviewRound·unknown을 손실 없이 보존하고 미확보/요약/선별 기록을 전문 검증으로 승격하지 않습니다.

| 범위 | 의미와 실제 위치 |
| --- | --- |
| 공개 후보 2,350 TXT | `data/candidates/`. 원 MD·현재 780 수집 ledger와 파일 총수를 구분합니다. |
| 비공개 프로그램 입력 2,168 TXT | 원 runtime 1,084와 production 입력 사본 1,084의 각각 보존 입력. `local-private/project/자료`, `local-private/production-inputs`의 정확 mapping을 사용합니다. 2,168개를 새로운 독립 사연 수로 세지 않습니다. |
| 저장 원문 HTML 862 | 위 두 입력 범위의 원 HTML 바이트·인코딩·SHA·상대 매체 순서를 typed sourceDocument로 보존합니다. 앞 읽기용 본문은 `preserved`이며 전문/OCR/권리 승인과 다릅니다. |
| 참고 기록 1,306 | 원문 전문 없는 상태를 유지합니다. summary/preserved 노트를 원문 제작 입력으로 승격하지 않습니다. |
| 수동 문안 1 TXT | 저장된 실제 Instagram 전체 문안/태그와 기존 postId/outputVersion/사진 binding만 보존. 원문/Threads 문안 미확보나 새 승인 여부를 추정하지 않습니다. |
| 현재 199 / 과거 365 리뷰 / 평가 이력 | 서로 다른 범위. `local-private/operating-studio/` 및 project 자료 사본의 원바이트를 보존하고 같은 버전이 아닐 때 과거 평가로 표시합니다. |

`/materials/`는 자료 카탈로그, `/`는 같은 글/버전 문안·검토, `/viewer/`는 정확 mapping이 연결된 현재 이미지를 봅니다. 문안과 태그는 각각 복사할 수 있지만 파일 저장은 한 TXT입니다. 라이선스·프롬프트·원문 댓글·계정/provider 이력을 게시문안으로 일괄 합치지 않습니다.

기존 분리 reader는 호환/이력 목적으로 남습니다. `source/` 원 HTML/TXT/JSON, `media/`, `manifest.json`, `작업 정보/`, `참고 기록/`의 원데이터는 삭제하거나 주기적으로 정규화/import해서 현재 평가로 덮어쓰지 않습니다. 같은 프로젝트의 typed 경로 mapping·SHA·CAS를 사용하며 모든 JSON 문자열의 절대경로를 일괄 치환하지 않습니다.

예전 바탕화면/0.3.1 자동 제작·2026-10-04 결과 숫자와 분리 파일 설명은 [6d5016d1 당시 입력 안내](https://github.com/kimjae134679/Threads/blob/6d5016d1ab3f9df2cd77efd18fbfce6aaddfd9f2/00_START_HERE/PROGRAM_INPUTS.md)에 보존합니다. 더 자세한 원문 형식은 [COMMUNITY_SOURCE_INPUT](../docs/COMMUNITY_SOURCE_INPUT.md), 마이그레이션/패키지 기술은 [루트 README](../README.md#통합-프로젝트-실행--단일-자료-txt)를 봅니다.
