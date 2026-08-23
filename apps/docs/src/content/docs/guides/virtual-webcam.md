---
title: Virtual Webcam & MediaStream Injection
description: Inject synthetic test patterns, local video files, and remote video streams into navigator.mediaDevices.
---

# 📹 Virtual Webcam & MediaStream Injection

Automating websites that require webcam access (such as video conferencing, KYC identity verification, avatar onboarding, and WebRTC applications) is notoriously difficult in traditional automation setups.

**Bflow** includes a built-in **CDP Virtual Webcam & MediaStream Injection Engine** that intercepts `navigator.mediaDevices.getUserMedia` and `navigator.mediaDevices.enumerateDevices` to feed custom video streams directly to the webpage.

---

## ⚡ Key Capabilities

- **Automated Virtual Device Registration**: Registers a `cdp-virtual-webcam` device labeled *"CDP Virtual Webcam (HD)"*.
- **Synthetic 30 FPS Test Pattern**: Draws an animated test pattern with a real-time UTC timestamp, perfect for verifying WebRTC streaming latency and FPS.
- **Local Video File Feed**: Loop any local `.mp4` or `.webm` video file as your virtual camera input.
- **Remote Video URL Stream**: Stream live or hosted video directly from any public or CORS-enabled URL.
- **In-Page HUD Webcam Modal**: Switch video feeds interactively during a recording session.

---

## 🎛️ Controlling Virtual Webcam from the In-Page HUD

During visual recording:

1. Click the **📹 Webcam** button in the floating HUD toolbar.
2. The **Virtual Webcam Controller Modal** will display the current active feed status.
3. Select your desired input source:
   - **Synthetic Test Pattern**: Generates a 640x480 @ 30 FPS animated vector canvas with moving markers and UTC clock.
   - **Upload Local Video File**: Choose a video file from your hard drive to loop continuously.
   - **Remote Video URL**: Input an `https://...` link to a video file.
4. Click **Apply Feed**. The webpage's `<video>` elements will immediately receive the virtual media stream.

---

## 💻 Programmatic JavaScript API

Inside page evaluations or test scripts, you can interact with `window.__cdpVirtualWebcam`:

```javascript
// Switch to synthetic test pattern
window.__cdpVirtualWebcam.setPattern();

// Switch to remote video URL
await window.__cdpVirtualWebcam.setVideoUrl("https://example.com/sample-webcam-feed.mp4");

// Clear virtual stream
window.__cdpVirtualWebcam.clear();
```

---

## 🧪 Testing WebRTC Applications

When testing video calling applications (Google Meet, Zoom web client, WebRTC peer-to-peer):

```typescript
// Test verifying virtual webcam interception
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
const videoTrack = stream.getVideoTracks()[0];

console.log(videoTrack.label); // "CDP Virtual Webcam (HD)"
```

> [!TIP]
> The virtual webcam is fully sandboxed within your Chrome CDP session, requiring no third-party OBS virtual camera drivers or OS kernel extensions.
