import fs from "node:fs/promises";
import path from "node:path";
import "./app/unified-material-txt.js";
import {cleanDisplayTitle} from './upload-studio/title-normalization.mjs';
const MaterialTxt=globalThis.ThreadsUnifiedMaterialTxt;

const LEGACY_RE=/^(?:\d{6}_|\d{8}_|\d{4}-\d{2}-\d{2}[_-]).+\.md$/;
const FILE_RE = /^(?:(?:신규|추가)수집)?(\d{6})_(C[012])_(A[01])_(P[01])_(.+)\.md$/;

export function section(text, headingPattern) {
  const re = new RegExp(`^##\\s+(?:${headingPattern})\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "im");
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
  const names=[];
  const visit=async(dir,relative='')=>{
    for(const entry of await fs.readdir(dir,{withFileTypes:true})){
      if(entry.isSymbolicLink())throw Error('repo_candidate_symlink');
      const rel=path.posix.join(relative,entry.name);
      if(entry.isDirectory()){
        if(!entry.name.startsWith('.')&&!/^_|archive|retired|길이제외/i.test(entry.name))await visit(path.join(dir,entry.name),rel);
      }else if(entry.isFile()&&/\.(?:md|txt)$/i.test(entry.name)&&(FILE_RE.test(entry.name.replace(/\.txt$/i,'.md'))||LEGACY_RE.test(entry.name.replace(/\.txt$/i,'.md'))))names.push(rel);
    }
  };
  await visit(candidatesDir);
  names.sort((a,b)=>a.localeCompare(b,'ko'));
  // A canonical TXT replaces its exact legacy sibling; never merge two different
  // bodies just because their names match.
  const selected=[];
  for(const name of names){
    if(name.endsWith('.md')&&names.includes(name.replace(/\.md$/,'.txt'))){
      const data=MaterialTxt.parse(await fs.readFile(path.join(candidatesDir,name.replace(/\.md$/,'.txt'))));
      if(data?.records.candidate?.originalMarkdown!==await fs.readFile(path.join(candidatesDir,name),'utf8'))throw Error('repo_candidate_original_conflict');
    }else selected.push(name);
  }
  const items = [];
  for (let index = 0; index < selected.length; index += 1) {
    const relativeName=selected[index],file=path.join(candidatesDir,relativeName),bytes=await fs.readFile(file);
    const unified=relativeName.endsWith('.txt')?MaterialTxt.parse(bytes):null;
    if(relativeName.endsWith('.txt')&&!unified)throw Error('unified_material_invalid');
    const filename=unified?.records.candidate?.originalKey||path.basename(relativeName);
    if(typeof filename!=='string'||path.basename(filename)!==filename||!(FILE_RE.test(filename)||LEGACY_RE.test(filename)))throw Error('repo_candidate_original_key_invalid');
    const match = filename.match(FILE_RE);
    const repoPath = path.posix.join((options.candidatesDir||'data/candidates').replaceAll('\\','/'),relativeName);
    const text=unified?unified.records.candidate.originalMarkdown:bytes.toString('utf8');
    if(typeof text!=='string')throw Error('repo_candidate_original_missing');
    const stage=/^(?:-\s*)?stage\s*:\s*([^\r\n]+)/im.exec(text)?.[1]||'';
    const dateCode=match?.[1]||(/^\d{6}_/.test(filename)?filename.slice(0,6):/^\d{8}_/.test(filename)?filename.slice(2,8):filename.slice(2,10).replaceAll('-',''));
    const candidateStage=match?.[2]||/C[012]/.exec(stage)?.[0]||'C0';
    const assetStage=match?.[3]||/A[01]/.exec(stage)?.[0]||(/^-(?:\s*)A1\s*:\s*true\s*$/im.test(text)?'A1':'A0');
    const publishStage=match?.[4]||/P[01]/.exec(stage)?.[0]||(/^-(?:\s*)P1\s*:\s*true\s*$/im.test(text)?'P1':'P0');
    const originalTitle=text.replace(/^\ufeff/,'').match(/^#\s+(.+)$/m)?.[1]?.trim()||(match?.[5]||filename.replace(/\.md$/,"")).replace(/_/g," ");
    const title=cleanDisplayTitle(unified?.human.title||originalTitle);
    const exactLinkSection = section(text, "정확한 링크");
    const observedUrl = firstUrl(exactLinkSection)||/^(?:-\s*)?(?:sourceUrl|source_url|exactPublicUrl|publicUrl|url)\s*:\s*(https?:\/\/\S+)/im.exec(text)?.[1]||'';
    const exactUrl = candidateStage === "C0" ? "" : observedUrl;
    const bodySummary = (section(text, "글 내용|확인된 글 내용 요약")||/^(?:-\s*)?whyGood\s*:\s*([^\r\n]+)/im.exec(text)?.[1]||"").slice(0, 1400);
    const format = section(text, "형식").split(/\r?\n/)[0]?.trim() || "";
    const source = sourceLabel(text, observedUrl);
    const policy = sourcePolicy(source, observedUrl);
    const rank = index + 1;
    const nextStage = processingStage(candidateStage, assetStage, publishStage);
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
        `[repo queue] ${rank}/${selected.length} · ${candidateStage}/${assetStage}/${publishStage} · next=${nextStage}`,
        candidateStage === "C0" && observedUrl ? `[provenance index] ${observedUrl}` : "",
      ].filter(Boolean).join("\n\n"),
      signals: { freshness: null, velocity: null, audience: null, originalityRoom: null, revenueFit: null },
      score: null,
      scoreBasis: "repo_candidate_needs_human_review",
      platforms: ["Threads", "Instagram Carousel", "Instagram Reels", "YouTube Shorts"],
      status: "research",
      relatedSources: [],
      sourceMeta: {
        originalTitle,
        provider: source,
        productionNotes: section(text, "중간 문구 초안").slice(0, 6000),
        repoCandidatePath: repoPath,
        candidateStage,
        assetStage,
        publishStage,
        exactUrlVerified: candidateStage !== "C0" && Boolean(exactUrl),
        provenanceUrl: observedUrl || null,
        format: format || null,
        processingRank: rank,
        processingTotal: selected.length,
        processingStage: nextStage,
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
