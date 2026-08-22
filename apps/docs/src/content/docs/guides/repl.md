---
title: Interactive Browser REPL
description: Real-time interactive Chrome DevTools Protocol command prompt.
---

# 💬 Interactive Browser REPL

The **Interactive Browser REPL** provides a live command prompt connected directly to a Chrome DevTools Protocol (CDP) session. It allows you to navigate pages, test selectors, evaluate JavaScript, block network assets, and capture screenshots on the fly.

## 🚀 Starting the REPL

```bash
bun repl
# or launch headed from the interactive studio
```

---

## 🛠️ Available REPL Commands

| Command | Syntax | Description | Example |
| :--- | :--- | :--- | :--- |
| `goto` / `open` | `goto <url>` | Navigate to a URL (prepends `https://` if omitted) | `goto news.ycombinator.com` |
| `title` | `title` | Print current document title | `title` |
| `url` | `url` | Print current active page URL | `url` |
| `text` | `text <selector>` | Get text content of an element | `text h1` |
| `click` | `click <selector>` | Click element matching selector or text | `click a.login` |
| `type` | `type <selector> <text>` | Type text into an input field | `type input[name="q"] bun` |
| `eval` | `eval <js_expression>` | Evaluate arbitrary JavaScript expression | `eval document.links.length` |
| `screenshot` | `screenshot [path]` | Save screenshot (defaults to `screenshot.png`) | `screenshot output/page.png` |
| `pdf` | `pdf [path]` | Print page to PDF (defaults to `page.pdf`) | `pdf output/page.pdf` |
| `block` | `block [images|css|fonts]` | Block resource types to speed up scraping | `block image font` |
| `metrics` | `metrics` | Print JS Heap, DOM Nodes, and Layout Count | `metrics` |
| `tasks` | `tasks` | List all built-in automation tasks | `tasks` |
| `task` | `task <id> [args]` | Execute a built-in task within the session | `task scrape-hn limit=5` |
| `help` | `help` | Display interactive help menu | `help` |
| `exit` / `quit` | `exit` | Close browser and exit the REPL | `exit` |

---

## 💡 Example REPL Session

```text
⚡ Launching Chrome for Interactive CDP Session...
✓ Connected to Chrome CDP on port 9222
Type "help" for a list of commands, or "exit" to quit.

cdp> goto https://example.com
Navigating to https://example.com...
✓ Loaded (185ms)

cdp> title
Title: Example Domain

cdp> text h1
Text [h1]: Example Domain

cdp> block image font
✓ Blocked resources: image, font

cdp> screenshot output/example.png
✓ Saved screenshot (19.2 KB) to output/example.png

cdp> metrics
Performance Metrics:
  JS Heap Used: 3.42 MB
  DOM Nodes:    28
  Layout Count: 3

cdp> exit
```
