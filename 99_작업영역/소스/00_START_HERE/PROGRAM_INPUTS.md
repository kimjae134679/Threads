# 프로그램 자료 사용 안내

## 현재 입력과 실행

현재 C 사용자 진입점과 D 보존·연결 설치본 `0.3.40-studio.20261117.4`/화면 이동은 [사용 안내](../프로젝트_사용안내.md), 실제 집계·검증은 [현재 인수인계](NEXT_RUN_HANDOFF.md)를 따릅니다. 현재 출력/읽기 canonical은 후보 하나의 **단일 TXT**입니다. 파일명 원키·기존 ID는 유지하고 원 MD와 같은 후보를 이중 집계하지 않습니다.

사람 영역의 원문 링크·정리한 표시제목·내용·Instagram/Threads 실제 전체 문안+태그와, 후행 기존 codec JSON을 같은 파일에서 읽습니다. 필드/권리·C/A/P·형식은 [데이터 계약](../data/README.md)이 단일 권위입니다. 원제·원 URL·본문/댓글·이미지 순서·SHA·출력 버전·reviewRound·unknown을 손실 없이 보존하고 미확보/요약/선별 기록을 전문 검증으로 승격하지 않습니다.

| 범위 | 의미와 실제 위치 |
| --- | --- |
| 공개 후보 2,361 TXT | C 소스의 `data/candidates/`. 당시 변환 baseline 2,350 + 2026-11-17 신규 11이며 원문 전문 확보·제작 승인 수가 아닙니다. 당시 780 수집 ledger와 전체 파일 수를 구분합니다. 신규 11은 summary·권리 미확인, 사진 URL 3개만 기록(파일 확보/픽셀 확인 아님)입니다. |
| 비공개 프로그램 입력 2,168 TXT | 원 runtime 1,084와 production 입력 사본 1,084의 각각 보존 입력. `local-private/project/자료`, `local-private/production-inputs`의 정확 mapping을 사용합니다. 2,168개를 새로운 독립 사연 수로 세지 않습니다. |
| 저장 원문 HTML 862 | 위 두 입력 범위의 원 HTML 바이트·인코딩·SHA·상대 매체 순서를 typed sourceDocument로 보존합니다. 앞 읽기용 본문은 `preserved`이며 전문/OCR/권리 승인과 다릅니다. |
| 참고 기록 1,306 | 원문 전문 없는 상태를 유지합니다. summary/preserved 노트를 원문 제작 입력으로 승격하지 않습니다. |
| 수동 문안 1 TXT | 저장된 실제 Instagram 전체 문안/태그와 기존 postId/outputVersion/사진 binding만 보존. 원문/Threads 문안 미확보나 새 승인 여부를 추정하지 않습니다. |
| 현재 199 / 과거 365 리뷰 / 평가 이력 | 서로 다른 범위. `local-private/operating-studio/` 및 project 자료 사본의 원바이트를 보존하고 같은 버전이 아닐 때 과거 평가로 표시합니다. |

당시 단일 TXT 변환 **4,519 = 공개 2,350 + private 2,168 + 수동 1**과 약 83.46GB 보존 기록은 이관 당시 수치입니다. 신규 11을 이 과거 변환 실적으로 소급하지 않습니다. 실제 private 원본은 D 운영루트의 제외 영역에 보존·연결하고 공개 코드·허용 기록만 Git으로 관리합니다. 현재 revision 169·개인 평가·원본 패킷을 보호하며 실제 작업물 준비 집계는 [인수인계](NEXT_RUN_HANDOFF.md)의 확인 시점을 따릅니다.

`/materials/`는 자료 카탈로그, `/`는 같은 글/버전 문안·검토, `/viewer/`는 정확 mapping이 연결된 현재 이미지를 봅니다. 문안과 태그는 각각 복사할 수 있지만 파일 저장은 한 TXT입니다. 오프라인 실파일의 양 플랫폼 문안은 같은 TXT와 글별 보기 HTML에서 확인하며, 미적용 수정초안과 현재 저장본의 판정을 구분합니다. 라이선스·프롬프트·원문 댓글·계정/provider 이력을 게시문안으로 일괄 합치지 않습니다.

기존 분리 reader는 호환/이력 목적으로 남습니다. `source/` 원 HTML/TXT/JSON, `media/`, `manifest.json`, `작업 정보/`, `참고 기록/`의 원데이터는 삭제하거나 주기적으로 정규화/import해서 현재 평가로 덮어쓰지 않습니다. 같은 프로젝트의 typed 경로 mapping·SHA·CAS를 사용하며 모든 JSON 문자열의 절대경로를 일괄 치환하지 않습니다.

예전 바탕화면/0.3.1 자동 제작·2026-10-04 결과 숫자와 분리 파일 설명은 [6d5016d1 당시 입력 안내](https://github.com/kimjae134679/Threads/blob/6d5016d1ab3f9df2cd77efd18fbfce6aaddfd9f2/00_START_HERE/PROGRAM_INPUTS.md)에 보존합니다. 더 자세한 원문 형식은 [COMMUNITY_SOURCE_INPUT](../docs/01_사용방법/커뮤니티_원문입력.md), 마이그레이션/패키지 기술은 [루트 README](../README.md#통합-프로젝트-실행--단일-자료-txt)를 봅니다.

## 글별 수정초안 — 현재 저장본과 분리

수정 원고는 운영 저장루트의 private `writing-drafts/<postId SHA>/<현재 basis SHA>/<TXT SHA>.txt`와 64자리 SHA `latest`로 보존합니다. 형식은 같은 unified-material TXT이며 `records.post`와 `records.material`, 원문/bodyKind·원기록·원문 ZIP·이미지 순서/SHA는 현재 export 그대로입니다. `records.caption`만 기존 글 편집 patch이고, 사람 영역의 양 플랫폼 문안은 그 patch를 메모리 사본에 적용한 `finalCaption`과 일치해야 합니다. `publicationAuthorized=false`는 그대로입니다.

허용 patch는 `caption/platform_captions/tags/common_tags/topic_tags/threads_topic_tag`뿐입니다. `common_tags`의 기존 후보 enum을 늘리지 않습니다. 사연 초안은 글별 `common_tags:[]`로 옛 공용 태그를 빼고 `tags`에 `#썰 #사연`(필요시 직접 관련 태그 1개), 기존 `topic_tags`의 내용 태그 2개로 최종 4~5개를 준비합니다. 정보형은 공용 사연 태그를 강제하지 않습니다. 전역 공용 태그 저장을 호출하거나 표지·원제·이미지·권리·평가·계정 필드를 초안으로 바꾸지 않습니다.

`GET /api/writing-drafts/<postId>`는 현재 글/전체 snapshot·출력 버전·material fingerprint·원문 해시와 일치하는 초안만 읽습니다. 작업대의 **수정초안**은 기존 문안과 분리한 전체 문안·태그를 보여 주며 닫기/글 이동/앱 재열기로 자동 적용되지 않습니다. 사람이 **이 글에 적용**을 누를 때만 `POST /api/writing-drafts/apply`가 초안 SHA·현재 revision/basis를 잠금 안에서 다시 확인하고 기존 domain 편집·이력·재검토 흐름을 사용합니다. 글별 공용 태그도 이력/되돌리기에 포함하며 옛 snapshot에 없던 값을 추측 복원하지 않습니다. 초안 저장/읽기는 현재 판정·점수·승인을 바꾸지 않고 명시 적용도 새 게시 승인이 아닙니다. 저장 시 원 snapshot 전체를 fresh export와 대조합니다. 읽기/적용 시 material.revision과 sources의 현재 전역 revision·순환 backup 복사본 관측목록은 원문 basis가 아닙니다. 그 과거 관측값은 TXT에 그대로 남기고, 실제 글 전체/글별 revision·ID/버전/fingerprint·현재 source 위치·원문 ZIP/본문/매체 해시는 계속 정확히 검증합니다. 따라서 다른 글 편집만으로 남은 초안이 무효화되지는 않습니다. 읽기 전용 inspection에서는 저장/적용을 거부합니다. 실제 운영 초안의 작성·내보내기 집계와 확인 시점은 [현재 인수인계](NEXT_RUN_HANDOFF.md)를 따릅니다. 초안 저장·재열람·파일 복사를 현재 글 적용이나 권리·게시 승인 완료로 세지 않습니다.
