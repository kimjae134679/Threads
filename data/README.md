# Threads 후보 데이터 — canonical TXT와 원기록 계약

## 현재 파일

사람/프로그램이 읽는 canonical은 `data/candidates/`의 **후보 한 건당 단일 TXT**입니다. 변환 범위 **4,519 = 공개 후보 2,350 + private 프로그램 입력 2,168 + 수동 문안 1**과 입력 종류는 [PROGRAM_INPUTS](../00_START_HERE/PROGRAM_INPUTS.md)를 참조합니다. private 약 83.46GB는 `local-private/` 등 Git 제외 영역에 보존하며 공개 파일에 실제 비밀·평가·계정/provider·개인·대용량 자료를 싣지 않습니다.

기존 `YYMMDD_C{0|1|2}_A{0|1}_P{0|1}_제목.md`는 원기록/역사 형식입니다. TXT 전환도 원 파일 키·ID·alias·원 MD SHA/기록을 보존합니다. 같은 키/ID의 TXT·MD를 별개의 새 후보로 처리하거나 연구원의 임시 순번을 영구 ID로 만들지 않습니다. 활성 수집 780건은 보존 ledger 범위이며 후보 총 2,350개와 다릅니다. `_raw_batches/`·제외/과거 snapshot을 활성화하지 않습니다.

## 한 TXT의 실제 codec 계약

사람 영역은 다음 순서입니다.

```text
원문링크 - 정확한 원 URL
제목 - plain 표시제목
내용 - 실제 보존 원문 또는 명시 요약/보존 기록/미확보 상태
게시문안 - 실제 저장된 플랫폼별 전체 문안과 태그
==============================
프로그램용 데이터들
기존 codec JSON
```

실제 codec은 [app/unified-material-txt.js](../app/unified-material-txt.js)입니다. 뒤 JSON에는 원제·기존 ID/버전·sourceFingerprint/ruleVersion/reviewRound·raw 원문/댓글·이미지 순서/SHA/분할·권리/판정/provider 상태·unknown 필드를 손실 없이 남깁니다. 새 스키마나 가짜 상태를 발명하지 않습니다. BOM/CRLF·한국어·본문 속 헤더/구분선을 보존하고 손상·ID 충돌·다른 버전은 failclosed합니다. 후행 프로그램 JSON은 사람의 본문이나 게시문안으로 노출하지 않습니다.

- `verbatim`: 기존 원문 기록을 실제 계약으로 확인한 전문 입력. 수집/권리/게시 gate는 별개입니다.
- `summary`: 실제 읽은 범위의 충실한 요약. 전문을 확보/판독했다는 뜻이 아닙니다.
- `preserved`: 원자료·HTML/ZIP의 읽기용 본문 또는 선별/참고 기록. 원문 검증/OCR/권리 승격이 아닙니다.
- `unavailable`: 원문 미확보. 없는 내용을 채우거나 다른 버전 원문을 붙이지 않습니다.

미열람 URL·사진 href·다운로드 실패·HTML 선택 미확인·권리 unknown은 실제 원문/파일 확보 수와 분리합니다. 이미지가 본문인 자료는 전체 픽셀/순서 판독이 필요하며 독립 텍스트와 부수 이미지 미열람은 구분합니다. 권리 미확인/`publicationAllowed=false`를 새로운 TXT/요약/라이선스 링크만으로 올리지 않습니다. 원본 보존과 공개물의 개인정보 제거는 [SOURCE_POLICY](../docs/SOURCE_POLICY.md)를 따릅니다.

## C/A/P — 기존 의미 그대로

- `C0`: 제목/인덱스 lead. 정확한 개별 URL/provenance가 부족함.
- `C1`: 정확한 공개 원문 URL/provenance와 필요한 관측을 확인함.
- `C2`: production 후보로 선정. rights/privacy/human gate는 별도 유지.
- `A0`: 실제 source-backed 사용자용 asset 미생성.
- `A1`: 실제 source screenshot/image 기반 사용자용 결과물 생성 확인.
- `P0`: 미게시.
- `P1`: 04_REVIEW_PUBLISH가 실제 게시 성공을 확인한 경우만.

Queue·예약·dry-run·provider-ready·API 호출 의도는 P1이 아닙니다. 과거 lead/ASSETS_PENDING/평가/미승인 demo를 현재 완료로 소급 승격하지 않습니다.

## 형식 분류 — 기존 세 가지

- `글`: 텍스트 중심이며 콘텐츠 이해에 필요한 원문 이미지가 없음.
- `이미지`: 본문과 함께 이미지/사진/뉴스 캡처 등이 있음. 본문과 이미지 근거를 함께 기록.
- `이미지 포스팅`: 이미지/카드/슬라이드/스크린샷 자체가 본문의 중심. 원래 순서의 전체 확보/판독 여부 기록.

애매하면 실제 원문과 이미지 역할을 확인합니다. 추출 marker 0을 무사진 확정으로 쓰지 않습니다. CAROUSEL_SOURCE/NEWS_CARD_POST/SCREENSHOT_POST 같은 새 enum을 만들지 않습니다. 탐색 주제 코드/라벨은 실제 [themes](../app/features/themes/README.md)와 일치시키며 위 세 가지 자료 형식 enum과 구분합니다.

## 자료의 권위와 이력

원제·정확 URL·관측 시각/cache·수치는 개별 실제 관측값을 그대로 보존하고 다른 시점·재게시처 수치를 합치지 않습니다. 기존 요약/댓글 메모/Jev 평가는 원문 인용이나 현재 판정이 아닙니다. 내용·태그·선별은 [Discovery](../01_DISCOVERY/README.md), 제목은 [제목 가이드](../01_DISCOVERY/TITLE_STYLE_GUIDE.md), 승인/같은 버전은 [HANDOFF](../docs/HANDOFF_CONTRACTS.md)를 따릅니다.

원 MD 형식·분리 content/comments/manifest 생성 명령·폴더 지도는 [6d5016d1 데이터 계약](https://github.com/kimjae134679/Threads/blob/6d5016d1ab3f9df2cd77efd18fbfce6aaddfd9f2/data/README.md)에 그대로 보존합니다. 이 문서 정리 작업은 그 normalizer/import를 실행하거나 원자료·코드·현재 판정을 바꾸는 권한이 아닙니다. 실제 실행/현재 완료 집계는 [사용 안내](../프로젝트_사용안내.md)와 [인수인계](../00_START_HERE/NEXT_RUN_HANDOFF.md)에서 확인합니다.
