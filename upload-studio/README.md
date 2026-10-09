# Upload Studio · 로컬 게시 준비

사용자의 승인된 v2 방향을 실제 프로그램으로 구현한 별도 모듈입니다. 기존 표지·리뷰·설치본을 덮어쓰지 않습니다.

## 실행

Node.js 24 이상에서 저장소 루트 기준:
```powershell
node upload-studio/server.mjs
```
브라우저에서 http://127.0.0.1:4387 을 엽니다. 서버는 127.0.0.1에만 연결되며 원격 접속·다른 Origin 요청·실제 게시/예약/연결 API를 거부합니다.

Windows 편의 실행은 `upload-studio/START.ps1`, 중단은 `STOP.ps1`입니다. 실행 정책을 바꾸거나 우회하지 않습니다. 실행 정책이 허용하지 않으면 위 Node 명령을 씁니다. 기존 앱·4173 서버를 변경하지 않습니다. 제작 자료는 아래 고정 계약만 읽으며 원본을 덮어쓰지 않습니다.

## 현재 제작 결과 연결

'현재 제작글 불러오기'에서 글을 선택합니다. 기본 자료 경로는 `D:\\A_KJ\\AI\\Projects\\Threads\\자료`이며 다른 경로는 `START.ps1 -MaterialRoot '실제 자료 폴더'` 또는 `node upload-studio/server.mjs --material-root "실제 자료 폴더"`로 지정합니다. 브라우저가 임의 파일 경로를 서버에 넘기는 API는 없습니다.

기존 `desktop/post-review-store.cjs`의 계약을 확인했습니다. `06_자동 제작 결과/status.json`의 글 ID와 `sourceFingerprint/outputSha256/ruleVersion/이미지 SHA-256`으로 동일한 제작 버전을 계산합니다. manifest 순서대로 rendered/slide-*.png의 실제 해시를 확인하고 선택한 글의 이미지 사본만 .local/assets에 저장합니다. 상대경로·realpath·심볼릭 링크 탈출을 차단합니다. 가져오는 동안 버전이 바뀌면 중단합니다. 모든 제작 페이지(최대200장)를 보존하고 Instagram10/Threads20 범위를 넘으면 준비를 보류합니다.

기존 제작 계획에 명시적 `publishCaption` 또는 `caption` 문자열이 있을 때만 그대로 사용합니다. 기존 제작기는 게시 본문을 제공하는 보장된 계약이 없으므로 이미지 본문을 임의 기사화하지 않습니다. 본문이 없으면 빈 공통 문안 편집창에 직접 입력합니다. 같은 글·같은 버전의 재가져오기는 사용자 편집을 보존합니다. 새 버전은 이전 문안을 archive에 보존하고 검수·승인 없이 새 제작 버전으로 교체하며 대기를 자동 생성하지 않습니다. 기존 07_사용자 평가/평가 기록.json의 현재 글 ID·제작 버전과 일치하는 점수/메모 및 다른 버전의 이전 점수는 읽기 전용 참고로 표시합니다. 같은 버전 재가져오기는 평가 정보만 갱신하며 작성한 문안을 보존합니다. 이 평가는 현재 게시 문안 검수/권리 확인/게시 승인을 대신하지 않습니다. 원본 평가 파일에는 쓰지 않습니다.

## 작성과 저장

- 새 글 또는 제작묶음 JSON을 불러옵니다. 별도 발행 제목 입력은 없습니다. 글 ID·제작 버전·기존 원문 정보는 내부 목록용입니다.
- 큰 공통 문안 편집기에 전체 본문을 입력합니다. 첫 줄 `[ 실제 핵심 문구 ]`도 본문 일부입니다. 양쪽 괄호 안 한 칸 띄기를 그대로 저장/표시합니다. 번호·설명용 라벨·자동 제목을 덧붙이지 않습니다.
- 승인된 문안 원칙: 원문에 근거한 간결한 기사체, 핵심 사건/갈등으로 시작, 당사자 행동·발언을 시간순 3~5문단, 실제 후기/결말. '작성자에 따르면', '~했다', '~전했다'를 일관되게 사용하며 원문 없는 반응·교훈·감상을 만들지 않습니다. 논쟁형만 자연스러운 질문을 쓸 수 있습니다. 이 프로그램이 원문을 읽거나 새 사실/평가를 만들어 넣지는 않습니다.
- 오른쪽 작은 Instagram/Threads 버튼은 다중 선택입니다. 공통 문안/태그를 선택한 대상에 적용하며 글마다 독립적으로 저장합니다.
- 미리보기는 작성 화면 바로 옆에 있습니다. Instagram은 이미지 아래 문안, Threads는 문안 아래 이미지입니다. 이미지 순서/넘김, 캡션 접힘/확장, 비율/크롭을 확인합니다. 실제 계정·반응 수는 만들어 표시하지 않습니다.
- 이미지 선택은 브라우저 -> 같은 컴퓨터의 서버로만 전송됩니다. 원본 바이트를 SHA-256 이름으로 저장합니다. 외부 접근이나 외부 전송은 없습니다.
- 예약 시각 선택은 PC의 로컬 시각입니다. 시간대 선택 UI 없이 해당 시점의 UTC 시각과 offset을 저장하고 같은 시각을 로컬로 표시합니다. 로컬 계획이며 시각 도래로 실행하지 않습니다.
- 변경은 순차 자동 저장합니다. 오래된 탭의 쓰기는 revision conflict로 막고 미저장 문안을 유지합니다. 브라우저의 이 프로그램 전용 백업키만 읽으며 창별 고유 ID로 미저장본을 분리합니다. 다른 창의 빈 저장/화면 이동이나 새 글 작성이 복구 대기본을 지우지 않습니다. 재시작 후 별도 복구 영역에서 복원하거나 JSON으로 보관할 수 있습니다. 복구한 원본 스냅샷은 일치하는 확인 기록으로 처리하여 다른 창의 새 편집을 지우지 않습니다.
- 실제 파일은 `upload-studio/.local/state.json`, 이전 저장은 `state.backup.json`, 이미지 원본은 `assets/`, 로컬 dry-run 저널은 `dry-run-journal/`입니다. 손상 복구는 명시적인 '이전 로컬 저장본 복원' 버튼이며 손상 원본도 보존합니다.
- JSON 내보내기는 문안·대상·시각·이미지 ID를 보존합니다. 다른 PC로 옮길 때는 이미지 원본을 포함한 .local 폴더를 함께 보관해야 합니다. 불러올 이미지 ID는 먼저 이 PC에 저장돼 있어야 합니다.

## 검수·대기·dry-run

새 제작 버전은 자동 대기에 들어가지 않습니다. 대기 버튼을 눌러 등록하며 동일 요청은 중복 생성하지 않습니다.
원문 확인, 5개 Safety Gate(PASS 또는 대응 메모가 있는 WARN), 현재 제작 버전의 직접 사용자 평가/검수가 있어야 dry-run 승인할 수 있습니다. 문안·태그·이미지 변경은 기존 검수/승인을 무효화하며 대상/시각 변경도 승인과 대기 내용을 다시 확인합니다. 평가·승인을 임의로 가져오거나 생성하지 않습니다.
계정은 항상 미연결, 실제 게시 승인은 항상 없음입니다. 검수 후 승인 버튼은 **dry-run만** 승인합니다.
대기 목록은 상태/검색/플랫폼 필터/정렬/일괄 선택/취소/명시적 dry-run을 지원합니다. 중단·응답 불명확·재시작 중단은 확인 필요로 잠기며 자동 재시도하지 않습니다. 취소한 글은 문안을 바꾸지 않고 명시적으로 다시 대기에 넣을 수 있습니다.
실제 게시 기록은 실제 응답이 없으므로 비어 있습니다. dry-run 결과는 별도 목록에 외부 요청 0회·실제 URL 없음으로 기록합니다.

## 기존 도구 재사용

기존 `threads.mjs`, `instagram.mjs`, `publication-journal.mjs` 원본을 `vendor/`에 변경 없이 보존했습니다. source blob SHA는 `vendor/provenance.json`에 있습니다. 브라우저 봇이 아니라 공식 API dry-run 구조입니다.
Threads dry-run이 capabilities에서 환경을 읽으므로 작업 프로세스를 `env:{}`로 실행합니다. 이 프로세스의 fetch도 거부하며 실제 credentials 환경을 전달/조회하지 않습니다. Instagram에도 빈 env를 명시합니다.
이미지 계획에는 `https://example.invalid/local/<sha>.jpg`라는 **외부 접근 불가 placeholder**만 넣습니다. 이 주소를 요청하거나 실제 게시에 사용할 수 없습니다.
기존 PublicationJournal의 원자적 claim·payload fingerprint·confirmed replay·불명확 결과 차단을 **로컬 dry-run 범위**에서 재사용합니다. accountKey는 공개된 'unconnected-platform' 식별자이며 token이 아닙니다.

## 최신 공식 범위와 연결 전 별도 승인 단계

확인일 2026-10-09. Meta 개발자 문서는 직접 접근 일부가 429였으며 현재 공식 검색 색인과 공개 Newsroom 화면을 대조했습니다.
- Instagram 캡션 2,200자, 게시 API 캐러셀 최대 10개: https://developers.facebook.com/documentation/instagram-platform/content-publishing 와 https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/error-codes
- Threads 일반 본문 500자, 이모지는 UTF-8 bytes로 계산, 캐러셀 최대20개: https://developers.facebook.com/documentation/threads/posts
- Threads 긴 텍스트 첨부 최대10,000자는 별도 기능: https://developers.facebook.com/documentation/threads/create-posts/text-attachments 와 https://about.fb.com/news/2025/09/attach-text-threads-posts-share-longer-perspectives/
- 이 어댑터는 긴 텍스트 첨부/자동 분할/첫 댓글 자동 등록을 지원하지 않습니다. 일반 본문 제한을 넘으면 남은 글자/초과량·준비 보류를 표시하고 원문을 그대로 보존합니다.
- Instagram 일반 개인계정은 이 공식 게시 API의 대상이 아닙니다. Business/Creator 프로페셔널 계정이 필요합니다. 현재 기존 어댑터는 Facebook Login/Graph 경로이며, 연결된 Facebook Page와 해당 경로의 최소 publishing scopes·명시적 API 버전 확인이 필요합니다. Instagram Login 경로는 별도 어댑터 작업이며 같은 설정으로 대체했다고 보지 않습니다.
- 실제 연결 전 사용자가 승인할 대상: 선택할 플랫폼/정확한 계정, 기존 공식 Meta 앱/로그인 경로, publishing 범위의 권한, 앱 역할/외부 사용자에 필요한 검토·접근 수준, 공개 HTTPS 이미지 저장 위치·외부 공개 범위와 권리. 사용자 본인이 OAuth 동의를 진행합니다. token 값은 앱 서버의 안전 저장소에만 연결해야 하며 클라이언트·문안·JSON·로그에 넣지 않습니다.
- 실제 이미지 게시 전 공개 HTTPS로 Meta가 가져올 수 있는 JPEG 자산과 도달 가능성 검증이 필요합니다. 로컬 PNG/WebP를 바로 업로드 가능한 자산이라고 표시하지 않습니다. 그 외부 검증/저장/변환/연결/게시 과정은 이번 구현에서 실행하지 않았습니다.
- Threads 실제 연결의 최소 범위는 threads_basic, threads_content_publish입니다. 프로필 선택·사용자 최종 승인이 먼저 필요합니다. Insights 추가 권한은 이번 범위에 없습니다.

UI 참고: https://about.fb.com/news/2025/04/new-features-threads-web-experience/ 및 Instagram 공개 metanewsroom 프로필/최신 상세 진입. Instagram 상세는 로그인 안내로 막혀 중단했습니다. 플랫폼 업데이트·계정·기기에 따라 UI는 달라지므로 완전한 동일 픽셀 보장을 하지 않습니다.

## 검증과 남은 적용 단계

`node upload-studio/test/node.test.mjs`는 실제 임시 파일·충돌·손상 복구·노드 worker·기존 저널·로컬 HTTP·서버 재시작·창별 백업·동시 잠금 복구·기존 평가 메타정보를 검증합니다. 저장 잠금은 완성된 고유 owner 디렉터리만 원자적으로 공개하고, 관측한 owner 파일만 해제하여 다른 창/프로세스의 새 잠금을 지우지 않습니다. 이전 버전의 손상된 잠금은 안전을 위해 자동 강제 삭제하지 않습니다. 저장소 `npm run check`에도 연결됩니다.
`node upload-studio/test/browser.mjs`는 CI의 실제 Chromium에서 긴 문안 입력/재열기/나란한 플랫폼 미리보기/대상·시각 분리/검색/일괄취소를 확인하고 실제 스크린샷을 저장합니다. 테스트 자료만 쓰며 외부 요청을 차단합니다. 생성한 디자인 PNG는 앱 화면 증거로 쓰지 않습니다.
PC의 실행 도구가 응답하지 않아 D자료 연결·설치·실제 PC 실행 및 .agents/skills 읽기는 아직 확인할 수 없습니다. 현재 경로는 Codex의 별도 작업영역이고 원본 체크아웃/설치가 아닙니다. 원격 AGENTS/04/contracts/실행 지침을 읽었습니다.
