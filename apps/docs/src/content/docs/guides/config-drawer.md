---
title: Live Config Inspector Drawer
description: Inspect and modify workflow JSON in real time inside Google Chrome.
---

# ⚙️ Live Config Inspector Drawer

The **Config Inspector Drawer** is an in-browser slide-out panel that gives you complete visibility and control over your workflow while recording.

---

## 🪟 Opening the Drawer

Click the **⚙️ Config (N)** button on the floating HUD toolbar (where `N` represents the number of recorded steps). A slide-out panel smoothly animates from the right side of the screen.

---

## 🛠️ Inspector Drawer Features

### 1. Step List & Live Reordering
- Displays all recorded steps in chronological sequence with action badges (`GOTO`, `CLICK`, `TYPE`, `EXTRACT`, `ASSERT`).
- **Move Up / Move Down**: Click the `↑` or `↓` arrows next to any step to rearrange the execution order.
- **Delete Step**: Click the red trash icon to remove unnecessary or accidental clicks.

---

### 2. Manual Step Inserters

Need to add a custom action without performing it on the page? Use the quick insertion forms:

- **Add Wait**: Specify a duration in milliseconds (e.g. `2000` for 2s delay).
- **Add WaitForSelector**: Wait for a CSS element or text before continuing. Click **Target** to close the drawer temporarily and select the element directly; press `Escape` to cancel targeting.
- **Add Navigation (`goto`)**: Force navigate to a URL.
- **Add Eval**: Execute custom JavaScript snippet and save its return value into a variable.

---

### 3. Workflow Variables Manager
- View all variables captured via extraction steps or passed from CLI.
- Add new initial variables (e.g., `userEmail="test@corp.com"`, `limit=25`).
- Delete or modify variable names.

---

### 4. Real-time JSON Code Viewer

- Inspect the formatted JSON representation of your workflow as it is being built.
- Copy the current workflow JSON to the clipboard.
- Useful for validating selector syntax and step configurations before finalizing.

### 5. Keyboard and screen-reader behavior

The drawer is exposed as a modal dialog with named tabs and tab panels. Opening it moves focus to the close control, closing it returns focus to Config, and `Escape` closes the drawer. Toolbar controls include accessible labels and the recorder badge supports `Enter`/`Space` activation.

---

## 💡 Quick Tips

> [!TIP]
> You can also inspect steps and variables from your terminal during a recording session using the `s` (steps), `c` (config), `d <idx>` (delete), and `v <k>=<v>` hotkeys.
