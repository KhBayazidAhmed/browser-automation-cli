export const INJECTED_WEBCAM_SRC = `
  if (!window.__cdpVirtualWebcam) {
    window.__cdpVirtualWebcam = {
      stream: null,
      videoEl: null,
      canvasEl: null,
      animId: null,
      sourceType: "none",
      sourceInfo: "None",

      _ensureCanvas() {
        if (!this.canvasEl) {
          this.canvasEl = document.createElement("canvas");
          this.canvasEl.width = 640;
          this.canvasEl.height = 480;
          this.canvasEl.style.display = "none";
          (document.body || document.documentElement).appendChild(this.canvasEl);
        }
        return this.canvasEl;
      },

      _stopCurrent() {
        if (this.animId) {
          clearInterval(this.animId);
          this.animId = null;
        }
        if (this.videoEl) {
          this.videoEl.pause();
          this.videoEl.src = "";
          this.videoEl.remove();
          this.videoEl = null;
        }
        if (this.stream) {
          this.stream.getTracks().forEach((t) => t.stop());
          this.stream = null;
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
        this.stream = canvas.captureStream ? canvas.captureStream(30) : (canvas.mozCaptureStream ? canvas.mozCaptureStream(30) : null);
        if (this.stream) {
          this.stream.getVideoTracks().forEach((t) => {
            try { Object.defineProperty(t, "label", { value: "CDP Virtual Webcam (HD)", configurable: true }); } catch (_) {}
          });
        }
        this.sourceType = "pattern";
        this.sourceInfo = "Synthetic Test Pattern (30 FPS)";
        this._notifyDeviceChange();
        return this.stream;
      },

      setVideoFile(file) {
        this._stopCurrent();
        const video = document.createElement("video");
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.style.display = "none";
        video.src = URL.createObjectURL(file);
        (document.body || document.documentElement).appendChild(video);
        this.videoEl = video;

        return new Promise((resolve) => {
          video.onloadeddata = async () => {
            try { await video.play(); } catch (_) {}
            const stream = video.captureStream ? video.captureStream(30) : (video.mozCaptureStream ? video.mozCaptureStream(30) : null);
            this.stream = stream;
            if (this.stream) {
              this.stream.getVideoTracks().forEach((t) => {
                try { Object.defineProperty(t, "label", { value: "CDP Virtual Webcam (HD)", configurable: true }); } catch (_) {}
              });
            }
            this.sourceType = "file";
            this.sourceInfo = \`File: \${file.name}\`;
            this._notifyDeviceChange();
            resolve(this.stream);
          };
          video.onerror = () => {
            this._stopCurrent();
            resolve(null);
          };
        });
      },

      setVideoUrl(url) {
        this._stopCurrent();
        const video = document.createElement("video");
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";
        video.style.display = "none";
        video.src = url;
        (document.body || document.documentElement).appendChild(video);
        this.videoEl = video;

        return new Promise((resolve) => {
          video.onloadeddata = async () => {
            try { await video.play(); } catch (_) {}
            const stream = video.captureStream ? video.captureStream(30) : (video.mozCaptureStream ? video.mozCaptureStream(30) : null);
            this.stream = stream;
            if (this.stream) {
              this.stream.getVideoTracks().forEach((t) => {
                try { Object.defineProperty(t, "label", { value: "CDP Virtual Webcam (HD)", configurable: true }); } catch (_) {}
              });
            }
            this.sourceType = "url";
            const cleanUrl = url.length > 35 ? url.slice(0, 32) + "..." : url;
            this.sourceInfo = \`URL: \${cleanUrl}\`;
            this._notifyDeviceChange();
            resolve(this.stream);
          };
          video.onerror = () => {
            this._stopCurrent();
            resolve(null);
          };
        });
      },

      clear() {
        this._stopCurrent();
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

          navigator.mediaDevices.getUserMedia = async (constraints) => {
            if (constraints && constraints.video) {
              if (!this.stream || this.sourceType === "none") {
                this.setPattern();
              }
              if (this.stream) {
                return this.stream;
              }
            }
            if (origGetUserMedia) return origGetUserMedia(constraints);
            throw new DOMException("Requested device not found", "NotFoundError");
          };

          navigator.mediaDevices.enumerateDevices = async () => {
            let devices = origEnumerateDevices ? await origEnumerateDevices() : [];
            const hasVirtual = devices.some((d) => d.deviceId === "cdp-virtual-webcam");
            if (!hasVirtual) {
              devices = [
                {
                  deviceId: "cdp-virtual-webcam",
                  kind: "videoinput",
                  label: "CDP Virtual Webcam (HD)",
                  groupId: "cdp-virtual-group",
                },
                ...devices,
              ];
            }
            return devices;
          };
        }
      },
    };

    window.__cdpVirtualWebcam.init();
  }
`;
