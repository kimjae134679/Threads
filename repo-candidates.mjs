import fs from "node:fs/promises";
import path from "node:path";

const FILE_RE = /^(\d{6})_(C[012])_(A[01])_(P[01])_(.+)\.md$/;

function section(text, headingPattern) {
  const re = new RegExp(`^##\\s+(?:${headingPattern})\\s*$([\\s\\S]*?)(?=^##\\s+|\\Z)`, "im");
  return text.match(re)?.[1]?.trim() || "";
}

function firstUrl(value) {
  return String(value || "").match(/https?:\/\/[^\s)>\]]+/i)?.[0] || "";
}

function sourceLabel(text, url) {
  const explicit = text.match(/(?:^|\n)(?:-\s*)?(?:출처|Source)\s*[:：]\s*([^\n]+)/i)?.[1]?.trim();
  if (explicit) return explicit.slice(0, 120);
  const haystack = `${text}\n${url}`;
  if (/teamblind|\bBlind\b/i.test(haystack)) return "Blind";
  if (/dcinside|디시/i.test(haystack)) return "DCInside";
  if (/fmkorea|에펨/i.test(haystack)) return "FMKorea";
  if (/theqoo|더쿠/i.test(haystack)) return "TheQoo";
  if (/instiz|인스티즈/i.test(haystack)) return "Instiz";
  if (/ruliweb|루리웹/i.test(haystack)) return "Ruliweb";
  if (/ppomppu|뽐뿌/i.test(haystack)) return "Ppomppu";
  if (/clien|클리앙/i.test(haystack)) return "Clien";
  if (/inven|인벤/i.test(haystack)) return "Inven";
  if (/arca\.live|아카라이브/i.test(haystack)) return "Arca";
  if (/reddit\.com/i.test(haystack)) return "Reddit";
  if (/naver\.com|네이버/i.test(haystack)) return "NAVER";
  if (/daum\.net|다음/i.test(haystack)) return "Daum";
  if (/threads\.net/i.test(haystack)) return "Threads";
  if (/instagram\.com/i.test(haystack)) return "Instagram";
  if (/youtube\.com|youtu\.be/i.test(haystack)) return "YouTube";
  return "repo-candidate";
}

function sourcePolicy(label, url) {
  const value = `${label} ${url}`;
  if (/Blind|DCInside|디시/i.test(value)) {
    return {
      sourceType: "community",
      sourceRisk: "red",
      sourceReason: "프로젝트 정책상 자동 크롤링/대량수집 대상이 아닙니다. 개별 공개 URL과 사람이 확인한 기록만 사용합니다.",
    };
  }
  if (/FMKorea|TheQoo|Instiz|Ruliweb|Ppomppu|Clien|Inven|Arca|NAVER|Daum|Reddit/i.test(value)) {
    return {
      sourceType: "community",
      sourceRisk: "yellow",
      sourceReason: "커뮤니티 후보입니다. 원문·권리·개인정보·명예훼손을 사람 검토하며 자동 게시하지 않습니다.",
    };
  }
  if (/Threads|Instagram|YouTube/i.test(value)) {
    return {
      sourceType: "social",
      sourceRisk: "yellow",
      sourceReason: "공개 소셜 후보입니다. 원문 재사용 권리와 개인정보를 별도 검토합니다.",
    };
  }
  return {
    sourceType: "unknown",
    sourceRisk: "yellow",
    sourceReason: "저장소에서 동기화한 후보입니다. 출처와 권리를 제작 전에 다시 확인합니다.",
  };
}

function processingStage(c, a, p) {
  if (p === "P1") return "published-record";
  if (a === "A1") return "review-publish";
  if (c === "C0") return "provenance-verification";
  if (c === "C1") return "source-asset-acquisition";
  return "editorial-production";
}

function dateFromPrefix(prefix) {
  const yy = Number(prefix.slice(0, 2));
  const mm = prefix.slice(2, 4);
  const dd = prefix.slice(4, 6);
  return `20${String(yy).padStart(2, "0")}-${mm}-${dd}T00:00:00+09:00`;
}

export async function loadRepoCandidates(rootDir, options = {}) {
  const candidatesDir = path.join(rootDir, options.candidatesDir || "data/candidates");
  const names = (await fs.readdir(candidatesDir))
    .filter((name) => FILE_RE.test(name))
    .sort((a, b) => a.localeCompare(b, "ko"));

  const items = [];
  for (let index = 0; index < names.length; index += 1) {
    const filename = names[index];
    const match = filename.match(FILE_RE);
    const [, dateCode, candidateStage, assetStage, publishStage] = match;
    const repoPath = `data/candidates/${filename}`;
    const text = await fs.readFile(path.join(candidatesDir, filename), "utf8");
    const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() || match[5].replace(/_/g, " ");
    const exactLinkSection = section(text, "정확한 링크");
    const observedUrl = firstUrl(exactLinkSection);
    const exactUrl = candidateStage === "C0" ? "" : observedUrl;
    const bodySummary = section(text, "글 내용|확인된 글 내용 요약").slice(0, 1400);
    const format = section(text, "형식").split(/\r?\n/)[0]?.trim() || "";
    const source = sourceLabel(text, observedUrl);
    const policy = sourcePolicy(source, observedUrl);
    const rank = index + 1;
    const stage = processingStage(candidateStage, assetStage, publishStage);
    const createdAt = dateFromPrefix(dateCode);

    items.push({
      id: `repo:${filename}`,
      repoCandidatePath: repoPath,
      repoSynced: true,
      title,
      url: exactUrl,
      kind: "story",
      sourceType: policy.sourceType,
      sourceRisk: policy.sourceRisk,
      sourceReason: policy.sourceReason,
      collectionAllowed: false,
      note: [
        bodySummary,
        `[repo queue] ${rank}/${names.length} · ${candidateStage}/${assetStage}/${publishStage} · next=${stage}`,
        candidateStage === "C0" && observedUrl ? `[provenance index] ${observedUrl}` : "",
      ].filter(Boolean).join("\n\n"),
      signals: { freshness: null, velocity: null, audience: null, originalityRoom: null, revenueFit: null },
      score: null,
      scoreBasis: "repo_candidate_needs_human_review",
      platforms: ["Threads", "Instagram Carousel", "Instagram Reels", "YouTube Shorts"],
      status: "research",
      relatedSources: [],
      sourceMeta: {
        provider: source,
        repoCandidatePath: repoPath,
        candidateStage,
        assetStage,
        publishStage,
        exactUrlVerified: candidateStage !== "C0" && Boolean(exactUrl),
        provenanceUrl: observedUrl || null,
        format: format || null,
        processingRank: rank,
        processingTotal: names.length,
        processingStage: stage,
        publicationAllowed: false,
      },
      scheduler: { manualRank: rank - 1 },
      createdAt,
      updatedAt: createdAt,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    candidatesDir: options.candidatesDir || "data/candidates",
    count: items.length,
    items,
  };
}
