# Threads 공식 API 연결

기준일: **2026-09-13 KST**

이 프로젝트는 Threads 게시를 브라우저 자동화로 클릭하지 않고 **Meta 공식 Threads API**로 연결한다.

## 필요한 권한

텍스트 게시 기본:

```text
threads_basic
threads_content_publish
```

게시 후 Insights 회수까지:

```text
threads_manage_insights
```

기능이 늘어나면 그때 필요한 최소 권한만 추가한다. 저장소에는 access token / app secret / cookie를 기록하지 않는다.

## 환경변수

PowerShell:

```powershell
$env:THREADS_ACCESS_TOKEN="YOUR_THREADS_USER_ACCESS_TOKEN"
npm start
```

CMD:

```cmd
set THREADS_ACCESS_TOKEN=YOUR_THREADS_USER_ACCESS_TOKEN
npm start
```

기본 API host:

```text
https://graph.threads.net
```

특별한 검증 목적이 아니면 `THREADS_API_HOST`를 바꾸지 않는다.

## 현재 구현된 확인

토큰이 있으면 앱 시작 시 다음을 읽는다.

```text
GET /me?fields=id,username,name,threads_profile_picture_url,threads_biography
GET /me/threads_publishing_limit?fields=quota_usage,config
```

따라서 승인 Queue에서 실제 게시 전에 **어느 @username 계정으로 나가는지** 확인할 수 있다.

## 실제 텍스트 게시 방식

공식 API의 2단계를 그대로 사용한다.

### 1. 컨테이너 생성

```text
POST /me/threads
media_type=TEXT
text=...
reply_control=...
```

프로젝트에서는 `auto_publish_text=true`를 사용하지 않는다.

### 2. 명시적 publish

```text
POST /me/threads_publish
creation_id=<container id>
```

즉 컨테이너를 만들었다는 이유만으로 공개 게시하지 않는다.

## 앱 안의 게시 조건

`Threads 게시 준비`가 나타나려면 모두 충족해야 한다.

1. 후보 상태 = `ready`
2. 사람 점수 평가 완료
3. Research Bundle = `사람 검토 완료`
4. Draft Studio = `사람 승인`
5. Rights / Safety Gate의 모든 항목 검토 완료
6. Gate에 `BLOCK` 없음
7. `WARN`이 있으면 대응 메모 존재
8. 게시 승인 Queue에서 `게시 대기 승인`
9. 그 승인 이후 초안/검토 상태가 바뀌지 않음
10. `THREADS_ACCESS_TOKEN` 연결됨

그 뒤에도 바로 게시하지 않는다.

```text
Threads 게시 준비
→ 승인된 Threads 초안 읽기 전용 미리보기
→ 실제 대상 @username 확인
→ reply_control 선택
→ "실제 공개 게시" 확인 체크
→ 마지막 confirm
→ 공식 API 호출
```

## 승인 후 텍스트 변경 방지

실제 publish endpoint는 브라우저가 보내는 임의의 `text` 값을 사용하지 않는다.

서버가 전달받은 승인 후보에서 다시:

```text
draftStudio.manualEdits.threads
```

를 읽고, 없으면 승인된 생성본의:

```text
hook + body + cta
```

를 조합한다.

게시 승인 시점의 `basisUpdatedAt`과 현재 후보의 `updatedAt`이 다르면 서버가 게시를 거부한다.

## 게시 후 기록

성공 시 localStorage 후보의 `publications[]`에 다음을 기록한다.

```text
platform: threads
id
creationId
text
replyControl
publishedAt
approvalBasis
insights
```

같은 승인본이 이미 게시된 경우 UI에서 다시 게시 버튼을 내지 않는다.

## Insights

`threads_manage_insights` 권한이 있으면 게시 후 다음 메트릭을 회수한다.

```text
views
likes
replies
reposts
quotes
shares
```

호출:

```text
GET /{thread_id}/insights?metric=views,likes,replies,reposts,quotes,shares
```

성과는 해당 `publication.insights`에 저장한다.

## 현재 범위

현재 공식 게시 연결은 **텍스트 Threads 게시만** 지원한다.

아직 하지 않는 것:

- 이미지/영상 자동 업로드
- 캐러셀
- 댓글/답글 자동화
- 스케줄 자동 게시
- 승인 없는 자동 게시
- 여러 계정 동시 게시

먼저 텍스트 콘텐츠에서 `주제 → 조사 → 초안 → 승인 → 게시 → Insights` 전체 루프를 실제로 검증한 뒤 확장한다.

## 공식 자료

- Threads API 공식 Postman collection: https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api
- Create Text Container: https://www.postman.com/meta/threads/request/34203612-1087ee19-4109-400d-8089-db9ed0a3d8f1
- Profile: https://www.postman.com/meta/threads/request/q9os31a/get-threads-user-s-profile-information
- Post Insights: https://www.postman.com/meta/threads/request/ndeeu6p/get-post-insights

Meta 공식 collection 자체도 최신 변경은 changelog가 더 권위 있을 수 있다고 안내하므로, 실제 배포 전에는 API 변경사항을 다시 확인한다.
