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
- AI 조사용 Research Bundle 프롬프트 생성/복사
- **조사 결과를 구조화된 Research Bundle로 후보에 저장**
- 사람 검토 완료 전 `제작 후보` 승격 차단
- 조사 대기 / 제작 후보 / 패스 상태 관리
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

현재 `server.mjs`, `app/app.js`, `app/youtube.js`, `app/clustering.js`, `app/research-bundle.js` 문법을 검사하며 GitHub Actions에도 같은 check가 연결되어 있습니다.

## Google Trends 연결

서버가 다음 Trending Now RSS를 서버측에서 읽어 브라우저에 JSON으로 전달합니다.

```text
https://trends.google.com/trending/rss?geo=KR
```

브라우저에서 HTML 파일만 직접 더블클릭하면 `/api/...`가 없으므로 가져오기는 동작하지 않습니다. `npm start`로 실행해야 합니다.

Google Trends 항목은 검색 관심도 신호입니다. 사건의 사실 여부를 증명하는 출처가 아니므로 자동으로 `제작 후보`로 승격하거나 게시하지 않습니다.

## YouTube 연결

YouTube는 API 키를 GitHub에 저장하지 않습니다. 실행 전에 `YOUTUBE_API_KEY` 환경변수로 넣습니다.

PowerShell 예:

```powershell
$env:YOUTUBE_API_KEY="YOUR_KEY"
npm start
```

CMD 예:

```cmd
set YOUTUBE_API_KEY=YOUR_KEY
npm start
```

키가 없으면 UI에 `API 키 필요`가 표시되고 버튼이 비활성화됩니다.

현재 사용하는 API는 `videos.list` + `chart=mostPopular` + `regionCode=KR`입니다. 이 결과는 2025-07-21 이후 예전 YouTube 전체 Trending 페이지와 같은 의미가 아니며, 인기 음악·영화·게임 차트 성격이 강한 별도 신호로 취급합니다.

수집하는 것은 제목, 채널, 게시시각, 조회/좋아요/댓글 수 등 메타데이터입니다. 영상/썸네일/음원을 다운로드하거나 재사용 권리가 생긴 것으로 취급하지 않습니다.

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

그리고 후보를 `제작 후보`로 올리려면 기존 점수 평가뿐 아니라 Research Bundle도 `사람 검토 완료` 상태여야 합니다.

`Bundle JSON 복사`로 해당 후보의 source/signals/cluster/research 결과를 다음 AI 작업이나 다른 도구로 넘길 수 있습니다.

## 데이터

현재 Inbox 자체 데이터는 브라우저의 다음 localStorage key에 저장됩니다.

```text
threads_trend_inbox_v1
```

계정 동기화/서버 DB는 아직 없습니다. 중요한 Inbox는 `JSON 내보내기`로 백업할 수 있습니다.

## 다음 구현 순서

1. 허용된 뉴스/RSS/API 소스 추가
2. Research Bundle을 실제 AI 조사 작업으로 자동 연결
3. Rights/Safety Gate 결과를 별도 상태로 구조화
4. Draft Studio
5. 승인 Queue
6. Threads 공식 API 발행/Insights 회수
7. 성과 데이터 기반 `KEEP / KILL / SCALE`

소스 사용 기준은 [`../docs/SOURCE_POLICY.md`](../docs/SOURCE_POLICY.md)를 우선합니다.
