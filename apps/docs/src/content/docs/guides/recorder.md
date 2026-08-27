---
title: Visual Live Recorder
description: Learn how to visually record browser workflows with the in-page floating HUD.
---

# 🔴 Visual Live Recorder

The **Visual Live Recorder** allows you to record real user actions in Google Chrome with an in-page floating HUD toolbar. It converts your clicks, form submissions, data extractions, and assertions into clean, declarative JSON workflows.

---

## 🚀 Starting a Recording Session

Start a visual recording from the command line:

```bash
# Standalone CLI
bflow record workflows/my-workflow.json https://news.ycombinator.com

# Monorepo development
bun record workflows/my-workflow.json https://news.ycombinator.com
```

### Launch with an Existing Browser Profile

Attach a cloned browser profile to reuse existing authenticated sessions:

```bash
bflow record workflows/authenticated-flow.json https://app.example.com --profile=work-chrome
```

Or choose **🔴 Record New Workflow** from the [Interactive Studio](/guides/interactive-studio/).

---

## 🪟 In-Page Floating HUD Toolbar

When Chrome opens, a floating toolbar is automatically injected into the top of the browser window:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⠿  REC 4  Pause  Add step ▾  Capture ▾  ▦  Config 4  Undo  Finish  ◀ │
└──────────────────────────────────────────────────────────────────────────────┘
```

The toolbar is draggable via the `⠿` grip handle and groups secondary actions into **Add step** and **Capture** menus to keep your viewport unobstructed. Only one popover stays open at a time; press `Escape` or click outside to dismiss.

### Complete HUD Controls Matrix

| Control | Trigger / Shortcut | Description |
| :--- | :--- | :--- |
| **Drag Handle (`⠿`)** | Click and drag | Reposition the HUD anywhere across the screen. |
| **Status Badge (`REC`)** | Click or `Enter` / `Space` | Toggles between `REC` (recording active) and `PAUSED`. Shows step count. |
| **Pause / Resume** | Click HUD button | Suspends event recording so you can solve CAPTCHAs, complete 2FA, or log in without polluting your workflow. |
| **Add step ▾ → Extract value** | `Shift + Click` or menu item | Opens variable naming modal and extracts element text or attributes. |
| **Add step ▾ → Extract list** | Click repeating element | Identifies sibling cards/table rows and captures all items into structured JSON arrays. |
| **Add step ▾ → Assert element** | `Alt + Click` or menu item | Opens assertion modal (strict equals, contains substring, regex, starts-with, ends-with). |
| **Add step ▾ → Wait** | Menu item | Opens the **Insert step** drawer panel to inject delays or element wait conditions. Click **Target** to visually select an element, or press `Escape` to cancel. |
| **Capture ▾ → Screenshot** | Menu item | Adds a viewport or full-page screenshot step saving to `{{outputDir}}`. |
| **Capture ▾ → Virtual camera** | Menu item | Configures synthetic test pattern feeds (30 FPS with UTC clock), local video files, or remote video streams. |
| **Data Source (`▦`)** | Click Sheets icon | Attaches or detaches a Google Sheet for data-driven row execution. |
| **Config Drawer (`⚙️`)** | Click sliders icon | Opens the in-browser drawer with **Steps**, **Variables**, **JSON**, and **Insert step** tabs. |
| **Undo Step (`↩`)** | Click undo icon | Reverts the last recorded action. |
| **Finish & Save (`✓`)** | Click Finish button | Finalizes the workflow JSON, saves to disk, and cleanly closes Chrome. |
| **Collapse (`◀` / `▶`)** | Click toggle button | Minimizes the toolbar into a compact badge. |

---

## ⚙️ Live In-Page Config Drawer

Clicking **⚙️ Config** opens a live slide-out panel inside Chrome:

- **Steps Tab**: View all recorded steps with badges (`GOTO`, `CLICK`, `TYPE`, `EXTRACT`, `ASSERT`). Reorder steps with `↑`/`↓` buttons or delete steps with the trash icon.
- **Variables Tab**: Inspect captured variables or add new workflow-level variable key-value pairs.
- **JSON Tab**: View the live formatted JSON workflow and copy it to clipboard with one click.
- **Insert Step Tab**: Manually add `wait`, `waitForSelector` (with interactive **Target** element picker and `Escape` cancel), `eval`, or `goto` steps.

See the dedicated [Config Inspector Drawer Guide](/guides/config-drawer/) for full details.

---

## ⌨️ Terminal Hotkeys During Recording

While Chrome is open, you can also control the recording session directly from your terminal prompt:

| Hotkey | Command | Description | Example |
| :--- | :--- | :--- | :--- |
| `c` or `config` | View Config | Prints the live formatted JSON workflow definition. | `c` |
| `s` or `steps` | View Steps | Displays a numbered list of all recorded steps. | `s` |
| `w <ms>` | Add Delay | Injects a fixed wait duration in milliseconds. | `w 2500` |
| `u` or `undo` | Undo Step | Reverts the last recorded action. | `u` |
| `d <index>` | Delete Step | Deletes a specific step by its 1-based index. | `d 3` |
| `v <key>=<val>` | Set Variable | Adds or updates a workflow variable. | `v searchQuery=bun` |
| `p` or `pause` | Pause / Resume | Toggles pause state for entering credentials or CAPTCHAs. | `p` |
| `f` or `[Enter]` | Finish & Save | Finalizes and saves the workflow file, then exits. | `f` |

---

## 💡 Best Practices for Flawless Recording

1. **Leverage Human-Centric Text**: Click natural text, buttons, and form labels. The recorder automatically produces resilient text locators like `text="Sign In"` instead of fragile auto-generated class names.
2. **Handle Auth Gracefully**: Use **Pause** before logging in with one-time credentials, or record password fields directly — the recorder automatically converts password inputs to secure environment references (`{{env.PASSWORD}}`).
3. **Smart Sibling Detection**: When scraping lists, search results, or tables, click **Extract list** on just *one* card to capture all items across the page.
4. **Assert Expected Milestones**: Insert assertions after important state transitions (e.g. after form submission, assert `text="Order Placed"`).

