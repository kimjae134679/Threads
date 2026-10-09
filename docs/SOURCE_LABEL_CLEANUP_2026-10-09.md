# 실제 표지 제목의 출처 태그 제거

이 변경은 03_PRODUCTION의 표지·표시 제목·캡션 제작 입력에 한정한다. 원문 제목·본문·출처 URL·권리·생성 기록은 내부에 그대로 보존한다. `[ 깨끗한 제목 ]` 형식의 사용자 캡션 제목과 일반 문맥의 `판`, 설명 괄호는 제거 대상이 아니다.

기존 titleInfo가 출처를 분리해도 설치 제작기가 원문 제목으로 coverHtml을 호출해서 `(블라인드)`, `[네이트판]`, `[판]` 등이 실제 PNG에 남았다. 공유 titleInfo를 일반 렌더러·설치 제작기·리뷰 목록이 함께 소비한다. 반복되는 알려진 출처/분류 접두어와 출처 접미어만 분리한다. 소스 태그를 포함한 강조·수동 줄바꿈은 정제된 전체 제목으로 재검증하고 필요한 경우 다시 계산한다.

- 현재 사용자 이미지 표지 199개 중 영향받은 23개만 실제 설치 프로그램으로 재제작한다. 나머지176개와 이미지 대기166개는 보존한다.
- 승인된 `.6` 제목 배치와 70% 음영을 유지한다. 정제된 제목 전체를 사용하므로 대상23개의 글자 크기/줄바꿈은 내용에 맞춰 다시 계산한다.
- 렌더러 버전 `2026-10-09.10`, 별도 설치 `0.3.37-cover.20261009.10`. 이전 `.9`199개 제작 이력과 설치본은 유지한다.
- fingerprint는 원문/정제 제목, 강조·줄바꿈, 실제 자산·생성기록·폰트 해시, 설치 런타임과 레시피를 포함한다.
- 현재 결과 등록은 canonical writer 잠금 아래 해당23개 폴더만 복구 가능하게 이동한다. 같은 리뷰 회차, 원문 ID, 원문 ZIP, 본문 PNG, 평가/진행 기록은 유지한다. 신규 outputVersion만 별도 검토 대상이다.

제작 요청/완료/등록/검증 증거: `C:\Users\user\Documents\Codex\2026-10-08\task-16\source-label-cleanup-20261009`. 원본 표지 보관: `D:\A_KJ\AI\Projects\Threads\자료\05_이전 작업\표지 개별 수정\source-label-cleanup-20261009`.

업로더의 기존 입력은 `자료/06_자동 제작 결과/status.json`과 글별 `production-plan.json`이다. 표시 및 캡션 생성에는 plan.coverTitle 또는 plan.captionInputTitle을 사용한다. raw row.title/plan.originalTitle은 정체성과 내부 근거로 보존한다. 기존 캡션이 없는 제작물에 캡션을 만들었다고 기록하지 않는다. 업로더의 버전 계약은 post-review-store.version(row)의 reviewRound 포함 해시와 일치해야 실제 버전 평가를 연결할 수 있다. 업로더 별도 작업자의 코드·계정·설치는 수정하지 않는다.

관련 검증: production-display-title, cover-reproduction-request, cover-typography, image-composition, post-review-store. 공유 렌더러가 production-title.cjs를 패키지에 포함하는지도 검증한다.

## 입력 정리 재발 방지

사용자 정정에 따라 렌더 직전 제거뿐 아니라 원문 가져오기 manifest/index, 후보 읽기, HTML·정확한 텍스트·저장 이미지 초안, 원문 ZIP 작성, planBundle 입력에 originalTitle/displayTitle/captionInputTitle을 확정한다. 기존 준비자료199개에는 원본 manifest·본문·source ZIP을 수정하지 않고 작업 정보/title-input.json과 제목 입력 인덱스를 파생 계약으로 남긴다. 현재 status199개에도 동일한 표시/캡션 입력 필드를 추가하되 outputVersion 구성 요소는 그대로 유지한다. 새 자료를 수집하지 않는다.

23개 실제 PNG는 `.37` 설치 런타임으로 생성했다. 입력 재발 방지를 포함한 최종 리뷰/제작 프로그램은 별도 `.38` 설치본이며 동일한 typography `.10`을 소비한다. 실제 출력 해시를 바꾸지 않는 입력 메타데이터 정리도 canonical writer 아래 백업·버전 보존 검사를 거친다.
