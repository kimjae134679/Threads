# 세로 제작 출력과 기존 결과 보존 — 2026-10-09

## 요구와 확인된 원인

표지·본문·댓글을 모두 1080×1440(3:4)로 제작한다. 제목 전체, 한글 단어, 본문·댓글 내용과 순서, 선택한 원문 이미지 영역을 유지한다. 본문 글자 크기는 52px, 줄 높이는 78px이다. 배치 여백은 132px이며 글자 실제 경계는 가장자리에서 120px 이상 떨어져야 한다. 사진형 표지는 기존 원본 전체를 contain 배치하고, 제목과 출처의 실제 글자 경계를 검사한다.

기존 제작기는 내용량에 따라 높이가 달랐다. 1080×552는 허용 비율 상한 1.91:1을 넘는다. 이 한 장에 배경 14px를 추가하면 1080×566이 되어 비율 검사를 통과하지만, 정사각형 표지와 서로 다른 본문 비율을 섞는 문제는 해결하지 못한다. 첫 이미지 비율에 맞추는 캐러셀에서는 뒤 이미지가 잘릴 수 있다. 따라서 신규 제작은 페이지 전체 비율을 통일하고 원문으로 다시 페이지를 나눈다.

근거: [Buffer의 Instagram 비율 범위](https://support.buffer.com/articles/instagrams-accepted-aspect-ratio-ranges-Frc2Xqewbd), [Buffer의 이미지·캐러셀 안내](https://support.buffer.com/articles/ideal-image-sizes-and-formats-for-your-buffer-posts-JxHNGZFvf9). 실제 서비스 화면 확인과 로컬 비율·잘림 시뮬레이션은 별개다.

## 구현

- `app/source-page-plan.js`: 제작 규칙 `2026-10-09.3`, `compileForFeed`, 정확한 정수 비율 검사, 내용 보존 배경 패딩. 과도하게 긴 이미지는 자르지 않고 보류한다.
- `app/source-batch.js`, `app/source-batch-image-composition.js`: 실제 신규 제작에 세로 계획을 연결하고 글자 경계를 검사한다. 계획만 바꾸고 기존 픽셀을 재사용하지 않는다.
- `desktop/batch-render.cjs`: 반환 PNG의 실제 IHDR, 크기, 순서, 수량, 계획 일치, 8MiB 제한을 검사한다.
- `desktop/universal-cover*.cjs`, `desktop/typography-cover-canvas.cjs`: 신규 기본 3:4, 기존 사진 전체 보존, 제목·출처 안전 영역 검사. 명시한 legacy 경로는 기존 동작을 유지한다.
- `desktop/folder-batch.cjs`: 제작 캐시 규칙 `2026-10-09.3-portrait-1080x1440-safe132`로 이전 배치를 구별한다.
- `desktop/cover-reproduction-run.cjs`: 기존 원문 ZIP을 읽어 표지·본문·댓글을 분리된 결과 폴더에 재출력한다. 텍스트뿐 아니라 이미지 전체 영역과 원문 내 이미지·텍스트 순서를 기존 audit로 검증한다.
- `desktop/image-production-run.cjs`: 한 글 제작에도 같은 재출력 경로와 실제 페이지 계획을 연결한다. `bodyPreserved=false`와 새 본문 규칙을 명시하여 픽셀 보존과 내용 보존을 혼동하지 않는다.
- `desktop/intake-pipeline-run.cjs`, `desktop/universal-reproduction-run.cjs`: 표지 메타데이터에 실제 렌더 크기를 기록한다.

## 기존 명령과 재개 계약

기존 설치 실행 명령은 다음과 같다. 새 기능이 포함된 패키지로 통합한 뒤 사용한다.

```powershell
& '<설치된 Threads Cut Editor.exe>' '--cover-reproduction-request=<요청 JSON 절대 경로>'
& '<설치된 Threads Cut Editor.exe>' '--image-production-request=<요청 JSON 절대 경로>'
```

기존 재현 요청은 `schema: threads-existing-cover-reproduction-v1`, 기존 `reviewRound`, 서로 겹치지 않는 절대 `sourceRoot`·`output`·`work`, 글별 `id`·원제목·`titleStyle`·현재 `oldRow`, 검증 가능한 `generatedCover` 기록을 그대로 사용한다. 세로 전체 재배치에는 `layoutMode: portrait`를 명시한다. 생략된 재현 요청은 과거 표지만 수정하는 `cover_only_legacy`이다. 한 글 이미지 제작은 portrait가 기본이다. 역사적 표지 재배치 도구는 legacy 비율을 명시한다.

실행 전 ready gate는 현재 회차와 행의 완전 일치, 원문 ZIP·현재 결과 ZIP·PNG 해시 일치, 글 ID와 생성 기록의 대응, 원본/결과/작업 경로 분리이다. 새 수집·생성·권리 검토를 건너뛰지 않는다. 사용자 생성 원본이 없는 재현 대상은 제작 대기로 보류한다.

`work/reproduction.lock`을 독점 생성하여 중복 실행을 막는다. `progress.json`과 글별 `checkpoints/<id>.json`에 완료·보류를 기록한다. 동일 fingerprint와 결과 파일 해시가 모두 맞는 완료 체크포인트만 재사용한다. 미완료 결과가 이미 있으면 덮어쓰지 않고 보류한다. 실패는 `state: held`, `id`, `reason`, `failedAt`, `publicationAllowed: false`, `regenerationRequested: false` 형식이다. 변경 없는 실패를 반복하지 않고 해당 항목을 해결한 뒤 별도 재개 작업을 한다.

완료 체크포인트는 실제 PNG·ZIP 해시, 런타임, 원본 보존 목록, `oldRow`·`changed`, `versionLinks`를 포함한다. 세로 재출력은 이전 렌더를 새 결과의 `previous-layout/rendered`에 보존하고 원본 결과 폴더는 수정하지 않는다. `layoutReviewContinuity`와 `versionLinks`는 기존·새 outputVersion 및 원문 ZIP 해시를 연결한다. 기존 평가 파일을 이 명령이 쓰거나 이관하지 않는다. 리뷰 담당자가 두 버전을 연결하고 이전 판단을 보존해야 한다. 결과 생성 완료와 현재 회차 활성화, 설치, 실제 게시 성공은 별도 단계다.

예약은 이 작업에서 만들지 않았다. 부모 작업은 검증된 새 설치 패키지와 글별 ready gate를 확인한 후 기존 한 글 명령을 예약할 수 있다.

## 검증과 현재 상태

핵심 테스트 53개 통과. 비율 경계·패딩 불변성, 한글 제목 전체와 강조 범위, 패키지 내부 모듈 경로, PNG 실제 크기·순서·수량, 원문 이미지 누락·부분 잘림·텍스트와 이미지 순서 변경 거부, 캐시와 기존 표지 전용 경로를 확인했다.

기존 원본과 생성 자산만 사용한 실제 Electron 렌더 4글·33 PNG를 별도 로컬 출력에서 확인했다. 페이지 수는 19→21, 3→3, 4→4, 4→5였다. 모든 결과는 1080×1440이며 본문 52px을 유지했다. 긴 제목과 실제 출처 글자 경계도 검사했다. 3:4 전체 보기와 4:5 중앙 잘림 시뮬레이션을 수행했다. 실제 Instagram 화면을 확인했다는 뜻은 아니다.

설치된 `0.3.38-cover.20261009.10`은 이 수정으로 교체하지 않았다. 설치 파일 해시는 읽어서 확인했으며 새 패키지 통합·설치 검증은 통합 담당 단계다. 현재 게시·예약과 기존 원문·결과·평가를 보존한다. 이 작업에서 전체 제작 목록을 재렌더하거나 활성화하지 않았다. 실제 대표 결과와 원문·평가 자료는 Git에 포함하지 않는다.

과거 358개 표지 교체는 별도 완료 기록이 있다(픽셀 변경 123개, 동일 결과 검증 235개). 이후 현재 목록은 실제 결과 199개와 이미지 대기 166개로 변경되었다. 과거 개수를 신규 세로 교체 대상으로 간주하지 않는다. 신규 실제 교체는 현재 대상 목록과 최신 사용자 지시를 대조한 뒤 담당자가 활성화한다.

## 남은 문제와 담당 단계

| 문제 | 확인 결과 | 다음 단계 |
|---|---|---|
| 원래 사용자 스크린샷 픽셀 | 지원되는 Library 내려받기에서 HTTP 403, 새 전송 정보로 한 번 재확인해도 동일 | 원본 접근이 복구된 후 같은 지원 경로로 확인 |
| 실제 Instagram UI | 현재 컴퓨터 도구의 앱·브라우저 목록이 비어 있음 | 게시 담당 환경에서 실제 캐러셀·프로필 그리드 확인 |
| 패키지·설치·현재 회차 연결 | 코드/대표 출력만 검증, 현재 설치·회차는 유지 | 통합 담당이 새 패키지 검증, 리뷰 담당이 버전 연결과 승인 범위 내 활성화 |
| 엔딩카드 | 최초 코드·테스트 추가가 자동 검토에서 거절됐으나 사용자 원문 근거로 1회 재검토 후 허용됨. 준비 코드·테스트 구현, 실제 사용자 카드 내보내기는 여전히 보류 | 승인된 카드 PNG 확보·시각 확인 후 새 패키지의 선택적 자산 연결 검증 |
| 운영 저장소 인계 게시 | 최초 commit·push가 자동 검토에서 거절됐으나 사용자 원문 근거로 1회 재검토 후 허용됨. `codex/threads-portrait-handoff-20261009` 브랜치에 인계 push 완료 | 중앙 main 반영·관리 앱 수집·다른 AI 읽음은 별도이며 미확인 |

엔딩카드 코드 연결과 실제 카드 이미지 확보를 구분한다. 현재 대표 4글·33 PNG에는 엔딩카드를 붙이지 않았으며 기존 결과를 교체하지 않았다.

독립 검토에서 지적된 실제 크기 메타데이터, 출처 안전 영역, 원문 이미지 무결성, 기존 본문 보존 플래그 오류를 수정하고 관련 테스트와 실제 렌더를 다시 확인했다. 원문·전체 캡션·이미지·음성·비공개 평가·비밀값은 공개 저장소와 운영 기록에서 제외한다.

## 선택적 엔딩카드 연결 준비

`desktop/ending-card.cjs`의 `loadEndingCard`와 `appendEndingCard`를 공유 렌더러가 사용한다. 새 한 글 `--image-production-request`의 최종 본문 재배치 뒤에도 연결했다. 요청에 아래 속성을 넣으며, 생략/비활성이면 기존 출력과 fingerprint를 유지한다.

```json
{
  "endingCard": {
    "enabled": true,
    "asset": {
      "file": "<승인된 카드 PNG 절대 경로>",
      "sha256": "<파일 SHA-256 64자리>",
      "handle": "@aftertalk2026",
      "approved": true
    }
  }
}
```

완성 카드 자산은 1080×1440 PNG·8MiB 이하, noninterlaced 8-bit RGB/RGBA이다. `approved`와 `handle`은 upstream에서 실제 픽셀을 확인한 자산의 선언이며 OCR 검증을 했다는 뜻이 아니다. 이미지·문구·편안한 글꼴/크기 조정은 승인된 카드 자산에서 완료해야 한다. 이 연결 코드는 이미지를 생성·재편집하거나 문구를 덧씌우지 않는다. 원본 자산 해시·정규 파일·링크 경로·규격·PNG chunk CRC·압축 데이터와 행 필터 디코딩을 검사하며 미준비/불일치는 렌더 전 보류한다.

카드는 `rendered/slide-NNN.png` 마지막 한 장으로 추가하고 계획의 `role: ending-card`, `endingCard` provenance, ZIP manifest의 장수를 함께 갱신한다. 본문·댓글·원문 ZIP 바이트를 보존한다. 이미 같은 카드가 마지막에 있는 완전한 결과에는 다시 붙이지 않으며 다른 자산·중간 카드·불완전 출력은 보류한다. 자산 SHA는 제작 fingerprint에 포함한다. 본문 감사는 보충 카드 역할을 원문 이미지로 오인하지 않으며 원문 단위 검증은 유지한다.

카드 포함 새 요청은 전체 출력이 필요하다. 과거 표지만 내보내는 `preserveBodyPlan` 소비 단계에는 붙이지 않는다. `--cover-reproduction-request`, 과거 전체 회차 재현/접수 명령과 브라우저 단독 내보내기는 아직 엔딩카드 요청 소비 연결 범위가 아니다. 연결 담당은 공유 `appendEndingCard`를 최종 본문 렌더 뒤에 호출하고 PNG·계획·ZIP·checkpoint를 같은 결과에서 기록해야 한다.

추가 검증은 테스트용 PNG를 사용한 실제 ZIP·원문 보존, 단일 추가·불완전 결과 거부, 자산 해시·handle·승인·규격 보류, fingerprint 변경, 공유 렌더 소비 연결이다. 독립 검토의 기존 엔딩 정보 잔존과 헤더만 있는 PNG 승인 문제를 실패 테스트로 재현하고 수정했다. 원문 ZIP에서 재배치할 때 이전 엔딩 metadata를 제거하고 선택된 카드만 최종에 재적용한다. 카드 미연결 재현 명령도 새 세로 출력에 오래된 엔딩 정보가 남지 않도록 정리했다. 영향받은 핵심 테스트 23개 통과(엔딩카드 7개 포함). 패키지 명시 목록의 새 모듈 누락도 발견·수정하여 평탄화 패키지 경로 검증을 통과했다. 실제 사용자 엔딩카드 시각 검증·새 패키지 실행·전체 결과 활성화는 하지 않았다.
