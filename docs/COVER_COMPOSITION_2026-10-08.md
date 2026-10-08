# 표지 제작 연결과 한 글씩 작업하는 인계

## 승인 범위와 통합 기준

이 변경은 제작 입력 → 표지 합성 → 별도 결과 출력이다. 기존 결과의 `source-bundle.zip` 입력 hash와 본문 페이지 계획을 확인하고 `rendered/slide-002.png` 이후를 그대로 복사한다. 본문을 다시 컴파일하거나 렌더하지 않는다. 원본, 평가, 현재 리뷰 회차와 설치 앱, 바로가기를 수정하지 않는다. 전체 365개를 교체하는 명령은 제공하지 않는다. 새 결과는 미검수·미게시이며 기존 점수를 이식하지 않는다.

최신 리뷰 UI 통합 기준은 `e9911a2e98d2a5e5629974889e07c93b9cd62441`이다. 이미지 계약 `dc9a4f57300af1d07fcbdb84af08e6ec0e8e1785`의 소비 경로를 연결한다. 제목 작업 `e5d81d96159dce02957ff2f155b480acd81ec16e`에서 표지 전용 `titleInfo`, `wrapTitle`만 가져온다. 그 작업의 본문 고아줄·페이지 나누기는 별도 통합 대상이다. `app/source-cut-post-review.*`와 설치 버전은 최신 기준을 유지한다.

## 선택과 구도

원문과 관련 있고 사용권이 검토된 원본 이미지 → 권리 검토된 외부 관련 이미지 → 원문 passage에 근거한 AI 장면 → 이미지가 불필요하면 완성된 글씨형 순서다. 모든 글에 이미지를 강제하지 않는다. 만화·일러스트 느낌의 단일 인물을 기본으로 쓰지 않는다. 사실적인 사진풍의 인물, 행동, 관계와 상황 전달을 우선하며 글마다 장소·색·구도를 결정한다. task10 카드 면담 장면의 정보 밀도와 행동 표현은 최소 참고다. 카드·회사·등장인물·색을 고정 템플릿으로 만들지 않는다.

생성 이미지 안에는 글씨를 넣지 않는다. 제목은 코드로 합성하고 원제 전체를 보존한다. `[판]`, `(네이트판)`, 제목 가장자리 `판}` 등 출처 표시만 분리하여 내부에 남긴다. 한글 단어를 음절로 쪼개지 않는다. 제목이 허용 영역에 맞지 않으면 작게 맞추거나 보류한다. 숫자 유무나 길이를 이유로 의미를 줄이거나 문구를 창작하지 않는다. 원제의 짧은 구절 하나만 포인트색으로 강조할 수 있다.

기본 1080×1080이다. 검토된 `safeArea`가 있을 때만 그곳에 제목을 얹는다. 하단은 검정 그라데이션과 흰 제목을 사용한다. 얼굴·손·행동을 덮을 공간이 없으면 별도 제목 밴드로 재배치한다. `crop`(contain/cover), `subjectRegion`, `aspectRatio`, `safeArea`는 글별 입력이다. 장면 중요한 부분이 잘리면 contain 또는 다른 배치를 선택한다. `AI 연출` 같은 노출 글씨는 넣지 않고 내부 provenance, receipt, 장면이 실재 증거가 아니라는 정보는 보존한다.

부모가 실제 화면에서 확인한 공개 구도 참고: [ddoz_ddoz](https://www.instagram.com/ddoz_ddoz/p/DeHsgyaEwN-/)의 연밥·팔찌 사진 + 하단 그라데이션 + 흰 두 줄, [todopick.official](https://www.instagram.com/todopick.official/p/DeO-5TgE_Qr/)의 맥락 사진 + 큰 흰 제목. 4:5 화면을 정사각형에 그대로 크롭하지 않고 재배치한다. 이는 구도 참고이며 사진 재사용 권리 승인이 아니다. 첫 계정의 3~7장과 추가 계정은 확인하지 않았으며 추정하여 채우지 않았다.

## 소비 경로와 기록

`loadImageRequirements → buildImageHandoff → prepareImageComposition → sourceZip → planBundle → renderBundle` 순서다. `generationRequests`가 남아 있으면 캐시 조회 전과 렌더러 진입 전에 보류한다. 기본 GPT 생성의 자동 호출 공급자는 이 코드에 연결하지 않았다. 예약 에이전트가 지원된 이미지 생성 도구로 실행하고 원본 저장·hash·권리·장면 검토를 완료한 뒤 ready 계약을 만든다. 신규 API, 키, 결제, 계정, 보안 권한, 브릿지 큐 전체 갱신을 요구하지 않는다.

`compositionAssets`와 `selectedCoverAsset`의 실제 파일 bytes를 다시 검사해 source ZIP 안에 포함한다. PNG/JPEG/WebP 서명, 파일 hash, symlink, 크기 제한을 확인한다. 제목·배치·크롭·소비 자산 hash와 렌더러 버전은 제작 fingerprint에 포함된다. 수동 선택 source/external 이미지의 `selectedCoverAsset`도 소비한다. 본문 placement는 현재 승인 범위에서 명시 보류한다.

새 coverRecipeVersion과 completeCover는 단건 표지 명령이나 실제 소비 계약·명시 text 선택에만 적용한다. 계약이 없는 일반 제작과 수동 legacy 보완 표지의 캐시·구도는 유지한다. 단건 명령에 이전 coverAsset 방식이 있으면 selectedCoverAsset 계약으로 검토하여 연결한 뒤 재시도한다. 일반 제작의 이전 coverAsset 지원은 유지한다.

옛 생성 원본의 생성 시각·모델·프롬프트 버전은 모르면 null로 둔다. `receiptOriginalSha256`가 내부 generationReceipt의 실제 원본 hash와 일치하는 경우에만 기존 자산으로 결합한다. 실제 당시 프롬프트 hash와 현재 장면 계획을 섞지 않는다. QA 대표 예외는 `representativeOnly:true`로 이미 준비된 자산만 쓴다. 이미 본 글의 새 생성이나 재발굴은 이 예외로 허용하지 않는다.

## 한 글 제작 명령

이 명령은 저장소 작업용이며 설치 앱 진입점이 아니다. Electron은 프로젝트의 기존 설치 런타임을 사용한다.

```powershell
$process = Start-Process -FilePath 'C:\KJ\Github\Threads\desktop\node_modules\electron\dist\electron.exe' -ArgumentList @('REPO_ABS\desktop\image-production-run.cjs','REQUEST_ABS.json') -WindowStyle Hidden -Wait -PassThru
if ($process.ExitCode -ne 0) { throw '표지 제작 보류: 체크포인트 확인' }
```

```json
{
  "schema": "threads-image-production-request-v1",
  "postId": "source-ID",
  "input": "ABS_STAGING_INPUT",
  "existingOutput": "ABS_EXISTING_RESULT",
  "output": "ABS_SEPARATE_RESULTS",
  "work": "ABS_PRIVATE_WORK",
  "title": "원제 전체",
  "sourceUrl": "확인된 개별 글 URL",
  "reviewProgress": "ABS_CURRENT_REVIEW_PROGRESS_JSON",
  "representativeOnly": false
}
```

입력과 기존 출력은 읽기만 한다. 결과는 `output/postId/fingerprint`에 저장하며 `review-preview.zip`, `source-bundle.zip`, `production-plan.json`, `rendered/*.png`를 만든다. `work/locks/image-production.lock`은 한 글 렌더 전역 락이다. 동시에 실행하면 skipped_running이다. 죽은 락은 자동 탈취하지 않고 PID·체크포인트를 확인한 후 사람이 조치한다. `work/checkpoints/postId.json` complete는 전체 결과 hash 검증 후 already_done으로 재사용하며 held는 이유와 재시도 조건을 남긴다. 완료는 게시나 현재 리뷰 등록을 의미하지 않는다.

## 예약 준비 gate와 우선순위 큐

이 작업은 예약을 생성하지 않는다. 부모가 만든 예약의 실행 준비를 아래 파일로 판단한다. `scripts/image-work-queue-cli.cjs`는 실제 최신 status/평가/검토 진행을 읽어 작업 폴더에만 큐를 쓴다.

```powershell
node scripts/image-work-queue-cli.cjs prepare CONFIG_ABS.json
node scripts/image-work-queue-cli.cjs claim CONFIG_ABS.json
node scripts/image-work-queue-cli.cjs finish CONFIG_ABS.json RESULT_ABS.json
```

config는 `materialRoot`, `repositoryRoot`, 자료 폴더 밖의 `workRoot` 절대 경로와 `attestations` 배열이다. 부모가 실제 완료 문서 파일과 SHA256로 `parent_work_complete`, `documents_integrated`, `supported_gpt_save_verified`, `cover_consumer_integrated`를 확인해야 ready가 된다. `{name,file,sha256}` 없는 gate는 waiting_for_parent_integration이다. 문서가 있다는 사실을 GPT 생성·저장 성공으로 꾸미지 않는다. 큐에는 planningCount / generationReadyCount / compositionReadyCount를 따로 기록한다.

매번 최신 진행 기록과 `05_이전 작업/리뷰 과거`의 진행 기록을 읽어 어떤 버전·회차에서든 seenAt이 있는 글, 현재 보류, 권리 보류, 원문 없음, 중복 ID·정규화 URL·확인된 동일 content hash를 제외한다. 기록의 schemaVersion/recordType/entries가 잘못되면 빈 열람으로 간주하지 않고 실패한다. 짧은 실제 원문은 길이를 이유로 누락 처리하지 않는다. 본문 계획의 실제 sourceUnits를 읽고 전개·갈등·반전·구체적 사물/행동의 문자열 신호로 순서를 잡는다. 단순 유료화/서비스 안내는 후순위다. 이는 휴리스틱 작업 순서이며 재미·사실 검증이나 사용자 평점으로 포장하지 않는다. 평가에는 현재 outputVersion 일치 여부를 붙이고 의견 참고만 한다. 새 결과에 이전 점수를 복사하지 않는다.

claim은 한 글만 반환하고 `work/scheduler/image-work.lock`의 claimToken을 finish까지 유지한다. 원본 sourceFingerprint와 별도 staging manifest·이미지 계약·편집 계획 hash로 workFingerprint를 계산한다. 완료/보류된 동일 workFingerprint는 자동 반복하지 않는다. held를 다시 작업하려면 근거·입력 수정과 명시적인 재시도 기록이 필요하다. staging 입력을 바꿔 재시도할 때 기존 본문 출력 fingerprint를 변경할 필요가 없다. finish는 해당 작업 중 확정된 staging 버전을 저장한다. 한 번 실행할 때 해당 글의 계획을 확인하고 필요한 경우에만 생성한 뒤 단건 제작 명령을 실행한다. complete finish는 대표 QA가 아닌 실제 체크포인트, 요청 input/existingOutput, 별도 결과 경로, 본문 보존 표시와 이미지·ZIP·계획 hash를 확인한다. `RESULT_ABS.json`은 `{postId,claimToken,state:'complete',productionCheckpoint:'ABS_PATH'}` 또는 `{postId,claimToken,state:'held',reason:'확인된 이유',nextAction:'필요한 조치'}`다. 후보가 소진되면 exhausted / stopSchedule:true를 부모에게 반환한다.

완료 기록에는 producer가 실제 소비한 `consumedInputFingerprint`가 있다. finish는 같은 글 ID·제목·URL·coverOnly로 현재 staging 입력을 다시 로드해 비교한다. 편집/계약/자산이 바뀐 뒤 예전 출력의 체크포인트로 새 버전을 완료 처리할 수 없다. 대표 QA의 오래된 체크포인트는 실제 예약 완료 근거로 사용할 수 없다.

오래된 seen snapshot만으로 예약 실행을 승인하지 않는다. 생성 직전 최신 진행 기록을 다시 확인하고 이미 본 글이면 held로 끝낸다. 실제 단건 제작은 representativeOnly가 아니면 reviewProgress의 최신 기록을 입력 로드 전과 렌더 직전에 다시 확인하고 검토 완료된 선택 계약을 요구한다. 생성 실패, 원본 미저장, hash 불일치, 권리·원문·장면·배치 미확인은 보류한다. 저장 경로 우회나 지원되지 않는 도구 재시도로 성공을 꾸미지 않는다.

## 새 수집 인계 형식

현재 묶음 완료 뒤 부모의 ready gate가 열릴 때만 다음 수집을 시작한다. DC/Blind/더쿠/뽐뿌/루리웹 등 다양하게 찾되 실제 공개 원문 접근 가능 여부와 권리를 확인한다. 로그인·접근 차단·보안 확인을 우회하지 않는다. 기사 단순 전재, 서비스/유료화 공지, 본문 미확인 글은 재미 있는 사연으로 공급하지 않는다. 제목만 보고 원문 내용을 꾸미지 않는다.

기존 intake manifest와 imageRequirements 계약을 확장 없이 재사용한다. 각 개별 글에 URL, 수집시각, 원문 게시시각(주장/검증 구분), 원제 전체, 실제 읽은 본문 순서와 image 위치·원본 파일 hash, 댓글/베플의 실제 표시 근거, category/format, 선택·제외 이유, 권리 상태를 남긴다. 편집 계획에는 원제 강조 구절, 표지 타입, 관련 이미지 검토 결과, 필요 장면의 passage 근거·프롬프트·배치, mustNotInvent, status/holdReason, 단건 명령과 작업 폴더를 넣는다. 모르는 시각·모델·반응·권리는 null/held로 둔다. 예약 에이전트는 이 자료를 새 사이트에 업로드하지 않는다.

## 대표 출력 근거

QA는 `C:\Users\user\Documents\Codex\2026-10-08\task-16\representative-qa`에 별도 보존했다. `index.html`, `verification.json`, `protected-files.json`, 단건 요청 JSON 3개, `work/checkpoints/*.json`, 출력 3묶음이 있다. 사용자가 이미 봤던 신입 글은 명시적인 대표 QA 예외로만 처리했으며 새 미리뷰 소재로 공급하지 않는다.

|입력 ID|표지|보존한 본문 PNG|
|---|---|---:|
|source-c17d392921074a|task10 A 실제 생성 원본 + 원제 전체 두 줄 + 두달만에 강조|14|
|source-b12910061b1456|12년차 차장 글의 완성된 정사각형 글씨 표지|1|
|source-5910ffdf9b10c2|뒷담화 계기 글의 완성된 정사각형 글씨 표지|5|

총 결과 이미지 23장 중 본문 20장은 이전 PNG SHA256과 동일하다. A 원본 hash는 `3d1c229c65c1930ae1b038f7dc42a4fc5c8d618b95692557892cb70289b1637a`, 실제 생성 프롬프트 hash는 `6e5b605fcfd10aebf214af24392dc5cf2902f54a06892bbf218b93c729299b89`다. 대표 A 표지 hash는 `a1a520cb1340c7815515492b4f241984cc7cddb88477d37f1326794a6f5e9fd9`다. task9 거절 자산은 사용하지 않았다. B 대안 결과와 초기 진단도 별도 보존했다.

실제 평가/진행은 사용자의 동시 검토로 바뀔 수 있으므로 종료 비교 시 변경 내역만 기록한다. 이 작업은 리뷰 파일을 쓰지 않는다. 초기/종료 검사 자료를 사용자의 최신 상태 위에 덮어쓰지 않는다. 코드 통합·push·설치·리뷰 공급은 부모가 최종 범위를 확인한 뒤 진행한다. 자동 생성 공급자와 신규 본문 제작, 대량 결과 교체, 실제 게시, 평가 승계는 이 변경에 연결되지 않는다.

최종 기준의 코드 보존 근거는 task16 `integration-verification.json`에 있다. 기존 compile/wrap/plainLink/headline 함수는 동일하고 titleInfo/wrapTitle만 추가됐다. 최신 리뷰 UI와 universal/square-cover, universal-production-model은 Git 체크아웃 줄바꿈 차이를 정규화한 내용 hash로 대조했다. 대표 실제 PNG/body hash는 줄바꿈 정규화 없이 bytes로 검증했다. 코드 리뷰에서 일반 캐시·legacy 표지 opt-in과 malformed progress fail-closed를 보강했다.

핵심 관련 검증은 image-composition, image-requirements, image-work-queue, image-work-state, packaged-image-composition, source-renderer-reuse, batch-render, cover-asset 33건이다. 별도 코드 검토에서 발견한 세 문제(일반 캐시/보완 표지 영향, 잘못된 열람 파일 수용, 예전 체크포인트로 수정 입력 완료)가 수정·재현 검증됐다. 대표 3건은 최종 동일 명령에 입력만 바꿔 다시 실행했고 모두 hash 검증 후 already_done으로 반환하여 불필요한 재렌더를 하지 않았다.

새 검토/후속 작업은 사용자 지정대로 Sol 계열을 선택하고 Astra를 선택하지 않는다. 이번 별도 검토의 도구 호출은 gpt-6.1-sol을 명시했다. 실제 주 실행 모델의 외부 설정값을 조회하는 경로는 제공되지 않아 확인했다고 주장하지 않는다. Engram 저장 도구가 현재 노출되지 않아 설치·재시작으로 범위를 넓히지 않았으며 판단과 검증 근거는 이 인계 문서에 보존했다.

15:34 UTC 큐 snapshot: 계획 검토 251건, 과거/현재 열람 제외 114건, 실제 generationReady 0건, compositionReady 0건, gate false. 숫자는 예약 실행 때 갱신되는 snapshot이며 문서의 고정 대상 수가 아니다. 초기 시제품 `codex/automatic-cover-composition-20261008` / `45c9423`은 제목/본문 실험 계보를 보존한 참고이며 통합 대상이 아니다. 통합은 최신 `e9911a2e` 기반 `codex/cover-only-integration-20261008`의 이미지 계약과 최종 표지 변경 두 커밋으로 조율한다. 별도 titlewrap 본문 변경은 이 브랜치에서 적용하지 않았다.
