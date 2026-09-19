# NEXT RUN HANDOFF

Updated: 2026-09-19 09:20 KST

## AUTOMATION-SPECIFIC OVERRIDE — DISCOVERY ONLY
For the separate `Threads 소재 발굴` automation, the user's explicit instruction wins: **01_DISCOVERY only**. Do not enter 02_EDITORIAL_SCORING, 03_PRODUCTION, 04_REVIEW_PUBLISH, or 05_EXPERIMENTS_ACCOUNTS. Do not capture/download source media, render, run Chrome E2E, publish/schedule, or modify existing production artifacts. Keep A0/P0 and `publicationAllowed=false`.

## Latest discovery-only automation batch
- Approximately 55 visible raw leads/results were inspected across Korean-community-first public search queries; weak, duplicate, generic-news and low-story leads were discarded.
- 16 new C1 Markdown candidates were retained in canonical `data/candidates/`.
- Strong examples: `생일선물 차액 35만원까지 계산하는 '반반 합의서' 부부`, `몰래 6천만원 넘게 대출… 코인인 줄 알았더니 게임 현질이었습니다`, `신용대출 1억에 집담보까지 몰래 주식… 손실 80% 넘었습니다`, `남편 월 천 넘게 버는데 "전업주부 하려고 대학 나왔냐"는 시어머니`, `축의금 15만원 낸 친구가 서운했는데, 출산 뒤엔 3일마다 찾아왔습니다`.
- Exact observed titles are preserved separately from content-facing titles. Individual public URLs were verified for every retained record. Repost-only provenance is explicitly marked as repost rather than original.
- Where image-centric content was not actually read, the record says image body unverified rather than inferring it.
- No discovery-only result implies A1/P1; all new records remain A0/P0 and `publicationAllowed=false`.

## Discovery constraints observed
- Korean communities were searched first (Blind, TheQoo, Inven plus searches targeting DCInside/FMKorea/Ruliweb/Ppomppu/Arca). Public search returned the strongest verifiable individual pages mainly from Blind/TheQoo/Inven this run.
- No login, anti-bot bypass, bulk crawling, screenshot capture, image download, OCR, moderation claim, rights claim or publication action was performed.

## Sequential-candidate lane — previous state retained
- Previous handoff had processed historical `260916_6만원도난오해` with exact Bobaedream provenance and left it A0/P0. This discovery automation did not continue that separate sequential/production lane.

## Publication ownership / safety
Only **04_REVIEW_PUBLISH** may actually publish or mark P1. Human rights/privacy/safety approval remains required.

## Next discovery run
Continue new Korean-community-first discovery and exact-source verification. Aim for roughly 40–80 raw leads and 15–30 retained when coverage permits. Do not move into production even if the candidate pool is large.