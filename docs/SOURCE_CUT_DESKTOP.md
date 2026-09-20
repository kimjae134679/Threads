# 링크 캡처와 Windows 컷 편집기

HTML 파일을 직접 여는 대신 Windows 앱 `Threads Cut Editor.exe`를 실행합니다. 기존 컷 편집 화면과 저장 파일 형식은 그대로 사용합니다.

## 사용법

1. 앱 위쪽 **게시글 링크**에 HTTPS 주소를 붙여 넣습니다.
2. **링크 캡처해서 열기**를 누릅니다. 진행 표시가 페이지 열기 → 아래쪽 본문 불러오기 → 이미지 생성 순서로 바뀝니다.
3. 캡처가 자동으로 원문 목록에 들어갑니다. 아주 긴 페이지는 최대 8000px 높이의 연속 이미지로 나뉩니다. 각 원문에서 표지 범위와 본문 분할선을 지정합니다.
4. 편집 저장으로 원본과 설정을 보관하고, 본문 확인 후 PNG ZIP으로 내보냅니다.

기존 편집을 바꾸기 전에 교체 확인을 합니다. 취소·실패 시 기존 편집은 보존합니다. 캡처 취소 버튼도 제공합니다. URL을 붙여 넣는 것만으로 자동 실행하지 않습니다.

## 범위

- 공개 HTTPS 페이지의 현재 본문을 캡처합니다. 페이지 UI는 캡처에 포함되므로 편집 범위에서 제외합니다.
- 로그인 정보나 기존 브라우저 쿠키를 가져오지 않습니다. 로그인/보안 확인/접근 차단은 우회하지 않습니다. 인식되지 않은 로그인 안내나 오버레이는 이미지에 남을 수 있으므로 결과를 확인해야 합니다.
- 무한 스크롤·가상 목록·계속 높이가 달라지는 페이지는 전체 확보를 보장하지 않습니다. 최대 너비 1280px / 높이 48000px / 60초까지 처리하며 초과하면 수동 캡처를 안내합니다.
- 제한 소스 DCInside/Blind의 자동 캡처는 기존 프로젝트 규칙에 따라 제외합니다. 직접 찍은 이미지는 기존 입력으로 넣을 수 있습니다.
- 브라우저에서 HTML만 열면 링크 캡처 버튼은 비활성화됩니다. 실제 캡처는 데스크톱 앱에서 실행합니다.
- Windows x64 ZIP은 압축을 모두 풀고 폴더 안 EXE를 실행합니다. EXE만 다른 곳으로 옮기면 실행되지 않습니다. Node 설치가 필요 없는 배포본입니다.
- Canva와 외부 게시 기능은 추가하지 않았습니다.

## 개발 실행과 빌드

저장소 루트에서:

```sh
npm ci --prefix desktop
npm start --prefix desktop
npm run pack:win --prefix desktop
```

빌드 결과: `desktop/dist/Threads-Cut-Editor-0.1.0-Windows-x64.zip`.
앱은 기존 전체 운영 서버와 분리되어 있어 API 키나 SQLite 서버 없이 편집을 실행합니다.

## 검증

`npm run check`는 URL/네트워크 주소 제한, 누락 없는 긴 이미지 분할, 실패 후 창 정리, 최소 IPC 공개 범위와 기존 기능을 검사합니다.

실제 데스크톱 검사: `npm run smoke --prefix desktop`. 18000px 테스트 페이지의 연속 3장 캡처, 실제 example.com 캡처, 앱 버튼으로 캡처 후 편집기에 열린 결과를 확인합니다. 결과는 `desktop/dist/smoke/report.json`에 기록합니다. 실행 성공 여부는 최신 handoff를 확인합니다. 테스트 산출물은 공개 GitHub에 올리지 않습니다.

보안 구현 근거: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [Chrome DevTools Page.captureScreenshot](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-captureScreenshot). 원격 페이지에는 Node·preload를 노출하지 않고 별도 세션을 사용합니다. 앱의 파일 저장은 사용자 저장 대화상자를 사용합니다.
