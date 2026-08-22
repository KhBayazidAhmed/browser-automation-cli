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

  function updateWebcamStatusUI() {
    const cam = window.__cdpVirtualWebcam;
    if (!cam) return;
    const isActive = cam.sourceType && cam.sourceType !== "none";
    const statusPreview = shadow.getElementById("webcam-status-preview");
    if (statusPreview) {
      statusPreview.innerText = "Feed: " + (cam.sourceInfo || "None") + (isActive ? " (640x480 @ 30fps)" : "");
    }
    const camBtn = shadow.getElementById("btn-webcam");
    if (camBtn) {
      camBtn.classList.toggle("active-cam", isActive);
      camBtn.innerHTML = ${JSON.stringify(ICONS.camera)} + (isActive ? " Cam (ON)" : " Cam");
    }
  }

  shadow.getElementById("btn-webcam")?.addEventListener("click", (e) => {
    e.stopPropagation();
    updateWebcamStatusUI();
    shadow.getElementById("modal-webcam-overlay")?.classList.add("open");
  });

  shadow.getElementById("btn-webcam-close")?.addEventListener("click", (e) => {
    e?.stopPropagation();
    shadow.getElementById("modal-webcam-overlay")?.classList.remove("open");
  });

  shadow.getElementById("btn-webcam-pattern")?.addEventListener("click", (e) => {
    e?.stopPropagation();
    if (window.__cdpVirtualWebcam) {
      window.__cdpVirtualWebcam.useTestPattern();
      updateWebcamStatusUI();
      showToast("Virtual Webcam: Test Pattern Active");
    }
    shadow.getElementById("modal-webcam-overlay")?.classList.remove("open");
  });

  shadow.getElementById("btn-webcam-solid")?.addEventListener("click", (e) => {
    e?.stopPropagation();
    if (window.__cdpVirtualWebcam) {
      window.__cdpVirtualWebcam.useColorFeed("#27272a");
      updateWebcamStatusUI();
      showToast("Virtual Webcam: Solid Slate Feed Active");
    }
    shadow.getElementById("modal-webcam-overlay")?.classList.remove("open");
  });

  const applyWebcamUrl = async (e) => {
    e?.stopPropagation();
    const inputUrl = shadow.getElementById("input-webcam-url");
    const url = inputUrl?.value?.trim();
    if (!url) {
      showToast("Please enter a valid video URL", true);
      return;
    }
    if (window.__cdpVirtualWebcam) {
      showToast("Loading video stream URL...");
      const stream = await window.__cdpVirtualWebcam.setVideoUrl(url);
      if (stream) {
        updateWebcamStatusUI();
        showToast("Virtual Webcam: Video URL Active");
        shadow.getElementById("modal-webcam-overlay")?.classList.remove("open");
      } else {
        showToast("Failed to load video from URL", true);
      }
    }
  };

  shadow.getElementById("btn-webcam-url-apply")?.addEventListener("click", applyWebcamUrl);
  shadow.getElementById("input-webcam-url")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      applyWebcamUrl(e);
    }
  });

  shadow.getElementById("input-webcam-file")?.addEventListener("change", async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const fileNameEl = shadow.getElementById("webcam-file-name");
    if (fileNameEl) fileNameEl.innerText = file.name;
    if (window.__cdpVirtualWebcam) {
      showToast("Loading video file: " + file.name);
      const stream = await window.__cdpVirtualWebcam.setVideoFile(file);
      if (stream) {
        updateWebcamStatusUI();
        showToast("Virtual Webcam: Video File Active (" + file.name + ")");
        shadow.getElementById("modal-webcam-overlay")?.classList.remove("open");
      } else {
        showToast("Failed to load video file", true);
      }
    }
  });

  shadow.getElementById("btn-webcam-reset")?.addEventListener("click", (e) => {
    e?.stopPropagation();
    if (window.__cdpVirtualWebcam) {
      window.__cdpVirtualWebcam.clear();
      updateWebcamStatusUI();
      const fileNameEl = shadow.getElementById("webcam-file-name");
      if (fileNameEl) fileNameEl.innerText = "No file selected";
      const inputUrl = shadow.getElementById("input-webcam-url");
      if (inputUrl) inputUrl.value = "";
      showToast("Virtual Webcam Disabled", true);
    }
    shadow.getElementById("modal-webcam-overlay")?.classList.remove("open");
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
