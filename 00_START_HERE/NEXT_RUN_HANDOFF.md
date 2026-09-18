# NEXT RUN HANDOFF

Updated: 2026-09-19 KST

## CURRENT USER OVERRIDE — PROCESS ALL CANDIDATES SEQUENTIALLY
The previous **DISCOVERY ONLY** override is superseded by the user's 2026-09-19 instruction.

Current operating order:
1. Start from current `main`, this file, the latest sequential T-0008 ops note, `data/_system/candidate-program-queue.json`, and `data/_system/candidate-program-progress.json`.
2. Refresh the queue from **every current file in `data/candidates/`**, including newly discovered candidates.
3. Process candidates one-by-one in deterministic filename-ascending order using stable `candidateKey` identity.
4. On the hourly scheduled run, work on **one next unprocessed candidate** as far as safely possible.
5. Record progress/blockers so future runs do not repeat finished work.

## Current inventory / program wiring
Current inventory after the first sequential provenance pass:
- total: **583**
- C0: **76**
- C1: **507**
- C2: 0
- A0: **583**
- A1: 0
- P0: **583**
- P1: 0

Program version: **0.42.3**

Repository candidates now flow into the running app through:
- `repo-candidates.mjs`
- `GET /api/repo-candidates`
- `app/repo-candidate-sync.js`

The browser Inbox merges repo candidates without overwriting richer user-edited state. Queue order is also written to:
- `data/_system/candidate-program-queue.json`

Cycle state is written to:
- `data/_system/candidate-program-progress.json`

## Stage rules
- **C0**: verify the exact individual public source/provenance first. Do not treat an index/list URL as the canonical source.
- **C1**: acquire real source screenshots/media only through public/permitted access. Never bypass login, anti-bot, paywall, or access controls.
- If a restricted/community source requires a manual screenshot, record the blocker/unblock condition and move to the next candidate on the next cycle.
- Never fabricate body text, comments, metrics, screenshots, media, OCR/vision results, moderation, rights clearance, A1, or P1.
- Production/editorial steps may proceed only from evidence actually acquired/verified.

## Binding cover / carousel rule
Latest user cover decision supersedes older blur language:
- **NO blur on the cover.**
- If the source contains a real image/media asset: use that source media directly as the cover background, without blur or generated replacement imagery.
- If the source is text-only: use **text-only cover**, with no generated image.
- Cover title: large, punchy, positioned higher; thin outline only for readability.
- Slide 2 onward: preserve original source screenshot/media order and content. No editorial reordering.
- Generated-image fallback remains disabled.

The runtime/card/source-package implementation was updated to this rule in v0.42.3.

## First sequential cycle completed
Original queue rank 1:
- `260916_C0_A0_P0_2026회사별느낌.md`
- exact public Blind post recovered:
  `https://www.teamblind.com/kr/post/2026%EB%85%84-%ED%9A%8C%EC%82%AC%EB%B3%84-%EB%8A%90%EB%82%8C-NEW-ver-bb05egco`
- candidate promoted to:
  `260916_C1_A0_P0_2026회사별느낌.md`
- next stage is blocked on **manual source screenshot acquisition** because Blind must not be auto-crawled/bypassed.
- no A1/P1/right/privacy/OCR/moderation success was claimed.

After refresh, the current next queue item is:
- `data/candidates/260916_C0_A0_P0_25살연애불가능할까.md`


## TEMP TEST ONLY conversion lane — user-added 2026-09-19
The hourly candidate-processing automation now has a second, explicitly temporary lane for gradually testing real conversion work from the user's 9–16 progress list.

Canonical temporary root:
- `03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/`

Binding isolation rules:
- Every test artifact stays under that root or a descendant whose name still contains `TEMP_TEST_ONLY` / `DO_NOT_PUBLISH`.
- Test outputs are **not production assets**, **not approved assets**, and **not live-use artifacts**.
- Keep `temporaryTestOnly=true` and `publicationAllowed=false`.
- Test results do not promote real candidate C/A/P states.
- Real publishing/metrics (item 16) stays disabled until the user later gives separate explicit approval for a specific live post.

The temporary lane advances one small unit per hourly run across:
9. permitted URL→full source body/media acquisition wiring
10. UI-chrome exclusion/crop review
11. paragraph/scene-boundary splitting
12. verified-content title suggestions
13. browser generate→download→reconnect/restore review
14. review-screen connection
15. approved-test-output runtime/PR reflection
16. live publish/metrics — DISABLED in this test lane

First temporary prototype exists at:
- `03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/260916_2026회사별느낌/`
- text-only no-blur cover prototype created
- conversion manifest created
- full body/source screenshot work is BLOCKED because the Blind source is not fully acquired and must not be bypassed.

Temporary progress:
- `03_PRODUCTION/_TEMP_TEST_ONLY_DO_NOT_PUBLISH/TEMP_TEST_PROGRESS.json`

## Publication ownership / safety
Only **04_REVIEW_PUBLISH** may actually publish or mark P1.
Human rights/privacy/safety approval remains required. The hourly processing schedule must never auto-publish.

## Verification
Windows clean-clone verification on 2026-09-19:
- `npm run check` **PASS**
- repository candidate sync test PASS
- source-package/card storyboard regressions PASS
- existing persistence/publisher/video/discovery regression suite PASS
- actual ffmpeg vertical render/ffprobe PASS

## Next
Refresh the queue first, then process exactly the next eligible candidateKey. Update both the progress file and this handoff after meaningful changes. Append the next sequential Sol ops note.
