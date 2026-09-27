# 기존 후보 자료 폴더 빠른 안내

## 열 곳

원문 후보 자료는 저장소의 `data/runtime/program_inputs/`에 정리됩니다. 바탕화면의 **Threads Cut Editor 자료 → 02 프로그램 입력**으로도 엽니다.

## 앱에서 실제 처리하는 순서

1. Threads Cut Editor 0.2.4를 실행하고 **원문 ZIP 제작**을 누릅니다.
2. 기존 후보 목록에서 글 하나를 고른 뒤 **이 글만 수집**을 누릅니다.
3. 원문 선별 화면에서 제목, 본문 조각, 이미지 파일·위치, 실제 댓글을 원문과 맞춰 확인합니다.
4. 확인 표시와 선택을 마친 뒤 원문 ZIP 또는 검수 전 미리보기를 저장합니다.

프로그램 입력 폴더의 `content.txt`는 원문이 아니라 기존 후보/평가를 정리한 참고 파일입니다. 앱의 **원본 폴더 선택**에는 실제 원문 HTML이나 본문 그대로의 TXT/JSON을 넣어야 합니다. 기존 요약을 원문으로 쓰지 않습니다.

## 파일 위치

- `index.csv`: Excel에서 제목·출처·링크·상태 검색
- 플랫폼 폴더: 게시물 단위 `candidate.md`, `content.txt`, `comments.txt`, `manifest.json`
- `media/`: 이미 출처 연결과 SHA-256을 확인한 원본 이미지가 있는 후보만
- 원본 기록: 저장소 `data/candidates/`, `data/jev_results/`, `data/candidate_bundles/`

본문·댓글 확인과 권리·개인정보 검토가 끝나지 않은 자료는 제작/게시 완료가 아닙니다. `publicationAllowed=false` 상태를 유지합니다.
