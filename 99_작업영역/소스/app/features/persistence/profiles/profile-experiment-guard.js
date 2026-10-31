(() => {
  const profileState = window.ThreadsPersistenceProfileState;
  const registry = window.ThreadsAccountRegistry;
  const accountSelect = document.querySelector("#assignmentAccount");
  if (!profileState || !registry || !accountSelect) return;

  const baseLabels = new Map(
    [...accountSelect.options].filter((option) => option.value).map((option) => [option.value, option.textContent])
  );

  function refresh() {
    for (const option of accountSelect.options) {
      if (!option.value || !registry.get(option.value)) continue;
      const state = profileState.get(option.value);
      const assignable = profileState.canAssign(option.value);
      option.disabled = !assignable;
      option.dataset.runtimeProfileStatus = state.status;
      option.dataset.runtimeProfileEnabled = String(state.enabled);
      const base = baseLabels.get(option.value) || option.textContent;
      const runtime = state.enabled ? state.status : "disabled";
      option.textContent = `${base} · runtime ${runtime}`;
    }
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest?.('[data-persist="profile-save"]')) setTimeout(refresh, 0);
  });
  document.addEventListener("threads:profile-state-updated", refresh);
  refresh();

  window.ThreadsProfileExperimentGuard = { refresh };
})();
