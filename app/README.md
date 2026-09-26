# Trend Inbox MVP

`Threads` 프로젝트의 실행형 콘텐츠 운영 화면입니다.

## 현재 되는 것

```text
Google Trends / YouTube / 직접 URL
→ 후보 Inbox
→ 유사 토픽 묶기
→ NAVER 뉴스·블로그·카페·검색트렌드 보강(선택)
→ 사람 점수 평가
→ 수동 또는 OpenAI 웹 검색 조사
→ Research Bundle
→ 사람 검토 완료
→ 플랫폼별 Draft Studio
→ Rights / Safety Gate
→ 게시 승인 Queue
→ Threads 공식 API 실제 게시(선택)
→ Threads Insights 회수
→ Experiment Lab KEEP / KILL / SCALE
```

세부 기능:

- Google Trends KR `Trending Now` RSS
- YouTube Data API `mostPopular` KR 메타데이터
- NAVER API HUB 뉴스 / 블로그 / 카페글 검색 결과
- NAVER Search Trend 30일 상대지수
- 수동 URL / 메모
- DCInside / Blind 자동수집 차단
- GREEN / YELLOW / RED 소스 위험도
- 후보 5개 신호 사람 평가
- 제목/URL/관련 출처 기반 유사 토픽 묶기
- 구조화 Research Bundle 저장
- 선택적 OpenAI Responses API + web search 조사
- 플랫폼별 Draft Studio
- 사실 / 권리 / 개인정보 / 명예훼손 / 플랫폼 정책 Safety Gate
- 사람 게시 승인
- 승인 이후 내용 변경 시 승인 무효화
- Threads 텍스트 게시
- Threads Insights
- 클릭 / 전환 / 실수익 수동 기록
- 같은 플랫폼 내부 상대 비교 기반 `LEARN / SCALE / KEEP / KILL`
- Experiment CSV 내보내기
- localStorage 저장 + 전체 JSON 백업/복원

## 실행

Node.js 24 이상에서 저장소 루트:

```bash
npm start
```

브라우저:

```text
http://127.0.0.1:4173/app/
```

별도 `npm install`은 필요하지 않습니다.

검사:

```bash
npm run check
```

GitHub Actions는 JavaScript 문법뿐 아니라 로컬 서버를 실제로 켜서 `/api/health`, `/api/connectors`, 정적 앱과 주요 UI script를 확인합니다. 외부 키가 없는 CI에서는 OpenAI / NAVER / Threads가 성공한 것처럼 보이지 않고 명확한 503을 반환하는지도 검사합니다.

## 선택적 연결

### YouTube Data API

```powershell
$env:YOUTUBE_API_KEY="YOUR_KEY"
```

현재 `videos.list + chart=mostPopular + regionCode=KR`을 사용합니다. 이 값은 2025-07-21 이후 과거 전체 YouTube Trending과 같은 의미가 아니므로 음악·영화·게임 중심의 별도 인기 신호로 취급합니다.

영상 파일을 내려받지 않고 제목, 채널, 게시시각, 조회/좋아요/댓글 등 메타데이터만 저장합니다.

### NAVER API HUB

2026-07-31 이후 신규 구현은 구 네이버 개발자센터 키가 아니라 NAVER API HUB 기준입니다.

```powershell
$env:NAVER_API_HUB_CLIENT_ID="YOUR_CLIENT_ID"
$env:NAVER_API_HUB_CLIENT_SECRET="YOUR_CLIENT_SECRET"
```

현재 사용:

```text
/search/v1/news
/search/v1/blog
/search/v1/cafearticle
/search-trend/v1/search
```

검색 결과는 제목/링크/짧은 검색 패시지만 저장하며 본문 재게시 권리가 생겼다고 취급하지 않습니다. Search Trend는 최대값=100 상대지수이므로 자동 점수로 덮어쓰지 않습니다.

### OpenAI AI 조사 / Draft Studio

```powershell
$env:OPENAI_API_KEY="YOUR_KEY"
```

기본 모델:

```text
gpt-5.6-luna
```

필요하면:

```powershell
$env:OPENAI_MODEL="..."
$env:OPENAI_RESEARCH_MODEL="..."
$env:OPENAI_DRAFT_MODEL="..."
```

AI 조사 결과는 항상 `조사 중`에서 시작합니다. AI가 준비됐다고 판단해도 사람 검토 완료로 자동 변경하지 않습니다.

Draft Studio도 사람 검토 완료 Research Bundle에서만 생성되며, 생성본은 자동 게시되지 않습니다.

### Threads 공식 API

```powershell
$env:THREADS_ACCESS_TOKEN="YOUR_THREADS_USER_ACCESS_TOKEN"
```

필수 권한:

```text
threads_basic
threads_content_publish
```

Insights:

```text
threads_manage_insights
```

흐름:

```text
Draft 사람 승인
→ Safety Gate 완료
→ 게시 대기 사람 승인
→ 대상 @username + 최종 문안 미리보기
→ 실제 공개 게시 확인 체크
→ 마지막 확인
→ /me/threads 컨테이너 생성
→ /me/threads_publish 게시
```

승인 후 문안이나 검토 상태가 바뀌면 게시 승인은 무효화됩니다.

상세: [`../docs/THREADS_API_SETUP.md`](../docs/THREADS_API_SETUP.md)

## NAVER 한국 자료 보강

후보를 선택하면 검색어를 직접 수정해 다음을 조회할 수 있습니다.

- 뉴스
- 블로그
- 카페글
- 검색 트렌드 30일

검색 결과는 후보의 `sourceEnrichment`에 저장됩니다. 개별 검색 결과의 `출처 후보로 추가`를 누르면 `relatedSources`에 들어갑니다.

이 동작은 `검증 완료`가 아닙니다. 뉴스/블로그/카페 결과는 Research에서 독립적으로 확인해야 합니다.

## Research Bundle

```text
reviewStatus       unresearched / researching / reviewed
whyNow
verifiedFacts[]
claimsToVerify[]
angles[]
riskNotes
sources[]
updatedAt
```

`reviewed`가 되려면 최소:

- `whyNow`
- 확인된 사실 1개 이상
- 추가 출처 1개 이상

이 필요합니다.

## Rights / Safety Gate

사람이 각각 판정합니다.

```text
fact
rights
privacy
defamation
platform
```

값:

```text
PASS / WARN / BLOCK / UNKNOWN
```

- BLOCK이 있으면 게시 승인 불가
- UNKNOWN이 있으면 게시 승인 불가
- WARN은 대응 메모가 있어야 다음 단계 진행 가능

## Experiment Lab

실제 게시된 `publications[]`만 실험 대상으로 사용합니다.

Threads에서 현재 보는 값:

```text
views
likes
replies
reposts
quotes
shares
```

파생:

```text
engagements = likes + replies + reposts + quotes + shares
engagement_rate = engagements / views
```

같은 플랫폼에서 `views > 0`인 게시물이 5개 미만이면 `LEARN`입니다.

5개 이상이면:

```text
performance_index = 조회수 백분위 * 0.55 + 참여율 백분위 * 0.45

>= 0.75   SCALE
<= 0.25   KILL
그 사이   KEEP
```

클릭/전환/실수익은 실제 값이 있을 때 사람이 입력합니다. 자동 판정은 수동 override 가능합니다.

상세: [`../docs/EXPERIMENT_LAB.md`](../docs/EXPERIMENT_LAB.md)

## 저장 데이터

브라우저 localStorage:

```text
threads_trend_inbox_v1
```

후보 객체 안에 Research, Draft, Safety Gate, publications, Insights, business metrics까지 함께 저장됩니다.

중요한 데이터는 `JSON 내보내기`로 백업합니다. Experiment Lab은 별도로 CSV 내보내기도 지원합니다.

## 다음 구현 순서

1. 실제 Threads 계정으로 텍스트 게시 E2E 1~3건 검증
2. Insights가 실제 계정 응답 형태와 맞는지 검증
3. 실제 5건 이상 게시 후 Experiment Lab 초기 기준 보정
4. 허용된 추가 공식/공개 소스 connector 확장
5. 이미지/영상 자체 제작 파이프라인
6. Reels/Shorts/Blog 등 다른 플랫폼 발행/성과 adapter
7. 계정별 DB/동기화

소스 사용 기준은 [`../docs/SOURCE_POLICY.md`](../docs/SOURCE_POLICY.md)를 우선합니다.

## 원문 기반 인스타 표지 제작

후보를 선택한 뒤 상세 화면의 **인스타 게시물 이미지 만들기**를 사용합니다.

1. **원문 캡처 / 이미지**를 선택하고 원문 파일을 순서대로 넣거나, **텍스트 원문만 사용**에서 본문을 붙여넣습니다.
2. **표지 제목**을 짧게 입력합니다. 줄바꿈으로 2~3줄을 지정할 수 있으며 원제목은 따로 보존됩니다.
3. 전체 본문 포함 여부를 확인하고 **미리보기 만들기**를 누릅니다.
4. 표지와 모든 본문 페이지를 확인한 뒤 **PNG 세트 받기** (버튼에 실제 크기 표시)를 누릅니다.

표지는 원문 위에 하단 그라데이션과 큰 흰색 제목을 합성합니다. 제목 하단 기준은 캔버스 높이의 약 83%로 올렸고, 검정 테두리는 2px입니다. 배경 블러와 글자 그림자는 없습니다. 미리보기와 다운로드가 같은 캔버스를 사용합니다. 한글 글꼴 두 굵기가 포함돼 별도 설치나 유료 이미지 API가 필요하지 않습니다.

이미지 표지는 테두리 여백 없이 채웁니다. 첫 원본 비율에 맞춰 폭 1080px, 높이 608~1350px로 자동 조절하며 같은 세트의 본문도 동일한 크기를 사용합니다. 극단적으로 가로로 넓거나 세로로 긴 원본은 표지에서 일부가 잘릴 수 있지만 본문에는 전체가 유지됩니다. 텍스트 원문은 1080×1350입니다. 원본 자체의 여백이나 낮은 해상도까지 자동 복원하지는 않습니다.

원문에 포함된 인스타 메뉴·버튼은 입력 전에 직접 제외해야 합니다. 자동 UI 제거/OCR은 구현하지 않았습니다. 긴 캡처는 비율을 보존해 분할하며 문단·장면 경계 자동 인식은 아직 없습니다.

텍스트는 20,000자까지 지원하며 본문을 생략하지 않고 여러 장으로 나눕니다. 이미지가 필요한 원문을 텍스트만으로 완료 처리하지 않도록 텍스트 모드는 원문 형식 **글**에 한정됩니다. 제목·텍스트·제작 설정은 후보에 저장되고 JSON 백업에 포함됩니다. 이미지 파일 자체는 세션을 닫으면 다시 선택해야 합니다. 다운로드 완료는 브라우저 다운로드 목록에서 확인합니다. 제작 완료가 게시 승인을 뜻하지는 않습니다.

프로그램 렌더링 예시: [이미지 원문 표지](../docs/examples/source-cover-image.png), [텍스트 원문 표지](../docs/examples/source-cover-text.png).

## 원문 컷 편집기

기존 후보의 원문 입력 후 **컷 편집기 열기**를 누르거나 `/app/source-cut-editor.html`을 엽니다. 표지와 본문 범위를 직접 지정하고 **여기서 페이지 나누기 → 원문 클릭**으로 페이지 경계를 추가합니다. 긴 원문은 휠로 스크롤하며 분할선은 원본 위치에 고정됩니다. 제목 테두리 기본 8px, 단어별 색상 강조를 지원합니다. 원본 포함 편집 저장과 PNG ZIP 출력을 사용할 수 있습니다. Canva 연결은 보류합니다. [자세한 사용법](../docs/SOURCE_CUT_EDITOR.md).
