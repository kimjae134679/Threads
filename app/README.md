# Trend Inbox MVP

`Threads` 프로젝트의 첫 실행형 화면입니다.

## 지금 되는 것

- Google Trends KR `Trending Now` RSS 실시간 후보 가져오기
- YouTube Data API `mostPopular` KR 메타데이터 가져오기(선택적 API 키)
- 직접 URL / 메모 소재 추가
- DCInside / Blind 자동수집 차단 판정
- GREEN / YELLOW / RED 소스 위험도 표시
- 콘텐츠 유형별 추천 플랫폼 표시
- 운영자 입력 기반 초기 점수
- 자동수집 항목은 임의 점수 대신 `검토 필요`로 표시
- 후보별 5개 신호를 사람 평가 후 점수 계산
- 제목/URL/관련 출처 기반 **유사 토픽 묶기**
- 수동 Research Bundle 저장
- 선택적 **OpenAI 웹 검색 기반 AI 조사**
- AI 조사 결과를 자동 승인하지 않고 `조사 중`으로 저장
- 사람 검토 완료 전 `제작 후보` 승격 차단
- 선택적 **Draft Studio**: Threads / Shorts·Reels·TikTok / Instagram Carousel / Blog / YouTube Long 초안 생성
- Draft Studio 편집 저장 / 복사 / 사람 승인 상태
- 자동 게시 없음
- 브라우저 localStorage 저장
- JSON 내보내기 / 불러오기

## 실행

Node.js 18 이상에서 저장소 루트 기준:

```bash
npm start
```

브라우저에서:

```text
http://127.0.0.1:4173/app/
```

별도 `npm install`은 필요하지 않습니다. 현재 서버는 Node 기본 모듈과 내장 `fetch`만 사용합니다.

## 검사

```bash
npm run check
```

GitHub Actions는 다음을 확인합니다.

- 모든 JavaScript 문법 검사
- 로컬 서버 실제 기동
- `/api/health`
- `/api/connectors`
- 정적 앱 `/app/`
- API 키가 없는 환경에서 AI endpoint가 성공한 것처럼 동작하지 않고 `openai_api_key_missing` 503을 반환하는지

외부 서비스의 실제 성공 여부는 해당 서비스 키가 없는 CI에서 fake success로 처리하지 않습니다.

## Google Trends 연결

서버가 다음 Trending Now RSS를 서버측에서 읽어 브라우저에 JSON으로 전달합니다.

```text
https://trends.google.com/trending/rss?geo=KR
```

브라우저에서 HTML 파일만 직접 더블클릭하면 `/api/...`가 없으므로 가져오기는 동작하지 않습니다. `npm start`로 실행해야 합니다.

Google Trends 항목은 검색 관심도 신호입니다. 사건의 사실 여부를 증명하는 출처가 아니므로 자동으로 `제작 후보`로 승격하거나 게시하지 않습니다.

## YouTube 연결

YouTube는 API 키를 GitHub에 저장하지 않습니다. 실행 전에 `YOUTUBE_API_KEY` 환경변수로 넣습니다.

PowerShell:

```powershell
$env:YOUTUBE_API_KEY="YOUR_KEY"
npm start
```

CMD:

```cmd
set YOUTUBE_API_KEY=YOUR_KEY
npm start
```

키가 없으면 UI에 `API 키 필요`가 표시되고 버튼이 비활성화됩니다.

현재 사용하는 API는 `videos.list` + `chart=mostPopular` + `regionCode=KR`입니다. 이 결과는 2025-07-21 이후 예전 YouTube 전체 Trending 페이지와 같은 의미가 아니며, 인기 음악·영화·게임 차트 성격이 강한 별도 신호로 취급합니다.

수집하는 것은 제목, 채널, 게시시각, 조회/좋아요/댓글 수 등 메타데이터입니다. 영상/썸네일/음원을 다운로드하거나 재사용 권리가 생긴 것으로 취급하지 않습니다.

## OpenAI AI 조사 / Draft Studio

OpenAI 연결은 선택 사항입니다. 키가 없으면 기존 수동 Research Bundle 기능을 그대로 사용할 수 있습니다.

PowerShell:

```powershell
$env:OPENAI_API_KEY="YOUR_KEY"
npm start
```

CMD:

```cmd
set OPENAI_API_KEY=YOUR_KEY
npm start
```

기본 모델은 비용을 낮추기 위해 `gpt-5.6-luna`입니다. 필요하면 실행 환경에서 변경할 수 있습니다.

```powershell
$env:OPENAI_MODEL="gpt-5.6-terra"
# 또는 조사/초안을 각각 다르게
$env:OPENAI_RESEARCH_MODEL="gpt-5.6-terra"
$env:OPENAI_DRAFT_MODEL="gpt-5.6-luna"
```

키/토큰은 GitHub에 커밋하지 않습니다.

### AI 조사 흐름

```text
후보 선택
→ AI로 최신 조사
→ Responses API + web search
→ 구조화 Research Bundle 생성
→ 상태는 무조건 `조사 중`
→ 사람이 출처/사실/권리 확인
→ `사람 검토 완료`로 저장
```

AI가 `ready`를 추천하더라도 자동으로 사람 검토 완료가 되지 않습니다.

RED 소스는 AI 요청에 원문 URL을 직접 넘기지 않고, 같은 주제를 **독립된 공개 출처에서만 조사**하도록 처리합니다.

### Draft Studio 흐름

Draft Studio는 `사람 검토 완료` Research Bundle에서만 실행됩니다.

```text
사람 검토 완료 Research Bundle
→ 플랫폼별 AI 초안 생성
→ Threads
→ Shorts / Reels / TikTok
→ Instagram Carousel
→ Blog
→ YouTube Long
→ 편집 저장
→ 검토 중
→ 사람 승인
```

`사람 승인`은 초안 검토 상태일 뿐 현재 버전에서는 **자동 게시를 실행하지 않습니다.**

AI 초안은 새 사실을 추가하지 않고 검토 완료 Bundle만 factual ground truth로 사용하도록 서버 지침을 걸어 두었습니다.

## 평가 규칙

자동으로 들어온 후보는 `freshness`처럼 데이터로 계산 가능한 값만 일부 채우고 나머지는 비워 둡니다.

다음 5개가 모두 채워진 뒤에만 초기 점수를 계산합니다.

- freshness
- velocity
- audience fit
- originality room
- revenue fit

RED 소스 또는 평가가 끝나지 않은 자동수집 후보는 바로 제작 후보로 올리지 않습니다.

## 유사 토픽 묶기

`유사 토픽 묶기`는 여러 수집 경로에서 같은 이슈가 중복으로 들어오는 문제를 줄이기 위한 **검토 보조 기능**입니다.

판정에 쓰는 신호:

- canonical URL 동일 여부
- related source URL 겹침
- 제목 단어 Jaccard 유사도
- 한국어/영문 제목의 2-gram / 3-gram 문자열 유사도
- 길이가 짧은 제목에는 더 높은 묶기 기준 적용

결과는 `clusterId`, `clusterSize`, `clusterConfidence`로 Inbox 데이터에 기록합니다.

중요: 이 기능은 후보를 자동 삭제하거나 하나로 합치지 않습니다. 서로 다른 사건이 잘못 묶일 수 있으므로 사람 검토용으로만 사용합니다.

## Research Bundle 저장

후보별로 다음 조사 결과를 저장합니다.

```text
reviewStatus       unresearched / researching / reviewed
whyNow             왜 지금 뜨는가
verifiedFacts[]    확인된 사실
claimsToVerify[]   아직 확인할 주장
angles[]           콘텐츠 각도
riskNotes          권리/개인정보/명예훼손 메모
sources[]          추가 출처 URL + 메모
updatedAt
```

`사람 검토 완료(reviewed)`로 저장하려면 최소한:

- `whyNow` 작성
- 확인된 사실 1개 이상
- 추가 출처 1개 이상

이 필요합니다.

후보를 `제작 후보`로 올리려면 기존 점수 평가뿐 아니라 Research Bundle도 `사람 검토 완료` 상태여야 합니다.

## 데이터

현재 Inbox 자체 데이터는 브라우저의 다음 localStorage key에 저장됩니다.

```text
threads_trend_inbox_v1
```

AI 조사 결과와 Draft Studio도 같은 후보 객체에 저장되어 JSON 내보내기에 포함됩니다.

계정 동기화/서버 DB는 아직 없습니다. 중요한 Inbox는 `JSON 내보내기`로 백업할 수 있습니다.

## 다음 구현 순서

1. 허용된 뉴스/RSS/API 소스 추가
2. Rights/Safety Gate를 독립 상태로 구조화
3. Draft 승인 Queue를 목록 화면으로 분리
4. Threads 공식 API 발행 — 사람 승인된 항목만
5. 게시 후 Insights 회수
6. 성과/수익 기록
7. 실제 데이터 기반 `KEEP / KILL / SCALE`

소스 사용 기준은 [`../docs/SOURCE_POLICY.md`](../docs/SOURCE_POLICY.md)를 우선합니다.
