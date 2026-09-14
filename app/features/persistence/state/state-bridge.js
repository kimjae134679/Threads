(() => {
  const model = window.ThreadsPersistenceStateModel;
  const footer = document.querySelector("footer");
  if (!model || !footer) return;

  const APP_KEY = "threads_trend_inbox_v1";
  const SCHEDULER_KEY = "threads_scheduler_control_v1";
  let serverRevision = 0;
  let preview = null;
  let previewSource = "";

  const section = document.createElement("section");
  section.className = "panel persistence-panel";
  section.innerHTML = `
    <div class="panel-title-row wrap">
      <div><p class="eyebrow">PERSISTENCE</p><h2>상태 백업 / 복원</h2>
      <p>명시적으로 저장·불러오기 할 때만 상태를 변경합니다. 충돌이나 secret 필드는 자동 덮어쓰기하지 않습니다.</p></div>
      <span id="persistenceRevision" class="pill neutral">default · SERVER r0</span>
    </div>
    <div class="top-actions">
      <label class="button ghost">저장 범위 <select id="persistenceNamespace"><option value="default">default</option></select></label>
      <button type="button" class="button ghost" data-persist="export">JSON 내보내기</button>
      <label class="button ghost file-button">JSON 불러오기<input type="file" data-persist-file accept="application/json" /></label>
      <button type="button" class="button ghost" data-persist="server-read">서버 읽기</button>
      <button type="button" class="button primary" data-persist="server-save">서버 저장</button>
      <button type="button" class="button primary" data-persist="apply" disabled>미리보기 적용</button>
    </div>
    <div id="persistenceStatus" class="system-message">아직 불러온 미리보기가 없습니다.</div>`;
  footer.insertAdjacentElement("beforebegin", section);

  const status = section.querySelector("#persistenceStatus");
  const revision = section.querySelector("#persistenceRevision");
  const applyButton = section.querySelector('[data-persist="apply"]');
  const namespaceSelect = section.querySelector("#persistenceNamespace");
  for (const profile of window.ThreadsAccountRegistry?.list?.() || []) {
    const option = document.createElement("option"); option.value = profile.id; option.textContent = profile.id; namespaceSelect.appendChild(option);
  }
  namespaceSelect.addEventListener("change", () => { updateRevision(0); preview = null; applyButton.disabled = true; setStatus(`저장 범위 변경: ${currentNamespace()}`, "info"); });
  section.addEventListener("click", onClick);
  section.querySelector("[data-persist-file]").addEventListener("change", onFile);

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; }
  }

  function currentSnapshot() {
    const appState = readJson(APP_KEY, { version: 1, items: [] });
    const scheduler = readJson(SCHEDULER_KEY, {});
    const profiles = window.ThreadsAccountRegistry?.list?.() || [];
    const experiments = model.experimentsFromItems(appState.items || []);
    return model.makeScopedSnapshot(appState, scheduler, currentNamespace(), { source: "browser-session", profiles, experiments });
  }

  function setStatus(message, tone = "info") {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function setPreview(input, source) {
    preview = model.migrateSnapshot(input);
    model.assertScope(preview, currentNamespace());
    previewSource = source;
    applyButton.disabled = false;
    const scopeText = preview.scope?.kind === "account"
      ? `${preview.scope.id} 계정 scope · 공용 후보/Scheduler 미적용`
      : "workspace 전체 scope";
    setStatus(`미리보기 준비: ${source} · ${scopeText} · 후보 ${preview.app.items.length}건 · 프로필 ${preview.profiles.length}개 · 실험 ${preview.experiments.length}개`, "success");
  }

  function currentNamespace() { return namespaceSelect?.value || "default"; }

  function stateUrl() { return `/api/state?namespace=${encodeURIComponent(currentNamespace())}`; }

  function updateRevision(value) {
    serverRevision = Number(value) || 0;
    revision.textContent = `${currentNamespace()} · SERVER r${serverRevision}`;
  }

  async function onClick(event) {
    const action = event.target.closest?.("[data-persist]")?.dataset.persist;
    if (!action) return;
    try {
      if (action === "export") return exportSnapshot();
      if (action === "server-read") return await readServer();
      if (action === "server-save") return await saveServer();
      if (action === "apply") return applyPreview();
    } catch (error) {
      setStatus(String(error?.message || error), "error");
    }
  }

  function exportSnapshot() {
    const snapshot = currentSnapshot();
    const blob = new Blob([`${JSON.stringify(snapshot, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `threads-state-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus(`JSON 내보내기 완료 · 후보 ${snapshot.app.items.length}건`, "success");
  }

  async function onFile(event) {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      setPreview(JSON.parse(await file.text()), `file:${file.name}`);
    } catch (error) {
      preview = null;
      applyButton.disabled = true;
      setStatus(`불러오기 실패: ${error?.message || error}`, "error");
    } finally {
      event.target.value = "";
    }
  }

  async function readServer() {
    const response = await fetch(stateUrl(), { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.message || body.error || `HTTP ${response.status}`);
    updateRevision(body.revision);
    if (!body.snapshot) {
      preview = null;
      applyButton.disabled = true;
      return setStatus("서버에 저장된 상태가 없습니다.", "info");
    }
    setPreview(body.snapshot, `server:r${body.revision}`);
  }

  async function saveServer() {
    const snapshot = currentSnapshot();
    const response = await fetch(stateUrl(), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ snapshot, expectedRevision: serverRevision }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 409) {
      updateRevision(body.currentRevision ?? serverRevision);
      throw new Error(`서버 revision 충돌. 서버를 다시 읽은 뒤 명시적으로 재저장하세요. (${body.message || "conflict"})`);
    }
    if (!response.ok || !body.ok) throw new Error(body.message || body.error || `HTTP ${response.status}`);
    updateRevision(body.revision);
    setStatus(`서버 저장 완료 · revision ${body.revision}`, "success");
  }

  function applyPreview() {
    if (!preview) return;
    const namespace = currentNamespace();
    const currentApp = readJson(APP_KEY, { version: 1, items: [] });
    const appState = model.restoreScopedAppState(currentApp, preview, namespace);
    localStorage.setItem(APP_KEY, JSON.stringify(appState));
    if (namespace === "default") {
      localStorage.setItem(SCHEDULER_KEY, JSON.stringify({
        state: preview.scheduler.status,
        options: preview.scheduler.options,
        history: preview.scheduler.history,
        updatedAt: new Date().toISOString(),
      }));
    }
    const scopeText = namespace === "default" ? "workspace 전체" : `${namespace} 계정 실험만`;
    setStatus(`미리보기 적용 완료: ${previewSource} · ${scopeText}. 화면을 다시 불러옵니다.`, "success");
    setTimeout(() => location.reload(), 50);
  }

  window.ThreadsPersistenceBridge = { currentSnapshot, setPreview, applyPreview, readServer, saveServer, currentNamespace };
})();
