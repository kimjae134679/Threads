# App Architecture

## 왜 이 문서가 필요한가

기능이 `수집 → 조사 → 제작 → 검수 → 게시 → 실험 → 창고/스케줄`로 계속 늘어나기 때문에 새 파일을 `app/` 루트에 계속 추가하면 의존성 순서와 데이터 소유권이 빠르게 꼬인다.

따라서 앞으로는 **기능별 폴더 + model/ui/style 분리 + 중앙 bootstrap** 규칙을 고정한다.

## 목표 구조

```text
app/
├─ index.html
├─ styles.css                  # 앱 전체 공통 레이아웃만
├─ app.js                      # 현재 legacy shell/state. 단계적으로 core/로 이동
│
├─ bootstrap/
│  └─ feature-loader.js        # 기능 로딩 순서를 한 곳에서 관리
│
├─ core/                       # 다음 리팩터링 대상
│  ├─ state/                   # state load/persist/schema migration
│  ├─ ui/                      # shell, global message, selection
│  └─ utils/                   # DOM/string/date 공통 유틸
│
├─ features/
│  ├─ discovery/
│  │  ├─ trends/               # Google Trends
│  │  ├─ youtube/              # YouTube metadata
│  │  ├─ clustering/           # 유사 토픽
│  │  ├─ sources/              # 다중 플랫폼 source registry/분류
│  │  ├─ comfort/              # Audience Comfort
│  │  └─ viral/                # Viral Finder / batch review
│  ├─ themes/
│  │  ├─ theme-taxonomy.js     # 테마 목록·키워드 설정
│  │  ├─ theme-model.js        # 자동 분류·정규화
│  │  ├─ theme-review.js       # 수동 수정·필터 UI
│  │  ├─ theme-review.css
│  │  └─ README.md
│  ├─ editorial/
│  │  ├─ research/             # Research Bundle
│  │  └─ safety/               # Rights/Safety Gate
│  ├─ production/
│  │  ├─ drafts/               # AI Draft Studio
│  │  ├─ strategy/             # format/hook/CTA/asset metadata
│  │  └─ cards/                # Community Card Factory / privacy mask
│  ├─ publish/
│  │  ├─ approval/             # approval integrity
│  │  ├─ threads/              # direct Threads API publisher
│  │  └─ buffer/               # optional Buffer queue/schedule publisher
│  ├─ warehouse/
│  │  ├─ model/                # queue eligibility/scoring
│  │  ├─ ui/                   # warehouse UI
│  │  └─ scheduler/            # 예약 게시 planner/executor
│  └─ experiments/
│     ├─ accounts/             # account registry/assignment
│     └─ lab/                  # metrics / KEEP KILL SCALE
│
└─ legacy/                     # 최종적으로는 비워질 임시 호환 영역
```

현재 기존 파일을 한 번에 전부 이동하지 않는다. **중앙 bootstrap을 먼저 만든 뒤 기능군 단위로 이동하고, 각 이동마다 CI를 통과시킨다.** 중간에 파일 경로를 대량 변경해서 앱 전체가 깨지는 것을 피하기 위한 방식이다.

## 파일 역할 규칙

각 기능은 가능하면 아래 형태를 따른다.

```text
<feature>-config.js / taxonomy.js   변경 가능한 설정·분류표
<feature>-model.js                  순수 로직, DOM 직접 접근 금지
<feature>-ui.js / review.js         DOM 렌더링·이벤트
<feature>.css                       해당 기능 전용 스타일
README.md                           상태·데이터 계약·다음 작업
```

### model

- `state`, DOM, localStorage를 직접 건드리지 않는다.
- 입력 객체를 받아 결과를 반환한다.
- Node `vm`으로 회귀 테스트가 가능해야 한다.

### UI

- model의 공개 API만 호출한다.
- 자기 기능이 소유한 필드만 저장한다.
- 콘텐츠 본문 변경과 운영 메타데이터 변경을 구분한다.

### config / taxonomy

- 분류 목록, 규칙, 상수만 둔다.
- UI 문자열과 판단 로직을 한 파일에 섞지 않는다.

## 데이터 소유권

```text
item.source*                01 DISCOVERY
item.viralReview            01 DISCOVERY / Viral Finder
item.themeClassification    공통 분류 메타데이터
item.researchBundle         02 EDITORIAL
item.cardFactory            03 PRODUCTION
item.contentStrategy        03 PRODUCTION
item.safetyGate             04 REVIEW
item.publishApproval        04 REVIEW
item.publications[]         04 PUBLISH / 실제 게시 확인 기록
item.bufferDeliveries[]     04 PUBLISH / Buffer 예약·전달 기록
item.warehouse              Warehouse 운영 메타
item.experimentAssignment   05 EXPERIMENTS
```

다른 기능의 필드를 조용히 수정하지 않는다. 예를 들어 Theme UI는 `item.themeClassification`만 수정하며 `item.researchBundle`이나 `item.safetyGate`를 수정하지 않는다.

`item.bufferDeliveries[]`와 `item.publications[]`도 구분한다. Buffer에 예약 요청을 넣었다고 실제 Threads 게시 완료로 간주하지 않는다. 외부 상태를 확인한 뒤 실제 sent 게시만 publication으로 승격한다.

## 콘텐츠 변경 vs 운영 메타데이터

게시 승인 무효화에 영향을 주는 값을 분리한다.

**콘텐츠 자체를 바꾸므로 `item.updatedAt` 갱신:**

- Draft 문안
- 카드 스토리보드
- 사용 자산
- 실험용 실제 콘텐츠 변형

**운영 메타데이터라서 기본적으로 승인 무효화하지 않음:**

- 테마 분류
- Warehouse HOT/EVERGREEN
- Warehouse priority/hold/notBefore/expiry
- Buffer queue/schedule delivery record
- 성과 수집 메타데이터

## Bootstrap 규칙

`app/bootstrap/feature-loader.js`가 동적 기능의 로딩 순서를 소유한다.

현재 주요 순서:

```text
production strategy
→ experiment metadata
→ themes
→ discovery sources
→ viral finder / comfort / bulk review
→ community cards
→ warehouse
→ buffer publisher
```

새 기능은 다른 파일에서 임의로 `<script>`를 연쇄 삽입하지 말고 bootstrap 목록에 등록한다.

## 테마 분류 계약

```text
item.themeClassification = {
  schemaVersion,
  taxonomyVersion,
  primaryTheme,
  secondaryThemes[],
  tags[],
  confidence,
  score,
  reasons[],
  source,        // auto | manual
  computedAt,
  updatedAt
}
```

테마와 안전성은 별개다. 예를 들어 `동물/자연` 자체는 정상 테마지만 동물학대·고어가 포함되면 Viral Finder의 Audience Comfort가 별도로 BLOCK한다.

## 앞으로의 물리적 파일 이동 순서

한 번에 다 옮기지 않는다.

1. `themes/` — 신규 구조로 시작 ✅
2. `discovery/sources/comfort/bulk review` — 신규 구조 적용 중 ✅
3. 기존 root `viral-*` → `discovery/viral/`
4. 기존 root `card-*` → `production/cards/`
5. `warehouse/` — queue model/UI 이동
6. `experiments/` — account/lab 이동
7. `editorial/` — research/safety 이동
8. `publish/` — direct Threads publisher 이동; Buffer는 이미 신규 구조 적용 ✅
9. 마지막에 `app.js`를 `core/state + core/ui`로 분해
10. root legacy 파일이 없어지면 호환 로더 제거

각 단계마다 `npm run check`와 GitHub Actions smoke test가 통과해야 다음 단계로 넘어간다.
