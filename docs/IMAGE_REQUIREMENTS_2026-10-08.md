# 원문 근거 이미지 입력 계약 v1

범위: 01 수집에서 이미지 필요성과 원문 근거를 기록하고 03 자동 제작 입력으로 전달한다. 새 이미지 생성, API 호출, 결제, 계정 접근, 게시, 전체 자료 변환, 제작물·평가·본문·회차·리뷰 UI 변경은 하지 않았다.

## 기존 입력을 유지하는 연결

기존 `threads-program-input-v1` manifest에 선택적으로 `imageRequirements`를 추가한다. 또는 같은 후보의 `작업 정보/image-requirements.json`에 독립 블록을 둔다. 두 곳을 동시에 쓰면 일치해야 한다. `source.json`/HTML/이미지·기존 sourceReview/media/status/점수는 그대로 보존한다. 기존 `threads-verbatim-source-v1` 오프라인 입력에도 같은 폴더의 sidecar를 쓸 수 있다.

- 형식: `docs/schemas/image-requirements-v1.schema.json` (JSON Schema 2020-12).
- 검사·파일 무결성·출고: `desktop/image-requirements.cjs`.
- `desktop/batch-input.cjs`는 선택적 계약을 읽고 기존 sourceText/files를 바꾸지 않은 채 `job.imageHandoff`로 전달한다.
- 생성 요청이 남아 있으면 batch-input은 캐시 확인 전에 중단한다. 실제 생성 소비자는 독립 `loadImageRequirements(root, identity)` 또는 CLI `prepare`에서 generationRequests를 읽어야 한다. 생성 대기가 기존 already_done 캐시로 성공 처리되지 않는다.
- 독립 프로그램은 `buildImageHandoff(record, {root, identity:{postId, sourceUrl, productionVersion}})` 또는 CLI `prepare` 결과를 읽는다. `generationRequests`만 생성 작업 입력이다. 보류·불필요·이미 본 소재에는 생성 작업이 없다. `ready`의 `compositionAssets`는 별도 합성 입력이다.
- 선택적 필드가 없는 레거시 입력의 결과는 그대로다. 불명확한 필드를 임의 보정하거나 기존 검수 상태를 승격하지 않는다.
- `desktop/folder-batch.cjs`의 제작 fingerprint에서는 passive imageHandoff와 manifest 최상위 imageRequirements만 제외한다. 나머지 JSON 원문 바이트·본문·자산·규칙 해시는 그대로 유지해 읽은 시각/본 기록 갱신만으로 재제작하거나 평가 버전을 바꾸지 않는다. 원본 manifest/sourceText 파일은 수정하지 않는다.
- `desktop/batch-render.cjs`는 미소비 generationRequests 및 준비된 새 합성 자산을 창 열기 전에 차단한다. 필요한 이미지가 빠졌는데 기존 렌더를 성공으로 보고하지 않는다. 도안/스타일은 수정하지 않았다.

## 선택 순서와 필드

`selection.priority`는 관련 원본 이미지 → 권리 검토된 관련 외부 이미지 → 원문 근거 AI 연출 → 글씨형 표지 순서를 고정한다. `originalDecision`/`externalDecision`에 관련성·권리 보류·부재·불필요·미확인을 구분하고 `choice`와 `reason`을 적는다. 사용 가능한 원본/외부 이미지가 있는데 AI를 선택하거나, 이미지가 불필요한 글에 AI 항목을 넣으면 거부한다. 미확인 자산 검토를 건너뛰어 AI 요청을 출고하지 않는다. 적절한 자산이 없으면 현재 글씨형 표지를 유지하고 프로그램이 제목을 합성한다. 새 도안은 이 작업 범위에 없다.

원본/외부 이미지를 실제 선택하면 `selection.selectedAsset`에 종류·로컬 파일·SHA256·개별 출처URL·관련성·실제 상업권 근거를 연결해야 한다. `usable` 표시만으로 통과하지 않는다. 원본은 글의 sourceUrl과 연결하고 외부 이미지는 그 자산의 확인된 개별 출처를 적는다. 파일 해시와 소스/개인정보 검토를 확인한 자산만 `selectedCoverAsset` 합성 계약으로 넘긴다. 이 새 선택 입력을 소비할 합성기는 아직 연결하지 않았으며 기존 파서 경로에서는 적용을 중단한다.

| 요구 | 계약 필드 |
| --- | --- |
| 글ID·원문URL·실제 읽은 시각 | postId, sourceUrl, read.status/readAt |
| 읽은 파일·해시·정확한 짧은 원문 근거 | read.reference/sha256/excerpts (본문 DOM 위치 또는 기존 OCR 영역 객체 보존) |
| 부족 여부·판단·원본 권리 | shortage.insufficient/reason/originals |
| 위치·순서·목적 | items[].placement.position/afterSourceId/order/purpose |
| 장면·행동·인물 수·근거·검토자·글별 시각 선택 | items[].scene (evidenceIds는 실제 read.excerpts ID, visualDesign은 글별 인물/구도/색 1~2개/표정 선택) |
| 만들면 안 되는 사실 | items[].mustNotInvent |
| 텍스트 없는 생성 프롬프트·버전 | items[].prompt (compilePrompt로 생성, 임의 추가 문구 거부) |
| 크롭·비율·인물 위치·제목 여백 | items[].composition |
| 불필요·본문 보류·권리 보류·생성 필요·준비됨 | status 및 items[].status, holdReasons |
| 원문·초상·안전 검토 근거 | clearance.status/evidence/reviewedBy (이미지 라이선스와 분리) |
| 도구·확인된 모델·확인 근거 | ready asset.tool.name/model/modelEvidence |
| 파일·해시·프롬프트 연결 | ready asset.file/sha256/promptVersion/promptSha256/generatedAt |
| 글·제작 버전 연결 | productionLink, ready asset.postId/productionVersion |
| 출처 경로·실제 조회/추천 등 | 선택적 collection.discoveredOn/originalSourceUrl/sourceChain/metrics |
| 리뷰 근거 | collection.reviewReference/reviewSha256 |

`readAt`은 이 작업에서 실제 본문을 읽은 UTC 시각이며 예전 acquisition.checkedAt와 다르다. 본문 미확인은 `metadata_only`/`unavailable`, readAt=null, scene/prompt=null 또는 items=[]와 보류 이유로 남긴다. 과거 후보의 bodyRead=true만으로 실제 본문 확보를 인정하지 않는다. 원문 주장은 출처의 주장으로 유지하며 사실 검증 완료로 만들지 않는다.

검증기는 모양·상태·ID·참조·정확한 인용·파일 해시를 검사한다. 인용과 장면의 의미적 일치, 개인정보·초상·본문 이용 허가를 자동 판정하지 않는다. 실제 담당 검토자가 scene.reviewedBy와 clearance 근거를 남겨야 생성 요청을 출고할 수 있다. 공개 사진/웹페이지라는 사실이나 AI 생성이라는 이유는 상업사용 허가가 아니다. 원본 rightsStatus=unknown은 유지한다. generated asset의 상업권도 user_owned 또는 licensed_commercial과 실제 근거가 필요하다.

## 이미지 안 글씨와 생성 이력

생성 원본에는 제목·숫자·댓글·로고·“AI 연출” 글씨를 넣지 않는다. `prompt.noText=true`, `titleBy=program`이다. 내부 이력에는 실제 도구·확인된 모델만 기록하며 미확인 모델은 null, modelEvidence도 null이다. 이미지 생성 도구를 이번 작업에서 선택/실행하지 않았다.

최신 사용자 지시가 앞선 표시 지시를 대체했다. 생성 원본과 합성 결과 모두 “AI 연출” 문구를 넣지 않는다. `provenance={kind:ai_generated, displayText:false, persistInManifest:true, actualScene:false}`, `overlays=[]`로 내부 이력을 보존한다. 현재 합성기는 이 새 계약을 소비하지 않으므로 `ready` 자산을 기존 batch-input 경로로 보내면 명시적으로 중단한다. **새 도구/provider의 생성 요청 소비, 본문 삽입과 내부 이력 보존 합성, 설치본 적용은 미연결**이다. 기존 cover-asset 형식으로 자동 치환하면 이력이 누락되므로 하지 않는다.

다른 도안 작업의 `task-10/generation-record.json`과 실제 텍스트 없는 PNG 두 개를 읽기·해시 대조만 했다. 신입사원 예제의 선택적 `generationReceipts`에 실제 도구명, 원본 파일/해시, 원래 프롬프트/해시, 기록 저장 시각을 보존했다. 모델명·기존 프롬프트 버전·정확한 생성 시각은 노출되지 않아 null이다. `recordedAt`을 `generatedAt`으로 가장하지 않는다. 이력의 `productionVersion=null`, `applicationStatus=not_applied`, `disposition=review_required`이며 현재365개 제작물에 적용되지 않았다.

도안 작업의 원래 프롬프트에는 경리 담당자 성별/약40세 등 원문에서 확인되지 않은 연출 세부가 있다. 이를 새 원문 사실로 승격하거나 컴파일러 프롬프트로 치환하지 않고 원래 이력으로 보존한다. 원문근거 재검토, 권리/안전 확인, 새 프롬프트 버전 및 적용 제작버전 연결 후에만 ready가 가능하다. 과거 textFree=false·본문 미독 상태의 첫 버전은 출고 예제에 넣지 않는다. 카드 면담은 이 글 전용이며 다른 글은 상황·행동·인물·구도·색을 새로 선택한다.

## 같은 소재 반복 전달 방지

`identity.sourceId`는 기존 manifest.id를 그대로 쓴다. `canonicalSourceUrl`은 기존 `intake-policy.cjs`의 canonicalUrl과 같아야 하며 URL 중복키로 쓰인다. 기존 sourceContentHash가 있으면 그대로 연결하고 없으면 null이다. sourceFingerprint는 기존 제작 입력 해시이며 새 중복키로 바꾸지 않는다.

`seenBefore`는 실제 `07_사용자 평가/검토 진행.json`의 entries에서 같은 id와 seenAt를 읽는다. 제작 버전은 기존 `post-review-store.cjs`의 version(row) 계산을 그대로 쓴다. matchedOutputVersions를 보존하고 다른 버전의 점수나 현재 버전의 본 기록으로 이식하지 않는다. 한 번 본 동일 sourceId의 재발견은 버전이 달라도 `excludeFromRediscovery=true`이며 생성·반복 전달 입력에서 제외한다. 점수·메모만으로 본 글을 추정하지 않는다. 모르면 unknown이다. 조회 snapshot의 SHA256과 확인 시각이 맞지 않으면 재확인한다. 기존 후보 큐·랜덤 UI는 수정하지 않았다.

## 실제 예제와 동작 명령

`docs/examples/image-requirements/`의 manifest는 기존 3건을 복사하고 블록만 추가했다. 기존 sourceReview의 false 값·평가·본문 파일은 바꾸지 않았다. evidence.json은 실제 기존 원문/제작 계획의 짧은 근거와 원본 경로·해시를 기록한 입력 예제용 파일이다. `review-progress-evidence.json`은 실제 진행 기록의 id/버전/본 기록만 보존한 snapshot이다.

1. `new-employee`: **엄청난 신입사원이 두달만에 짤린 썰 후기**. 저장 HTML 본문과 해당 문장을 대조했다. 기존 이미지는 게임 장례식 화면으로 사연과 관련이 없다. 카드 용도 확인 대화·2인 장면의 프롬프트 초안은 권리/안전/외부이미지 검토 보류이며, 실제 본 글 기록도 있어 재발견 전달에서 제외한다. 요청0, 이 작업의 생성 파일0. 다른 작업의 생성 원본2개는 미적용·재검토 내부 이력으로만 연결한다.
2. `reply-word`: **12년차 차장입니다. 회사에서 넵 쓰지마세요**. 실제 스크린샷 두 장을 보고 기존 전사 본문과 대조했다. 글과 후속 답변이 핵심이므로 새 AI 이미지 불필요, 글씨형 표지. 원본 스크린샷 권리는 미확인으로 유지. 요청0.
3. `company-feelings`: **2026년 회사별 느낌 NEW ver.**. 실제 manifest/참고 기록을 읽었으나 확인된 본문 파일이 없다. 장면·인물 수·완성 프롬프트를 만들지 않고 source_hold. 요청0.

작업 루트에서 실행:

```powershell
node --test test/image-requirements.test.mjs
node scripts/image-requirements-cli.cjs validate docs/examples/image-requirements/new-employee/manifest.json
node scripts/image-requirements-cli.cjs validate docs/examples/image-requirements/reply-word/manifest.json
node scripts/image-requirements-cli.cjs validate docs/examples/image-requirements/company-feelings/manifest.json
node scripts/image-requirements-cli.cjs prepare docs/examples/image-requirements/new-employee/manifest.json
```

CLI는 stdout JSON/실패 exit=1이며 입력을 쓰거나 이미지를 만들지 않는다. CLI 전체 결과를 자동화가 읽을 수 있다. 검증 통과는 생성·게시·권리 승인을 뜻하지 않는다. 실제 생성 필요·ready 경로는 TEST_ONLY의 소유 텍스트/1px PNG로 해시·내부 생성이력·버전 연결만 검증했다. 외부 도안 원본의 절대경로는 이 PC의 읽기 전용 연결이며 CLI는 실제 파일/해시를 대조한다. 이동된 파일은 연결을 갱신해야 한다. 저장소 테스트는 외부 task-10 원본을 요구하지 않고 로컬 snapshot과 TEST_ONLY 이력 파일로 검증한다.
