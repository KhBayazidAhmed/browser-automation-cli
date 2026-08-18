export const INJECTED_DRAWER_RENDER_SRC = `
  function renderStepsList() {
    const container = shadow.getElementById("steps-list-container");
    if (!container) return;
    if (flowState.steps.length === 0) {
      container.innerHTML = '<div class="empty-state">No steps recorded yet. Click or type on the page to begin!</div>';
      return;
    }
    container.innerHTML = "";
    flowState.steps.forEach((step, idx) => {
      const card = document.createElement("div");
      card.className = "step-item";
      const action = step.action || "step";
      const pillClass = "pill-" + action.toLowerCase();
      const stepName = step.name || \`\${action.toUpperCase()} Step \${idx + 1}\`;
      let detail = step.url || step.selector || step.code || step.path || (step.durationMs ? \`\${step.durationMs}ms\` : "");
      card.innerHTML = \`
        <div class="step-item-left">
          <div class="step-index-badge">#\${idx + 1}</div>
          <div class="step-action-pill \${pillClass}">\${action}</div>
          <div class="step-info"><div class="step-name">\${stepName}</div><div class="step-detail">\${detail}</div></div>
        </div>
        <div class="step-actions">
          <button class="btn-icon btn-icon-up" data-idx="\${idx}" \${idx === 0 ? "disabled style='opacity:0.3;'" : ""}>↑</button>
          <button class="btn-icon btn-icon-down" data-idx="\${idx}" \${idx === flowState.steps.length - 1 ? "disabled style='opacity:0.3;'" : ""}>↓</button>
          <button class="btn-icon btn-icon-del" data-idx="\${idx}">🗑️</button>
        </div>
      \`;
      card.querySelector(".btn-icon-up")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (idx > 0) {
          const temp = flowState.steps[idx];
          flowState.steps[idx] = flowState.steps[idx - 1];
          flowState.steps[idx - 1] = temp;
          persistState(); renderDrawer();
          emitRecordEvent({ type: "moveStep", fromIndex: idx, toIndex: idx - 1 });
        }
      });
      card.querySelector(".btn-icon-down")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (idx < flowState.steps.length - 1) {
          const temp = flowState.steps[idx];
          flowState.steps[idx] = flowState.steps[idx + 1];
          flowState.steps[idx + 1] = temp;
          persistState(); renderDrawer();
          emitRecordEvent({ type: "moveStep", fromIndex: idx, toIndex: idx + 1 });
        }
      });
      card.querySelector(".btn-icon-del")?.addEventListener("click", (e) => {
        e.stopPropagation();
        flowState.steps.splice(idx, 1);
        persistState(); renderDrawer();
        emitRecordEvent({ type: "deleteStep", index: idx });
      });
      container.appendChild(card);
    });
  }

  function renderJsonViewer() {
    const viewer = shadow.getElementById("json-viewer");
    if (!viewer) return;
    viewer.innerText = JSON.stringify({ name: flowState.name, variables: flowState.variables, steps: flowState.steps }, null, 2);
  }

  function renderVarsList() {
    const container = shadow.getElementById("vars-list");
    if (!container) return;
    const keys = Object.keys(flowState.variables);
    if (keys.length === 0) {
      container.innerHTML = '<div class="empty-state">No variables defined yet.</div>';
      return;
    }
    container.innerHTML = "";
    keys.forEach((key) => {
      const row = document.createElement("div");
      row.className = "var-item";
      row.innerHTML = \`<div><span class="var-key">\${key}</span>: <span class="var-val">"\${flowState.variables[key]}"</span></div><button class="btn-icon btn-icon-del">🗑️</button>\`;
      row.querySelector(".btn-icon-del")?.addEventListener("click", () => {
        delete flowState.variables[key];
        persistState(); renderDrawer();
        emitRecordEvent({ type: "setVariables", variables: flowState.variables });
      });
      container.appendChild(row);
    });
  }

  function renderDrawer() {
    updateBadge();
    if (!isDrawerOpen) return;
    renderStepsList();
    renderJsonViewer();
    renderVarsList();
  }

  function toggleDrawer(open) {
    isDrawerOpen = open !== undefined ? open : !isDrawerOpen;
    shadow.getElementById("drawer-overlay")?.classList.toggle("open", isDrawerOpen);
    if (isDrawerOpen) renderDrawer();
    updateBadge();
  }

  shadow.getElementById("btn-config")?.addEventListener("click", (e) => { e.stopPropagation(); toggleDrawer(); });
  shadow.getElementById("btn-drawer-close")?.addEventListener("click", () => toggleDrawer(false));
  shadow.getElementById("drawer-overlay")?.addEventListener("click", (e) => { if (e.target === shadow.getElementById("drawer-overlay")) toggleDrawer(false); });

  shadow.querySelectorAll(".drawer-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      shadow.querySelectorAll(".drawer-tab").forEach((t) => t.classList.remove("active"));
      shadow.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const tabKey = tab.getAttribute("data-tab");
      shadow.getElementById("panel-" + tabKey)?.classList.add("active");
      if (tabKey === "json") renderJsonViewer();
      if (tabKey === "steps") renderStepsList();
      if (tabKey === "vars") renderVarsList();
    });
  });

  shadow.getElementById("btn-copy-json")?.addEventListener("click", () => {
    const viewer = shadow.getElementById("json-viewer");
    if (viewer) { navigator.clipboard?.writeText(viewer.innerText); showToast("✓ Copied JSON to Clipboard!"); }
  });

  shadow.getElementById("btn-add-var")?.addEventListener("click", () => {
    const keyInput = shadow.getElementById("new-var-key"), valInput = shadow.getElementById("new-var-val");
    const key = keyInput?.value?.trim(), val = valInput?.value?.trim() || "";
    if (key) {
      flowState.variables[key] = val;
      if (keyInput) keyInput.value = ""; if (valInput) valInput.value = "";
      persistState(); renderDrawer();
      emitRecordEvent({ type: "addVariable", key, value: val });
    }
  });

  shadow.getElementById("btn-submit-wait")?.addEventListener("click", () => {
    const ms = Number(shadow.getElementById("add-wait-ms")?.value) || 1000;
    flowState.steps.push({ name: \`Wait \${ms}ms\`, action: "wait", durationMs: ms });
    persistState(); renderDrawer();
    emitRecordEvent({ type: "wait", durationMs: ms, name: \`Wait \${ms}ms\` });
  });

  shadow.getElementById("btn-submit-waitfor")?.addEventListener("click", () => {
    const sel = shadow.getElementById("add-waitfor-sel")?.value?.trim();
    const text = shadow.getElementById("add-waitfor-text")?.value?.trim();
    if (!sel && !text) return;
    const step = { name: \`Wait for \${sel || text}\`, action: "waitForSelector", selector: sel || undefined, text: text || undefined, strictText: text ? true : undefined };
    flowState.steps.push(step);
    persistState(); renderDrawer();
    emitRecordEvent({ type: "waitForSelector", selector: sel, text, strictText: Boolean(text), name: step.name });
  });

  shadow.getElementById("btn-submit-eval")?.addEventListener("click", () => {
    const code = shadow.getElementById("add-eval-code")?.value?.trim();
    const as = shadow.getElementById("add-eval-var")?.value?.trim();
    if (!code) return;
    const step = { name: \`Eval JS\${as ? \` -> "\${as}"\` : ""}\`, action: "eval", code, as: as || undefined };
    flowState.steps.push(step);
    persistState(); renderDrawer();
    emitRecordEvent({ type: "eval", code, as: as || undefined, name: step.name });
  });

  shadow.getElementById("btn-submit-goto")?.addEventListener("click", () => {
    const url = shadow.getElementById("add-goto-url")?.value?.trim();
    if (!url) return;
    const step = { name: \`Navigate to \${url}\`, action: "goto", url };
    flowState.steps.push(step);
    persistState(); renderDrawer();
    emitRecordEvent({ type: "goto", url, name: step.name });
  });
`;
