---
title: Quick Start
description: Get up and running with Browser Automation CLI in under 2 minutes.
---

# 🚀 Quick Start

Get started with Browser Automation CLI in two minutes.

## 📋 Prerequisites

Before you begin, ensure you have:
1. **[Bun](https://bun.sh)** (version 1.1 or higher) installed on your machine.
2. **Google Chrome** or Chromium installed locally.

---

## 📦 Step 1: Install Dependencies

Clone the repository and install dependencies with Bun:

```bash
git clone https://github.com/KhBayazidAhmed/browser-automation-cli.git
cd browser-automation-cli
bun install
```

---

## ⚡ Step 2: Launch the Studio (The Easy Way)

The simplest and most user-friendly way to use the CLI is the **Interactive Terminal Studio**:

```bash
bun dev
# or
bun cli
```

You will see an interactive prompt:

```text
┌  ⚡ Browser Automation Studio
│
◇  What would you like to do?
│  ● 🌊 Run a Workflow
│  ○ 🔴 Record New Workflow
│  ○ 🚀 Run Programmatic Task
│  ○ 💬 Open Interactive Browser REPL
│  ○ 📁 View Extracted Data & Outputs
│  ○ ❌ Exit
```

Use your arrow keys and press **Enter** to choose an action.

---

## 🔴 Step 3: Record Your First Workflow

To visually record a new automation flow in Chrome:

```bash
bun record workflows/my-first-flow.json https://news.ycombinator.com
```

1. Chrome will open with the **In-Page Floating HUD Toolbar**.
2. Click on elements, type into search boxes, or press **🔍 Extract** / **📊 List** to extract data.
3. Click **🛑 Finish** (or press `f` / `Enter` in the terminal) to save your workflow to `workflows/my-first-flow.json`.

---

## 🌊 Step 4: Replay Your Workflow

Execute the recorded workflow anytime from the command line:

```bash
# Run headless (fast, in the background)
bun flow workflows/my-first-flow.json

# Run headed (watch Chrome execute live in a window)
bun flow workflows/my-first-flow.json --headed
```

---

## 🛠️ Step 5: Try the Interactive Browser REPL

Need to inspect a webpage or test CDP commands interactively? Launch the REPL:

```bash
bun repl
```

```text
cdp> goto https://example.com
✓ Loaded (210ms)
cdp> title
Title: Example Domain
cdp> screenshot output/example.png
✓ Saved screenshot (18.4 KB) to output/example.png
cdp> exit
```

---

## 📚 What's Next?

- Explore the [Interactive Studio Guide](/guides/interactive-studio/) for all interactive menu features.
- Learn about the [Visual Live Recorder](/guides/recorder/) HUD controls and shortcuts.
- Check the [CLI Command Reference](/reference/cli-commands/) for direct CLI flags and command options.
