import { ICONS } from "./hud-icons.js";

export const INJECTED_DRAWER_RENDER_SRC = `
  function getStepIcon(action) {
    switch (action) {
      case "click": return ${JSON.stringify(ICONS.check)};
      case "type": return ${JSON.stringify(ICONS.code)};
      case "screenshot": return ${JSON.stringify(ICONS.screenshot)};
      case "wait": return ${JSON.stringify(ICONS.wait)};
      case "waitForSelector": return ${JSON.stringify(ICONS.wait)};
      case "extract": return ${JSON.stringify(ICONS.extract)};
      case "extractMultiple": return ${JSON.stringify(ICONS.list)};
      case "assert": return ${JSON.stringify(ICONS.assert)};
      case "goto": return ${JSON.stringify(ICONS.globe)};
      default: return ${JSON.stringify(ICONS.zap)};
    }
  }

  function renderStepsList() {
    const container = shadow.getElementById("steps-list-container");
    const countEl = shadow.getElementById("tab-steps-count");
    if (!container) return;
    if (countEl) countEl.innerText = (flowState.steps || []).length;
    if (!flowState.steps || flowState.steps.length === 0) {
      container.innerHTML = '<div class="empty-state">No steps recorded yet. Click or type on the page to begin!</div>';
      return;
    }
    container.innerHTML = "";
    flowState.steps.forEach((step, idx) => {
      const item = document.createElement("div");
      item.className = "step-item";
      const iconSvg = getStepIcon(step.action);
      item.innerHTML = \`
        <div class="step-num">\${idx + 1}</div>
        <div class="step-content">
          <div class="step-title">\${iconSvg} \${step.name || step.action}</div>
          <div class="step-meta">\${step.selector ? \`Selector: \${step.selector}\` : (step.url ? \`URL: \${step.url}\` : (step.durationMs ? \`Wait: \${step.durationMs}ms\` : "")) }</div>
        </div>
        <div class="step-actions">
          \${idx > 0 ? '<button class="btn-icon btn-icon-up" title="Move Up">' + ${JSON.stringify(ICONS.chevronUp)} + '</button>' : ''}
          \${idx < flowState.steps.length - 1 ? '<button class="btn-icon btn-icon-down" title="Move Down">' + ${JSON.stringify(ICONS.chevronDown)} + '</button>' : ''}
          <button class="btn-icon btn-icon-del" title="Delete Step">' + ${JSON.stringify(ICONS.trash)} + '</button>
        </div>
      \`;

      item.querySelector(".btn-icon-up")?.addEventListener("click", () => {
        const temp = flowState.steps[idx];
        flowState.steps[idx] = flowState.steps[idx - 1];
        flowState.steps[idx - 1] = temp;
        persistState(); renderDrawer();
        emitRecordEvent({ type: "moveStep", fromIndex: idx, toIndex: idx - 1 });
      });

      item.querySelector(".btn-icon-down")?.addEventListener("click", () => {
        const temp = flowState.steps[idx];
        flowState.steps[idx] = flowState.steps[idx + 1];
        flowState.steps[idx + 1] = temp;
        persistState(); renderDrawer();
        emitRecordEvent({ type: "moveStep", fromIndex: idx, toIndex: idx + 1 });
      });

      item.querySelector(".btn-icon-del")?.addEventListener("click", () => {
        flowState.steps.splice(idx, 1);
        persistState(); renderDrawer();
        emitRecordEvent({ type: "deleteStep", index: idx });
      });

      container.appendChild(item);
    });
  }

  function renderJsonViewer() {
    const viewer = shadow.getElementById("drawer-json-viewer");
    if (viewer) viewer.value = JSON.stringify(flowState, null, 2);
  }

  function renderVarsList() {
    const container = shadow.getElementById("vars-list-container");
    const countEl = shadow.getElementById("tab-vars-count");
    if (!container) return;
    const keys = Object.keys(flowState.variables || {});
    if (countEl) countEl.innerText = keys.length;
    if (keys.length === 0) {
      container.innerHTML = '<div class="empty-state">No custom variables declared.</div>';
      return;
    }
    container.innerHTML = "";
    keys.forEach((key) => {
      const row = document.createElement("div");
      row.className = "var-item";
      row.innerHTML = '<div><span class="var-key">' + key + '</span>: <span class="var-val">"' + (flowState.variables[key] || '') + '"</span></div><button class="btn-icon btn-icon-del" title="Delete">' + ${JSON.stringify(ICONS.trash)} + '</button>';
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
    const sub = shadow.getElementById("drawer-subtitle");
    const stepCount = (flowState.steps || []).length;
    const varCount = Object.keys(flowState.variables || {}).length;
    if (sub) {
      sub.innerText = "Flow: " + (flowState.name || "Recorded Flow") + " • " + stepCount + " " + (stepCount === 1 ? "step" : "steps") + " • " + varCount + " " + (varCount === 1 ? "variable" : "variables");
    }
    const stepsCount = shadow.getElementById("tab-steps-count");
    const varsCount = shadow.getElementById("tab-vars-count");
    if (stepsCount) stepsCount.innerText = stepCount;
    if (varsCount) varsCount.innerText = varCount;
    const activeTab = shadow.querySelector(".drawer-tab.active")?.getAttribute("data-tab") || "steps";
    if (activeTab === "steps") renderStepsList();
    else if (activeTab === "json") renderJsonViewer();
    else if (activeTab === "vars") renderVarsList();
  }

  function toggleDrawer(open) {
    isDrawerOpen = open !== undefined ? open : !isDrawerOpen;
    const overlay = shadow.getElementById("drawer-overlay");
    overlay?.classList.toggle("open", isDrawerOpen);
    overlay?.setAttribute("aria-hidden", String(!isDrawerOpen));
    if (isDrawerOpen) {
      const triggerFocus = shadow.activeElement;
      renderDrawer();
      requestAnimationFrame(() => {
        if (!shadow.activeElement || shadow.activeElement === triggerFocus) shadow.getElementById("btn-drawer-close")?.focus();
      });
    } else {
      updateBadge();
      shadow.getElementById("btn-config")?.focus();
    }
  }

  shadow.getElementById("btn-config")?.addEventListener("click", (e) => { e.stopPropagation(); toggleDrawer(); });
  shadow.getElementById("btn-drawer-close")?.addEventListener("click", () => toggleDrawer(false));
  shadow.getElementById("drawer-overlay")?.addEventListener("click", (e) => { if (e.target === shadow.getElementById("drawer-overlay")) toggleDrawer(false); });
  shadow.addEventListener("keydown", (e) => { if (e.key === "Escape" && isDrawerOpen) toggleDrawer(false); });

  shadow.querySelectorAll(".drawer-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      shadow.querySelectorAll(".drawer-tab").forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
      shadow.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      const tabKey = tab.getAttribute("data-tab");
      shadow.getElementById("panel-" + tabKey)?.classList.add("active");
      const body = shadow.querySelector(".drawer-body");
      if (body) body.scrollTop = 0;
      renderDrawer();
    });
  });

  shadow.getElementById("btn-copy-json")?.addEventListener("click", () => {
    const viewer = shadow.getElementById("drawer-json-viewer");
    if (viewer) {
      navigator.clipboard?.writeText(viewer.value);
      showToast("JSON copied to clipboard!");
    }
  });

  shadow.getElementById("btn-add-var")?.addEventListener("click", () => {
    const k = shadow.getElementById("new-var-key")?.value?.trim();
    const v = shadow.getElementById("new-var-val")?.value?.trim();
    if (k) {
      flowState.variables = flowState.variables || {};
      flowState.variables[k] = v || "";
      persistState(); renderDrawer();
      emitRecordEvent({ type: "setVariables", variables: flowState.variables });
      shadow.getElementById("new-var-key").value = "";
      shadow.getElementById("new-var-val").value = "";
      showToast('Variable "' + k + '" saved');
    }
  });

  shadow.getElementById("btn-submit-wait")?.addEventListener("click", () => {
    const ms = Number(shadow.getElementById("add-wait-ms")?.value) || 1000;
    const step = { name: "Wait " + ms + "ms", action: "wait", durationMs: ms };
    flowState.steps.push(step); persistState(); renderDrawer();
    emitRecordEvent({ type: "wait", durationMs: ms, name: step.name });
    showToast("Added " + ms + "ms delay");
  });

  shadow.getElementById("btn-submit-waitfor")?.addEventListener("click", () => {
    const sel = shadow.getElementById("add-waitfor-sel")?.value?.trim();
    const text = shadow.getElementById("add-waitfor-text")?.value?.trim();
    if (sel || text) {
      const step = { name: "Wait for " + (sel || text), action: "waitForSelector", selector: sel, text: text };
      flowState.steps.push(step); persistState(); renderDrawer();
      emitRecordEvent({ type: "waitForSelector", selector: sel, text: text, name: step.name });
      showToast("Added WaitForSelector step");
    }
  });

  shadow.getElementById("btn-submit-eval")?.addEventListener("click", () => {
    const code = shadow.getElementById("add-eval-code")?.value?.trim();
    const as = shadow.getElementById("add-eval-var")?.value?.trim();
    if (code) {
      const step = { name: "Evaluate Code", action: "eval", code, as };
      flowState.steps.push(step); persistState(); renderDrawer();
      emitRecordEvent({ type: "eval", code, as, name: step.name });
      showToast("Added Eval step");
    }
  });

  shadow.getElementById("btn-submit-goto")?.addEventListener("click", () => {
    const url = shadow.getElementById("add-goto-url")?.value?.trim();
    if (url) {
      const step = { name: "Navigate to " + url, action: "goto", url };
      flowState.steps.push(step); persistState(); renderDrawer();
      emitRecordEvent({ type: "goto", url, name: step.name });
      showToast("Added Navigation to " + url);
    }
  });
`;
