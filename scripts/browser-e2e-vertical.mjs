import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const base = process.env.E2E_BASE_URL || "http://127.0.0.1:4173/app/";
const fixture = path.join(os.tmpdir(), `threads-e2e-${process.pid}.png`);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
await fs.writeFile(fixture, png);
const browser = await chromium.launch({ headless: true, executablePath: chrome });
const page = await browser.newPage();
const errors = [];
const requests = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("request", (request) => {
  if (/\/api\/(?:threads|buffer)\/publish/.test(request.url()) || /\/api\/vertical-video\//.test(request.url())) {
    requests.push({ method: request.method(), url: request.url() });
  }
});

try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForSelector(".vertical-video-production-panel", { state: "attached" });
  const seeded = await page.evaluate(() => {
    const item = {
      id: "e2e-vertical-fixture",
      title: "E2E vertical fixture",
      url: "https://example.com/e2e",
      kind: "story",
      sourceType: "manual",
      sourceRisk: "yellow",
      status: "ready",
      score: 80,
      note: "E2E only",
      signals: { freshness: 8, velocity: 8, audience: 8, originalityRoom: 8, revenueFit: 8 },
      updatedAt: new Date().toISOString(),
    };
    state.items.unshift(item);
    selectedId = item.id;
    persist();
    render();
    return { title: document.querySelector("#detailTitle")?.textContent };
  });
  await page.waitForFunction(() => !document.querySelector(".card-factory-section")?.hidden);
  await page.click("#cardAutofillBtn");
  await page.setInputFiles("#cardImageInput", fixture);
  await page.waitForFunction(() => document.querySelector("#cardImageStatus")?.textContent?.includes("1"));
  await page.click("#cardBuildBtn");
  await page.waitForFunction(() => document.querySelectorAll("#cardPreviewGrid canvas[data-card-index]").length > 0);
  const dimensions = await page.evaluate(() => [...document.querySelectorAll("#cardPreviewGrid canvas[data-card-index]")].map((canvas) => [canvas.width, canvas.height]));
  const reviewButtons = page.locator("[data-privacy-reviewed]");
  const reviewCount = await reviewButtons.count();
  for (let index = 0; index < reviewCount; index += 1) await reviewButtons.nth(index).click();
  await page.waitForTimeout(100);
  const privacyGate = await page.evaluate(() => window.ThreadsCardPrivacyMask?.exportEnvelope?.()?.gate || null);
  await page.click("#cardSaveBtn");
  await page.waitForFunction(() => Boolean(state.items.find((item) => item.id === "e2e-vertical-fixture")?.cardFactory?.updatedAt));
  await page.selectOption("[data-vertical-rights]", "cleared");
  await page.click("[data-vertical-rights-save]");
  await page.waitForFunction(() => !document.querySelector("[data-vertical-render]").disabled);
  await page.fill("[data-vertical-seconds]", "0.5");
  await page.click("[data-vertical-render]");
  await page.waitForFunction(() => {
    const download = document.querySelector("[data-vertical-download]");
    return download && !download.hidden;
  }, { timeout: 30000 });
  const rendered = await page.evaluate(() => {
    const item = state.items.find((entry) => entry.id === "e2e-vertical-fixture");
    return {
      artifact: item?.verticalVideoArtifact || null,
      status: document.querySelector("[data-vertical-status]")?.textContent,
      download: document.querySelector("[data-vertical-download]")?.getAttribute("href"),
    };
  });
  const video = await page.request.get(new URL(rendered.download, base).href);
  const bytes = (await video.body()).byteLength;
  const stale = await page.evaluate(() => {
    const item = state.items.find((entry) => entry.id === "e2e-vertical-fixture");
    item.updatedAt = new Date(Date.now() + 1000).toISOString();
    persist();
    document.querySelector("#detailNote").dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("#cardPreviewGrid").dispatchEvent(new Event("click", { bubbles: true }));
    return item.updatedAt;
  });
  await page.waitForTimeout(100);
  const staleStatus = await page.locator("[data-vertical-status]").textContent();
  console.log(JSON.stringify({ seeded, dimensions, reviewCount, privacyGate, rendered, videoStatus: video.status(), bytes, stale, staleStatus, requests, errors }));
} finally {
  await browser.close();
  await fs.rm(fixture, { force: true });
}
