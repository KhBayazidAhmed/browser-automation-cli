export const INJECTED_WAIT_TARGET_SRC = `
  function resetWaitTargetVisuals() {
    if (hoveredEl) {
      hoveredEl.style.outline = "";
      hoveredEl.style.cursor = "";
      hoveredEl = null;
    }
    if (tooltip) tooltip.style.display = "none";
  }

  function showWaitTargetPanel(selector) {
    toggleDrawer(true);
    shadow.querySelectorAll(".drawer-tab").forEach((tab) => {
      const isAdd = tab.getAttribute("data-tab") === "add";
      tab.classList.toggle("active", isAdd);
      tab.setAttribute("aria-selected", String(isAdd));
    });
    shadow.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
    shadow.getElementById("panel-add")?.classList.add("active");
    const body = shadow.querySelector(".drawer-body");
    if (body) body.scrollTop = 0;
    const input = shadow.getElementById("add-waitfor-sel");
    if (input && selector) input.value = selector;
    requestAnimationFrame(() => { input?.focus(); input?.select?.(); });
  }

  function applyWaitTargetSelection(selector) {
    isWaitTargetMode = false;
    resetWaitTargetVisuals();
    if (typeof broadcastModes === "function") broadcastModes();
    showWaitTargetPanel(selector);
    showToast("Element targeted: " + selector);
  }

  function submitWaitTargetSelection(selector) {
    if (isTopWindow) applyWaitTargetSelection(selector);
    else {
      isWaitTargetMode = false;
      resetWaitTargetVisuals();
      try { window.top?.postMessage({ type: "__cdp_wait_target_selected__", selector }, "*"); } catch {}
    }
  }

  function cancelWaitTargetSelection() {
    isWaitTargetMode = false;
    resetWaitTargetVisuals();
    if (typeof broadcastModes === "function") broadcastModes();
    showWaitTargetPanel("");
    showToast("Element targeting cancelled", true);
  }

  function requestWaitTargetCancel() {
    if (isTopWindow) cancelWaitTargetSelection();
    else {
      isWaitTargetMode = false;
      resetWaitTargetVisuals();
      try { window.top?.postMessage({ type: "__cdp_wait_target_cancel__" }, "*"); } catch {}
    }
  }

  shadow.getElementById("btn-target-waitfor")?.addEventListener("click", (e) => {
    e.stopPropagation();
    isExtractMode = false; isListExtractMode = false; isAssertMode = false; isWaitTargetMode = true;
    btnExtract?.classList.remove("active"); btnList?.classList.remove("active"); btnAssert?.classList.remove("active-assert");
    toggleDrawer(false);
    if (typeof broadcastModes === "function") broadcastModes();
    showToast("Select an element on the page • Esc to cancel");
  });
`;
