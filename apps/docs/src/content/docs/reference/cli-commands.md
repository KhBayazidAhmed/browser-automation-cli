---
title: CLI Commands & Flags
description: Complete reference for all Bflow commands and flags.
---

# 🛠️ CLI Commands & Flags Reference

Bflow provides convenient shortcuts via `package.json` and direct CLI invocation.

## 📌 Main Commands

| Command | Shorthand / Alternative | Description |
| :--- | :--- | :--- |
| `bun cli` | `bflow` | Launch the guided **Interactive Terminal Studio** wizard. |
| `bun record <file.json> [url]` | `bflow record ...` | Start a visual live recording session in Chrome. |
| `bun flow <file.json> [flags]` | `bflow flow ...` | Replay one declarative JSON workflow. |
| `bun workflow run <file.json> [data flags]` | `bflow workflow run ...` | Execute one isolated workflow run per external data row. |
| `bun sheets <command>` | `bflow sheets ...` | Authenticate, inspect, read, or update Google Sheets. |
| `bun data providers` | `bflow data providers` | List registered external-data providers. |
| `bun tasks` | `bflow tasks` | List all available built-in tasks and parameter descriptions. |
| `bun task <id> [--param=val]` | `bflow task <id> ...` | Execute a built-in automation task. |
| `bun apps/tui/src/index.ts profiles` | `bflow profiles` | List detected browser profiles and safe IDs. |
| `bun repl` | `bflow repl` | Start an interactive Chrome DevTools Protocol command prompt. |
| `bun mcp` | `bflow mcp` | Serve persistent workflow-authoring tools to Codex, Claude, or another MCP host over STDIO. |
| `bun cleanup` | `bflow cleanup` | Terminate any lingering orphan Chrome processes. |
| `bun run cli --version` | `bflow --version` | Print `development` for source runs or the embedded standalone release version. |

`bun dev` is intentionally not an alias for `bun cli`: it starts all development workspaces in the monorepo.

---

## 🚩 Global Flags & Options

### Workflow Execution Flags (`bun flow`)

| Flag | Type | Description |
| :--- | :--- | :--- |
| `--headed` | Boolean | Launch Chrome visibly on your desktop (default is headless). |
| `--headless=false` | Boolean | Alias for `--headed`. |
| `--<key>=<value>` | Any | Override workflow variable (e.g. `--searchQuery="Bun"`). |

### Browser profile flags

These flags apply to commands that launch Chrome, including `record`, `flow`, `workflow run`, `task`, and `repl`.

| Flag | Description |
| :--- | :--- |
| `--profile=<id>` | Use a detected browser profile by cloning it into an automation-safe temporary directory. |
| `--direct-profile` | Use the selected profile directory directly instead of cloning it. Close the normal browser first and use this only when direct access is intentional. |
| `--user-data-dir=<path>` | Use an explicit Chrome user-data directory. |
| `--profile-directory=<name>` | Select a profile directory inside the user-data directory. `--profile-dir` is an alias. |

List safe profile IDs first with `bflow profiles` or `bun apps/tui/src/index.ts profiles`.

### Data-driven workflow flags

| Flag | Description |
| :--- | :--- |
| `--data=<uri>` | Select a provider URI such as `google-sheets://ID/Users`. |
| `--data-source=<name>` | Select a named entry from the workflow's `dataSources`. |
| `--parallel=<count>` | Set the bounded browser-worker concurrency. |
| `--batch-size=<count>` | Set provider read and result-write batch size. |
| `--from-row`, `--to-row` | Restrict absolute provider row numbers. |
| `--where='<expression>'` | Filter rows before scheduling them. |
| `--resume` | Skip rows already marked completed. |
| `--retry-failed` | Include previously failed rows when resuming. |
| `--retry-count=<count>` | Retry transient row failures. |
| `--dry-run` | Authenticate, inspect, filter, and validate without Chrome or provider write-back; a local summary is still produced. |
| `--account=<email>` | Select a stored provider account. |
| `--headed` / `--headless=false` | Show each browser worker instead of running headless. |

See [External Data](/data/overview/) and [Google Sheets](/data/google-sheets/) for command examples.

### Google Sheets commands

| Command | Purpose |
| :--- | :--- |
| `bun sheets login [--account=<hint>]` | Complete OAuth login in the system browser. |
| `bun sheets status` / `bun sheets accounts` | List stored accounts and token status. |
| `bun sheets logout [--account=<email>]` | Revoke and remove the selected/default account. |
| `bun sheets list [--account=<email>]` | List accessible spreadsheets. |
| `bun sheets inspect <sheet>` | Discover columns and inferred types. |
| `bun sheets preview <sheet> [--limit=10]` | Read a redacted preview. |
| `bun sheets read <sheet> [row flags]` | Stream rows as JSON. |
| `bun sheets write <sheet> --row=N --values='<json>'` | Update named columns on one absolute sheet row. |

For `inspect`, `preview`, `read`, and `write`, `<sheet>` can be a spreadsheet ID or URL. Use `--sheet=<tab>`, `--range=A:E`, `--gid=<id>`, and `--header-row=N` to select its layout.

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
| `bun run build:release <target> <outfile> [version]` | `bun scripts/build-release.ts ...` | Compile a versioned standalone executable for a supported Bun target. |

---

## 🧹 Process Management (`bun cleanup`)

If a browser session is abnormally interrupted or disconnected, you can cleanly terminate any remaining orphan Chrome instances without needing `killall` or Task Manager:

```bash
bun cleanup
```
