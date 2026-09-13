# Trend Inbox MVP

`Threads` 프로젝트의 첫 실행형 화면입니다.

## 지금 되는 것

- Google Trends KR `Trending Now` RSS 실시간 후보 가져오기
- 직접 URL / 메모 소재 추가
- DCInside / Blind 자동수집 차단 판정
- GREEN / YELLOW / RED 소스 위험도 표시
- 콘텐츠 유형별 추천 플랫폼 표시
- 운영자 입력 기반 초기 점수
- 자동수집 항목은 임의 점수 대신 `검토 필요`로 표시
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

`server.mjs`와 `app/app.js`의 JavaScript 문법을 검사합니다.

## Google Trends 연결

서버가 다음 공식 Trending Now RSS를 서버측에서 읽어 브라우저에 JSON으로 전달합니다.

```text
https://trends.google.com/trending/rss?geo=KR
```

브라우저에서 HTML 파일만 직접 더블클릭하면 `/api/...`가 없으므로 Google Trends 가져오기는 동작하지 않습니다. `npm start`로 실행해야 합니다.

Google Trends 항목은 검색 관심도 신호입니다. 사건의 사실 여부를 증명하는 출처가 아니므로 자동으로 `제작 후보`로 승격하거나 게시하지 않습니다.

## 데이터

현재 Inbox 자체 데이터는 브라우저의 다음 localStorage key에 저장됩니다.

```text
threads_trend_inbox_v1
```

계정 동기화/서버 DB는 아직 없습니다. 중요한 Inbox는 `JSON 내보내기`로 백업할 수 있습니다.

## 다음 구현 순서

1. 허용된 RSS/API Source Registry를 실제 커넥터로 연결
2. 후보별 신호 편집/평가 UI
3. 여러 출처를 하나의 Topic으로 묶는 중복/클러스터링
4. Research Bundle을 실제 AI 조사 작업으로 넘기는 연결
5. Draft Studio
6. 승인 Queue
7. Threads 공식 API 발행/Insights 회수
8. 성과 데이터 기반 `KEEP / KILL / SCALE`

소스 사용 기준은 [`../docs/SOURCE_POLICY.md`](../docs/SOURCE_POLICY.md)를 우선합니다.
