import { ICONS } from "./hud-icons.js";

export const INJECTED_MODALS_SRC = `
  let modalCallback = null;
  function openVariableModal(title, preview, defaultName, onConfirm) {
    const modalOverlay = shadow.getElementById("modal-overlay");
    const modalTitle = shadow.getElementById("modal-title");
    const modalPreview = shadow.getElementById("modal-preview");
    const modalInput = shadow.getElementById("modal-var-input");
    if (modalTitle) modalTitle.innerHTML = title;
    if (modalPreview) modalPreview.innerText = preview ? ("Preview: " + preview) : "No preview text";
    if (modalInput) { modalInput.value = defaultName; setTimeout(() => modalInput.focus(), 50); }
    modalCallback = onConfirm;
    modalOverlay?.classList.add("open");
  }

  function closeModal() {
    shadow.getElementById("modal-overlay")?.classList.remove("open");
    modalCallback = null;
  }

  shadow.getElementById("modal-cancel-btn")?.addEventListener("click", () => { closeModal(); showToast("Action cancelled", true); });
  shadow.getElementById("modal-save-btn")?.addEventListener("click", () => {
    const val = shadow.getElementById("modal-var-input")?.value?.trim();
    if (modalCallback && val) modalCallback(val);
    closeModal();
  });
  shadow.getElementById("modal-var-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = e.target?.value?.trim();
      if (modalCallback && val) modalCallback(val);
      closeModal();
    } else if (e.key === "Escape") closeModal();
  });

  let assertCallback = null;
  function openAssertModal(selector, preview, onConfirm) {
    const modalOverlay = shadow.getElementById("modal-assert-overlay");
    const modalPreview = shadow.getElementById("modal-assert-preview");
    const modalVal = shadow.getElementById("modal-assert-val");
    if (modalPreview) modalPreview.innerText = 'Selector: ' + selector + String.fromCharCode(10) + 'Text: ' + preview;
    if (modalVal) { modalVal.value = preview; setTimeout(() => modalVal.focus(), 50); }
    assertCallback = onConfirm;
    modalOverlay?.classList.add("open");
  }

  function closeAssertModal() {
    shadow.getElementById("modal-assert-overlay")?.classList.remove("open");
    assertCallback = null;
  }

  shadow.getElementById("modal-assert-cancel")?.addEventListener("click", () => { closeAssertModal(); showToast("Assertion cancelled", true); });
  shadow.getElementById("modal-assert-save")?.addEventListener("click", () => {
    const assertType = shadow.getElementById("modal-assert-type")?.value || "strict";
    const expectedVal = shadow.getElementById("modal-assert-val")?.value ?? "";
    if (assertCallback) assertCallback(assertType, expectedVal);
    closeAssertModal();
  });
  shadow.getElementById("modal-assert-val")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const assertType = shadow.getElementById("modal-assert-type")?.value || "strict";
      const expectedVal = e.target?.value ?? "";
      if (assertCallback) assertCallback(assertType, expectedVal);
      closeAssertModal();
    } else if (e.key === "Escape") closeAssertModal();
  });

  const dataOverlay = shadow.getElementById("modal-data-overlay");
  const dataSheetInput = shadow.getElementById("input-data-sheet");
  const dataTabInput = shadow.getElementById("input-data-tab");
  const dataRangeInput = shadow.getElementById("input-data-range");
  const dataAccountInput = shadow.getElementById("input-data-account");

  function currentDataSource() {
    const sourceName = flowState.data?.source;
    return sourceName ? flowState.dataSources?.[sourceName] : undefined;
  }

  function closeDataModal() {
    dataOverlay?.classList.remove("open");
  }

  function openDataModal() {
    const source = currentDataSource();
    let sheet = "", tab = "", range = "";
    if (source?.uri) {
      try {
        const uri = new URL(source.uri);
        sheet = decodeURIComponent(uri.hostname);
        tab = decodeURIComponent(uri.pathname.replace(/^\\/+/, ""));
        range = uri.searchParams.get("range") || "";
      } catch { sheet = source.uri; }
    }
    if (dataSheetInput) dataSheetInput.value = sheet;
    if (dataTabInput) dataTabInput.value = tab;
    if (dataRangeInput) dataRangeInput.value = range;
    if (dataAccountInput) dataAccountInput.value = source?.account || "";
    const current = shadow.getElementById("modal-data-current");
    if (current) {
      current.hidden = !source?.uri;
      current.innerText = source?.uri ? ("Attached: " + source.uri) : "";
    }
    const detach = shadow.getElementById("btn-data-detach");
    if (detach) detach.hidden = !source;
    dataOverlay?.classList.add("open");
    setTimeout(() => dataSheetInput?.focus(), 50);
  }

  shadow.getElementById("btn-data")?.addEventListener("click", (e) => {
    e.stopPropagation();
    openDataModal();
  });
  shadow.getElementById("btn-data-cancel")?.addEventListener("click", closeDataModal);
  shadow.getElementById("btn-data-attach")?.addEventListener("click", () => {
    const input = dataSheetInput?.value?.trim();
    if (!input) {
      showToast("Paste a Google Sheet URL or spreadsheet ID", true);
      dataSheetInput?.focus();
      return;
    }
    emitRecordEvent({
      type: "attachDataSource",
      provider: "google-sheets",
      input,
      tab: dataTabInput?.value?.trim() || undefined,
      range: dataRangeInput?.value?.trim() || undefined,
      account: dataAccountInput?.value?.trim() || undefined,
    });
    closeDataModal();
    showToast("Google Sheet attached");
  });
  shadow.getElementById("btn-data-detach")?.addEventListener("click", () => {
    emitRecordEvent({ type: "detachDataSource", provider: "google-sheets" });
    closeDataModal();
    showToast("Google Sheet detached");
  });
  dataOverlay?.addEventListener("click", (e) => {
    if (e.target === dataOverlay) closeDataModal();
  });
  for (const input of [dataSheetInput, dataTabInput, dataRangeInput, dataAccountInput]) {
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDataModal();
      if (e.key === "Enter") shadow.getElementById("btn-data-attach")?.click();
    });
  }

  const btnPause = shadow.getElementById("btn-pause");
  const btnExtract = shadow.getElementById("btn-extract");
  const btnList = shadow.getElementById("btn-list");
  const btnAssert = shadow.getElementById("btn-assert");
  const btnWait = shadow.getElementById("btn-wait");
  const btnShot = shadow.getElementById("btn-shot");
  const btnUndo = shadow.getElementById("btn-undo");
  const btnStop = shadow.getElementById("btn-stop");
  const tooltip = shadow.getElementById("tooltip");

  const togglePause = (e) => {
    e?.stopPropagation();
    flowState.isPaused = !flowState.isPaused;
    persistState(); updateBadge();
    if (btnPause) btnPause.innerHTML = flowState.isPaused ? (${JSON.stringify(ICONS.play)} + '<span class="hud-action-label">Resume</span>') : (${JSON.stringify(ICONS.pause)} + '<span class="hud-action-label">Pause</span>');
    if (btnPause) btnPause.setAttribute("title", flowState.isPaused ? "Resume recording" : "Pause recording");
    shadow.getElementById("badge")?.classList.toggle("paused", flowState.isPaused);
    showToast(flowState.isPaused ? "Recording paused" : "Recording resumed");
    if (typeof broadcastModes === "function") broadcastModes();
    emitRecordEvent({ type: flowState.isPaused ? "pause" : "resume" });
  };
  btnPause?.addEventListener("click", togglePause);
  shadow.getElementById("badge")?.addEventListener("click", togglePause);
  shadow.getElementById("badge")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePause(e); }
  });

  btnExtract?.addEventListener("click", (e) => {
    e.stopPropagation();
    isExtractMode = !isExtractMode; isListExtractMode = false; isAssertMode = false;
    btnExtract.classList.toggle("active", isExtractMode);
    btnList?.classList.remove("active"); btnAssert?.classList.remove("active-assert");
    if (typeof broadcastModes === "function") broadcastModes();
    showToast(isExtractMode ? "Extract Mode ON" : "Extract Mode OFF");
  });

  btnList?.addEventListener("click", (e) => {
    e.stopPropagation();
    isListExtractMode = !isListExtractMode; isExtractMode = false; isAssertMode = false;
    btnList.classList.toggle("active", isListExtractMode);
    btnExtract?.classList.remove("active"); btnAssert?.classList.remove("active-assert");
    if (typeof broadcastModes === "function") broadcastModes();
    showToast(isListExtractMode ? "List Mode ON" : "List Mode OFF");
  });

  btnAssert?.addEventListener("click", (e) => {
    e.stopPropagation();
    isAssertMode = !isAssertMode; isExtractMode = false; isListExtractMode = false;
    btnAssert.classList.toggle("active-assert", isAssertMode);
    btnExtract?.classList.remove("active"); btnList?.classList.remove("active");
    if (typeof broadcastModes === "function") broadcastModes();
    showToast(isAssertMode ? "Assert Mode ON" : "Assert Mode OFF");
  });

  btnWait?.addEventListener("click", (e) => {
    e.stopPropagation(); toggleDrawer(true);
    shadow.querySelectorAll(".drawer-tab").forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
    shadow.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    const addTab = shadow.querySelector('.drawer-tab[data-tab="add"]');
    addTab?.classList.add("active"); addTab?.setAttribute("aria-selected", "true");
    shadow.getElementById("panel-add")?.classList.add("active");
    const body = shadow.querySelector(".drawer-body");
    if (body) body.scrollTop = 0;
    shadow.getElementById("add-wait-ms")?.focus();
  });

  btnShot?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (flowState.isPaused) return;
    const shotPath = '{{outputDir}}/screenshot-' + Date.now() + '.png';
    const step = { name: "Capture Screenshot at Step " + (flowState.steps.length + 1), action: "screenshot", path: shotPath };
    flowState.steps.push(step); persistState(); renderDrawer();
    emitRecordEvent({ type: "screenshot", path: shotPath, url: window.location.href });
    showToast("Screenshot step added!");
  });

  btnUndo?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (flowState.steps.length > 0) {
      const removed = flowState.steps.pop();
      persistState(); renderDrawer();
      emitRecordEvent({ type: "undo" });
      showToast("Undid step: " + (removed.name || removed.action));
    } else showToast("No steps to undo", true);
  });

  btnStop?.addEventListener("click", (e) => {
    e.stopPropagation();
    emitRecordEvent({ type: "finish", flow: flowState });
    showToast("Flow saved successfully!");
  });
`;
