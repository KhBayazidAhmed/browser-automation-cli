import { HUD_STYLES } from "./hud-styles.js";
import { HUD_HTML } from "./hud-template.js";
import { INJECTED_DRAWER_RENDER_SRC } from "./injected-drawer-render.js";
import { INJECTED_EVENT_RECORDER_SRC } from "./injected-event-recorder.js";

export const INJECTED_ADVANCED_RECORDER_SCRIPT = `
(() => {
  if (window.__cdpRecorderInjected) {
    if (window.__cdpHydrate) window.__cdpHydrate();
    return;
  }
  window.__cdpRecorderInjected = true;

  let flowState = { name: "Recorded Flow", steps: [], variables: {}, isPaused: false };
  try {
    const saved = sessionStorage.getItem("__cdp_flow_state__");
    if (saved) flowState = { ...flowState, ...JSON.parse(saved) };
  } catch {}

  let isExtractMode = false, isListExtractMode = false, isAssertMode = false;
  let isCollapsed = false, isDrawerOpen = false, extractCount = 0, hoveredEl = null;

  function persistState() {
    try { sessionStorage.setItem("__cdp_flow_state__", JSON.stringify(flowState)); } catch {}
  }

  function emitRecordEvent(event) {
    if (window.__cdpRecordEvent) window.__cdpRecordEvent(JSON.stringify(event));
  }

  const hudContainer = document.createElement("div");
  hudContainer.id = "__cdp_recorder_hud__";
  hudContainer.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;";

  const shadow = hudContainer.attachShadow({ mode: "open" });
  shadow.innerHTML = \`<style>${HUD_STYLES}</style>${HUD_HTML}\`;

  function showToast(msg, isWarn = false) {
    const toast = shadow.getElementById("toast");
    if (!toast) return;
    toast.innerText = msg;
    toast.style.borderColor = isWarn ? "#fbbf24" : "#10b981";
    toast.style.color = isWarn ? "#fbbf24" : "#10b981";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function updateBadge() {
    const count = flowState.steps.length;
    const badgeText = shadow.getElementById("badge-text");
    const badge = shadow.getElementById("badge");
    const btnPause = shadow.getElementById("btn-pause");
    const btnConfig = shadow.getElementById("btn-config");
    const tabStepsCount = shadow.getElementById("tab-steps-count");
    const tabVarsCount = shadow.getElementById("tab-vars-count");
    const subtitle = shadow.getElementById("drawer-subtitle");

    if (badgeText) badgeText.innerText = flowState.isPaused ? \`PAUSED (\${count})\` : \`REC (\${count})\`;
    if (badge) badge.classList.toggle("paused", flowState.isPaused);
    if (btnPause) {
      btnPause.innerText = flowState.isPaused ? "▶️ Resume" : "⏸️ Pause";
      btnPause.classList.toggle("active", flowState.isPaused);
    }
    if (btnConfig) {
      btnConfig.innerText = \`⚙️ Config (\${count})\`;
      btnConfig.classList.toggle("active", isDrawerOpen);
    }
    if (tabStepsCount) tabStepsCount.innerText = String(count);
    if (tabVarsCount) tabVarsCount.innerText = String(Object.keys(flowState.variables).length);
    if (subtitle) subtitle.innerText = \`Flow: \${flowState.name} • \${count} steps • \${Object.keys(flowState.variables).length} variables\`;
  }

  ${INJECTED_DRAWER_RENDER_SRC}

  const barWrapper = shadow.getElementById("bar-wrapper");
  let isDragging = false, dragStartX = 0, dragStartY = 0, initialPosX = 0, initialPosY = 0, curPosX = 0, curPosY = 0, dragRafId = null;

  shadow.getElementById("drag-handle")?.addEventListener("mousedown", (e) => {
    isDragging = true; dragStartX = e.clientX; dragStartY = e.clientY;
    const rect = barWrapper.getBoundingClientRect();
    initialPosX = rect.left; initialPosY = rect.top;
    barWrapper.style.left = "0px"; barWrapper.style.top = "0px"; barWrapper.style.bottom = "auto";
    barWrapper.style.transform = \`translate3d(\${initialPosX}px, \${initialPosY}px, 0)\`;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging || !barWrapper) return;
    curPosX = initialPosX + (e.clientX - dragStartX); curPosY = initialPosY + (e.clientY - dragStartY);
    if (!dragRafId) {
      dragRafId = requestAnimationFrame(() => {
        barWrapper.style.transform = \`translate3d(\${curPosX}px, \${curPosY}px, 0)\`;
        dragRafId = null;
      });
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) { isDragging = false; if (dragRafId) { cancelAnimationFrame(dragRafId); dragRafId = null; } initialPosX = curPosX; initialPosY = curPosY; }
  });

  shadow.getElementById("btn-toggle")?.addEventListener("click", () => {
    isCollapsed = !isCollapsed;
    shadow.getElementById("bar")?.classList.toggle("collapsed", isCollapsed);
    shadow.getElementById("btn-toggle").innerText = isCollapsed ? "▶" : "◀";
  });

  ${INJECTED_EVENT_RECORDER_SRC}

  function mountHud() {
    if (!document.getElementById("__cdp_recorder_hud__") && (document.body || document.documentElement)) {
      (document.body || document.documentElement).appendChild(hudContainer);
      updateBadge();
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountHud);
  else mountHud();

  window.__cdpSyncState = (s) => {
    try { flowState = { ...flowState, ...(typeof s === "string" ? JSON.parse(s) : s) }; persistState(); renderDrawer(); } catch {}
  };
  window.__cdpHydrate = () => { mountHud(); renderDrawer(); };
})();
`;
