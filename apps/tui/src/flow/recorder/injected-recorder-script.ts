import { ICONS } from "./hud-icons.js";
import { HUD_STYLES } from "./hud-styles.js";
import { HUD_HTML } from "./hud-template.js";
import { INJECTED_DRAWER_RENDER_SRC } from "./injected-drawer-render.js";
import { INJECTED_EVENT_RECORDER_SRC } from "./injected-event-recorder.js";
import { INJECTED_WEBCAM_SRC } from "./injected-webcam.js";

export const INJECTED_ADVANCED_RECORDER_SCRIPT = `
(() => {
  ${INJECTED_WEBCAM_SRC}

  if (window.__cdpRecorderInjected) {
    if (window.__cdpHydrate) window.__cdpHydrate();
    return;
  }
  window.__cdpRecorderInjected = true;

  const isTopWindow = window === window.top;
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

  function getFrameIdentifier() {
    if (window === window.top) return undefined;
    if (window.name && window.name.trim()) return window.name.trim();
    try {
      if (window.location.host && window.location.pathname && window.location.pathname !== "/" && window.location.pathname !== "blank") {
        return window.location.host + window.location.pathname;
      }
      if (window.location.pathname && window.location.pathname !== "/" && window.location.pathname !== "blank") {
        return window.location.pathname;
      }
      if (window.location.host) return window.location.host;
    } catch {}
    return window.location.href;
  }

  function emitRecordEvent(event) {
    const frameId = getFrameIdentifier();
    if (frameId && !event.frame) event.frame = frameId;
    if (window.__cdpRecordEvent) {
      window.__cdpRecordEvent(JSON.stringify(event));
    } else if (!isTopWindow && window.top) {
      try { window.top.postMessage({ type: "__cdp_child_record_event__", payload: event }, "*"); } catch {}
    }
  }

  function broadcastModes() {
    if (!isTopWindow) return;
    try {
      const iframes = document.querySelectorAll("iframe, frame");
      for (let i = 0; i < iframes.length; i++) {
        try {
          iframes[i].contentWindow?.postMessage({
            type: "__cdp_recorder_mode__",
            isExtractMode,
            isListExtractMode,
            isAssertMode,
            isPaused: flowState.isPaused,
          }, "*");
        } catch {}
      }
    } catch {}
  }

  window.addEventListener("message", (e) => {
    if (!e.data) return;
    if (e.data.type === "__cdp_recorder_mode__") {
      if (typeof e.data.isExtractMode === "boolean") isExtractMode = e.data.isExtractMode;
      if (typeof e.data.isListExtractMode === "boolean") isListExtractMode = e.data.isListExtractMode;
      if (typeof e.data.isAssertMode === "boolean") isAssertMode = e.data.isAssertMode;
      if (typeof e.data.isPaused === "boolean") flowState.isPaused = e.data.isPaused;
    } else if (e.data.type === "__cdp_child_record_event__" && isTopWindow && e.data.payload) {
      emitRecordEvent(e.data.payload);
    }
  });

  const hudContainer = document.createElement("div");
  hudContainer.id = "__cdp_recorder_hud__";
  hudContainer.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;";

  const shadow = hudContainer.attachShadow({ mode: "open" });
  shadow.innerHTML = ${JSON.stringify(`<style>${HUD_STYLES}</style>${HUD_HTML}`)};

  if (!isTopWindow) {
    const barEl = shadow.getElementById("bar");
    if (barEl) barEl.style.display = "none";
    const drawerEl = shadow.getElementById("drawer");
    if (drawerEl) drawerEl.style.display = "none";
  }

  function showToast(msg, isWarn = false) {
    const toast = shadow.getElementById("toast");
    if (!toast) return;
    toast.innerText = msg;
    toast.style.borderColor = isWarn ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.12)";
    toast.style.color = "#fafafa";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function updateBadge() {
    const badgeText = shadow.getElementById("badge-text");
    if (badgeText) badgeText.innerText = (flowState.isPaused ? "PAUSED (" : "REC (") + (flowState.steps || []).length + ")";
    const configCount = shadow.getElementById("btn-config-count");
    if (configCount) configCount.innerText = (flowState.steps || []).length;
  }

  ${INJECTED_DRAWER_RENDER_SRC}

  let isDragging = false, dragStartX = 0, dragStartY = 0, initialPosX = 0, initialPosY = 0, curPosX = 0, curPosY = 0;
  let dragRafId = null;
  const bar = shadow.getElementById("bar");
  const dragHandle = shadow.getElementById("drag-handle");

  dragHandle?.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    curPosX = initialPosX + (e.clientX - dragStartX);
    curPosY = initialPosY + (e.clientY - dragStartY);
    if (!dragRafId) {
      dragRafId = requestAnimationFrame(() => {
        if (bar) bar.style.transform = "translate3d(" + curPosX + "px, " + curPosY + "px, 0)";
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
    const toggleBtn = shadow.getElementById("btn-toggle");
    if (toggleBtn) toggleBtn.innerHTML = isCollapsed ? ${JSON.stringify(ICONS.chevronRight)} : ${JSON.stringify(ICONS.chevronLeft)};
  });

  ${INJECTED_EVENT_RECORDER_SRC}

  function mountHud() {
    if (!document.getElementById("__cdp_recorder_hud__") && (document.body || document.documentElement)) {
      (document.body || document.documentElement).appendChild(hudContainer);
      if (isTopWindow) updateBadge();
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
