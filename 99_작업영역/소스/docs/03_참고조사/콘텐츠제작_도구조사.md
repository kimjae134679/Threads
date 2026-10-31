# AI research + creator automation tool stack

Updated: 2026-09-15 KST

This note collects tools that are useful specifically for the current Threads project: Korean-community discovery, source acquisition, AI-assisted research, feed production, vertical-video production, publishing, and analytics.

## 1. AI-native search / research

### Exa
Use for semantic/public-web discovery when normal keyword search is noisy. Good fit for finding recent source pages, alternate coverage, related posts, and first-party sources.

Recommended role in this project:
- topic expansion after Korean-community candidate discovery;
- find first-party fact sources for a viral post;
- find duplicates/same-story pages;
- not a replacement for the actual source page or observed engagement evidence.

### Tavily
Search/extract/research/crawl API aimed at AI agents. Good for short research jobs where one interface should search and return clean context.

Recommended role:
- fact-check bundle generation;
- alternate-source discovery;
- source-page extraction on allowed public pages;
- research fallback when native web results are weak.

### Firecrawl
Web search + page-to-clean-content + crawl/extract. Especially useful after a candidate URL is already known and the goal is to obtain clean text/metadata from public pages.

Recommended role:
- clean extraction from permitted public pages;
- URL -> Markdown/text for source-package creation;
- structured extraction jobs;
- recurring page monitoring for explicitly allowed sources.

### Google Trends + NAVER DataLab
Keep these as trend-signal sources rather than content-source truth.

Recommended role:
- Korea trend spike detection;
- search-demand confirmation;
- topic ranking before manual/community source acquisition.

## 2. Real-browser acquisition

### Camofox
Already installed locally. Prefer as the first local browser-acquisition experiment for permitted public pages.

Role:
- open dynamic public pages;
- acquire visible text/image context when static extraction is insufficient;
- capture screenshots/source evidence;
- never use it to bypass login/anti-bot/access restrictions.

### Browserbase + Stagehand
Cloud browser-agent alternative. Stagehand is designed for agentic browser work and can extract structured JSON from dynamic pages using natural-language instructions. Browserbase also provides managed sessions/search/fetch and human-in-the-loop patterns.

Use only if local Camofox becomes maintenance-heavy or if cloud browser sessions/observability materially help. Do not make both stacks equal primaries.

### Playwright
Keep primarily for deterministic regression/E2E. It can remain a fallback for acquisition where a deterministic script is clearly better than an AI browser.

## 3. Structured scraping / data jobs

### Apify
Actors are scheduled/serverless scraping and browser-automation tasks with structured inputs/outputs and dataset storage.

Recommended role:
- sources that are explicitly supported and allowed;
- repeatable public-web extraction jobs;
- scheduled metadata collection;
- data-provider fallback when maintaining a custom scraper is not worth it.

Do not use an Actor merely to bypass a site's terms or access controls. DCInside/Blind remain public-index/permitted-browser/manual-capture paths.

## 4. Workflow orchestration

### n8n
Useful as a visual orchestration layer for:

`trend/search -> candidate scoring -> research -> source package -> render -> human approval -> official publish -> analytics`

It supports AI nodes, 500+ integrations, human approvals, code, and self-hosting. It is valuable when the pipeline becomes operationally complex, but it should not replace the Threads application's authoritative state/gates.

Recommended use later:
- scheduled research/discovery jobs;
- webhook glue between render/storage/publish providers;
- notifications/approval reminders;
- analytics ingestion.

## 5. Feed image / carousel production

For the current reference-first 1080x1080 feed format, keep the in-app Canvas renderer first because it gives exact control and avoids a paid dependency.

If cloud rendering is later needed:

### Creatomate
Template or JSON-driven image/video rendering API. Easy path for bulk social visuals and short-form videos without operating render servers.

### Shotstack
Cloud media/video editing API. Notable for an MCP server that can be connected to ChatGPT/Codex, allowing an agent to compose/preview/render edits directly. Strong candidate for experiments if direct AI-driven video production is desired.

## 6. Reels / YouTube Shorts production

Do not stretch square carousel assets. Build 1080x1920 MP4 separately.

Candidate approaches:

### Remotion
React/code-based video renderer. Best fit when layout, timing, typography, and version control should live in the Threads repository. More engineering work, but less vendor lock-in and excellent reproducibility.

### Creatomate
Fastest cloud-template path. Feed Source Package data into a vertical template and receive rendered MP4.

### Shotstack
Cloud timeline/render API and AI/MCP integration. Good if we want the agent to generate/edit a timeline without maintaining our own render infrastructure.

Initial recommendation:
- prototype one real Reel/Short in Creatomate or Shotstack to learn the required scene contract;
- once format stabilizes, decide whether to keep the cloud renderer or encode the winning format in Remotion.

## 7. Publishing / republishing

### Official APIs remain the production authority
- Instagram API for professional account feed/carousel/Reels;
- Threads API;
- YouTube Data API for Shorts/video uploads.

### Buffer
Useful reference/optional operational layer. It supports Threads scheduling/trending/analytics and Instagram publishing flows. Keep as fallback/benchmark rather than making Threads dependent on it.

### Repurpose.io
Useful reference for the common creator pattern `one published video -> automatic distribution to Reels/Shorts/other channels`. For this project, the equivalent should eventually be implemented from the verified Source Package + vertical MP4 rather than blindly re-uploading arbitrary source content.

## 8. Recommended stack for this project now

Do not install everything. Current practical stack:

1. Google Trends + NAVER DataLab + native/public search for Korea trend signals.
2. Exa or Tavily for AI-native discovery/fact-source expansion.
3. Firecrawl for clean extraction from allowed public pages.
4. Camofox for real browser acquisition where extraction is insufficient.
5. Manual screenshot intake for Blind/DCInside/restricted or unstable sources.
6. Existing 1080x1080 in-app renderer for Instagram/Threads.
7. Later: one cloud video renderer experiment (Shotstack or Creatomate), then decide on Remotion.
8. Official platform APIs for publishing; 04 remains sole publication owner.
9. n8n only when orchestration complexity justifies it.

## 9. ChatGPT-direct integrations found

The ChatGPT plugin directory currently exposes:
- Firecrawl
- Tavily AI
- Exa

These are especially useful because ChatGPT can call them directly after the user connects them. They can reduce manual copy/paste and make broad research/source extraction easier inside the same conversation.

## Guardrails

- no fabricated metrics or extraction success;
- search/index evidence is not equivalent to source-page evidence;
- no login/anti-bot bypass for restricted communities;
- no plaintext credentials;
- generated imagery is not the default feed path;
- source asset provenance and review state stay attached to every output;
- 04 REVIEW_PUBLISH remains the only owner of final publishing.
