---
title: Interactive Studio (The Easy Way)
description: Master the guided terminal wizard for Bflow.
---

# ⚡ Interactive Studio — The Easy Way

The **Interactive Studio** is the most intuitive and beginner-friendly way to use Bflow. You don't need to memorize complex CLI arguments or flags — simply run a single command and navigate with your arrow keys.

## 🚀 Launching the Studio

Run the CLI workspace command from the repository root:

```bash
bun cli
```

`bun dev` starts every development workspace, including the documentation site, and is not an alias for the studio.

---

## 🧭 Studio Navigation Menu

When the studio launches, you are presented with a clean, guided interactive wizard:

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

---

## 🎯 Studio Options Walkthrough

### 1. 🌊 Run a Workflow
Select this option to browse and run existing JSON workflow files:
- **Auto-detection**: The CLI automatically scans the `workflows/` directory and lists all available `.json` files.
- **Headed / Headless Mode**: Choose whether to run the browser invisibly in the background (Headless) or watch Chrome perform the actions on your desktop (Headed).
- **Execution Summary**: Displays step-by-step progress, execution time, pass/fail status, and any extracted data in real time.

---

### 2. 🔴 Record New Workflow
Select this option to start a visual recording session:
- **Enter Target URL**: Type or paste the initial URL you want to visit (e.g. `https://news.ycombinator.com`).
- **Specify File Name**: Enter a destination path (e.g. `workflows/my-recording.json`).
- **Live Chrome Recording**: Chrome opens immediately with the In-Page HUD. Your clicks, inputs, assertions, and data extractions are recorded live.

---

### 3. 🚀 Run Programmatic Task
Run pre-packaged automation tasks without writing any code:
- `scrape-hn` — Extracts top stories, ranks, points, and URLs from Hacker News.
- `site-audit` — Measures performance metrics, DOM nodes, load time, and captures full-page screenshots.
- `form-automation` — Automated form filling and validation testing.

The wizard prompts you for customizable task parameters (such as `limit`, `url`, etc.) interactively!

---

### 4. 💬 Open Interactive Browser REPL
Launches a live, persistent Chrome DevTools Protocol session with a command-line interface:
- Navigate with `goto <url>`
- Click elements with `click <selector>`
- Type text with `type <selector> <text>`
- Capture screenshots with `screenshot <file.png>`
- Read text with `text <selector>`
- Evaluate JavaScript with `eval <expression>`

---

### 5. 📁 View Extracted Data & Outputs
Quickly inspect extracted results, logs, and screenshots stored in the `output/` directory directly within your terminal.

---

## 💡 Why Use Interactive Studio?

1. **Zero Configuration**: No need to write scripts or configure headless flags.
2. **Interactive Prompts**: Prompts guide you step-by-step with clear defaults.
3. **Safe & Clean**: Automatic browser lifecycle handling ensures no zombie Chrome processes are left running in the background.
