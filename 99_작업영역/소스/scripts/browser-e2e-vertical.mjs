import assert from "node:assert/strict";
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
  const expectedVersion = JSON.parse(await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8')).version;
  const healthUrl = new URL('/api/health', base).href;
  const healthResponse = await page.request.get(healthUrl);
  assert.equal(healthResponse.status(), 200, 'E2E target health endpoint must respond');
  const health = await healthResponse.json();
  assert.equal(health.version, expectedVersion, 'stale E2E server: expected ' + expectedVersion + ', got ' + (health.version || 'unknown'));
  assert.ok(health.runtimeStartedAt, 'E2E target must expose runtime start identity');
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
  const mainThreadProbeMs = [];
  for (let index = 0; index < 20; index += 1) {
    const startedAt = Date.now();
    const probe = await page.evaluate(() => ({
      bootstrap: document.documentElement.dataset.featureBootstrap || "",
      title: document.querySelector("#detailTitle")?.textContent || "",
    }));
    mainThreadProbeMs.push(Date.now() - startedAt);
    assert.equal(probe.bootstrap, "ready", `bootstrap lost readiness during responsiveness probe ${index}`);
    assert.equal(probe.title, "E2E vertical fixture", `selection changed during responsiveness probe ${index}`);
  }
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
  await page.waitForTimeout(100);
  const gateState = await page.evaluate(() => ({
    disabled: document.querySelector("[data-vertical-render]").disabled,
    status: document.querySelector("[data-vertical-status]").textContent,
    savedPrivacy: state.items.find((item) => item.id === "e2e-vertical-fixture")?.cardFactory?.privacy?.gate || null,
    livePrivacy: window.ThreadsCardPrivacyMask?.exportEnvelope?.()?.gate || null,
    canvases: [...document.querySelectorAll("#cardPreviewGrid canvas[data-card-index]")].map((canvas) => [canvas.width, canvas.height]),
  }));
  if (gateState.disabled) throw new Error(`vertical_render_gate_blocked:${JSON.stringify(gateState)}`);
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

  const reviewFixture = await page.evaluate(() => {
    const item = state.items.find((entry) => entry.id === "e2e-vertical-fixture");
    item.researchBundle = { ...(item.researchBundle || {}), reviewStatus: "reviewed" };
    item.draftStudio = { ...(item.draftStudio || {}), generated: true, reviewStatus: "approved" };
    item.safetyGate = {
      schemaVersion: 1,
      fact: "pass",
      rights: "pass",
      privacy: "pass",
      defamation: "pass",
      platform: "pass",
      notes: "E2E fixture only; no publication attempted.",
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persist();
    document.dispatchEvent(new CustomEvent("threads:content-revision-changed", { detail: { candidateId: item.id, source: "e2e-review-fixture" } }));
    return { updatedAt: item.updatedAt, artifactBasis: item.verticalVideoArtifact?.handoffBasisUpdatedAt };
  });
  await page.waitForFunction(() => Boolean(document.querySelector('.approval-card[data-item-id="e2e-vertical-fixture"]')));
  await page.waitForFunction(() => Boolean(document.querySelector('.approval-card[data-item-id="e2e-vertical-fixture"] [data-vertical-artifact-handoff]')));
  const reviewHandoff = await page.evaluate(() => ({
    cardClass: document.querySelector('.approval-card[data-item-id="e2e-vertical-fixture"]')?.className,
    notice: document.querySelector('.approval-card[data-item-id="e2e-vertical-fixture"] [data-vertical-artifact-handoff]')?.textContent,
    publishApproval: state.items.find((entry) => entry.id === "e2e-vertical-fixture")?.publishApproval || null,
  }));

  const stale = await page.evaluate(() => {
    const item = state.items.find((entry) => entry.id === "e2e-vertical-fixture");
    item.updatedAt = new Date(Date.now() + 1000).toISOString();
    persist();
    document.querySelector("#cardPreviewGrid").dispatchEvent(new Event("click", { bubbles: true }));
    document.dispatchEvent(new CustomEvent("threads:content-revision-changed", { detail: { candidateId: item.id, source: "e2e-stale" } }));
    return item.updatedAt;
  });
  await page.waitForTimeout(120);
  const staleStatus = await page.locator("[data-vertical-status]").textContent();
  const staleDownload = await page.locator("[data-vertical-download]").evaluate((el) => ({ hidden: el.hidden, href: el.getAttribute("href"), ariaDisabled: el.getAttribute("aria-disabled") }));
  const staleHandoff = await page.locator('.approval-card[data-item-id="e2e-vertical-fixture"] [data-vertical-artifact-handoff]').textContent();
  const livePublishRequests = requests.filter((entry) => /\/api\/(?:threads|buffer)\/publish/.test(entry.url));
  assert.equal(errors.length, 0, `page errors: ${JSON.stringify(errors)}`);
  assert.equal(livePublishRequests.length, 0, `unexpected publish requests: ${JSON.stringify(livePublishRequests)}`);
  assert.equal(video.status(), 200, "vertical artifact download must return HTTP 200");
  assert.ok(bytes > 0, "vertical artifact download must contain bytes");
  assert.ok(dimensions.length > 0 && dimensions.every(([width, height]) => width === 1080 && height === 1080), "Card Factory must produce only 1080x1080 inputs");
  assert.equal(privacyGate?.allowed, true, "privacy gate must be explicitly reviewed before render");
  assert.equal(rendered.artifact?.probe?.width, 1080, "vertical artifact width must be 1080");
  assert.equal(rendered.artifact?.probe?.height, 1920, "vertical artifact height must be 1920");
  assert.equal(rendered.artifact?.publishReady, false, "03 artifact must never claim publish readiness");
  assert.equal(rendered.artifact?.providerCapability, "unsupported", "vertical provider publishing must remain unsupported");
  assert.match(reviewHandoff.notice || "", /04/, "04 handoff notice must be visible");
  assert.match(staleStatus || "", /stale/, "03 status must mark changed revision stale");
  assert.deepEqual(staleDownload, { hidden: true, href: null, ariaDisabled: "true" }, "stale artifact download must fail closed");
  assert.match(staleHandoff || "", /stale/, "04 handoff must mark changed revision stale");
  assert.ok(mainThreadProbeMs.every((ms) => ms < 1000), `main-thread responsiveness regression: ${JSON.stringify(mainThreadProbeMs)}`);
  console.log(JSON.stringify({ seeded, mainThreadProbeMs, dimensions, reviewCount, privacyGate, gateState, rendered, videoStatus: video.status(), bytes, reviewFixture, reviewHandoff, stale, staleStatus, staleDownload, staleHandoff, requests, errors }));
} finally {
  await browser.close();
  await fs.rm(fixture, { force: true });
}
