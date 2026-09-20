import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadRepoCandidates } from "../repo-candidates.mjs";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "threads-repo-candidates-"));
const dir = path.join(root, "data", "candidates");
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(path.join(dir, "260918_C0_A0_P0_test0.md"), `# C0 title

## 글 내용
본문 미확인 후보.

## 정확한 링크
정확한 개별 URL 미확인. 공개 index: https://example.com/index

## 형식
글

## 이미지/자산/게시상태
C0 / A0 / P0, publicationAllowed=false
`);
await fs.writeFile(path.join(dir, "260918_C1_A0_P0_test1.md"), `# C1 title

## 글 내용
정확한 원문을 확인한 후보.

## 정확한 링크
https://www.reddit.com/r/test/comments/abc/post/

- 출처: Reddit

## 형식
글
`);

const result = await loadRepoCandidates(root);
assert.equal(result.count, 2);
assert.equal(result.items[0].sourceMeta.processingRank, 1);
assert.equal(result.items[1].sourceMeta.processingRank, 2);
assert.equal(result.items[0].url, "");
assert.equal(result.items[0].sourceMeta.processingStage, "provenance-verification");
assert.equal(result.items[1].url, "https://www.reddit.com/r/test/comments/abc/post/");
assert.equal(result.items[1].sourceMeta.processingStage, "source-asset-acquisition");
assert.equal(result.items[1].status, "research");
assert.equal(result.items[1].sourceMeta.publicationAllowed, false);

await fs.rm(root, { recursive: true, force: true });
console.log("Repository candidate sync tests passed.");
