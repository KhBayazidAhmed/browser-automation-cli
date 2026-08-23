---
title: Process Cleanup & Troubleshooting
description: Manage orphan Chrome processes, troubleshoot connection issues, and debug workflows.
---

# 🧹 Process Cleanup & Troubleshooting

Bflow is engineered with robust lifecycle management. However, unexpected system crashes or forced terminal terminations (`Ctrl + C`) can occasionally leave headless Chrome processes running in the background.

Here is how to resolve common operational issues.

---

## 🧹 Orphan Process Cleanup

If you ever suspect lingering headless Chrome processes are consuming RAM or locking DevTools ports:

```bash
bun cleanup
```

Or programmatically:

```typescript
import { Browser } from "./cdp/index.js";

const killed = await Browser.cleanupOrphans();
console.log(`Terminated ${killed} orphan Chrome instances.`);
```

### What `bun cleanup` Does:
1. Searches system processes for Chrome instances launched with `--remote-debugging-port`.
2. Matches flags used specifically by the CLI (e.g. `--user-data-dir` containing temporary automation profiles).
3. Safely sends `SIGTERM` and cleans up temporary profile directories.

---

## 🔍 Common Issues & Solutions

### 1. "Chrome not found in standard system locations"
- **Cause**: Chrome is installed in a non-standard directory or using a custom Chromium build.
- **Solution**: Set the `CHROME_PATH` environment variable:
  ```bash
  export CHROME_PATH="/opt/google/chrome/chrome"
  ```

---

### 2. "CDP WebSocket connection timeout"
- **Cause**: Port collision or Chrome taking too long to launch.
- **Solution**:
  1. Run `bun cleanup` to release any stale ports.
  2. Increase timeout if running on resource-constrained CI machines:
     ```typescript
     const browser = await Browser.launch({ timeout: 15000 });
     ```

---

### 3. "Element not found or interaction timed out"
- **Cause**: The element may be loaded asynchronously or inside an iframe.
- **Solution**:
  1. Add a `waitForSelector` step before clicking or typing.
  2. Use a case-insensitive locator: `text/i="submit"`.
  3. Replay in headed mode (`--headed`) to visually observe the page layout.

---

### 4. Headless Mode vs Headed Mode differences
Some websites detect headless Chrome and present bot challenges (Cloudflare / CAPTCHA).
- **Tip**: Test in headed mode first (`bun flow workflow.json --headed`).
- During visual recording, use **⏸️ Pause** on the HUD to complete verification challenges manually before resuming recording.
