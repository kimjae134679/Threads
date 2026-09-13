# AGENTS.md — Threads / AI Content Monetization Lab

이 저장소는 `많이 긁어서 많이 올리는 봇`이 아니라 **트렌드 탐지 → 검증 → 자체 콘텐츠 제작 → 멀티플랫폼 배포 → 성과 학습** 시스템을 만든다.

## 읽는 순서

1. 현재 채팅의 사용자 최신 지시
2. `README.md`
3. `docs/SOURCE_POLICY.md`
4. `docs/RESEARCH_2026-09.md`
5. `docs/CONTENT_PIPELINE.md`
6. `docs/PLATFORM_MATRIX.md`
7. `docs/EXECUTION_PLAN_30D.md`

운영 허브를 함께 쓸 때는 `kimjae134679/project-operations-hub`의 최신 Governance/User Policies도 따른다.

## 고정 원칙

- 공개되어 있다는 이유만으로 수집·복제·상업 재사용을 허용된 것으로 보지 않는다.
- DCInside, Blind 및 약관 미확인 회원제/폐쇄형 커뮤니티를 자동 크롤링 대상으로 만들지 않는다.
- 공식 API/RSS/공식 발표/직접 입력 URL/라이선스 자료를 먼저 사용한다.
- 원문 전체, 댓글 묶음, 타인 영상/짤을 AI로 말투만 바꿔 게시하지 않는다.
- 모든 게시 후보는 원 출처 URL, 확인된 사실, 권리 상태, 위험 플래그를 추적할 수 있어야 한다.
- 정치·사건사고·범죄 주장·개인 폭로·건강/금융 고위험 주제는 사람 승인 없이 자동 게시하지 않는다.
- 식별 가능한 일반인의 개인정보와 익명 커뮤니티 이용자 추적 정보는 게시물에서 제거한다.
- 비밀키/API key/token/cookie/session은 GitHub에 기록하지 않는다.

## 플랫폼별 주의

- **YouTube:** AI 사용 자체는 금지되지 않지만 양산형/반복형/재사용 콘텐츠는 수익화에 불리하다. 영상별 독자적 서사·해설·편집 기여를 남긴다. 현실적으로 보이는 AI 합성은 필요한 경우 표시한다.
- **X:** 2026-09 Original Content Rewards에서는 자동 수단으로 생성되거나 게시된 콘텐츠가 수익 대상에서 제외될 수 있으므로 수익 목적 계정은 사람 승인/직접 게시를 기본값으로 둔다.
- **Instagram/Facebook:** 원본 콘텐츠 우선 정책을 전제로 한다. 테두리·자막·속도 변경 정도의 저가치 편집을 원본으로 취급하지 않는다.
- **Blog:** 대량 AI 페이지 생성·스크래핑 재작성으로 검색 순위를 노리는 구조를 만들지 않는다.

## 구현 우선순위

1. Source Registry / Link Inbox
2. Topic normalization + duplicate clustering
3. Trend scoring
4. Research Bundle
5. Rights/Safety Gate
6. Platform-specific draft generation
7. Human approval UI
8. 공식 게시 API 연결
9. Analytics ingestion
10. 성과 기반 점수/프롬프트 개선

게시 자동화보다 **출처 추적·권리 판정·승인·분석**을 먼저 완성한다.

## 콘텐츠 실험 규칙

- 같은 계정에 무관한 모든 주제를 섞지 않는다.
- `주제 축 × 포맷 × 플랫폼 × 훅`을 실험 단위로 저장한다.
- 조회수만 보지 말고 저장/공유/댓글/팔로우/클릭/수익/전환을 함께 본다.
- 한 번 반응한 소재는 그대로 복제하지 말고 후속 질문·비교·깊이 있는 설명으로 확장한다.

## 완료 기준

문서 조사 작업은 출처와 기준일을 남긴다. 구현 작업은 fake success 없이 실제 입력→초안→검사→승인→출력 흐름이 재현되어야 완료로 본다.
