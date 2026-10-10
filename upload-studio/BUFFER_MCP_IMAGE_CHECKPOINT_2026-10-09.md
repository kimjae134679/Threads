# Buffer 게시 운영 결과와 재개 규칙 — 2026-10-10 KST

## 묶음 등록 운영 변경 — 2026-10-10 사용자 지시

이 절은 항목마다 list/get를 반복하던 이전 확인 절차를 대체한다. 이번 변경은 체크포인트와 문서의 운영 계약 갱신이며, 실행 코드 구현·배포 또는 새 게시·예약 실행을 뜻하지 않는다.

- 시작 전에 비공개 cooldown과 단일 writer 잠금을 확인한다. 기존 cooldown은 2026-10-11 02:39 KST까지 유지한다. 부모의 2026-10-10 14:53:16 KST 읽기 응답은 하루 요청 잔여 2회, resetSeconds 42337이었다. 절대 초기화 시각은 응답 시각을 더한 추정값이며 실제 reset 완료는 아직 확인하지 않았다. 이 기록에서는 Buffer API를 호출하지 않았다.
- cooldown 이후 첫 요청은 이미 알려진 두 채널을 함께 넣은 목록 조회다. 가능하면 시작 1회로 상태·점유 시각·공통 여유와 응답의 요청 예산을 얻는다. 알려진 계정·채널·정적 설정은 변경 근거가 없으면 재조회하지 않는다. 목록에 다음 페이지가 있으면 전체 페이지를 읽으며 추가 페이지도 예산에 포함한다.
- 현재 저장된 통과 판정과 같은 버전·지문·원본 순서가 맞는 항목만 사용한다. 불명확하거나 이미 예약·접수된 항목은 신규 묶음에서 제외한다. 두 채널의 공통 여유, 미래 공통 시각, 자산 제한을 모두 만족하는 N쌍을 먼저 고정한다.
- 생성 자체는 플랫폼별 1요청씩, 한 쌍당 2요청으로 순차 수행한다. 확인된 일괄 생성 기능은 없다. 각 생성 전 시도 기록·중복 방지를 저장하고, 반환된 ID·상태·문안·이미지 순서·예약 시각을 계획과 대조해 즉시 보관한다. 성공 응답의 정보를 재사용하며 항목마다 list/get를 다시 호출하지 않는다.
- 묶음 종료 시 두 채널 목록을 가능하면 1회 조회해 생성 ID 전부와 기존 예약을 일괄 대조한다. 상태, 플랫폼, 정확한 문안, ordered media URL, 예약 시각을 확인한다. sent는 실제 게시 링크·게시 시각 등 기존 완료 계약까지 충족해야 하며 scheduled는 완료로 표시하지 않는다.
- 불확실한 생성·부분 실패만 예외 조회한다. 알려진 ID는 get, ID가 없으면 제한된 목록 대조로 접수 여부를 확인한다. 조회 전 같은 요청을 다시 생성하지 않는다. 명확히 연결할 수 없으면 미확정으로 보존하고 나머지 묶음에서 제외한다. 다른 한쪽이 이미 접수됐다면 그대로 보존하며 삭제·재예약으로 보정하지 않는다. Meta 제한은 자동 재시도·문안 회피하지 않는다.

### 호출 예산과 부분 결과

시작·종료 목록이 각각 한 페이지이고 예외가 없는 경우 최소 호출 수는 **2N+2회**다. 새 한 쌍은 **4회**(시작1+생성2+종료1), N쌍은 **2N+2회**이며 예를 들어 5쌍은12회다. 생성2N회는 순차 개별 요청이며 하나의 일괄 생성 요청이 아니다.

실행 전 확보할 예산은 **시작 목록 페이지 수 + 2N + 종료 목록 페이지 수 + 오류 예비분 E**다. E는 사전에 별도 고정하며 일반 묶음의 기본 예비분은2회다. 한 페이지 가정의 계획 예산은 1쌍6회, N쌍2N+4회다. 페이지 추가·확인 조회·실패 요청이 있으면 실제 사용량은 더 늘 수 있다. 응답의 모든 적용 한도 중 가장 작은 여유를 사용하고, 종료 조회와 예비분을 먼저 남긴다.

예산이 부족하면 시작 전에 등록할 쌍 수를 줄이거나 생성0으로 대기한다. 중간 실패·예산 변동 시 신규 생성을 중단하고, 요청한 수·접수 ID·한쪽만 접수된 쌍·실패·미확정·일괄 대조 여부·남은 대기를 각각 기록한다. 종료 조회를 못 했으면 대조 미완료로 남기고 성공·완료를 추정하지 않는다. API 요청 예산과 채널별 예약 한도10건은 별개다. 코드나 자동화 설정은 이 문서 변경에서 수정하지 않았다.

이전 집계는 해당 시각의 이력이다. 최신 API 전체 집계 확인은 2026-10-10 08:14:19 KST였고, 이후 부모가 본 화면에는 추가 Threads 제한 경고가 있다. 현재 정확한 오류 총수·ID·원인은 아직 미확인이다. 새로 제작된 출력, 소재 불일치 항목, 정책 제한 항목은 이번 묶음에 자동 편입하지 않는다.

사용자가 요청한 형식은 사진 캐러셀과 Instagram 자체 음악이다. [Buffer 공식 안내](https://support.buffer.com/en-us/articles/scheduling-instagram-posts-reels-stories-and-notifications-3XA98S9Q5p)에 대한 부모 확인에 따르면 사진 게시물 음악은 notification publishing 후 Instagram 앱에서 마무리한다. MP4 또는 자동 음악 게시 구현 완료로 기록하지 않는다.


이 문서는 04_REVIEW_PUBLISH의 외부 전달 담당이 실제 조회·파일 검사·전송 결과를 정리한 공개 운영 기록이다. 아래 과거 체크포인트의 접근 불가·생산 전송 대기 상태는 해당 시점의 이력이다. 현재 재개는 이 상단의 최신 확인과 비공개 원장을 우선한다. 개별 문안, 이미지, 계정·채널 식별자, 게시 링크, 원본 URL, 개인 평가 내용 및 비밀값은 공개하지 않는다.

## 완료 범위와 현재 확인

2026-10-10 약 06:20 KST까지 확인한 상태이며 상시 최신 현황이 아니다.

| 구분 | 실제 확인 |
|---|---|
| 공개 테스트 | 같은 원본 5건을 대상으로 Instagram 5건 sent, Threads 4건 sent·1건 error |
| 기존 예약 | 플랫폼별 10건, 합계 20건 유지. 13개 원본에 해당 |
| 전송 중·현재 보류·삭제 | 각각 0건. 기존 테스트용 비공개 초안 1건 보존 |
| 일시 초안 전환 | 중단 지시 때 13건 전환. 후속 유지 지시에 따라 같은 ID·원래 미래 시각으로 모두 복원 |
| 현재 통과본 | state revision 120의 현재 버전·지문과 일치한 활성 통과 60건 |
| 완료·남은 원본 | 양쪽 sent 4건, 양쪽 완료 전 56건 = 예약이 있는 13건 + 완전 대기 42건 + 한쪽 sent·한쪽 error 1건 |
| 플랫폼별 미완료 | Instagram 55건·Threads 56건. 이 중 기존 예약 제외 대기 45건·46건 |
| 자동 예약 보충 | 부모 운영 담당의 재활성화 후 실제 설정 true 확인. 외부 전달 담당은 설정을 변경하지 않음 |

9개 실제 공개 결과는 provider ID, HTTPS 게시 링크, providerVerifiedAt, publishedAt을 독립 조회로 확인했다. 예약을 완료로 표시하지 않았으며 consumer 최신 결과 30건(예약20·sent9·error1)을 저장 파일과 대조했다. 새 사람 판정 생성·기존 판정 덮어쓰기는 0건이다.

## 사용자 요구와 실제 적용

- Cloudinary Free에는 승인된 완성 테스트와 정확한 통과 버전의 게시용 이미지만 보관한다. 공개 URL 접근은 승인 범위다. 원문·평가·미검토 자료, 결제·플랜 변경·새 비밀값 생성은 제외한다.
- 최종 통과 감사 기록과 원본을 보존한다. 장식 제목 대괄호 제거는 명시 승인된 제한 변환이며 몸통·태그·이미지 순서·원본 bytes를 몰래 바꾸지 않는다.
- 새 전송은 Instagram과 Threads에 같은 원본 글·버전·순서로 한 쌍을 사용한다. 새 예약 쌍은 같은 미래 시각을 사용하며 한쪽 제한에 다른 소재를 대신 짝짓지 않는다.
- 이미 공개된 글은 유지한다. 최신 지시에 따라 기존 예약20건도 유지한다. 삭제·재게시·임의 교체를 실행하지 않는다.
- 세로 캔버스·여백·글씨 배치 보정은 프로그램 제작 담당이 수행한다. 사용자는 내용·순서가 유지되는 해당 보정에 기존 평가 보존을 명시했다. 이는 새로운 사람 통과 판정을 자동 생성하거나 source/rights/safety를 verified로 바꾸는 승인이 아니다. 새 자산 해시·버전 연결과 명시 승인 연결은 별도로 보존한다.
- 한 건의 가로 과다 이미지에는 앞서 승인된 최소 패딩 예외를 적용했다. 1080×552 원본을 1080×568 사본으로 만들고 위·아래8px씩 추가했다. 원본 영역596,160pixel의 동일성을 독립 디코딩 비교로 확인했다. 해당 Instagram의 기존 실패 ID에서만 재전송했고, 이미 sent인 Threads 원본은 유지했다. 이 패딩은 전체 캐러셀 잘림 해결이 아니다.

## 확인된 원인·해결과 미확인 사항

| 현상 | 확인 근거와 조치 |
|---|---|
| Library 원본 다운로드403 | 정상 PNG에도 발생. MIME 누락 때문이라고 단정하지 않음. 차단 다운로드·다른 브리지·credential-protection 경로를 재시도하지 않음 |
| PC 원본 접근 | 이후 지원된 Windows 실행 환경에서 원본을 직접 읽을 수 있었음. 접근 가능 상태와 당시 원격 Library 실패는 별개 |
| 전송 데이터 누락·명령 길이 | 큰 base64는 제한된 조각으로 읽고 전체 길이·해시를 확인. 긴 문서는 구조화된 파일 쓰기 사용. PowerShell 문자열은 ASCII escape로 처리 |
| 비동기 프로세스 | session_id가 반환되면 완료와 exit code까지 기다림. 파일 쓰기가 끝나기 전 후속 업로드를 실행하지 않음 |
| Instagram 가로 비율 오류 | 실패 자산은 약1.9565:1로1.91:1 상한 밖. 위의 승인 패딩 후 같은 ID sent 확인 |
| Instagram 본문 잘림 | 공식 가이드상 캐러셀은 첫 이미지 비율로 나머지를 crop. 정사각형 표지와 다른 비율의 본문 혼합이 잘림 원인과 일치. 모든 장의 동일 비율·안전 여백 보정은 제작 담당 후속 범위 |
| Buffer429 | 안내된 Retry-After를 기다린 뒤 요청과 중복 상태를 다시 확인. 접수된 전송을 재생성하지 않음 |
| 마지막 Threads 제한 | Meta community guidelines 제한을 실제 get_post에서 확인. 어떤 문장·이미지가 원인인지는 응답에 없음. 자동 재시도·우회·새 소재 대체 없음 |
| 이미 공개된 글 수정 | 현재 Buffer 공식 가이드는 published post edit/delete를 지원하지 않음. Instagram 자체의 모든 수정 가능성을 검증한 것으로 확대 해석하지 않음 |

마지막 Threads의 오류 메시지:
> This post has been restricted by Meta for violating community guidelines. Please review the guidelines, edit your post, and try again.

사용자 승인만으로 Meta 제한을 해제할 수 없다. 정확한 거절 자료와 공식 사유를 검토한 뒤 허용되는 수정 범위와 검토를 정해야 한다. 이 기록에서는 원인을 추측하거나 기존 판정을 취소하지 않았다.

## 예약 제약과 남은 일

- 기존 예약13개 원본 중 양쪽 예약이 있는 것은7쌍이다. 같은 시각은1쌍, 다른 시각은6쌍이다. 한쪽에만 예약된 원본6건도 있다. 최신 유지 지시 때문에 기존 시각은 변경하지 않았다.
- 기존 한 쌍은 두 플랫폼 제목·소재 의미가 다르다. 이미지 본문 근거와 제목 불일치는 확인했지만 사용자가 각각 의도한 것인지는 파일만으로 확정할 수 없다. 문안·표지 의미를 바꾸는 일은 단순 괄호 제거를 넘어선다.
- 완전 대기42개 원본 중 이미지 개수만으로 양쪽에 맞는 것은23건이고,19건은 현재 Instagram10장 제한을 초과한다. 개수 통과가 비율·파일·정책 검증 완료를 뜻하지 않는다. 임의 분할·삭제·순서 변경으로 우회하지 않는다.
- 실제 무료 예약 한도는 현재 채널별10건이며 빈칸0이다. 다음 새 쌍은 양쪽 공통 미래 빈칸이 있어야 한다.
- 슬롯은 Asia/Seoul, [08:00,11:00), [12:00,14:00), [17:00,21:00),30분 간격이다. 과거·점유 시각과 provider 실제 한도를 제외한다.
- 시각 변경 승인안: “기존 미게시 예약 중 시각이 다른6쌍을 제안된 같은 미래 시각으로 재배치하세요. 기존 ID·문안·이미지를 보존하고 삭제하지 마세요.” 비공개 원장에는 당일17:00–19:30의30분 간격으로 충돌을 피하는 구체안을 기록했으며 미적용이다.
- 소재 수정 승인안: “불일치한 한 쌍을 확인된 이미지 본문 소재로 통일하고 상대 플랫폼 제목·표지도 수정하세요.” 정확한 수정본과 승인 연결은 제작·검토 담당이 확정한다.
- 외부 전달 담당은 프로그램 코드·배포·다른 담당 문서를 수정하지 않는다. 프로그램 보정·새 자산 전달 완료는 아직 이 작업의 검증 결과가 아니다.

## 파일 계약·소유권과 재발 방지

| 담당 | 소유 범위 |
|---|---|
| 제작·프로그램 담당 | 원문 근거, 실제 렌더러·세로 출력, 원본과 파생 자산, 배포 |
| 검토 앱 담당 | 현재 state와 별도 final-review 결정 파일, 사용자 판정 감사, 결과 consumer |
| 외부 전달 담당 | 승인 버전 비교, 공식 MCP 외부 쓰기, provider 결과·오류·중복 확인, 이 운영 문서 |
| 통합 담당 | 공통 목차·정책·프로젝트 지도와 후속 승인 전달 |

확인된 비공개 파일은 .local/state.json, .local/final-review-decisions.json, .local/final-review-handoff/, .local/assets/, .local/final-review-results/, .local/provider-delivery-log/ 및 .local/provider-delivery-media/ 아래에 있다. 실제 PC 절대 경로, 원본 manifest 참조, 게시 링크·계정·개별 hash와 승인 연결은 비공개 원장에만 남긴다. 기준 공개 소스는 기존 feature/upload-studio-offline-20261009의 upload-studio/다. 이 문서 커밋은 실행 코드·배포 변경이 아니다.

consumer는 파일당 schema:1 결과 객체 하나를 읽는다. 필드는 postId, outputVersion, fingerprint, platform, providerPostId, status, externalUrl, providerVerifiedAt, publishedAt, scheduledAt, recordedAt이다. 누락 값은 null, 시각은 ISO8601이다. 같은 글·버전·지문·플랫폼의 최신 recordedAt을 사용한다. sent+providerPostId+HTTPS게시링크+providerVerifiedAt+publishedAt이 모두 유효해야 완료로 인정한다. 이전 버전 결과는 현재에 자동 승계하지 않는다. 상세 계약은 [DELIVERY_RESULTS_CONTRACT](DELIVERY_RESULTS_CONTRACT.md)을 따른다.

단일 외부 작성자 잠금을 먼저 확인한다. 쓰기 전 시도·원본 연결을 저장하고, 모호한 응답은 조회 후 조정한다. 라이브 목록은 모든 페이지를 확인한다. 원본 전송은 SHA/MIME/순서와 provider object·bytes·PNG metadata를 검증해 재사용한다. 이미 확인한609장 원본 전체를 이유 없이 다시 검사하지 않는다. 원본 검증과 승인 패딩 사본 검증은 구분한다.

상태·오류 원장과 비공개 Library 체크포인트는 같은 고정 참조를 갱신한다. 그 참조와 실제 버전은 공개하지 않는다. 이번 확인에서 원격 보관본은 v2로 교체·재조회됐고 writer guard는 해제됐다. 자동화 활성 여부는 과거 로그로 추정하지 않고 실제 설정을 읽는다. 이번 담당은 자동화 create/update를 호출하지 않았다.

검증 범위는 실제 provider 조회, 현재60건의 판정·버전·지문 비교, consumer최신30결과 비교, 원본 파일/선택 자산·패딩 검사 및 비공개 체크포인트 재조회다. 앱 빌드·렌더러 배포·전체 품질 재검수는 이 문서 작업에서 실행하지 않는다. 공개 문서 검증은 변경된 텍스트의 비공개정보 제외, 링크·UTF-8·공백 및 원격 커밋/본문 재조회로 수행한다. GitHub connector로 쓴 문서 커밋은 PC checkout HEAD/origin 동기화 증거가 아니다.

## 공식 근거

- [Buffer 이미지 규격·캐러셀 crop](https://support.buffer.com/articles/ideal-image-sizes-and-formats-for-your-buffer-posts-JxHNGZFvf9)
- [Buffer 예약과 published edit/delete 제한](https://support.buffer.com/articles/scheduling-posts-4Qdld7giAZ)
- [Buffer 미디어 호스팅](https://developers.buffer.com/guides/hosting-media.html)

---

## 아래는 이전 단계의 보존 기록

# Buffer MCP image delivery checkpoint — 2026-10-10 (KST)

Observed provider snapshot: 2026-10-10 around 03:06 KST. Results below describe that checkpoint, not a continuous live monitor.

Role: 04_REVIEW_PUBLISH. The private image delivery test succeeded in the latest follow-up below. Production publishing still awaits a verified exact-version review handoff.

## Observed results

- The connected Buffer MCP exposes list, get, create and edit post tools.
- One authorized text-only test draft was created and then independently fetched. The provider returned draft, null dueAt, null sentAt and an empty assets list.
- A complete list_posts read for the selected two channels returned only that test draft, with hasNextPage=false. No existing post media URL was available in that snapshot.
- The test draft is excluded from publication and refill. Its ID and exact text remain in the private task result, not this public repository.
- Buffer schema introspection exposes ImageAssetInput.url and ordered AssetInput entries. No upload mutation was exposed.
- The official hosting guide explicitly states that there is no API file upload endpoint. Media URLs must be direct, public, unauthenticated and stable through publication.
- upload-studio/local-assets.mjs stores original bytes locally by SHA-256. production-input.mjs imports ordered manifest images after checking their hashes and production version.
- upload-studio/BUFFER_CONTRACT.md describes an offline adapter. MCP account connection does not enable the local application's send routes.

## Execution blockers

The local execution tool failed during process setup. The authorized Desktop Commander connector reported its monthly usage limit and explicitly instructed no retry or reconnect. No PC directory, local manifest, image bytes, existing storage configuration or current local branch was successfully read in this checkpoint.

The review task read also failed, so the actual frozen approved-version handoff has not been received. Generated output, historical scores, imported files and offline preview approval must not be substituted for the user's current exact-version pass.

No image upload, key creation, security change, public reservation, public publication or recurring executor was performed by this task. The later authorized Cloudinary connection is now verified below.

## Supported next transfer

### One private image test without creating a host

The account owner can open the already-created test draft under the correct Threads channel in Buffer Publish > Drafts, choose Edit, attach the existing finished item's images from the PC in their exact original order, and select Save as Draft without setting a time or adding to queue.

Target: the existing Buffer test draft. No duplicate draft is needed. Cost: no new hosting subscription or plan change is requested; the operation uses the existing Buffer account. Disclosure: selected files are transferred to and stored by Buffer. Draft status prevents social publication; it is not a guarantee that every CDN file URL requires authentication.

After the save, get_post must verify the same ID, draft status, unchanged exact text, null dueAt/sentAt, expected media count and order. A provider media reference alone does not establish byte equality; the approved manifest hashes and source bytes still need verification before public delivery.

### API delivery for approved production versions

Use an existing explicitly approved stable HTTPS media destination if one can be verified. Otherwise the user must approve the precise storage account, destination/prefix, selected files, retention, public URL access and costs before any new hosting or permissions are created. Anyone with a public media URL can retrieve its bytes. Do not expose original input, review records or unrelated images. Signed URLs that may expire before publication and share/preview pages are unsuitable.

The user subsequently selected and explicitly authorized Cloudinary Free for one finished test item and the exact image versions personally passed in review. Paid plans, billing changes, source text, review records and unreviewed material remain excluded.

## Required live handoff and verification

Receive the actual review producer contract before implementing its parser. Minimum information to agree with that producer includes the existing item ID, immutable production/review version, explicit current user pass, exact platform caption/tags, ordered image hashes and file references, destination channel and a fingerprint covering the approved content. These are integration requirements, not a claim that a new schema has already been accepted.

Changed text, hashtags, image bytes or image order requires review again. Unreviewed, changed, rejected and discarded items remain held. Do not auto-approve the collection.

Use Asia/Seoul slots every 30 minutes, per platform, within [08:00,11:00), [12:00,14:00), [17:00,21:00). This yields 18 candidate slots per day per platform. Exclude past and occupied slots, fetch every provider page, respect the account's actual capacity and request budget, and retain remaining passed versions in order. A schedule is not evidence of publication.

Persist a reservation and duplicate fence before a write. Unknown outcomes require reconciliation by provider reads, not a second create. Retry only explicitly failed operations after a duplicate check and with a bounded policy. Record provider ID, scheduled/sent/error status, verified external link and sanitized failure cause. Never journal credentials or complete private captions in this public repository.

## Verification boundaries

This checkpoint changes documentation only. No local code or producer data was modified. Local HEAD/origin equality and a clean PC worktree cannot be verified while PC access is unavailable. The GitHub commit and workflow status are checked separately after the documentation write; do not claim tests passed before those results exist.

## Official references

- https://developers.buffer.com/guides/hosting-media.html
- https://developers.buffer.com/examples/create-image-post.html
- https://support.buffer.com/articles/attaching-images-videos-and-other-media-to-your-posts-eudySt0TnS
- https://support.buffer.com/articles/saving-and-scheduling-draft-posts-CBLXg1yFXp

## Cloudinary connection verified — 2026-10-10 KST

The user explicitly authorized Cloudinary Free storage and public URL delivery for the existing finished test item and exact image versions personally passed in review. Paid plans, billing changes, original inputs, review records and unreviewed material remain excluded. No further authorization is needed for this agreed scope.

The official Cloudinary plugin is now exposed in this session. Read-only get_usage_details succeeded and reported Free with a 25-credit limit. Its zero usage/resource figures were last updated on 2026-10-08, so they do not establish current storage emptiness. A current list_images read succeeded with 60 image records and no continuation cursor, including main-sample. No listed asset was established as the authorized finished test image or a currently passed production version. Samples and screenshots must not substitute for the actual finished file.

The current official upload_asset tool accepts upload_request.file as a URL, local path or base64 string. The older hosted server's URL-only description does not constrain this plugin schema. This is supported input syntax, not proof that a particular PC path or chat attachment is accessible to the upload runtime. A later handoff resolved an existing user-attached PNG as a candidate for the one private test. It is not established as the latest passed production version. PC access remains unavailable and the exhausted connector must not be retried, reconnected or bypassed.

Proposed storage grouping remains buffer-delivery/test and buffer-delivery/passed. When the real file becomes accessible, preserve original bytes, format and order; use an opaque object identifier with overwrite=false, no transformation, no conversion and no automatic analysis. Verify the resulting versioned HTTPS delivery URL and original-byte equality before attaching it. Retain object/version/hash references privately; do not put source bytes, private titles, channel identifiers or credentials in this public note. Oversized assets or exhausted free capacity remain held without a paid upgrade.

A fresh Buffer read verified the existing test post as draft with zero assets, null dueAt/sentAt and sharedNow=false. Both intended channels remain connected and unlocked. A complete scheduled/sending read returned zero posts with hasNextPage=false. No image upload, draft edit, new draft, reservation or publication occurred in this follow-up.

Once the original candidate image is visually verified and a supported transfer is completed, upload that file under the existing consent, edit the existing Threads test draft with saveToDraft=true, preserve its exact text and required metadata, and omit mode/dueAt. Fetch the same provider ID afterwards and verify draft status, unchanged exact text, null dueAt/sentAt, expected image count/order and the verified media reference. The test remains excluded from public publishing.

Production delivery still requires the producer's frozen exact-version pass and ordered media/content handoff. Only those versions may enter the already-authorized KST slots, within actual provider limits and after reservation/duplicate checks. A connection, sample asset or text-only draft does not prove successful image delivery.

Sources:
- https://cloudinary.com/documentation/cloudinary_llm_mcp
- https://cloudinary.com/pricing

## Existing attachment transfer check — 2026-10-10 KST

The resolved candidate was read through Library, and its fixed file reference was passed to prepare_materialize. The preparation succeeded but returned workspace_path=null and a short-lived HTTPS GET download URL with no extra request headers. The exact private Library/file identifiers and transfer URL are retained privately and are omitted here.

The image read returned an image asset pointer and extracted caption/OCR; this execution environment did not receive renderable pixels. Original visual inspection has therefore not been completed here. No local file was created, and no unsupported PC access was attempted.

Cloudinary's exposed upload schema supports URL input, so an original-byte remote ingestion route is a candidate without assuming the remote service can read a PC path. The URL has not been submitted to Cloudinary in this checkpoint. Library helper requirements still govern any local materialization. No successful upload, new asset URL, draft image edit or current-version production approval is claimed.

## Private image delivery test succeeded — 2026-10-10 KST

The parent execution environment materialized and visually inspected the same resolved Library candidate. It confirmed an actual finished cover image rather than a UI screenshot. This satisfied the requested original visual check. The older attachment remains test-only and is not an established current passed production version.

A fresh Library transfer preparation returned a HTTPS GET download URL with no extra request headers. The official Cloudinary upload_asset tool successfully ingested that URL into the approved test storage group. The target public object was checked absent before upload, overwrite=false was supplied, and no transformation, conversion, OCR, analysis or new credential was requested. Neither a PC path nor the parent's cloud filesystem path was submitted as a remote-server-local file.

An independent Cloudinary get_asset_details read confirmed the same asset and version: PNG, 1,615,694 bytes, 1080 by 1080 pixels, public upload delivery, zero derived assets. These match the Library source metadata. Cryptographic source-versus-delivery byte equality has not been independently checked; matching byte counts and dimensions are not a hash comparison.

The existing Buffer test draft was then edited with the verified versioned HTTPS image URL, unchanged text, saveToDraft=true and no mode/dueAt. No duplicate post was created. An independent get_post read verified the same draft, exactly one image, unchanged text, matching media source URL, null dueAt/sentAt, sharedNow=false and isCustomScheduled=false. A complete scheduled/sending read for both intended channels still returned zero posts and hasNextPage=false.

Exact source identifiers, Cloudinary asset/object/version references, image URL, and Buffer post ID are retained in the private task evidence. This public document contains no private title, image link, account identifier or credential. No payment, plan change, public social reservation or public social publication occurred.

The one private test is complete. Production delivery remains held until the review producer supplies explicit user-passed immutable versions with exact captions/tags, ordered source image references/hashes, destination channels and duplicate fences. The test image must never enter the production refill queue.

## Current integration boundary: separate verdict and delivery records — 2026-10-10 KST

The user's latest direction simplifies the review-to-uploader boundary. This section supersedes the earlier proposal to require a new comprehensive approved-input export. The review owner will confirm the exact existing-result paths, separate verdict-file path and field names. This task must not invent those paths, create passes, rewrite the shared queue or replace the whole review state.

Review records only the post identity, result version/fingerprint, verdict (passed/revise/discard) and review time in a separate decision file. The production ledger, existing completed output and Buffer delivery state remain distinct. The uploader reads that decision file together with the existing result; only a current passed verdict whose result version/fingerprint matches exactly is eligible.

Before transmission, read the current verdict and result again, confirm exact platform text/tags, and verify every original image in its approved order. Missing, mismatched, changed, unreviewed, on-hold, revised or discarded versions are excluded from new reservations/publication. Only the exact matching current passed version is allowed. Adding the hold verdict does not authorize deleting or changing existing provider reservations. Read existing result metadata and bytes through the owner's confirmed supported route. No additional approval schema or synthetic manifest will be required merely for this task's convenience.

Uploader-owned delivery records are separate from the decision file, review state and production ledger. Use the owner's confirmed result destination when available; do not invent or create a new local path here. Record the source identity/version/fingerprint, ordered original-image hashes and Cloudinary object versions, destination, planned KST time, provider ID, status, failure cause and verified link. Do not store credentials or private source/review material in this public repository.

Existing authorization still covers Cloudinary Free for the test and exact user-passed versions, plus platform-specific 30-minute scheduling inside KST [08:00,11:00), [12:00,14:00), [17:00,21:00). Reconcile current provider reservations and account capacity before sequential writes. Preserve exact caption/tag/image content; uncertain responses require reads and duplicate reconciliation before any retry.

The exact decision-file/result contract and accessible delivery-record destination are pending the review owner's confirmation. No production upload or reservation has been performed. The old test draft remains excluded from production. Multiple-image delivery, Instagram delivery and production sequential scheduling remain unverified.
