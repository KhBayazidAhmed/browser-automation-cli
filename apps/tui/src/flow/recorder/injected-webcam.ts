import { ICONS } from "./hud-icons.js";

export const INJECTED_WEBCAM_SRC = `
  if (!window.__cdpVirtualWebcam) {
    window.__cdpVirtualWebcam = {
      canvasEl: null,
      stream: null,
      animId: null,
      videoEl: null,
      sourceType: "none", // "none" | "pattern" | "solid" | "url" | "file"
      sourceInfo: "None",
      _installed: false,

      _ensureCanvas() {
        if (!this.canvasEl) {
          this.canvasEl = document.createElement("canvas");
          this.canvasEl.width = 640;
          this.canvasEl.height = 480;
          this.canvasEl.style.position = "fixed";
          this.canvasEl.style.top = "-9999px";
          this.canvasEl.style.left = "-9999px";
          this.canvasEl.style.opacity = "0";
          this.canvasEl.style.pointerEvents = "none";
          (document.body || document.documentElement).appendChild(this.canvasEl);
        }
        return this.canvasEl;
      },

      _ensureStream() {
        const canvas = this._ensureCanvas();
        if (!this.stream || !this.stream.active) {
          try {
            this.stream = canvas.captureStream(30);
          } catch (e) {
            console.warn("[CDP Virtual Webcam] Failed to captureStream:", e);
          }
        }
        return this.stream;
      },

      _stopCurrent() {
        if (this.animId) {
          clearInterval(this.animId);
          this.animId = null;
        }
        if (this.videoEl) {
          try {
            this.videoEl.pause();
            this.videoEl.removeAttribute("src");
            this.videoEl.load();
            this.videoEl.remove();
          } catch (_) {}
          this.videoEl = null;
        }
        this.sourceType = "none";
        this.sourceInfo = "None";
      },

      useTestPattern() {
        return this.setPattern();
      },

      setPattern() {
        this._stopCurrent();
        const canvas = this._ensureCanvas();
        const ctx = canvas.getContext("2d");
        let x = 50, y = 50, dx = 4, dy = 3;

        const draw = () => {
          ctx.fillStyle = "#111113";
          ctx.fillRect(0, 0, 640, 480);

          ctx.fillStyle = "#18181b";
          ctx.fillRect(20, 20, 600, 440);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 1;
          ctx.strokeRect(20, 20, 600, 440);

          x += dx; y += dy;
          if (x < 40 || x > 600) dx = -dx;
          if (y < 40 || y > 440) dy = -dy;
          ctx.beginPath();
          ctx.arc(x, y, 16, 0, Math.PI * 2);
          ctx.fillStyle = "#fafafa";
          ctx.fill();

          ctx.fillStyle = "#fafafa";
          ctx.font = "600 18px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillText("CDP Virtual Webcam Feed", 210, 220);
          ctx.font = "13px ui-monospace, monospace";
          ctx.fillStyle = "#a1a1aa";
          ctx.fillText(new Date().toISOString().slice(11, 19) + " UTC", 270, 250);
          ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillStyle = "#71717a";
          ctx.fillText("Synthetic Video Stream (640x480 @ 30fps)", 195, 280);
        };

        draw();
        this.animId = setInterval(draw, 1000 / 30);
        this._ensureStream();
        this.sourceType = "pattern";
        this.sourceInfo = "Synthetic Test Pattern (30 FPS)";
        this._notifyDeviceChange();
        return this.stream;
      },

      useColorFeed(color = "#27272a") {
        return this.setColorFeed(color);
      },

      setColorFeed(color = "#27272a") {
        this._stopCurrent();
        const canvas = this._ensureCanvas();
        const ctx = canvas.getContext("2d");

        const draw = () => {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 640, 480);

          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.font = "600 18px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillText("CDP Virtual Webcam - Solid Slate", 185, 225);
          ctx.font = "13px ui-monospace, monospace";
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.fillText(new Date().toISOString().slice(11, 19) + " UTC", 270, 255);
          ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          ctx.fillText("Color: " + color + " (640x480 @ 30fps)", 230, 280);
        };

        draw();
        this.animId = setInterval(draw, 1000 / 30);
        this._ensureStream();
        this.sourceType = "solid";
        this.sourceInfo = "Solid Color Feed (" + color + ")";
        this._notifyDeviceChange();
        return this.stream;
      },

      setVideoFile(file) {
        if (!file) return Promise.reject(new Error("No video file selected"));
        this._stopCurrent();
        const canvas = this._ensureCanvas();
        const ctx = canvas.getContext("2d");

        const video = document.createElement("video");
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.style.position = "fixed";
        video.style.top = "-9999px";
        video.style.left = "-9999px";
        video.style.opacity = "0";
        video.style.pointerEvents = "none";

        let blobUrl = "";
        try {
          blobUrl = URL.createObjectURL(file);
        } catch (_) {}
        if (blobUrl) video.src = blobUrl;
        (document.body || document.documentElement).appendChild(video);
        this.videoEl = video;

        const fileName = file.name || "custom-video.mp4";
        this.sourceType = "file";
        this.sourceInfo = "File: " + fileName;

        const draw = () => {
          if (video && video.videoWidth && video.videoHeight && video.readyState >= 2) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, 640, 480);
            try {
              const hRatio = 640 / video.videoWidth;
              const vRatio = 480 / video.videoHeight;
              const ratio = Math.min(hRatio, vRatio);
              const centerShiftX = (640 - video.videoWidth * ratio) / 2;
              const centerShiftY = (480 - video.videoHeight * ratio) / 2;
              ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight,
                            centerShiftX, centerShiftY, video.videoWidth * ratio, video.videoHeight * ratio);
            } catch (_) {}
          } else {
            ctx.fillStyle = "#09090b";
            ctx.fillRect(0, 0, 640, 480);
            ctx.fillStyle = "#18181b";
            ctx.fillRect(20, 20, 600, 440);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.strokeRect(20, 20, 600, 440);

            ctx.fillStyle = "#fafafa";
            ctx.font = "600 18px -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.fillText("Virtual Camera - Video File Stream", 175, 215);

            ctx.font = "14px ui-monospace, monospace";
            ctx.fillStyle = "#a1a1aa";
            ctx.fillText("Source: " + fileName, 180, 245);

            ctx.font = "12px ui-monospace, monospace";
            ctx.fillStyle = "#71717a";
            ctx.fillText(new Date().toISOString().slice(11, 19) + " UTC | 30 FPS", 245, 275);
          }
        };

        draw();
        this.animId = setInterval(draw, 1000 / 30);
        this._ensureStream();
        this._notifyDeviceChange();

        try { video.play().catch(() => {}); } catch (_) {}
        return Promise.resolve(this.stream);
      },

      setVideoUrl(url) {
        if (!url || typeof url !== "string") return Promise.reject(new Error("Invalid video URL"));
        this._stopCurrent();
        const canvas = this._ensureCanvas();
        const ctx = canvas.getContext("2d");

        const video = document.createElement("video");
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";
        video.style.position = "fixed";
        video.style.top = "-9999px";
        video.style.left = "-9999px";
        video.style.opacity = "0";
        video.style.pointerEvents = "none";
        video.src = url;
        (document.body || document.documentElement).appendChild(video);
        this.videoEl = video;

        const cleanUrl = url.length > 40 ? url.slice(0, 37) + "..." : url;
        this.sourceType = "url";
        this.sourceInfo = "URL: " + cleanUrl;

        const draw = () => {
          if (video && video.videoWidth && video.videoHeight && video.readyState >= 2) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, 640, 480);
            try {
              const hRatio = 640 / video.videoWidth;
              const vRatio = 480 / video.videoHeight;
              const ratio = Math.min(hRatio, vRatio);
              const centerShiftX = (640 - video.videoWidth * ratio) / 2;
              const centerShiftY = (480 - video.videoHeight * ratio) / 2;
              ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight,
                            centerShiftX, centerShiftY, video.videoWidth * ratio, video.videoHeight * ratio);
            } catch (_) {}
          } else {
            ctx.fillStyle = "#09090b";
            ctx.fillRect(0, 0, 640, 480);
            ctx.fillStyle = "#18181b";
            ctx.fillRect(20, 20, 600, 440);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.strokeRect(20, 20, 600, 440);

            ctx.fillStyle = "#fafafa";
            ctx.font = "600 18px -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.fillText("Virtual Camera - Video URL Stream", 175, 215);

            ctx.font = "14px ui-monospace, monospace";
            ctx.fillStyle = "#a1a1aa";
            ctx.fillText("URL: " + cleanUrl, 180, 245);

            ctx.font = "12px ui-monospace, monospace";
            ctx.fillStyle = "#71717a";
            ctx.fillText(new Date().toISOString().slice(11, 19) + " UTC | 30 FPS", 245, 275);
          }
        };

        draw();
        this.animId = setInterval(draw, 1000 / 30);
        this._ensureStream();
        this._notifyDeviceChange();

        try { video.play().catch(() => {}); } catch (_) {}
        return Promise.resolve(this.stream);
      },

      clear() {
        this._stopCurrent();
        if (this.stream) {
          this.stream.getTracks().forEach((t) => t.stop());
          this.stream = null;
        }
        if (this.canvasEl) {
          const ctx = this.canvasEl.getContext("2d");
          ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        }
        this._notifyDeviceChange();
      },

      _notifyDeviceChange() {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.dispatchEvent) {
            navigator.mediaDevices.dispatchEvent(new Event("devicechange"));
          }
        } catch (_) {}
      },

      init() {
        if (this._installed) return;
        this._installed = true;

        if (navigator.mediaDevices) {
          const origGetUserMedia = navigator.mediaDevices.getUserMedia?.bind(navigator.mediaDevices);
          const origEnumerateDevices = navigator.mediaDevices.enumerateDevices?.bind(navigator.mediaDevices);

          navigator.mediaDevices.enumerateDevices = async () => {
            let devs = [];
            try {
              if (origEnumerateDevices) devs = await origEnumerateDevices();
            } catch (_) {}

            const virtualDev = {
              deviceId: "cdp-virtual-webcam",
              groupId: "cdp-virtual-group",
              kind: "videoinput",
              label: "CDP Virtual Webcam (HD)",
              toJSON() {
                return {
                  deviceId: this.deviceId,
                  groupId: this.groupId,
                  kind: this.kind,
                  label: this.label,
                };
              },
            };

            const filtered = devs.filter((d) => d.deviceId !== "cdp-virtual-webcam");
            return [virtualDev, ...filtered];
          };

          navigator.mediaDevices.getUserMedia = async (constraints) => {
            if (constraints && constraints.video) {
              if (!this.stream || !this.stream.active) {
                this.setPattern();
              }
              const activeTracks = this.stream.getVideoTracks();
              if (activeTracks.length > 0) {
                const outStream = new MediaStream();
                activeTracks.forEach((t) => {
                  try {
                    Object.defineProperty(t, "label", {
                      value: "CDP Virtual Webcam (HD)",
                      configurable: true,
                    });
                  } catch (_) {}
                  outStream.addTrack(t);
                });
                return outStream;
              }
            }
            if (origGetUserMedia) {
              return origGetUserMedia(constraints);
            }
            throw new DOMException("Requested device not found", "NotFoundError");
          };
        }
      },
    };

    window.__cdpVirtualWebcam.init();
  }
`;
