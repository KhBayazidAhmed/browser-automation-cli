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
# Standalone CLI
bflow cleanup

# Monorepo development
bun cleanup
```

Or programmatically:

```typescript
import { Browser } from "./cdp/index.js";

const killed = await Browser.cleanupOrphans();
console.log(`Terminated ${killed} orphan Chrome instances.`);
```

### What `cleanup` Does:
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

### 2. "CDP WebSocket connection timeout" or Port Collisions
- **Cause**: Chrome DevTools port collision or Chrome taking too long to launch on busy systems.
- **Solution**:
  1. Run `bflow cleanup` to release any stale ports.
  2. If running on resource-constrained CI machines, increase step timeouts.

---

### 3. Profile In-Use / Profile Lock Errors
- **Cause**: Using `--direct-profile` while your regular Chrome browser is open, or running `--parallel > 1` with a browser profile.
- **Solution**:
  1. Use `--profile=<id>` (clones the profile safely into an ephemeral directory) instead of `--direct-profile`.
  2. If using `--direct-profile` or `--user-data-dir`, ensure all existing Chrome browser windows are closed and run with `--parallel=1`.

---

### 4. Element Not Found or Interaction Timed Out
- **Cause**: The element is loaded asynchronously, inside a shadow DOM, or inside an iframe.
- **Solution**:
  1. Add a `waitForSelector` step before clicking or typing.
  2. Use a case-insensitive locator: `text/i="submit"`.
  3. Specify the iframe name or index using the `frame` property: `"frame": "widget-frame"`.
  4. Replay in headed mode (`bflow flow workflow.json --headed`) to visually observe what is happening on screen.

---

### 5. Bot Detection & CAPTCHA Challenges
- Some websites detect headless Chrome signatures and present Cloudflare / CAPTCHA challenges.
- **Solution**:
  - Run in headed mode: `bflow flow workflow.json --headed`.
  - During visual recording, use **⏸️ Pause** on the HUD toolbar to solve challenges manually, then resume recording.

