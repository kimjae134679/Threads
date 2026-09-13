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
- 미평가 자동수집 항목은 바로 `제작 후보`로 승격 불가
- Research Bundle용 프롬프트 생성/복사
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

`server.mjs`, `app/app.js`, `app/youtube.js`의 JavaScript 문법을 검사합니다.

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

## 데이터

현재 Inbox 자체 데이터는 브라우저의 다음 localStorage key에 저장됩니다.

```text
threads_trend_inbox_v1
```

계정 동기화/서버 DB는 아직 없습니다. 중요한 Inbox는 `JSON 내보내기`로 백업할 수 있습니다.

## 다음 구현 순서

1. 허용된 뉴스/RSS/API 소스 추가
2. 여러 출처를 하나의 Topic으로 묶는 중복/클러스터링
3. Research Bundle을 실제 AI 조사 작업으로 넘기는 연결
4. Draft Studio
5. 승인 Queue
6. Threads 공식 API 발행/Insights 회수
7. 성과 데이터 기반 `KEEP / KILL / SCALE`

소스 사용 기준은 [`../docs/SOURCE_POLICY.md`](../docs/SOURCE_POLICY.md)를 우선합니다.
