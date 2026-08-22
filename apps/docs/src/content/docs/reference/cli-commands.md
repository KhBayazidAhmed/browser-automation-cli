---
title: CLI Commands & Flags
description: Complete reference for all Browser Automation CLI commands and flags.
---

# 🛠️ CLI Commands & Flags Reference

Browser Automation CLI provides convenient shortcuts via `package.json` and direct CLI invocation.

## 📌 Main Commands

| Command | Shorthand / Alternative | Description |
| :--- | :--- | :--- |
| `bun dev` | `bun cli` | Launch the guided **Interactive Terminal Studio** wizard. |
| `bun record <file.json> [url]` | `bun apps/tui/src/index.ts record ...` | Start a visual live recording session in Chrome. |
| `bun flow <file.json> [flags]` | `bun apps/tui/src/index.ts flow ...` | Replay a declarative JSON workflow. |
| `bun tasks` | `bun task list` | List all available built-in tasks and parameter descriptions. |
| `bun task <id> [--param=val]` | `bun run <id> ...` | Execute a built-in automation task. |
| `bun repl` | `bun apps/tui/src/index.ts repl` | Start an interactive Chrome DevTools Protocol command prompt. |
| `bun cleanup` | `bun apps/tui/src/index.ts cleanup` | Terminate any lingering orphan Chrome processes. |

---

## 🚩 Global Flags & Options

### Workflow Execution Flags (`bun flow`)

| Flag | Type | Description |
| :--- | :--- | :--- |
| `--headed` | Boolean | Launch Chrome visibly on your desktop (default is headless). |
| `--headless=false` | Boolean | Alias for `--headed`. |
| `--<key>=<value>` | Any | Override workflow variable (e.g. `--searchQuery="Bun"`). |

### One-Shot Automation Flags

You can also run quick one-shot actions directly:

```bash
bun apps/tui/src/index.ts --url https://example.com --screenshot output/shot.png
```

| Flag | Type | Description |
| :--- | :--- | :--- |
| `--url <url>` | String | Navigates directly to URL and logs load time. |
| `--screenshot <path>` | String | Captures a screenshot to the specified path. |
| `--headed` | Boolean | Runs in a visible browser window. |

---

## 🧪 Testing & Verification Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `bun test` | `bun test apps/tui/tests` | Run the complete unit and integration test suite. |
| `bun test:watch` | `bun test --watch apps/tui/tests` | Run tests in interactive watch mode. |
| `bun test:headed` | `HEADED=1 bun test apps/tui/tests` | Run test suite visibly in an active Chrome window. |
| `bun test:strict` | `bun test apps/tui/tests/locators.test.ts` | Test strict text locators and assertions. |
| `bun test:flows` | `bun test apps/tui/tests/flows.test.ts` | Run workflow execution test suite. |
| `bun check` | `biome check --write .` | Format and lint all files with Biome. |
| `bun check:max-lines` | `bun scripts/check-max-lines.ts` | Enforce file size modularity checks. |

---

## 🧹 Process Management (`bun cleanup`)

If a browser session is abnormally interrupted or disconnected, you can cleanly terminate any remaining orphan Chrome instances without needing `killall` or Task Manager:

```bash
bun cleanup
```
