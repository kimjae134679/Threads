# 다음 수집 지시 — 출처 다양화와 이미지 입력 v1

더쿠·뽐뿌·루리웹을 반드시 탐색 범위에 포함하고, 인벤 또는 한 사이트 재게시물만으로 후보를 채우지 않는다. 이 지시는 다음 수집 작업의 입력 계약이며 이번 작업에서 대량 새 수집을 실행하지 않는다. 사이트별 quota나 품질 점수를 임의로 만들지 않는다.

후보마다 정확한 개별 원문URL, 원제, 실제 읽은 본문 근거와 시각, 발견 사이트와 원출처 연결, stable sourceID/중복소재키, 사진·본문의 권리 상태를 기록한다. 검색결과/목록 URL이나 제목만 있는 자료는 확인한 본문으로 취급하지 않는다. 재게시 출처에서 원출처가 표시돼도 원출처를 직접 확인하지 못했다면 originalSourceUrl은 미확인으로 남긴다. 사이트가 다르더라도 같은 소재는 한 번 발견한 sourceId와 원문/내용 중복키를 연결한다. 자동 merge/delete와 이미 본 글의 반복 전달은 하지 않는다.

- 기존 manifest.id → imageRequirements.identity.sourceId (새 ID로 갈아끼우지 않는다).
- 정확한 URL → 기존 manifest.sourceUrl, imageRequirements.sourceUrl/identity.canonicalSourceUrl.
- 본문 읽기 → read.reference/sha256/excerpts/readAt, 미확인은 source_hold와 이유.
- 발견·원출처 경로 → 기존 manifest.platform, 선택적 collection.discoveredOn/originalSourceUrl/sourceChain.
- 실제 조회·추천·댓글 등 → collection.metrics[{kind,value,observedAt,reference}]. 모르면 항목을 생략한다. 순위/조회수만으로 품질을 판정하지 않고 qualityBasis=body_and_review를 유지한다.
- 권리 → shortage.originals[].rightsStatus/evidence 및 clearance. 공개=상업사용 가능으로 기록하지 않는다.
- 기존 본 기록 → 실제 검토 진행 entries의 id/seenAt/outputVersion을 identity.seenBefore에 연결. 점수나 메모를 본 기록으로 추정하지 않는다.
- 이미지 선택 → 관련 원문 이미지, 검토된 외부 이미지, 근거 있는 텍스트 없는 AI 프롬프트, 완성도 있는 글씨형 표지 순. 모든 글에 AI를 요구하지 않는다.

로그인·차단·약관상 금지 크롤링을 우회하지 않는다. 허용된 수동 읽기/공식 API/제공 캡처만 사용한다. 본문·이미지·댓글·반응을 읽지 못했으면 만들어 채우지 않는다. 새 API·인증·결제·계정 접근은 이 지시로 승인되지 않는다.

## 최신 실제 리뷰를 선별·수집에 적용

`docs/examples/image-requirements/review-guidance-evidence.json`은 실제 `자료/07_사용자 평가/평가 기록.json`을 2026-10-08에 읽은 최신 5개 메모 snapshot이며 글ID·outputVersion·시각·원본 SHA256을 함께 보존한다. 과거/다른 버전의 점수로 현재 후보를 평가하지 않는다. 다음 수집 시 최신 실제 파일을 다시 읽고 변경된 메모를 우선한다.

- `source-95d0ca45c7a3cc`, 제작버전 `2ec65ada6febab8ba6aa619ea8a8ddea6c1e1a1511d92de50f52f2a62c1745cf`: 원문에 없는 “사이다!” 같은 감정·효과 라벨을 덧붙이지 말 것. exact title과 실제 근거를 먼저 확인한다.
- 커밍아웃 글의 핵심 단어, 신랑/1인분, 시댁 모두 E/나만 I, 10명/100명처럼 대비 관계를 원문 근거와 함께 수집한다. 무엇을 강조할지는 원문에서 찾고 새 숫자·사건·인물 반응을 만들지 않는다. 이는 다음 수집의 근거 기록 지시이며 현재 제목·이미지 도안·리뷰 UI를 수정하지 않는다.

스키마·명령·미연결 범위: [원문 근거 이미지 입력 계약](../docs/IMAGE_REQUIREMENTS_2026-10-08.md).
