# 제목 표시 정제 입력 계약

공유 제작·표지 파일을 수정하지 않는 별도 모듈입니다. `title-normalization.mjs`의 `cleanDisplayTitle(rawTitle)`과 `cleanCaptionFirstLine(caption)`을 Node/브라우저에서 동일하게 재사용할 수 있습니다. 현재 원격 main에서는 출처 접두 공통 정제 함수를 찾지 못했으므로 이 경계를 명시해 표지 작업과 통합 시 같은 입력/기대값을 사용합니다.

- 반복된 첫머리 [네이트판], [판], (블라인드), [블라인드] 등 허용 목록의 출처 접두만 제거합니다. 임의 괄호 구절은 삭제하지 않습니다.
- `[ [네이트판] (블라인드) 실제 제목 ]` → `[ 실제 제목 ]`
- `[판] 실제 제목` → `[ 실제 제목 ]` (캡션 첫 줄 경계)
- `[ 판교 판사가 판단한 사건 ]` → 동일
- 본문에 등장한 [판] 인용·일반 단어 판·CRLF·문단·끝 공백 → 동일
- 원본 제목은 `post.source.original_title`/`source.label`, URL은 `source.url`로 그대로 보존합니다. 표시용 정제는 canonical 제작 outputVersion의 입력을 바꾸지 않습니다.
