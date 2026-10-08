# 모바일 준비판: 읽기 전용 호환 조사

검토 기준 branch codex/android-review-20261008, pinned SHA af392a1d22e0a593659c1fdce79184912d6d9803. 전체 브랜치 merge/cherry-pick, 계정인증, 모바일 실제 import/export 연결, 사용자 평가 쓰기는 수행하지 않았습니다. 현재 제작·표지·CLI와 독립적인 후속 연결 요구입니다.

현행 desktop/post-review-store.cjs:12 queue는 인스턴스 내부입니다. save(54~61), change visit/decide(72~87)의 전체 read/validate/read-round/writeAtomic과 feedback(17)의 legacy migration을 공동 canonical writer barrier로 감싸야 합니다. list/readSnapshots도 동일한 일관된 export snapshot을 읽어야 합니다. desktop/review-release.cjs의 review-delivery.lock은 현재 PC save/change와 공유되지 않습니다. 모든 writer가 쓰는 잠금을 구현·검증하기 전 모바일 allCanonicalWriters/roundActivation을 true로 선언하면 안 됩니다.

공동 잠금은 회차 교체 시 이동하는07 폴더 밖 materialRoot에 둡니다. PC queue→shared lock, activation→shared lock→delivery lock, mobile import→shared lock→mobile-import.lock 순서를 고정합니다. activation은 CAS부터 전체07 archive·old pointer archive·journal 완료까지 보유합니다. 모바일 withCanonicalWriter(work)는 work를 정확히 한 번 await하고, lock 내에서 readSnapshots를 읽도록 연결합니다. 별도 withSupplyLock은 remote/journal 보호로 유지합니다.

직접 호환 차이2개: exchange.createReadOnlyPcStore는 PC0.3.16만 허용하여0.3.18을 거부합니다. release-feed.selectCompletedRound는 wholeCollectionRegenerated=true 및 모든 출력generated만 허용해 새 표지 수정 verified-intake(false/photo already_done)를 waiting으로 봅니다. 기존 universal 조건은 유지하고, opt-in verified-intake 경로는 완료proof·intakeAuditPassed/preservedCurrent·고유ID·page/post count·fatal없음을 확인해야 합니다. 부분 재제작을 전체 재제작으로 표시해서 우회하면 안 됩니다.

평가 기록.json.mobile-import/UUID의 before.bin/after.json/journal.json/resolved.json 복구 자료와 canonical JSON mobileImport.receipts/revisions/decisionRecords를 보존합니다. 현행 PC save는 top-level metadata를 보존하지만 모바일 revision은 갱신하지 않습니다. PC edit 후 content-hash conflict와 export baseline 갱신 정책을 실제 충돌 테스트로 검증해야 합니다. receipt를 임의 생성하거나 metadata를 초기화하지 않습니다. 전체07 archive는 해당 transaction 디렉토리를 포함해 보존합니다. publish_approved 결정기록은 workflow 적격·실제게시로 자동 승격하지 않습니다.

후속 단계: 공동잠금 unit/E2E 동시writer·회차전환·중단복구 검증 → version/feed 호환 opt-in → 별도 모바일 담당과 code/설치 검증 → 사용자 승인된 실제 연결. 현재 이 문서는 위치·차이 조사 결과이며 연결 완료가 아닙니다.
