import { chromium } from "playwright-core";

const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const base = process.env.E2E_BASE_URL || "http://127.0.0.1:4173/app/";
const browser = await chromium.launch({ headless: true, executablePath: chrome });
const page = await browser.newPage();
const errors = [];
const requests = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("request", (request) => {
  if (/publish|vertical-video/.test(request.url())) requests.push({ method: request.method(), url: request.url() });
});

try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForSelector(".vertical-video-production-panel");
  const seeded = await page.evaluate(() => {
    const now = new Date().toISOString();
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
      updatedAt: now,
      cardFactory: {
        updatedAt: now,
        privacy: { gate: { allowed: true, code: "image-privacy-reviewed", captureCount: 1, reviewedCount: 1, staleIdentity: [] } },
      },
    };
    state.items.unshift(item);
    selectedId = item.id;
    persist();
    render();
    const preview = document.querySelector("#cardPreviewGrid");
    preview.innerHTML = "";
    const figure = document.createElement("figure");
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    canvas.dataset.cardIndex = "0";
    const context = canvas.getContext("2d");
    context.fillStyle = "#222";
    context.fillRect(0, 0, 1080, 1080);
    context.fillStyle = "#fff";
    context.font = "60px sans-serif";
    context.fillText("E2E", 100, 180);
    figure.appendChild(canvas);
    preview.appendChild(figure);
    return {
      title: document.querySelector("#detailTitle")?.textContent,
      panelHidden: document.querySelector(".vertical-video-production-panel")?.hidden,
    };
  });

  await page.waitForTimeout(150);
  const privacy = await page.evaluate(() => {
    const figure = document.querySelector("#cardPreviewGrid figure");
    const button = figure?.querySelector("[data-privacy-reviewed]");
    return { button: Boolean(button), gate: window.ThreadsCardPrivacyMask?.exportEnvelope?.()?.gate || null };
  });
  if (privacy.button) {
    await page.locator("[data-privacy-reviewed]").first().click();
    await page.waitForTimeout(80);
  }
  const afterPrivacy = await page.evaluate(() => window.ThreadsCardPrivacyMask?.exportEnvelope?.()?.gate || null);

  await page.selectOption("[data-vertical-rights]", "cleared");
  await page.click("[data-vertical-rights-save]");
  await page.waitForTimeout(80);
  const gateBefore = await page.evaluate(() => ({
    disabled: document.querySelector("[data-vertical-render]").disabled,
    status: document.querySelector("[data-vertical-status]").textContent,
  }));
  await page.fill("[data-vertical-seconds]", "0.5");
  if (!gateBefore.disabled) {
    await page.click("[data-vertical-render]");
    await page.waitForFunction(() => {
      const download = document.querySelector("[data-vertical-download]");
      return download && !download.hidden;
    }, { timeout: 20000 });
  }

  const final = await page.evaluate(() => {
    const item = state.items.find((entry) => entry.id === "e2e-vertical-fixture");
    return {
      artifact: item?.verticalVideoArtifact || null,
      status: document.querySelector("[data-vertical-status]")?.textContent,
      download: document.querySelector("[data-vertical-download]")?.getAttribute("href"),
    };
  });
  console.log(JSON.stringify({ seeded, privacy, afterPrivacy, gateBefore, final, requests, errors }));
} finally {
  await browser.close();
}
