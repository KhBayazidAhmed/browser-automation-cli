# ⚡ Bflow

> **Browser Automation for Humans** — Ultra-lightweight, zero-bloat CLI and visual recording studio powered by direct Chrome DevTools Protocol (CDP) and Bun.

Record browser workflows interactively with an in-page floating HUD, extract lists and tables with a single click, and replay declarative JSON flows with sub-millisecond execution overhead.

---

## ✨ Why Bflow?

Traditional browser automation tools (Puppeteer, Selenium, Playwright) often come with heavy dependencies, complex API boilerplate, and brittle CSS selectors that break on the slightest UI update.

**Bflow** is built differently:

- 🔴 **Visual Live Recorder**: Record user interactions directly in Chrome with an in-page HUD toolbar. No coding required.
- 🎯 **Human-Centric Strict Text Selectors**: Target buttons, inputs, and elements by their visible text (`text="Sign In"`), aria labels, or placeholders instead of fragile auto-generated CSS classes.
- ⚡ **Zero Heavyweight Frameworks**: Communicates directly over native CDP WebSockets in Bun with your local Chrome installation.
- 📊 **Smart Data Extraction**: Extract single text fields or entire repeating table/card grids by simply selecting one element.
- ⏸️ **Pause / Resume & Undo**: Seamlessly pause recording to solve CAPTCHAs or 2FA, undo mistakes on the fly, and reorder steps in a live drawer.
- 🚀 **Declarative JSON Replay**: Run recorded workflows headless in CI/CD or headed on your desktop, with variable overrides and assertions.
- 🤖 **Agent-Assisted Authoring**: Let Codex, Claude, or another MCP client build and verify a flow, then replay the published JSON without an agent.
- 🧾 **External Row Data**: Run an isolated workflow per Google Sheets row with filtering, bounded parallelism, retries, resume, and result write-back.
- 🔐 **Sensitive-Data Protection**: Resolve secrets from environment variables and redact configured row values from errors, saved output, screenshots, and PDFs.

---

## 🚀 Quick Start

### Install a release

The standalone release only requires Google Chrome, Chromium, Brave, or Microsoft Edge. Bun and Node.js are not required.

macOS and Linux:

```bash
curl -fsSL https://browser-automation-cli.bixbd.com/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://browser-automation-cli.bixbd.com/install.ps1 | iex
```

Then launch the studio:

```bash
bflow
```

The installers detect the operating system and CPU, verify the published SHA-256 checksum, install without administrator access, and add the installation directory to the user `PATH`. Open a new terminal if the command is not immediately available.

Install a specific version by setting `BFLOW_VERSION` to a release such as `1.0.0`. Override the destination with `BFLOW_INSTALL_DIR`.

### Run from source

Prerequisites:

- [Bun](https://bun.sh) 1.3.12
- Google Chrome, Chromium, Brave, or Microsoft Edge

Install dependencies:

```bash
bun install
```

Launch the interactive terminal studio:

```bash
bun cli
```

`bun run dev` starts every development workspace in the monorepo; `bun cli` starts only the browser automation studio.

Examples below use the repository's `bun` shortcuts. With a standalone release, replace commands such as `bun record`, `bun flow`, and `bun sheets` with `bflow record`, `bflow flow`, and `bflow sheets`.

The interactive wizard provides a guided terminal experience:

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

## 🔴 Visual Live Recorder

Record browser sessions visually. As you browse, the CLI captures your clicks, inputs, assertions, and data extractions, generating clean declarative JSON workflows.

```bash
bun record workflows/my-workflow.json https://news.ycombinator.com
```

### In-Page Floating HUD Controls

When Chrome opens, a floating toolbar appears directly inside the browser:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ⠿  REC 4  Pause  Add step ▾  Capture ▾  Config 4  Undo  Finish  ◀ │
└──────────────────────────────────────────────────────────────────────────┘
```

| Control | How to Use | What it Does |
| :--- | :--- | :--- |
| **Normal Click** | Click any element | Records a click action using smart, resilient text/aria selectors |
| **Input / Type** | Type into any field | Captures text entry with element labels and placeholders |
| **Add step ▾** | Open the menu | Extract a value/list, assert an element, or add a wait |
| **Extract Text** | `Shift + Click` or use **Add step** | Extracts element text into a named workflow variable |
| **Extract List** | Use **Add step**, then select 1 card/row | Auto-detects repeated sibling cards/tables and extracts all rows |
| **Assert Element** | `Alt + Click` or use **Add step** | Adds an assertion (strict equal, contains, or regex) |
| **Wait** | Use **Add step** | Adds a delay or opens the drawer to wait for a selector/text; **Target** selects an element directly from the page |
| **Capture ▾** | Open the menu | Adds a screenshot or configures the virtual camera |
| **Config Drawer** | Click the sliders button | Opens the live Steps, Variables, JSON, and Insert step panels |
| **⏸️ Pause / Resume** | Click HUD button | Pause recording to bypass CAPTCHAs, 2FA, or login without recording noise |
| **↩ Undo Step** | Click HUD button | Reverts the last recorded action |
| **Screenshot** | Use **Capture** | Captures a full-page or viewport screenshot at that step |
| **🛑 Finish & Save** | Click HUD button | Finalizes and saves the flow to `.json` and exits |

### Interactive Terminal Hotkeys During Recording

While recording, you can also inspect and control the session directly from your terminal:
- `c` / `config` — Print live formatted JSON configuration
- `s` / `steps` — View numbered step-by-step breakdown
- `w <ms>` — Add a wait delay (e.g. `w 2000`)
- `u` / `undo` — Undo last recorded step
- `d <index>` — Delete step by number (e.g. `d 2`)
- `v <key>=<val>` — Add or update a workflow variable (e.g. `v userEmail=test@corp.com`)
- `p` / `pause` — Toggle pause / resume
- `f` or `[Enter]` — Finish and save workflow

---

## 🌊 Declarative Workflow Replay

Run any recorded or hand-crafted `.json` workflow from the CLI:

```bash
# Run headless (fast, background execution)
bun flow workflows/my-workflow.json

# Run headed (watch Chrome execute live in a window)
bun flow workflows/my-workflow.json --headed

# Replay with dynamic variable overrides
bun flow workflows/my-workflow.json --searchQuery="Bun runtime" --limit=10
```

Run the same workflow once per external row:

```bash
bun sheets login
bun workflow run workflows/my-workflow.json \
  --data='google-sheets://SPREADSHEET_ID/Users?range=A:E' \
  --dry-run
```

Remove `--dry-run` after reviewing the plan. Row execution supports filters, bounded parallelism, retries, resume, and sparse result write-back.

### Example Workflow JSON (`workflows/hn-top-stories.json`)

```json
{
  "name": "Hacker News Top Stories",
  "variables": {
    "targetSite": "news.ycombinator.com"
  },
  "steps": [
    { "action": "goto", "url": "https://news.ycombinator.com" },
    { "action": "assert", "selector": "body", "contains": "Hacker News" },
    {
      "action": "extractMultiple",
      "containerSelector": ".athing",
      "fields": {
        "title": ".titleline > a",
        "url": ".titleline > a@href"
      },
      "as": "topStories"
    },
    { "action": "screenshot", "path": "output/hn-top.png" }
  ]
}
```

---

## 🤖 Agent-Assisted Workflow Authoring

Expose the bounded browser-authoring tools to an MCP client:

```bash
codex mcp add bflow -- \
  bun --cwd /absolute/path/to/browser-automation-cli run mcp

claude mcp add bflow --scope project -- \
  bun --cwd /absolute/path/to/browser-automation-cli run mcp
```

The agent observes structured page state, performs validated workflow steps, verifies the final state, and publishes ordinary workflow JSON. Domain allowlists, action/time budgets, explicit confirmation for high-impact actions, environment-only sensitive inputs, and redacted traces constrain authoring. The published flow runs normally with `bun flow` and does not require an agent.

---

## 🛠️ CLI Command Reference

| Command | Description |
| :--- | :--- |
| `bflow` | Launch the interactive Terminal Studio wizard |
| `bflow record <file.json> [url]` | Start visual recording session in Chrome |
| `bflow flow <file.json> [flags]` | Execute a declarative JSON workflow |
| `bflow workflow run <file.json> [data flags]` | Execute one isolated workflow run per external data row |
| `bflow sheets <command>` | Authenticate, inspect, read, and update Google Sheets |
| `bflow data providers` | List installed external-data providers |
| `bflow tasks` | List all built-in programmatic tasks |
| `bflow task <task-id> [--param=val]` | Execute a built-in automation task |
| `bflow profiles` | List detected browser profiles |
| `bflow repl` | Open live interactive CDP command prompt |
| `bflow mcp` | Serve agent-assisted workflow-authoring tools over local MCP STDIO |
| `bflow cleanup` | Terminate any lingering orphan Chrome processes |
| `bflow --version` | Print the installed version |
| `bun test` | Run complete unit and integration test suite |
| `bun test:headed` | Run test suite visibly in an active Chrome window |
| `bun check` | Run Biome linting and code formatting checks |

---

## 💬 Interactive Browser REPL

Need to inspect a live page or test CDP commands interactively? Launch the REPL:

```bash
bun repl
```

```text
cdp> goto https://example.com
✓ Loaded (240ms)
cdp> title
Title: Example Domain
cdp> text h1
Text [h1]: Example Domain
cdp> click a
✓ Clicked: "a"
```

---

## 🧪 Testing & Verification

Comprehensive test suites run against an in-memory HTTP fixture server:

```bash
# Run all test suites
bun run test

# Watch mode for instantaneous feedback
bun run test:watch

# Headed mode (visible Chrome)
bun run test:headed

# Run strict text locator tests
bun run test:strict

# Run workflow execution tests
bun run test:flows
```

---

## 📦 Publishing a release

Standalone releases are built by [the release workflow](.github/workflows/release.yml) for macOS, Linux, and Windows on x64 and ARM64. Linux glibc and musl builds are published separately.

1. Update `version` in the root `package.json`.
2. Commit and push the release changes.
3. Tag that exact version and push the tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The tag must match the package version. GitHub Actions compiles and archives every executable, publishes `SHA256SUMS`, and creates the GitHub Release. The public installer commands start working after the first release is published.

To uninstall on macOS or Linux, remove `$HOME/.local/bin/bflow` and the marked `bflow CLI` entry from your shell configuration. On Windows, remove `%LOCALAPPDATA%\Programs\bflow` and its user `PATH` entry.

Deploy the documentation and domain-hosted installers to the `browser-automation-cli` Cloudflare Pages project with:

```bash
bun run docs:deploy
```

---

## 📁 Project Structure

```text
browser-automation-cli/
├── apps/
│   └── tui/
│       ├── src/
│       │   ├── authoring/   # Persistent, policy-bound agent authoring sessions
│       │   ├── cdp/         # Native CDP WebSocket client & browser manager
│       │   ├── cli/         # CLI REPL dispatcher and command runners
│       │   ├── data/        # Data-driven workflow execution adapters
│       │   ├── flow/        # Flow runner & visual in-page recorder HUD
│       │   ├── mcp/         # Codex/Claude-compatible authoring tools
│       │   ├── tasks/       # Built-in automation tasks (scrape, audit, forms)
│       │   └── tui/         # Interactive Clack terminal wizard
│       ├── tests/           # In-memory server fixtures and test suites
│       └── workflows/       # Recorded workflow JSON definitions
├── output/                  # Extracted JSON data, screenshots, and logs
└── packages/
    ├── config/              # Shared TypeScript and tooling configs
    └── data/                # Provider contracts, transforms, and Google Sheets provider
```

See [agent-assisted authoring](apps/docs/src/content/docs/guides/agent-authoring.md) and [external data workflows](apps/docs/src/content/docs/data/overview.md) for complete setup and safety guidance.

---

## 📄 License

MIT
