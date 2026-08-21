# ⚡ Browser Automation CLI

> **Browser Automation for Humans** — Ultra-lightweight, zero-bloat CLI and visual recording studio powered by direct Chrome DevTools Protocol (CDP) and Bun.

Record browser workflows interactively with an in-page floating HUD, extract lists and tables with a single click, and replay declarative JSON flows with sub-millisecond execution overhead.

---

## ✨ Why Browser Automation CLI?

Traditional browser automation tools (Puppeteer, Selenium, Playwright) often come with heavy dependencies, complex API boilerplate, and brittle CSS selectors that break on the slightest UI update.

**Browser Automation CLI** is built differently:

- 🔴 **Visual Live Recorder**: Record user interactions directly in Chrome with an in-page HUD toolbar. No coding required.
- 🎯 **Human-Centric Strict Text Selectors**: Target buttons, inputs, and elements by their visible text (`text="Sign In"`), aria labels, or placeholders instead of fragile auto-generated CSS classes.
- ⚡ **Zero Heavyweight Frameworks**: Communicates directly over native CDP WebSockets in Bun with your local Chrome installation.
- 📊 **Smart Data Extraction**: Extract single text fields or entire repeating table/card grids by simply selecting one element.
- ⏸️ **Pause / Resume & Undo**: Seamlessly pause recording to solve CAPTCHAs or 2FA, undo mistakes on the fly, and reorder steps in a live drawer.
- 🚀 **Declarative JSON Replay**: Run recorded workflows headless in CI/CD or headed on your desktop, with variable overrides and assertions.

---

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) (v1.1+)
- Google Chrome or Chromium installed on your system

### 1. Install Dependencies

```bash
bun install
```

### 2. Launch Interactive Terminal Studio

```bash
bun run dev
# or
bun cli
```

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
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⠿ | 🔴 REC (4) | ⏸️ Pause | 🔍 Extract | 📊 List | 🔎 Assert | ⏱️ Wait | 📷 Shot | ⚙️ Config (4) | ↩ Undo | 🛑 Finish │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Control | How to Use | What it Does |
| :--- | :--- | :--- |
| **Normal Click** | Click any element | Records a click action using smart, resilient text/aria selectors |
| **Input / Type** | Type into any field | Captures text entry with element labels and placeholders |
| **🔍 Extract Text** | `Shift + Click` or click HUD button | Extracts element text into a named workflow variable |
| **📊 Extract List** | Click HUD button & select 1 card/row | Auto-detects repeated sibling cards/tables and extracts all rows |
| **🔎 Assert Text** | `Alt + Click` or click HUD button | Adds an assertion (Strict Equal, Contains Substring, or Regex) |
| **⏱️ Add Wait** | Click HUD button | Injects custom delay or waits for an element to appear |
| **⚙️ Config Drawer** | Click HUD button | Opens live in-page drawer to view JSON, delete steps, or edit variables |
| **⏸️ Pause / Resume** | Click HUD button | Pause recording to bypass CAPTCHAs, 2FA, or login without recording noise |
| **↩ Undo Step** | Click HUD button | Reverts the last recorded action |
| **📷 Screenshot** | Click HUD button | Captures a full-page or viewport screenshot at that step |
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

### Example Workflow JSON (`workflows/hn-top-stories.json`)

```json
{
  "name": "Hacker News Top Stories",
  "startUrl": "https://news.ycombinator.com",
  "variables": {
    "targetSite": "news.ycombinator.com"
  },
  "steps": [
    { "action": "goto", "url": "https://news.ycombinator.com" },
    { "action": "assert", "target": "Hacker News", "match": "contains" },
    {
      "action": "extractList",
      "target": ".athing",
      "fields": {
        "title": ".titleline > a",
        "url": ".titleline > a@href"
      },
      "variable": "topStories"
    },
    { "action": "screenshot", "path": "output/hn-top.png" }
  ]
}
```

---

## 🛠️ CLI Command Reference

| Command | Description |
| :--- | :--- |
| `bun dev` or `bun cli` | Launch the interactive Terminal Studio wizard |
| `bun record <file.json> [url]` | Start visual recording session in Chrome |
| `bun flow <file.json> [flags]` | Execute a declarative JSON workflow |
| `bun tasks` | List all built-in programmatic tasks |
| `bun task <task-id> [--param=val]` | Run a specific automation task |
| `bun repl` | Open live interactive CDP command prompt |
| `bun cleanup` | Terminate any lingering orphan Chrome processes |
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

## 📁 Project Structure

```text
browser-automation-cli/
├── apps/
│   └── tui/
│       ├── src/
│       │   ├── cdp/         # Native CDP WebSocket client & browser manager
│       │   ├── cli/         # CLI REPL dispatcher and command runners
│       │   ├── flow/        # Flow runner & visual in-page recorder HUD
│       │   ├── tasks/       # Built-in automation tasks (scrape, audit, forms)
│       │   └── tui/         # Interactive Clack terminal wizard
│       ├── tests/           # In-memory server fixtures and test suites
│       └── workflows/       # Recorded workflow JSON definitions
├── output/                  # Extracted JSON data, screenshots, and logs
└── packages/
    └── config/              # Shared TypeScript and tooling configs
```

---

## 📄 License

MIT
