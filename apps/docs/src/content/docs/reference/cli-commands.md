---
title: CLI Commands & Flags
description: Complete reference for all Bflow commands and flags.
---

# 🛠️ CLI Commands & Flags Reference

Bflow provides an extensive set of commands whether running the standalone `bflow` binary or developing within the monorepo using `bun`.

---

## 📌 Main Commands Matrix

| Standalone CLI (`bflow`) | Monorepo (`bun`) | Description |
| :--- | :--- | :--- |
| `bflow` | `bun cli` | Launch the guided **Interactive Terminal Studio** wizard. |
| `bflow record <file> [url]` | `bun record <file> [url]` | Start a visual live recording session in Chrome with floating HUD. |
| `bflow flow <file> [flags]` | `bun flow <file> [flags]` | Replay a declarative JSON workflow. |
| `bflow workflow run <file> [flags]` | `bun workflow run <file> [flags]` | Execute an isolated workflow run per external data row. |
| `bflow sheets <command>` | `bun sheets <command>` | Authenticate, inspect, read, or update Google Sheets. |
| `bflow data providers` | `bun data providers` | List all registered external data providers. |
| `bflow tasks` | `bun tasks` | List all available built-in programmatic automation tasks. |
| `bflow task <id> [flags]` | `bun task <id> [flags]` | Execute a built-in automation task (e.g. `scrape-hn`, `site-audit`). |
| `bflow profiles` | `bun apps/tui/src/index.ts profiles` | List detected Chrome browser profiles and their safe identifiers. |
| `bflow repl [flags]` | `bun repl [flags]` | Start an interactive Chrome DevTools Protocol command prompt. |
| `bflow mcp` | `bun mcp` | Launch the Model Context Protocol (MCP) server over STDIO for AI agent authoring. |
| `bflow cleanup` | `bun cleanup` | Terminate any lingering orphan Chrome automation processes. |
| `bflow --version` | `bun run cli --version` | Print the compiled release binary version or `development`. |

> [!NOTE]
> `bun dev` starts every development workspace across the monorepo, including the documentation site. Use `bflow` or `bun cli` to start the terminal automation studio.

---

## 🚩 Global Flags & Options

### Workflow Execution Flags (`bflow flow`)

| Flag | Type | Description |
| :--- | :--- | :--- |
| `--headed` | Boolean | Launch Chrome visibly on your desktop (default is headless). |
| `--headless=false` | Boolean | Alias for `--headed`. |
| `--debug` | Boolean | Pause before each step in an interactive debugger: run next, continue all, go back one step, skip a step, inspect extracted variables and page state, retry or skip after failures, or quit. Requires an interactive terminal. |
| `--<key>=<value>` | Any | Override workflow variable (e.g. `--query="Bun runtime"` or `--limit=10`). |

---

### Browser Profile Flags

Applicable across all browser-launching commands (`record`, `flow`, `workflow run`, `task`, `repl`):

| Flag | Description |
| :--- | :--- |
| `--profile=<id>` | Clones an existing browser profile into a safe automation sandbox. |
| `--direct-profile` | Uses the selected profile directory directly without cloning (requires Chrome to be closed). |
| `--user-data-dir=<path>` | Uses an explicit custom Chrome user-data directory. |
| `--profile-directory=<name>` | Selects a specific profile folder inside user-data directory (alias: `--profile-dir`). |

---

### External Data & Row Execution Flags (`bflow workflow run`)

| Flag | Description |
| :--- | :--- |
| `--data=<uri>` | Provider URI (e.g. `google-sheets://SPREADSHEET_ID/Sheet1?range=A:E`). |
| `--data-source=<name>` | Selects a named entry from the workflow's `dataSources` block. |
| `--parallel=<count>` | Bounded concurrent browser workers (1–100). |
| `--batch-size=<count>` | Provider read and write-back batch size (default: `25`). |
| `--from-row=<n>`, `--to-row=<n>` | Restricts execution to absolute 1-based provider row numbers. |
| `--where='<expression>'` | Filters rows before scheduling (`=`, `!=`, `>`, `<`, `>=`, `<=`, `~`). |
| `--resume` | Skips rows already marked `completed` and continues pending work. |
| `--retry-failed` | When resuming, includes rows that previously failed. |
| `--retry-count=<count>` | Maximum automatic retries for transient errors (rate limits, timeouts). |
| `--dry-run` | Discovers schema and validates plan without launching Chrome or mutating rows. |
| `--account=<email>` | Selects a stored Google account. |
| `--headed` | Runs worker browsers visibly on your desktop. |

---

### Google Sheets CLI Commands (`bflow sheets`)

| Command | Purpose | Example |
| :--- | :--- | :--- |
| `bflow sheets login` | Initiates OAuth 2.0 loopback login. | `bflow sheets login --account=user@corp.com` |
| `bflow sheets status` | Validates token expiration and refresh capability. | `bflow sheets status` |
| `bflow sheets accounts` | Lists all authenticated Google accounts. | `bflow sheets accounts` |
| `bflow sheets list` | Lists all accessible Google Spreadsheets. | `bflow sheets list` |
| `bflow sheets inspect <sheet>` | Discovers columns, types, and tab dimensions. | `bflow sheets inspect SPREADSHEET_ID --sheet=Users` |
| `bflow sheets preview <sheet>` | Displays a redacted preview of first rows. | `bflow sheets preview SPREADSHEET_ID --limit=5` |
| `bflow sheets read <sheet>` | Streams rows as JSON array. | `bflow sheets read SPREADSHEET_ID --from-row=2 --to-row=50` |
| `bflow sheets write <sheet>` | Updates named columns on an absolute row. | `bflow sheets write SPREADSHEET_ID --row=2 --values='{"status":"done"}'` |
| `bflow sheets logout` | Revokes and deletes stored credentials. | `bflow sheets logout --account=user@corp.com` |

---

## 🧪 Testing & Verification Scripts

| Monorepo Script | Command | Description |
| :--- | :--- | :--- |
| `bun test` | `bun test apps/tui/tests` | Run the complete unit and integration test suite. |
| `bun test:watch` | `bun test --watch apps/tui/tests` | Run tests in interactive watch mode. |
| `bun test:headed` | `HEADED=1 bun test apps/tui/tests` | Run test suite visibly in an active Chrome window. |
| `bun test:strict` | `bun test apps/tui/tests/locators.test.ts` | Test strict text locators and assertions. |
| `bun test:flows` | `bun test apps/tui/tests/flows.test.ts` | Run workflow execution test suite. |
| `bun check` | `biome check --write .` | Format and lint all files with Biome. |
| `bun check:max-lines` | `bun scripts/check-max-lines.ts` | Enforce file size modularity checks. |
| `bun run build:release` | `bun scripts/build-release.ts ...` | Compile a versioned standalone executable for a supported target. |

---

## 🧹 Process Management (`bflow cleanup`)

If a browser session is abnormally interrupted, you can cleanly terminate any remaining orphan Chrome instances:

```bash
# Standalone CLI
bflow cleanup

# Monorepo development
bun cleanup
```

