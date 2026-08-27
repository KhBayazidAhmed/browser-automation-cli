---
title: Quick Start
description: Get up and running with Bflow in under 2 minutes.
---

# 🚀 Quick Start

Get started with Bflow in two minutes.

## 📋 Prerequisites

Before you begin, ensure you have:
1. **[Bun](https://bun.sh)** (version 1.1 or higher) installed on your machine.
2. **Google Chrome** or Chromium installed locally.

---

## 📦 Step 1: Install Bflow

Choose your preferred installation method:

### Option A: Standalone Binary (Recommended)

macOS / Linux:
```bash
curl -fsSL https://browser-automation-cli.bixbd.com/install.sh | sh
```

Windows PowerShell:
```powershell
irm https://browser-automation-cli.bixbd.com/install.ps1 | iex
```

Verify your installation:
```bash
bflow --version
```

### Option B: Monorepo Source Checkout

```bash
git clone https://github.com/KhBayazidAhmed/browser-automation-cli.git
cd browser-automation-cli
bun install
```

---

## ⚡ Step 2: Launch the Studio (The Easy Way)

The simplest way to use Bflow is the **Interactive Terminal Studio**:

```bash
# Standalone CLI
bflow

# Monorepo development
bun cli
```

You will see the interactive prompt:

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
# Standalone CLI
bflow record workflows/my-first-flow.json https://news.ycombinator.com

# Monorepo development
bun record workflows/my-first-flow.json https://news.ycombinator.com
```

1. Chrome opens with the **In-Page Floating HUD Toolbar**.
2. Click elements, type into inputs, or click **Add step ▾** to extract values (`Shift+Click`) or assert text (`Alt+Click`).
3. Click **Finish** on the HUD (or press `f` / `Enter` in your terminal) to save the workflow to `workflows/my-first-flow.json`.

---

## 🌊 Step 4: Replay Your Workflow

Execute the recorded workflow anytime from the command line:

```bash
# Headless mode (fast, background execution)
bflow flow workflows/my-first-flow.json
# (Monorepo: bun flow workflows/my-first-flow.json)

# Headed mode (visible Chrome window)
bflow flow workflows/my-first-flow.json --headed
# (Monorepo: bun flow workflows/my-first-flow.json --headed)
```

---

## 🛠️ Step 5: Try the Interactive Browser REPL

Inspect a webpage or test CDP commands interactively:

```bash
# Standalone CLI
bflow repl

# Monorepo development
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

## 🤖 Step 6: Connect an AI Agent via MCP

Serve persistent workflow-authoring tools to Claude Code or Codex:

```bash
# Standalone CLI
bflow mcp

# Monorepo development
bun mcp
```

The AI agent can observe the page, perform steps, verify postconditions, and publish deterministic workflows that replay later without an AI model!

---

## 📚 What's Next?

- Explore the [Interactive Studio Guide](/guides/interactive-studio/) for all interactive menu features.
- Learn about the [Visual Live Recorder](/guides/recorder/) HUD controls and shortcuts.
- Connect [Codex or Claude for agent-assisted authoring](/guides/agent-authoring/), then replay the published workflow without the agent.
- Drive a workflow from [Google Sheets or another external provider](/data/overview/).
- Check the [CLI Command Reference](/reference/cli-commands/) for direct CLI flags and command options.
