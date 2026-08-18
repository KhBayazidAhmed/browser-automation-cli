# Direct CDP Browser Automation CLI, TUI Studio & Visual Recorder

Ultra-lightweight, zero-dependency browser automation engine communicating directly with Chrome via Chrome DevTools Protocol (CDP) over native WebSockets in Bun.

## Features

- 🎯 **Strict Text Matching on All Actions**: Target, click, type, extract, and assert elements using exact trimmed strict text (`text="Submit"`, `strictText: true`), immune to dynamic/brittle CSS class changes.
- 🖥️ **Interactive TUI Studio**: Visual terminal dashboard to browse workflows, inspect step-by-step actions, and launch recording sessions.
- 🔴 **Visual Live Recorder**: Record user actions in real time with an in-page floating HUD, live cursor tooltip, and auto-selector generator.
- 📊 **Table & List Card Extraction**: Click one item card to automatically detect and extract all repeated sibling cards/tables.
- ↩ **Undo & ⏸️ Pause/Resume**: Pause recording anytime to bypass CAPTCHAs/logins, and undo accidental clicks.
- 🌊 **Declarative Flow Runner**: Run no-code JSON workflows with variable substitution, multi-field data extraction, and assertions.
- ⚡ **Zero NPM Dependencies**: Uses Bun's native WebSocket and system Chrome.
- 🚀 **Blazing Fast**: Sub-50ms execution times for DOM interactions, clicks, and evaluations.
- 🛡️ **Resource Blocking**: Block images, fonts, and CSS with `page.blockResources()` for 5–10x faster page loads.
- 📸 **Screenshots & PDF**: Full-page and viewport screenshots directly to disk.
- 💬 **Interactive REPL**: Live browser control prompt in the terminal.
- 🧪 **Automated Test Suite**: Built-in benchmark and assertion suite.

---

## 1. Interactive CLI Wizard

Launch the interactive terminal wizard:

```bash
bun run dev
# or
bun apps/tui/src/index.ts
```

The interactive wizard provides a clean, step-by-step experience powered by `@clack/prompts`:

```text
┌  ⚡ Browser Automation Studio
│
◇  What would you like to do?
│  ● 🌊 Run a Workflow (3 available)
│  ○ 🔴 Record New Workflow
│  ○ 🚀 Run Programmatic Task
│  ○ 💬 Open Interactive Browser REPL
│  ○ 📁 View Extracted Data & Outputs (4 files)
│  ○ ❌ Exit
```

- **Fuzzy Selection**: Select workflows or tasks with arrow keys and Enter.
- **Inspect Step Breakdown**: Inspect what each step does before running it.
- **Live Spinners & Extracted Data Summaries**: Real-time progress without full-screen clearing.
- **Graceful Cancellation**: Press `[Esc]` or `[Ctrl+C]` at any prompt to go back or exit.

---

## 2. Visual Flow Recorder (No-Code Creation)

Start recording on any website:

```bash
bun run record workflows/my-flow.json https://news.ycombinator.com
```

### In-Page HUD Toolbar & Live Config Inspector

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⠿ | 🔴 REC (4) | ⏸️ Pause | 🔍 Extract | 📊 List | 🔎 Assert | ⏱️ Wait | 📸 Shot | ⚙️ Config (4) | ↩ Undo | 🛑 Finish │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Control | Action |
| :--- | :--- |
| **Normal Click** | Records a click action with smart, resilient selector. |
| **Type in Input** | Records input text on change/submit with target labels. |
| **🔍 Extract Text** *(Shift+Click)* | Opens in-page variable modal to extract text into a named variable. |
| **📊 Extract List** | Click one repeated item card or table row; automatically extracts all matching items with titles & links. |
| **🔎 Assert Text** *(Alt+Click)* | Opens Assertion modal with Strict Equal, Substring Contains, or Regex matching options. |
| **⏱️ Add Wait** | Injects custom delay (`wait: 1500ms`) or dynamic wait for selector. |
| **⚙️ Config (N)** | **Live Config Inspector Drawer**: View real-time JSON config, inspect/delete/reorder steps, and manage variables. |
| **⏸️ Pause / Resume** | Pause recording to navigate or solve CAPTCHAs without recording noise. |
| **↩ Undo Step** | Reverts the last recorded action. |
| **📸 Screenshot** | Injects an instant screenshot step at that point in the flow. |
| **🛑 Finish & Save** | Saves the flow to JSON and closes the browser. |

### Interactive Terminal CLI Commands While Recording

While Chrome is open, the terminal prompt gives you real-time inspection and control:
- `c` or `config` — Print live, syntax-formatted JSON workflow configuration
- `s` or `steps` — Print numbered step-by-step breakdown
- `w <ms>` — Insert wait delay (e.g. `w 2000`)
- `u` or `undo` — Undo last recorded step
- `d <num>` — Delete any step by index (e.g. `d 2`)
- `v <key>=<val>` — Add or update a workflow variable (e.g. `v userEmail=test@corp.com`)
- `p` or `pause` — Toggle pause / resume
- `f` or `[Enter]` on empty line — Finish and save workflow

---

## 3. Running Declarative Automation Flows (CLI Replay)

Execute any recorded or hand-written `.json` workflow directly:

```bash
# Replay headless in the background
bun run flow workflows/hn-top-stories.json

# Replay visibly in a Chrome window
bun run flow workflows/hn-top-stories.json --headed

# Replay with variable overrides
bun run flow workflows/form-pipeline.json --fullName="Alice" --userEmail="alice@test.com"
```

---

## 4. Running Programmatic Tasks

```bash
# List all tasks
bun run tasks

# Run specific task with parameters
bun run task scrape-hn --limit=5
bun run task site-audit --url=https://github.com
bun run task form-submit --name="Bob"
```

---

## 5. Testing & Verification

We follow the industry-standard architecture for browser testing (in-memory HTTP fixture server + native test runner):

```bash
# Run all test suites
bun run test

# Watch mode for instantaneous feedback
bun run test:watch

# Run tests visibly in an active Chrome window (headed mode)
bun run test:headed

# Run only Strict Text & Assertion tests
bun run test:strict

# Run only Declarative Flow tests
bun run test:flows

# Run specific tests matching a pattern
bun test -t "disambiguate"
bun test -t "extract"
```

### Architecture
- **In-Memory Test Server** ([`tests/fixtures/server.ts`](file:///Users/bixbd/Desktop/coding-heaven/browser-automation-cli/apps/tui/tests/fixtures/server.ts)): Starts a zero-latency `Bun.serve` instance on ephemeral `127.0.0.1:0` serving realistic HTML routes (`/`, `/disambiguation`, `/forms`, `/async`, `/inventory`, `/boundaries`).
- **Standard Test Suites** ([`tests/`](file:///Users/bixbd/Desktop/coding-heaven/browser-automation-cli/apps/tui/tests/)):
  - `cdp-core.test.ts` — CDP protocol, metrics, navigation, and network blocking
  - `locators.test.ts` — Exact text targeting, disambiguation, pseudo-selectors
  - `forms.test.ts` — Inputs, placeholders, aria-labels, and async DOM waiting
  - `flows.test.ts` — Multi-step declarative flows, variable passing, list extraction
  - `assertions.test.ts` — Strict equality, substring rejection, boundary handling
