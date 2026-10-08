# 제목·줄바꿈·본문 고아줄 대표 수정 인계 — 2026-10-08

최종 전달 상태: 브랜치 `codex/content-wrap-20261008`, 기준 전체 SHA `373812befa7f2669eef608083133dc6bf313daba`. 변경은 아래 코드 10개·테스트 7개·이 문서 1개, 총 18개 파일이다. 실제 설치/전체 회차 적용은 하지 않았다.

최종 `npm run check`는 JavaScript 276개 구문 검사와 95개 테스트 묶음이 통과했고 종료 코드 0을 확인했다. 로그는 `../check-delivery.log`이다. 제거한 출처를 강조 문구로 전달할 때 legacy 제목이 잘리는 문제까지 수정했고, 독립 검토자의 재현 및 회귀 검증에서 남은 중요 결함은 없었다. Square 실제 렌더 14개, compact/legacy 24개와 안전 보류도 통과했다.

공유 파일 조정: `desktop/universal-cover.cjs`의 다른 작업자 editorial 분기와 이 변경의 제목 메타데이터 분리를 함께 보존해야 한다. `desktop/package.json`에는 `title-layout.cjs` 패키지 포함만 추가했으므로 UI 작업의 버전/포장 수정과 합쳐야 한다. 이미지 입력 계약 브랜치 `codex/image-requirements-20261008`의 `dc9a4f57300af1d07fcbdb84af08e6ec0e8e1785`는 병합하지 않았고 `desktop/batch-input.cjs`, `desktop/batch-render.cjs`, `desktop/folder-batch.cjs`도 수정하지 않았다. 실제 Git 충돌 마커는 없으며 최종 통합은 부모 작업에서 조율한다.

03_PRODUCTION 표현/렌더링만 수정. 실제 원본/리뷰/과거 점수 보존. 현재 회차나 설치본 교체 없이 대표 7글·37장만 생성했다. 전체 365글·3073장 적용 완료를 뜻하지 않는다.

## 최신 실파일 평가

review-20261008-square-complete, 18건, updatedAt 2026-10-08T13:25:27.979Z; 수정시각 2026-10-08T13:25:27.982Z. 모든 글 ID/제작버전/원래 점수/메모는 C:\Users\user\Documents\Codex\2026-10-08\task-14\representative-output-reviewed/latest-evaluations.json. 안내 문서의 universal-temp/빈 평가는 현재 실파일보다 오래됐다. 새 평가 점수는 만들지 않았다.

직접 실패: source-ac6fc8b1f1829c, outputVersion e2822a9945510f8dc7914d149007004ee5a47f475367e0eb3c8d0a742bf10748, 3점, 메모 “산 개더러움 이란 글씨가 혼자 따로놂”. 이전 5번째 장 한줄을 재현했고 새 마지막 장에는 앞 설명 2줄과 끝문장이 함께 있다. 4번째 장의 원본 이미지 전체 영역은 유지했다.

직접 실패: source-842a63b3d248fb, outputVersion 1450720908641daaf549519f65ad2844bee699f716aa6ef133bcedc46a7daeea, 점수 null, 메모 “(네이트판) 쓰지말랫지”. 끝의 출처표시도 경계 메타데이터로 분리하고 표시 제목에서만 숨겼다.

실제 경계 실패: source-7b6661b6a2156b 최장 제목, 평가 없음. 이전 정사각 표지가 “보장된다면”을 된/다 경계에서 나눴다. 새 표지는 88px, 단어 내부 경계 0, 전체 제목 문자 보존. 기존 코드가 원덬이 앞부분/파일 확장자/장문 표기를 임의 삭제하던 동작도 제거했다. 사이트표시만 경계에서 숨기며 (사이다!), 후기, .jpg 등 실제 내용은 보존한다.

현재 7개 표본에서 크롭과 마지막 단일 글자 외톨이는 실제로 재현되지 않았다. 크롭 원인을 꾸며 기록하지 않는다. 수정 출력은 실제 glyphBoxes가 모두 안전 여백 내에 있고, 300자 공백 없는 제목은 단어를 나누거나 축약하지 않고 보류하는 실제 Electron 검증을 통과했다. 한글 단어 사이에서만 제목을 나누고 필요한 경우 크기를 낮춘다. 본문 긴 문단 페이지 분할에는 마지막 2줄 연결 규칙, 이미지 뒤 짧은 끝문장에는 앞 설명 이동 규칙을 적용한다.

## 대표 출력

| 글 ID | 장수 | 제목 단어 내부 분리 | 기존 평가 |
|---|---:|---:|---|
| source-ac6fc8b1f1829c | 5 → 5 | 0 → 0 | 3 (이전 제작본) |
| source-842a63b3d248fb | 10 → 10 | 0 → 0 | 없음 (이전 제작본) |
| source-ea281a867a852a | 2 → 2 | 0 → 0 | 6 (이전 제작본) |
| source-b0ada7acfec56a | 4 → 4 | 0 → 0 | 6 (이전 제작본) |
| source-80ff8e745aa9c8 | 9 → 9 | 0 → 0 | 8 (이전 제작본) |
| source-c17a46580b99ba | 2 → 2 | 0 → 0 | 없음 (이전 제작본) |
| source-7b6661b6a2156b | 5 → 5 | 1 → 0 | 없음 (이전 제작본) |

비교 화면: C:\Users\user\Documents\Codex\2026-10-08\task-14\representative-output-reviewed/index.html. 각 글 폴더의 rendered/slide-*.png, production-plan.json, comparison.json. 320px 결과 small-*.png 및 visual-review.json. manifest.json에는 원본 ZIP SHA, 모든 대표 입력/PNG의 보존 SHA, 원문·댓글·이미지 연속 감사가 있다. 적용 대상은 application-targets.json: 대표 실제 생성 ID 7개, 경계 사이트표시 후보 12개(현재 표지 문구 미검증인 후보), 전체적용 false.

## 코드 기준·충돌·검증

브랜치 codex/content-wrap-20261008, 작업경로 C:\Users\user\Documents\Codex\2026-10-08\task-14\content-wrap. 최초 조사 251ae0b 이후 현재 square 제작기 커밋 373812b로 우리 브랜치만 fast-forward했다. 다른 작업자 파일은 덮어쓰지 않았다. 리뷰 viewer source-cut-post-review.*는 diff에 없다.

수정: app/source-page-plan.js, app/universal-production-model.js, desktop/square-cover.cjs, desktop/square-cover-canvas.cjs, desktop/universal-cover.cjs, desktop/universal-cover-canvas.cjs, desktop/reflow-review-covers-run.cjs, desktop/title-layout.cjs, desktop/package.json, scripts/sync-title-layout.mjs. 테스트: test/content-title-pagination.test.mjs, test/content-layout-samples.cjs, test/source-page-plan.test.mjs, test/square-cover-render.cjs, test/compact-cover-render.cjs, test/title-reflow-compatibility.test.mjs, test/packaged-title-layout.test.mjs.

독립 검토에서 저장된 축약/재작성 제목과 원제목 불일치 2글을 발견했다. 자동 제작 preparePlan과 cover-reflow 모두 originalTitle을 우선한다. source-c17a46580b99ba의 “군대리아 최신 근황”을 복원했고, 이전 임의 제목 source-284ac09a545713은 “스몰 같지 않은 스몰웨딩 후기”가 정확한 원제목임을 확인했다(이 글 재제작/전체 적용은 하지 않았다). 숫자 경계 표본은 실제 원제목에 3천만원이 있는 source-80ff8e745aa9c8로 변경했다. 설치 폴더에 존재하지 않는 ../app require는 독립 title-layout.cjs로 대체하고 package whitelist에 포함했다. 라벨이 원문 설명과 떨어지던 추가 경계도 수정했다. 기존 수동 줄바꿈의 한 글자 줄은 자동으로 재배치하며 구형 legacy canvas에서도 단어를 분리하지 않는다.

충돌 주의: D:/A_KJ/AI/Workspace/Threads/cover-visibility-20261008-Sol의 desktop/universal-cover.cjs에는 미커밋 editorial 연결 변경이 있다. 이번 파일은 source-title 메타데이터 분리용 최소 수정이다. 부모 통합 때 두 변경을 합쳐야 하며 해당 체크아웃 복사/덮어쓰기 금지. 다른 코드·원본·브릿지큐·API·계정·결제·활성 리뷰·설치 변경 없음.

검증: 수정 전 새 회귀 테스트에서 출처 괄호표시/불필요한 제목삭제/단어규칙부재/이미지뒤고립 실패 확인. 재흐름의 출처표시 제목 거부도 RED→GREEN 확인. 설치 구조 테스트 성공. 대표 오프라인 Electron 제작 7글·37장, 원문·댓글·이미지 감사 성공, 원본·평가·진행·포인터 및 대표 원본 파일 SHA 보존. 320px gallery 가로넘침 false, 이미지 로드 true, 7표지와 Everest 연속 2장 직접 시각 검수. Square canvas 14경계, compact/사진형 24경계+legacy 안전보류 성공. 저장소 검사 로그 C:\Users\user\Documents\Codex\2026-10-08\task-14/check-reviewed.log, 실행 C:\Users\user\Documents\Codex\2026-10-08\task-14/representatives-reviewed.stdout.log. 독립 코드 검토는 추가 460 이미지/본문 경계에서 순서·원문·여백 손실 0을 보고했다.

중간 부모 스레드 메시지는 자동 승인 검토에서 “해당 수신처 승인 부족”으로 거절됐고 재전송하지 않았다. 이 문서와 최종 응답으로 인계한다. 전체 적용은 부모와 현재 리뷰 UI 작업 담당의 조율 뒤 별도 실행해야 한다.
