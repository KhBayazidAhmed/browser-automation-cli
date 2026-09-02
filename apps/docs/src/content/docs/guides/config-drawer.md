---
title: Live Config Inspector Drawer
description: Inspect and modify workflow JSON in real time inside Google Chrome.
---

# ⚙️ Live Config Inspector Drawer

The **Config Inspector Drawer** is an in-browser slide-out modal panel that gives you complete visibility and control over your workflow while recording. Every action recorded in Chrome or entered via terminal hotkeys is synchronized bidirectionally in real time.

---

## 🪟 Opening and Dismissing the Drawer

- **Open**: Click the **⚙️ Config (N)** button on the floating HUD toolbar (where `N` reflects the current recorded step count).
- **Dismiss**: Click the close icon (`✕`), click outside the drawer on the backdrop overlay, or press `Escape`. Focus automatically returns to the Config button on the toolbar.

---

## 🛠️ Inspector Drawer Tabs

The drawer organizes workflow management into four dedicated tabs:

### 1. 📋 Steps Tab (`panel-steps`)
- Displays all recorded steps in chronological sequence with colored action badges (`GOTO`, `CLICK`, `TYPE`, `EXTRACT`, `EXTRACTMULTIPLE`, `ASSERT`, `WAIT`, `SCREENSHOT`, `PDF`, `BLOCK`, `EVAL`, `SAVE`).
- **Step Reordering**: Click `↑` or `↓` arrow buttons beside any step to adjust its execution sequence on the fly.
- **Delete Step**: Click the red trash icon to instantly remove accidental clicks or unwanted steps.
- **Real-time Counter**: Displays the total step count directly in the tab header badge.

---

### 2. 🔤 Variables Tab (`panel-vars`)
- **Inspect Variables**: View all captured extraction variables, runtime inputs, and initial defaults.
- **Add Variable**: Define custom workflow variables with default values (e.g. `userEmail="alice@example.com"`, `maxResults=25`).
- **Live Sanitization**: Automatically validates variable names against reserved keywords and sanitizes inputs.

---

### 3. 📄 JSON Spec Tab (`panel-json`)
- **Live Code Viewer**: Inspect the clean, indented JSON representation of your workflow definition as it evolves.
- **One-Click Copy**: Click **Copy JSON** to copy the workflow definition directly to your system clipboard.
- **Syntax Verification**: Validate selectors, URLs, timeouts, and variable interpolation patterns prior to saving.

---

### 4. ➕ Insert Step Tab (`panel-add`)
Inject custom workflow steps without performing manual actions on the page:

| Step Inserter | Inputs | Description |
| :--- | :--- | :--- |
| **Wait** | Duration in milliseconds | Pauses execution for a fixed duration (e.g. `2000` for 2 seconds). |
| **Wait for element** | CSS selector or text matcher | Injects a `waitForSelector` step. Click **Target** (`🔍 Target`) to minimize the drawer, highlight elements on the page (even inside iframes), and click to capture the selector automatically. Press `Escape` to cancel targeting. |
| **Run JavaScript (`eval`)** | JS code snippet, optional variable name | Evaluates JavaScript in the page context and optionally assigns the return value to a workflow variable. |
| **Navigate (`goto`)** | Destination URL | Adds an explicit navigation step to a new URL. |

---

## ♿ Keyboard Navigation & Accessibility

The drawer follows WAI-ARIA modal dialog conventions:
- **ARIA Roles**: Decorated with `role="dialog"`, `aria-modal="true"`, and `role="tablist"` / `role="tabpanel"`.
- **Focus Management**: Opening the drawer focuses the close button; closing it restores focus to the triggering HUD toolbar control.
- **Escape Key**: Closes the active modal or cancels element targeting mode.
- **Recorder Badge**: Accessible status badge (`REC` / `PAUSED`) with keyboard support via `Enter` or `Space`.

---

## 💡 Terminal Synchronization

The In-Page Config Drawer stays 100% in sync with terminal commands. Adding a variable via terminal (`v key=val`), inserting a wait (`w 2000`), or undoing a step (`u`) immediately updates the browser drawer and HUD badges.

