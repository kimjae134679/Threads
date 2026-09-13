# 00 — START HERE / 운영 관제판

이 저장소는 역할별로 분리해서 운영한다. 한 사람이 여러 역할을 맡아도 **산출물과 책임 경계는 섞지 않는다.**

## 전체 흐름

```text
01 DISCOVERY
소재 찾기 / 사용자가 직접 제보
        ↓ Candidate Packet
02 EDITORIAL & SCORING
사실 확인 / 자료 정리 / 점수 / 콘텐츠 각도 결정
        ↓ Approved Content Brief
03 PRODUCTION
Threads 글 / Shorts·Reels·TikTok / Carousel / Blog / YouTube 제작
        ↓ Draft Package
04 REVIEW & PUBLISH
권리·안전·사실 검수 / 사람 승인 / 실제 게시
        ↓ Publication Record
05 EXPERIMENTS & ACCOUNTS
계정별 실험 / Insights / 클릭·전환·수익 / KEEP·KILL·SCALE
        ↓ 다음 실험 가설
01 DISCOVERY로 피드백
```

## 역할 바로가기

| 파트 | 하는 일 | 하지 않는 일 | 다음 파트에 넘기는 것 |
|---|---|---|---|
| [01 DISCOVERY](../01_DISCOVERY/) | 트렌드·링크·아이디어 수집 | 최종 점수, 최종 문안, 게시 | Candidate Packet |
| [02 EDITORIAL & SCORING](../02_EDITORIAL_SCORING/) | 조사·검증·점수·각도 | 실제 게시물 제작, 게시 | Approved Content Brief |
| [03 PRODUCTION](../03_PRODUCTION/) | 플랫폼별 콘텐츠 제작 | 새 사실 추가, 점수 변경, 게시 | Draft Package |
| [04 REVIEW & PUBLISH](../04_REVIEW_PUBLISH/) | Safety Gate·승인·게시 | 소재 발굴, 성과 해석 | Publication Record |
| [05 EXPERIMENTS & ACCOUNTS](../05_EXPERIMENTS_ACCOUNTS/) | 계정/포맷 실험·성과 분석 | 승인 없이 콘텐츠 변경/게시 | Experiment Result |

## 실전 벤치마크 / 제작 규칙

실제 운영 패턴을 볼 때는 아래 세 문서를 같이 본다.

- [`../docs/BENCHMARK_2026-09.md`](../docs/BENCHMARK_2026-09.md) — Meta/Threads 공식 guidance, 대규모 포맷 데이터, creator/brand 사례, 한국 public snapshot, Shorts 기준
- [`../03_PRODUCTION/FORMAT_PLAYBOOK.md`](../03_PRODUCTION/FORMAT_PLAYBOOK.md) — F01~F20 콘텐츠 포맷, H01~H10 Hook, CTA/asset/reply taxonomy
- [`../05_EXPERIMENTS_ACCOUNTS/EXPERIMENT_MATRIX.md`](../05_EXPERIMENTS_ACCOUNTS/EXPERIMENT_MATRIX.md) — TH-A/B/C 초기 실험 조합과 판정 방식

벤치마크는 시작 가설일 뿐이다. 실제 계정 결과가 쌓이면 **우리 own data를 우선**한다.

## 절대 규칙

- 앞 파트의 산출물을 뒤 파트가 임의로 다시 해석해서 바꾸지 않는다. 수정이 필요하면 이전 파트로 되돌린다.
- 사실/출처는 `02`가 소유한다. `03`은 표현만 바꾸고 새 사실을 추가하지 않는다.
- 게시 권한은 `04`만 가진다.
- 계정 전략과 성공/실패 판정은 `05`가 소유한다.
- 같은 콘텐츠를 여러 계정에 그대로 복제해서 뿌리는 방식은 실험으로 보지 않는다. 계정마다 명확한 가설/포지셔닝/형식 차이를 둔다.
- 계정 여러 개는 정책 회피용이 아니라 **서로 다른 콘텐츠 전략을 비교하는 실험군**으로 운영한다.
- `A10 Unknown rights` 자산은 실제 게시하지 않는다. 권리를 확인하고 분류/Safety Gate를 다시 검토한다.

## 현재 실행 프로그램

```text
npm start
http://127.0.0.1:4173/app/
```

현재 앱은 위 5단계를 하나의 Trend Inbox UI에서 처리하는 MVP다. 폴더 분리는 사람/AI 역할과 인수인계를 명확히 하기 위한 운영 구조이며, 기존 코드 파일 위치를 무리하게 이동해 실행을 깨뜨리지 않는다.

후보에는 계정/가설/버전뿐 아니라 콘텐츠 포맷·훅·CTA·자산 출처·Reply mode·Topic tag 계획까지 실험값으로 저장할 수 있고, 새 publication에는 해당 전략을 snapshot으로 고정해 과거 성과 귀속을 보존한다.

## 작업 시작 방법

1. 내가 지금 어느 역할인지 확인한다.
2. 해당 역할 폴더의 README를 먼저 읽는다.
3. 필요한 경우 위 벤치마크/Playbook/Matrix를 확인한다.
4. 입력 계약을 확인한다.
5. 자기 역할의 산출물만 만든다.
6. 완료 후 다음 역할의 입력 형식으로 넘긴다.

상세 인수인계 필드: [`../docs/HANDOFF_CONTRACTS.md`](../docs/HANDOFF_CONTRACTS.md)
