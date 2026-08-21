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
    if (modalPreview) modalPreview.innerText = "Selector: " + selector + "\\nText: \\"" + preview + "\\"";
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

  const btnPause = shadow.getElementById("btn-pause");
  const btnExtract = shadow.getElementById("btn-extract");
  const btnList = shadow.getElementById("btn-list");
  const btnAssert = shadow.getElementById("btn-assert");
  const btnWait = shadow.getElementById("btn-wait");
  const btnShot = shadow.getElementById("btn-shot");
  const btnWebcam = shadow.getElementById("btn-webcam");
  const btnUndo = shadow.getElementById("btn-undo");
  const btnStop = shadow.getElementById("btn-stop");
  const tooltip = shadow.getElementById("tooltip");

  const togglePause = (e) => {
    e?.stopPropagation();
    flowState.isPaused = !flowState.isPaused;
    persistState(); updateBadge();
    if (btnPause) btnPause.innerHTML = flowState.isPaused ? (${JSON.stringify(ICONS.play)} + " Resume") : (${JSON.stringify(ICONS.pause)} + " Pause");
    const badgeEl = shadow.getElementById("badge");
    badgeEl?.classList.toggle("paused", flowState.isPaused);
    showToast(flowState.isPaused ? "Recording paused" : "Recording resumed");
    emitRecordEvent({ type: flowState.isPaused ? "pause" : "resume" });
  };
  btnPause?.addEventListener("click", togglePause);
  shadow.getElementById("badge")?.addEventListener("click", togglePause);

  btnExtract?.addEventListener("click", (e) => {
    e.stopPropagation();
    isExtractMode = !isExtractMode; isListExtractMode = false; isAssertMode = false;
    btnExtract.classList.toggle("active", isExtractMode);
    btnList?.classList.remove("active"); btnAssert?.classList.remove("active-assert");
    showToast(isExtractMode ? "Extract Mode ON" : "Extract Mode OFF");
  });

  btnList?.addEventListener("click", (e) => {
    e.stopPropagation();
    isListExtractMode = !isListExtractMode; isExtractMode = false; isAssertMode = false;
    btnList.classList.toggle("active", isListExtractMode);
    btnExtract?.classList.remove("active"); btnAssert?.classList.remove("active-assert");
    showToast(isListExtractMode ? "List Mode ON" : "List Mode OFF");
  });

  btnAssert?.addEventListener("click", (e) => {
    e.stopPropagation();
    isAssertMode = !isAssertMode; isExtractMode = false; isListExtractMode = false;
    btnAssert.classList.toggle("active-assert", isAssertMode);
    btnExtract?.classList.remove("active"); btnList?.classList.remove("active");
    showToast(isAssertMode ? "Assert Mode ON" : "Assert Mode OFF");
  });

  btnWait?.addEventListener("click", (e) => {
    e.stopPropagation(); toggleDrawer(true);
    shadow.querySelectorAll(".drawer-tab").forEach((t) => t.classList.remove("active"));
    shadow.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    shadow.querySelector('.drawer-tab[data-tab="add"]')?.classList.add("active");
    shadow.getElementById("panel-add")?.classList.add("active");
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

  const modalWebcamOverlay = shadow.getElementById("modal-webcam-overlay");
  const btnWebcamPattern = shadow.getElementById("btn-webcam-pattern");
  const btnWebcamSolid = shadow.getElementById("btn-webcam-solid");
  const btnWebcamDisable = shadow.getElementById("btn-webcam-reset");
  const modalWebcamClose = shadow.getElementById("btn-webcam-close");

  btnWebcam?.addEventListener("click", (e) => {
    e.stopPropagation();
    modalWebcamOverlay?.classList.add("open");
  });

  modalWebcamClose?.addEventListener("click", (e) => {
    e?.stopPropagation();
    modalWebcamOverlay?.classList.remove("open");
  });

  btnWebcamPattern?.addEventListener("click", (e) => {
    e?.stopPropagation();
    if (window.__cdpVirtualWebcam) {
      window.__cdpVirtualWebcam.useTestPattern();
      btnWebcam?.classList.add("active-cam");
      if (btnWebcam) btnWebcam.innerHTML = ${JSON.stringify(ICONS.camera)} + " Cam (ON)";
      showToast("Virtual Webcam: Test Pattern Active");
    }
    modalWebcamOverlay?.classList.remove("open");
  });

  btnWebcamSolid?.addEventListener("click", (e) => {
    e?.stopPropagation();
    if (window.__cdpVirtualWebcam) {
      window.__cdpVirtualWebcam.useColorFeed("#27272a");
      btnWebcam?.classList.add("active-cam");
      if (btnWebcam) btnWebcam.innerHTML = ${JSON.stringify(ICONS.camera)} + " Cam (ON)";
      showToast("Virtual Webcam: Slate Feed Active");
    }
    modalWebcamOverlay?.classList.remove("open");
  });

  btnWebcamDisable?.addEventListener("click", (e) => {
    e?.stopPropagation();
    if (window.__cdpVirtualWebcam) {
      window.__cdpVirtualWebcam.clear();
      btnWebcam?.classList.remove("active-cam");
      if (btnWebcam) btnWebcam.innerHTML = ${JSON.stringify(ICONS.camera)} + " Cam";
      showToast("Virtual Webcam Disabled", true);
    }
    modalWebcamOverlay?.classList.remove("open");
  });

  btnUndo?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (flowState.steps.length > 0) {
      const removed = flowState.steps.pop();
      persistState(); renderDrawer();
      emitRecordEvent({ type: "undo" });
      showToast("Undid step: " + (removed.name || removed.action));
    } else {
      showToast("No steps to undo", true);
    }
  });

  btnStop?.addEventListener("click", (e) => {
    e.stopPropagation();
    emitRecordEvent({ type: "finish", flow: flowState });
    showToast("Flow saved successfully!");
  });
`;
