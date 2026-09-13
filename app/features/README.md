# Feature Modules

새 기능은 `app/` 루트에 파일을 추가하지 않고 이 폴더 아래에 둔다.

## 도메인

- `discovery/` — 외부 신호 수집, Viral Finder, 중복/Comfort
- `themes/` — 테마 자동/수동 분류와 테마 필터
- `editorial/` — 조사, 사실 검증, Safety
- `production/` — Draft, 제작 전략, Community Card
- `publish/` — 승인 무결성, 공식 플랫폼 게시
- `warehouse/` — 완제품 창고, 우선순위, Scheduler
- `experiments/` — 계정 전략, 가설, 성과 분석

## 새 기능 체크리스트

1. 도메인 폴더 선택
2. 설정/분류표와 판단 model 분리
3. DOM 코드는 UI 파일로 분리
4. 기능 전용 CSS 분리
5. state 소유 필드 문서화
6. model 회귀 테스트 추가
7. `bootstrap/feature-loader.js`에 명시적으로 등록
8. `npm run check` 통과
9. 서버 smoke test 통과
10. 운영 허브 handoff 갱신

다른 feature의 파일을 직접 `loadCompanion()`으로 연쇄 로딩하는 방식은 새 코드에서 금지한다. 기능 로딩 순서는 bootstrap 한 곳에서 관리한다.
