import { ICONS } from "./hud-icons.js";

export const INJECTED_WEBCAM_MODAL_SRC = `
  function updateWebcamStatusUI() {
    const cam = window.__cdpVirtualWebcam;
    if (!cam) return;
    const isActive = cam.sourceType && cam.sourceType !== "none";
    const statusPreview = shadow.getElementById("webcam-status-preview");
    if (statusPreview) statusPreview.innerText = "Feed: " + (cam.sourceInfo || "None") + (isActive ? " (640x480 @ 30fps)" : "");
    const camBtn = shadow.getElementById("btn-webcam");
    if (camBtn) {
      camBtn.classList.toggle("active-cam", isActive);
      camBtn.innerHTML = ${JSON.stringify(ICONS.camera)} + (isActive ? " Cam (ON)" : " Cam");
    }
  }

  shadow.getElementById("btn-webcam")?.addEventListener("click", (e) => {
    e.stopPropagation(); updateWebcamStatusUI();
    shadow.getElementById("modal-webcam-overlay")?.classList.add("open");
  });
  shadow.getElementById("btn-webcam-close")?.addEventListener("click", (e) => {
    e?.stopPropagation(); shadow.getElementById("modal-webcam-overlay")?.classList.remove("open");
  });
  shadow.getElementById("btn-webcam-pattern")?.addEventListener("click", (e) => {
    e?.stopPropagation();
    if (window.__cdpVirtualWebcam) { window.__cdpVirtualWebcam.useTestPattern(); updateWebcamStatusUI(); showToast("Virtual Webcam: Test Pattern Active"); }
    shadow.getElementById("modal-webcam-overlay")?.classList.remove("open");
  });
  shadow.getElementById("btn-webcam-solid")?.addEventListener("click", (e) => {
    e?.stopPropagation();
    if (window.__cdpVirtualWebcam) { window.__cdpVirtualWebcam.useColorFeed("#27272a"); updateWebcamStatusUI(); showToast("Virtual Webcam: Solid Slate Feed Active"); }
    shadow.getElementById("modal-webcam-overlay")?.classList.remove("open");
  });

  const applyWebcamUrl = async (e) => {
    e?.stopPropagation();
    const inputUrl = shadow.getElementById("input-webcam-url");
    const url = inputUrl?.value?.trim();
    if (!url) { showToast("Please enter a valid video URL", true); return; }
    if (window.__cdpVirtualWebcam) {
      showToast("Loading video stream URL...");
      const stream = await window.__cdpVirtualWebcam.setVideoUrl(url);
      if (stream) { updateWebcamStatusUI(); showToast("Virtual Webcam: Video URL Active"); shadow.getElementById("modal-webcam-overlay")?.classList.remove("open"); }
      else showToast("Failed to load video from URL", true);
    }
  };
  shadow.getElementById("btn-webcam-url-apply")?.addEventListener("click", applyWebcamUrl);
  shadow.getElementById("input-webcam-url")?.addEventListener("keydown", (e) => { if (e.key === "Enter") applyWebcamUrl(e); });

  shadow.getElementById("input-webcam-file")?.addEventListener("change", async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const fileNameEl = shadow.getElementById("webcam-file-name");
    if (fileNameEl) fileNameEl.innerText = file.name;
    if (window.__cdpVirtualWebcam) {
      showToast("Loading video file: " + file.name);
      const stream = await window.__cdpVirtualWebcam.setVideoFile(file);
      if (stream) { updateWebcamStatusUI(); showToast("Virtual Webcam: Video File Active (" + file.name + ")"); shadow.getElementById("modal-webcam-overlay")?.classList.remove("open"); }
      else showToast("Failed to load video file", true);
    }
  });

  shadow.getElementById("btn-webcam-reset")?.addEventListener("click", (e) => {
    e?.stopPropagation();
    if (window.__cdpVirtualWebcam) {
      window.__cdpVirtualWebcam.clear(); updateWebcamStatusUI();
      const fileNameEl = shadow.getElementById("webcam-file-name");
      if (fileNameEl) fileNameEl.innerText = "No file selected";
      const inputUrl = shadow.getElementById("input-webcam-url");
      if (inputUrl) inputUrl.value = "";
      showToast("Virtual Webcam Disabled", true);
    }
    shadow.getElementById("modal-webcam-overlay")?.classList.remove("open");
  });
`;
