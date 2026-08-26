import { ICONS } from "./hud-icons.js";

export const INJECTED_DRAWER_RENDER_SRC = `
  function renderJsonViewer() {
    const viewer = shadow.getElementById("drawer-json-viewer");
    if (viewer) {
      viewer.value = JSON.stringify(flowState, null, 2);
    }
  }

  function renderVarsList() {
    const container = shadow.getElementById("vars-list-container");
    if (!container) return;
    const vars = flowState.variables || {};
    const entries = Object.entries(vars);
    const tabCount = shadow.getElementById("tab-vars-count");
    if (tabCount) tabCount.innerText = String(entries.length);

    if (entries.length === 0) {
      container.innerHTML = '<div class="empty-state">No workflow variables defined. Use form above to add variables.</div>';
      return;
    }

    container.innerHTML = entries.map(([k, v]) => \`
      <div class="var-item">
        <div class="var-item-key">\${k}</div>
        <div class="var-item-val">\${String(v)}</div>
        <div class="var-item-actions">
          <button class="step-btn btn-del-var btn-icon-del" data-key="\${k}" title="Delete variable">${ICONS.trash}</button>
        </div>
      </div>
    \`).join('');

    container.querySelectorAll(".btn-del-var").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const k = btn.getAttribute("data-key");
        if (k && flowState.variables) {
          delete flowState.variables[k];
          persistState(); renderDrawer();
          emitRecordEvent({ type: "setVariables", variables: flowState.variables });
          showToast('Deleted variable "' + k + '"');
        }
      });
    });
  }

  function renderStepsList() {
    const container = shadow.getElementById("steps-list-container");
    if (!container) return;
    const tabCount = shadow.getElementById("tab-steps-count");
    if (tabCount) tabCount.innerText = String(flowState.steps.length);

    if (flowState.steps.length === 0) {
      container.innerHTML = '<div class="empty-state">No recorded steps yet. Perform actions on the page or use the toolbar.</div>';
      return;
    }

    container.innerHTML = flowState.steps.map((st, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === flowState.steps.length - 1;
      let detail = st.selector || st.url || (st.durationMs ? st.durationMs + 'ms' : '') || st.code || '';
      if (st.text) detail += ' text="' + st.text + '"';
      if (st.as) detail += ' -> {{' + st.as + '}}';
      if (st.frame) detail = '[frame: ' + st.frame + '] ' + detail;
      const actIcon = st.action === 'click' ? '🖱️' : st.action === 'type' ? '⌨️' : st.action === 'goto' ? '🌐' : st.action === 'assert' ? '🛡️' : st.action === 'extract' ? '📦' : st.action === 'extractMultiple' ? '📊' : st.action === 'wait' ? '⏱️' : st.action === 'waitForSelector' ? '⏳' : '⚡';

      return \`
        <div class="step-item" data-step-idx="\${idx}">
          <div class="step-item-num">\${idx + 1}</div>
          <div class="step-item-info">
            <div class="step-item-title">\${actIcon} \${st.name || st.action}</div>
            <div class="step-item-detail">\${detail}</div>
          </div>
          <div class="step-item-actions">
            <button class="step-btn btn-step-up btn-icon-up" data-idx="\${idx}" \${isFirst ? 'disabled style="opacity:0.3;"' : ''} title="Move Step Up">${ICONS.chevronUp}</button>
            <button class="step-btn btn-step-down btn-icon-down" data-idx="\${idx}" \${isLast ? 'disabled style="opacity:0.3;"' : ''} title="Move Step Down">${ICONS.chevronDown}</button>
            <button class="step-btn btn-step-del btn-icon-del" data-idx="\${idx}" title="Delete Step">${ICONS.trash}</button>
          </div>
        </div>
      \`;
    }).join('');

    container.querySelectorAll(".btn-icon-up").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute("data-idx"));
        if (idx > 0) {
          const tmp = flowState.steps[idx - 1];
          flowState.steps[idx - 1] = flowState.steps[idx];
          flowState.steps[idx] = tmp;
          persistState(); renderDrawer();
          emitRecordEvent({ type: "moveStep", fromIndex: idx, toIndex: idx - 1, steps: flowState.steps });
        }
      });
    });

    container.querySelectorAll(".btn-icon-down").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute("data-idx"));
        if (idx < flowState.steps.length - 1) {
          const tmp = flowState.steps[idx + 1];
          flowState.steps[idx + 1] = flowState.steps[idx];
          flowState.steps[idx] = tmp;
          persistState(); renderDrawer();
          emitRecordEvent({ type: "moveStep", fromIndex: idx, toIndex: idx + 1, steps: flowState.steps });
        }
      });
    });

    container.querySelectorAll(".btn-icon-del").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute("data-idx"));
        if (idx >= 0 && idx < flowState.steps.length) {
          const removed = flowState.steps.splice(idx, 1)[0];
          persistState(); renderDrawer();
          emitRecordEvent({ type: "deleteStep", index: idx });
          showToast('Deleted step ' + (idx + 1) + ': ' + (removed.name || removed.action));
        }
      });
    });
  }

  function renderDrawer() {
    const subtitle = shadow.getElementById("drawer-subtitle");
    if (subtitle) {
      const varCount = flowState.variables ? Object.keys(flowState.variables).length : 0;
      subtitle.innerText = "Flow: " + (flowState.name || "Recorded Flow") + " • " + flowState.steps.length + " steps • " + varCount + " variables";
    }
    const configCount = shadow.getElementById("btn-config-count");
    if (configCount) configCount.innerText = String(flowState.steps.length);

    renderStepsList();
    renderVarsList();
    renderJsonViewer();
  }

  function toggleDrawer(forceOpen) {
    isDrawerOpen = typeof forceOpen === "boolean" ? forceOpen : !isDrawerOpen;
    const overlay = shadow.getElementById("drawer-overlay");
    if (overlay) {
      overlay.classList.toggle("open", isDrawerOpen);
      if (isDrawerOpen) renderDrawer();
    }
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
    const viewer = shadow.getElementById("drawer-json-viewer");
    if (viewer) {
      navigator.clipboard?.writeText(viewer.value);
      showToast("JSON copied to clipboard!");
    }
  });

  shadow.getElementById("btn-start-picker")?.addEventListener("click", () => {
    toggleDrawer(false);
    if (typeof activatePointerMode === "function") activatePointerMode();
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
