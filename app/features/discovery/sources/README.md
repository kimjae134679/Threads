# Discovery Sources / Theme Lanes

## 목적

Viral Finder가 한 플랫폼의 인기글만 보는 구조가 되지 않도록 **테마별 탐색 레인 + 플랫폼별 수집 방식**을 분리한다.

핵심 원칙:

- 테마는 `app/features/themes/`가 소유한다.
- 이 모듈은 "어디서 찾을지"와 "어떤 테마를 어떤 플랫폼에서 우선 볼지"를 소유한다.
- 외부 사이트 약관/권리 문제 때문에 `발견 가능`과 `본문 자동 수집 가능`을 같은 것으로 취급하지 않는다.
- 자동 본문수집이 허용되지 않거나 확인되지 않은 곳은 **공개 검색 메타데이터 + 사용자 제공 URL/스크린샷 + 수동 Capture**로만 반입한다.

## 탐색 레인

- 웃긴 짤 / 밈
- 커뮤니티 논란 / 의견갈림
- 소식 / 이슈 / 지금 뜨는 것
- 직장 / 취업 / 회사썰
- 연애 / 인간관계
- 돈 / 소비 / 재테크
- 군대 / 학교
- 황당 / 실화 / 반전
- AI / IT / 게임
- 연예 / 방송 / 문화
- 스포츠 / e스포츠
- 음식 / 여행 / 장소
- 동물 / 자연

각 레인은 `themes[]`와 `sources[]`를 가진다. 후보는 기존 Theme Classification을 기준으로 레인에 들어가며, 소스 플랫폼은 별도 메타데이터다.

## 플랫폼 Registry

현재 Registry에는 다음 범위를 포함한다.

- Google Trends
- NAVER 뉴스 / 블로그 / 카페
- Daum 카페
- YouTube
- Reddit
- X / Twitter
- Threads
- Instagram
- DCInside
- Blind
- FMKorea
- 더쿠
- 인스티즈
- 클리앙
- 루리웹
- 인벤
- 뽐뿌
- 아카라이브
- Tistory / 공개 블로그
- 기타 뉴스 / 공개 웹

`adapter` 값은 실제 구현 상태다.

```text
connected                     현재 바로 사용 가능
connected-when-credentialed   API credential이 있으면 사용 가능
manual-only                   자동 대량수집 금지/미사용, 검색 메타+수동 반입
planned / planned-discovery   Registry에는 있으나 실제 adapter 미구현
```

**Registry에 이름이 있다고 실제 크롤러가 구현됐다는 뜻이 아니다.**

## 현재 UI

`DISCOVERY LANES / SOURCES` 패널에서:

- 레인별 현재 후보 수
- 해당 레인에서 우선 볼 플랫폼
- 플랫폼별 연결 방식
- Viral Finder의 레인 필터
- Viral Finder의 플랫폼 필터
- 각 Viral 후보의 실제 출처/레인 chip

을 표시한다.

## 다음 구현

1. `connected`/`connected-when-credentialed` 소스에서 실제 bulk discovery 결과를 레인별 feed로 통합
2. X/Reddit 등 공식 API 사용 가능 시 adapter 추가
3. 공개 검색 인덱스 discovery worker를 별도 서버 모듈로 분리
4. DCInside/Blind 등은 bulk body crawler를 만들지 않고 Capture Packet 흐름 강화
5. 매 실행마다 레인별 최소 후보 수를 보장하는 quota planner 추가
6. 성과 데이터가 쌓이면 `레인 × 플랫폼 × 포맷` 성과를 학습해 탐색 비중을 자동 조절
