# 전체 색 구절과 부분 크기 구절

제목의 색 강조 범위와 글자 크기 강조 범위를 별도 입력으로 받는다. 공통 렌더러에는 글 ID별 예외를 넣지 않는다. 원문 제목, 조사, 확장자, 본문을 보존한다.

제작 입력의 `editorial.titleStyle` 예:

```json
{
  "emphasis": "내 방 달라는 딸",
  "sizeEmphasis": "달라는",
  "sizeScale": 1.06
}
```

`emphasis` 전체를 포인트색으로 칠하고 `sizeEmphasis`만 6% 크게 만든다. 크기 강조가 불필요하면 빈 문자열을 명시한다. 색 구절이 두 줄로 넘어가도 전부 유지한다. 직접 지정한 구절은 조사 앞에서 끝날 수 있다. `sizeEmphasis`는 색 구절 내부에 있어야 하며, 크기 배율은 1~1.12 범위다. 잘못된 입력은 합성을 보류한다. 자동 구절 선택의 기존 한글 단어 경계 정책은 유지한다.

제작 입력 → `desktop/batch-render.cjs` → 이미지 합성 또는 글씨형 표지 → `production-plan.json`으로 전달한다. `coverTitleStyle`과 `universalCover.titleStyle`에 기록하고 재합성에도 사용한다. 입력에 색·크기 구절과 배율이 포함되므로 제작 fingerprint가 달라진다. 이미지 합성 소비자 버전은 `2026-10-09.3`이다.

실제 요청 적용: `결혼 정보회사` 전체 색, 크기 강조 없음; `내 방 달라는 딸` 전체 색, `달라는`만 6%; `돈 안 내는` 전체 색, `안 내는`만 6%. 세 글에 대한 실제 현재 결과만 교체했고 본문 PNG 23장·원본·ZIP의 다른 항목·평가·진행·리뷰 회차를 보존했다. 전후 SHA와 출력버전 재조회 증거는 작업 폴더의 `explicit-title-three-20261009/proof.json`에 보관한다. 전후 화면은 같은 폴더의 `전후 비교.html`이다.

참조 이미지 다운로드는 공식 경로에서 HTTP 403으로 실패했다. 참조 픽셀을 보거나 일치 여부를 확인했다는 의미가 아니다. 직접 지정한 구절 요청을 검증한 결과다.

설치된 제작 프로그램 `0.3.27-cover.20261009.2`는 이전 `2026-10-09.2` 코드를 포함한다. 현재 실제 결과와 이 소스의 `.3` 변경을 설치된 프로그램에 포함했다고 주장하지 않는다. 리뷰 프로그램과 바로가기는 수정하지 않았다.

검증 명령:

```powershell
node --test test/cover-typography.test.mjs test/image-composition.test.mjs test/reflow-review-covers.test.mjs
git diff --check
```
