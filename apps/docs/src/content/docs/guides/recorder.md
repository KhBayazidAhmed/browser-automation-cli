---
title: Visual Live Recorder
description: Learn how to visually record browser workflows with the in-page floating HUD.
---

# 🔴 Visual Live Recorder

The **Visual Live Recorder** allows you to record real user actions in Google Chrome with an in-page floating HUD toolbar. It converts your clicks, form submissions, data extractions, and assertions into clean, declarative JSON workflows.

## 🚀 Starting a Recording Session

Start a visual recording from the command line:

```bash
bun record workflows/my-workflow.json https://news.ycombinator.com
```

Or choose **🔴 Record New Workflow** from the [Interactive Studio](/guides/interactive-studio/).

---

## 🪟 In-Page Floating HUD

When Chrome opens, a floating toolbar appears at the top of the browser window:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ⠿ | 🔴 REC (4) | ⏸️ Pause | 🔍 Extract | 📊 List | 🔎 Assert | ⏱️ Wait | 📷 Shot | ⚙️ Config (4) | ↩ Undo | 🛑 Finish │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### HUD Controls & Actions

| Control | Mouse / Shortcut | Description |
| :--- | :--- | :--- |
| **Normal Click** | Left Click on any element | Records a resilient click step using human-visible text, aria labels, or role selectors. |
| **Input / Type** | Type into any input or textarea | Automatically records typing with placeholder and label association. |
| **🔍 Extract Text** | `Shift + Click` or click HUD button | Prompts for a variable name and extracts the element's text into that variable. |
| **📊 Extract List** | Click HUD button & select 1 element | Automatically detects repeating sibling cards/table rows and extracts all rows into structured JSON. |
| **🔎 Assert Text** | `Alt + Click` or click HUD button | Opens a prompt to add a text assertion (Strict Equal, Contains Substring, or Regex). |
| **⏱️ Add Wait** | Click HUD button | Adds a custom delay (in milliseconds) or waits for a selector to appear. |
| **📷 Screenshot** | Click HUD button | Captures a viewport or full-page screenshot at that step. |
| **⚙️ Config Drawer** | Click HUD button | Opens an in-page slide-out drawer showing live JSON, recorded steps, and variables. |
| **⏸️ Pause / Resume** | Click HUD button | Temporarily pauses recording so you can solve CAPTCHAs, 2FA, or log in without recording junk steps. |
| **↩ Undo Step** | Click HUD button | Removes the last recorded step. |
| **🛑 Finish & Save** | Click HUD button | Saves the workflow to your JSON file and cleanly exits Chrome. |

---

## ⚙️ Live In-Page Config Drawer

Clicking **⚙️ Config** opens a live slide-out drawer inside Chrome where you can:
- View the complete JSON workflow definition as it builds.
- Delete individual steps with a single click.
- Reorder steps.
- Inspect and manage extracted variables.

---

## ⌨️ Terminal Hotkeys During Recording

While the Chrome browser is open, you can also control the recording session directly from your terminal:

| Key | Command | Description |
| :--- | :--- | :--- |
| `c` or `config` | View Config | Prints the live formatted JSON workflow in the terminal. |
| `s` or `steps` | View Steps | Displays a numbered list of all recorded steps. |
| `w <ms>` | Add Delay | Injects a wait step (e.g. `w 2000` for 2 seconds). |
| `u` or `undo` | Undo Step | Reverts the last recorded action. |
| `d <index>` | Delete Step | Deletes a specific step by its index (e.g. `d 2`). |
| `v <key>=<val>` | Set Variable | Adds or updates a workflow variable (e.g. `v email=user@test.com`). |
| `p` or `pause` | Pause / Resume | Toggles pause state for entering credentials or CAPTCHAs. |
| `f` or `[Enter]` | Finish & Save | Finalizes the workflow, writes to disk, and closes Chrome. |

---

## 💡 Best Practices for Recording

- **Use Human-Centric Elements**: Click text, buttons, and links naturally — the recorder creates resilient text locators automatically.
- **Pause for Auth & CAPTCHAs**: Use `⏸️ Pause` before entering sensitive one-time credentials or completing CAPTCHA puzzles, then `Resume` when on the target page.
- **Extract Lists with One Click**: When extracting items from a catalog, search results, or table, click **📊 List** on just *one* card to let the smart algorithm capture all sibling items.
