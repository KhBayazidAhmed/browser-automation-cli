---
title: Interactive Browser REPL
description: Real-time interactive Chrome DevTools Protocol command prompt.
---

# 💬 Interactive Browser REPL

The **Interactive Browser REPL** provides a live command prompt connected directly to an active Chrome DevTools Protocol (CDP) session. It allows you to navigate pages, test selectors, evaluate JavaScript, switch iframe contexts, block network assets, and capture screenshots interactively.

---

## 🚀 Starting the REPL

```bash
# Standalone CLI
bflow repl

# Monorepo development
bun repl
```

### Launch Options

```bash
# Launch in a visible headed browser window
bflow repl --headed

# Attach a cloned browser profile
bflow repl --profile=work-chrome --headed
```

---

## 🛠️ Complete REPL Commands Matrix

| Command | Syntax | Description | Example |
| :--- | :--- | :--- | :--- |
| `goto` / `open` | `goto <url>` | Navigate to a URL (prepends `https://` if omitted). | `goto news.ycombinator.com` |
| `title` | `title` | Print the current document or frame title. | `title` |
| `url` | `url` | Print the current active page or frame URL. | `url` |
| `text` | `text <selector>` | Get visible text content of an element. | `text h1.title` |
| `click` | `click <selector>` | Click an element matching a CSS selector or human text. | `click button.login` |
| `type` | `type <selector> <text>` | Type text into an input or textarea element. | `type input[name="q"] bun runtime` |
| `frames` | `frames` | List all iframes and frames on the page with indices and URLs. | `frames` |
| `frame` | `frame <idx\|id\|name\|url>` | Switch active prompt context to a specific child frame. | `frame 1` or `frame payment-frame` |
| `main` | `main` | Switch target context back to the top-level main frame. | `main` |
| `eval` | `eval <js_expression>` | Evaluate arbitrary JavaScript expression in the active frame. | `eval document.links.length` |
| `screenshot` / `shot` | `screenshot [path]` | Save a screenshot of the current page (default: `output/repl-screenshot.png`). | `screenshot output/page.png` |
| `pdf` | `pdf [path]` | Export current page as a PDF (default: `output/repl-page.pdf`). | `pdf output/report.pdf` |
| `block` | `block <types>` | Block resource types (e.g. `image`, `stylesheet`, `font`). | `block image font` |
| `metrics` | `metrics` | Print real-time JS Heap usage, DOM node count, and layout calculations. | `metrics` |
| `tasks` | `tasks` | List all registered programmatic automation tasks. | `tasks` |
| `task` | `task <id> [jsonArgs]` | Execute a built-in task within the session. | `task scrape-hn {"limit":5}` |
| `help` | `help` | Display the list of available commands and usage hints. | `help` |
| `exit` / `quit` | `exit` | Close Chrome and terminate the REPL session. | `exit` |

---

## 💡 Example REPL Session

```text
⚡ Launching Chrome for Interactive CDP Session...
✓ Connected to Chrome CDP on port 9222
Type "help" for a list of commands, or "exit" to quit.

cdp> goto https://example.com
✓ Loaded (185ms)

cdp> title
Title: Example Domain

cdp> text h1
Text [h1]: Example Domain

cdp> frames
Active Frames (2):
* [0] main -> https://example.com [MAIN]
  [1] iframe_widget -> https://widget.example.com

cdp> frame 1
✓ Switched context to frame: iframe_widget

cdp [frame:widget]> eval document.title
Result: Widget Frame

cdp [frame:widget]> main
✓ Switched context back to main frame

cdp> screenshot output/example.png
✓ Saved screenshot (19.2 KB) to output/example.png

cdp> metrics
Performance Metrics:
  JS Heap: 3.42 MB
  DOM Nodes: 28
  Layouts: 3

cdp> exit
```

