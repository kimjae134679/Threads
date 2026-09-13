# Viral Discovery Test — 2026-09-14

## 목적

실제 공개 검색에서 잡힌 게시물을 몇 개 가져와 `바이럴 후보 / 저반응 비교군 / 불쾌감 차단`이 구분되는지 확인한다.

원문 전체/이미지/영상은 복제하지 않았다. 아래는 공개 검색 결과의 메타데이터와 편집 요약만 기록한다.

## 샘플 A — 강한 반응

- Source: Reddit `r/memes`
- URL: https://www.reddit.com/r/memes/comments/1w6mgy4/it_was_like_that/
- Published: 2026-09-03
- Public indexed signal: 약 14,647 votes
- Theme: Reddit의 예전/현재 문화를 비교하는 밈, 댓글에서 봇/광고/과거 문화 이야기로 대화 확장
- 판단: `바이럴 후보`
- 카드화 아이디어: 원본 밈을 그대로 복제하기보다 `예전 인터넷 vs 지금 인터넷`이라는 쟁점으로 자체 비교 카드 제작
- Rights: 원본 이미지 재사용 여부 별도 확인 필요

## 샘플 B — 낮은 반응 비교군

- Source: Reddit `r/NewToReddit`
- URL: https://www.reddit.com/r/NewToReddit/comments/1wb31r4/9_years_on_reddit_and_still_basically_new/
- Published: 2026-09-08
- Public indexed signal: 48 votes
- Theme: 9년 된 계정이지만 여전히 초보라는 자조/공감형 이야기
- 판단: `LOW 또는 보조 후보`
- 용도: 반응이 실제로 작은 글이 강추천으로 잘못 올라가지 않는지 비교하는 샘플

## 샘플 C — 본문보다 댓글 반응형

- Source: Reddit `r/help`
- URL: https://www.reddit.com/r/help/comments/1wcp38q/new_changelog_september_10_2026/
- Published: 2026-09-10
- Public indexed signal: 안내 글 자체 반응은 작지만 특정 기능 변경에 대한 댓글이 더 강하게 반응
- 판단: `댓글에서 소재 찾기` 유형
- 카드화 아이디어: 단순 changelog 복사보다 "사용자들이 가장 싫어한 변경점" 같은 후속 해설형 후보

## 샘플 D — Audience Comfort 차단 회귀 샘플

- Source: Reddit `r/dankmemes`
- URL: https://www.reddit.com/r/dankmemes/comments/1wdma2k/removed/
- Published: 2026-09-11
- Theme: 실제 암살/폭력 사건을 밈과 논쟁으로 소비하는 제거 게시물
- 판단: `BLOCK`
- 이유: 조회 가능성 여부와 무관하게 사용자가 요청한 "보고 나서 불쾌하기만 한 소재 제외" 기준에 맞지 않음

## 발견 결과를 앱에서 사용하는 방법

동일 샘플은 `data/viral-discovery-latest.json`에도 메타데이터만 넣었다.

```text
npm start
→ http://127.0.0.1:4173/app/
→ Viral Finder
→ 최신 실제 발견 묶음 가져오기
```

그 뒤 앱에서 자동 점수/Comfort/중복을 보고 여러 개를 한 번에 선택해 조사 또는 제작 후보로 넘긴다.

## 현재 한계

- 검색 결과에 보이는 vote 수와 실제 조회수/전체 댓글 수가 항상 모두 제공되는 것은 아니다.
- 따라서 지표가 일부 없는 후보는 과대평가하지 않는다.
- 원문 전체가 필요한 경우 허용된 API/소스가 아니면 수동 URL/스크린샷 Capture 단계가 필요하다.
