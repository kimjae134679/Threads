# Themes

## 목적

후보를 포맷이 아니라 **무슨 주제인가** 기준으로 분류한다. 이 분류는 Viral Finder 필터, Warehouse 정리, 이후 Scheduler의 같은 테마 연속 게시 방지와 성과 분석에 사용한다.

## 현재 테마

- `work_career` — 직장 / 커리어
- `dating_relationships` — 연애 / 인간관계
- `money_consumption` — 돈 / 소비 / 재테크
- `military_school` — 군대 / 학교
- `internet_humor` — 인터넷 / 유머 / 밈
- `weird_true_story` — 황당 / 실화 / 반전
- `tech_ai_games` — AI / IT / 게임
- `life_debate` — 생활 / 공감 / 논쟁
- `entertainment_celeb` — 연예 / 방송 / 영화
- `animals_nature` — 동물 / 자연
- `society_news` — 사회 / 사건 / 시사
- `sports` — 스포츠 / e스포츠
- `food_travel` — 음식 / 여행 / 장소
- `general_viral` — 기타 바이럴

## 파일

```text
theme-taxonomy.js   테마 정의와 키워드
theme-model.js      자동 점수/primary/secondary 분류
theme-review.js     상세 수동 수정 + Viral/Warehouse 테마 필터
theme-review.css    기능 전용 스타일
```

## 자동 분류

제목, 메모, Research Bundle, 관련 출처 제목을 합친 뒤 taxonomy 키워드에 가중치를 준다.

- 제목에 키워드가 있으면 가중치 추가
- `kind=humor/story/product/breaking` 같은 기존 분류도 작은 보조 신호로 사용
- 주 테마 1개 + 보조 테마 최대 2개 자동 제안
- 사람이 수동 저장하면 자동 재분류가 그 값을 덮어쓰지 않음

## 중요한 구분

**Theme ≠ Safety.**

`animals_nature`는 정상적인 테마다. 고양이/강아지 소재라고 자동 차단하지 않는다. 동물학대, 고어, 잔혹성 등은 Viral Finder의 Audience Comfort에서 별도로 BLOCK한다.

## 이후 사용

- Scheduler: 같은 `primaryTheme` 연속 게시 간격 조정
- Experiment Lab: 테마별 조회/참여/클릭/수익 비교
- Discovery: 특정 테마 부족 시 다음 수집에서 보충
- 계정 전략: 계정별 허용/선호 테마 비율 설정
