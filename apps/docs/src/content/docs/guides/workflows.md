---
title: Workflow Execution
description: Execute, replay, and customize declarative JSON workflows.
---

# 🌊 Workflow Execution

Workflows in Browser Automation CLI are declarative, version-controllable JSON files. You can execute them headless in CI/CD pipelines or headed on your local desktop.

## 🚀 Running a Workflow

### Headless Execution (Default / CI Mode)

Headless mode runs Chrome invisibly in the background. It is blazing fast and ideal for automated testing, cron jobs, and CI/CD pipelines:

```bash
bun flow workflows/hn-top-stories.json
```

### Headed Execution (Visible Chrome Window)

Headed mode launches a visible Chrome window so you can watch each step execute live in real time:

```bash
bun flow workflows/hn-top-stories.json --headed
```

---

## 🔄 Dynamic Variable Overrides

You can pass dynamic variables into any workflow via CLI arguments. This allows you to write reusable templates:

```bash
bun flow workflows/search-workflow.json --query="Bun runtime" --limit=10
```

Inside your workflow JSON, use `{{variableName}}` syntax:

```json
{
  "name": "Search Workflow",
  "startUrl": "https://duckduckgo.com",
  "variables": {
    "query": "Default Query",
    "limit": 5
  },
  "steps": [
    { "action": "goto", "url": "https://duckduckgo.com" },
    { "action": "type", "selector": "input[name='q']", "text": "{{query}}" },
    { "action": "click", "selector": "button[type='submit']" }
  ]
}
```

---

## 📄 Example Workflow: Hacker News Scraper

Here is a complete workflow example (`workflows/hn-top-stories.json`):

```json
{
  "name": "Hacker News Top Stories",
  "startUrl": "https://news.ycombinator.com",
  "variables": {
    "targetSite": "news.ycombinator.com"
  },
  "steps": [
    {
      "action": "goto",
      "url": "https://news.ycombinator.com",
      "waitUntil": "domcontentloaded"
    },
    {
      "action": "assert",
      "text": "Hacker News",
      "contains": "Hacker News"
    },
    {
      "action": "extractMultiple",
      "containerSelector": ".athing",
      "as": "topStories",
      "limit": 10,
      "fields": {
        "title": ".titleline > a",
        "url": ".titleline > a@href"
      }
    },
    {
      "action": "screenshot",
      "path": "output/hn-top.png",
      "fullPage": true
    },
    {
      "action": "save",
      "path": "output/hn-stories.json",
      "format": "json"
    }
  ]
}
```

---

## 📊 Workflow Execution Output

When a workflow runs, the CLI logs a step-by-step progress report with execution times:

```text
🌊 Starting flow: Hacker News Top Stories (5 steps)
  [1/5] 🌐 goto https://news.ycombinator.com ... ✓ (284ms)
  [2/5] 🔎 assert "Hacker News" ... ✓ (12ms)
  [3/5] 📊 extractMultiple (.athing) -> topStories (10 items) ... ✓ (45ms)
  [4/5] 📷 screenshot -> output/hn-top.png ... ✓ (120ms)
  [5/5] 💾 save -> output/hn-stories.json ... ✓ (4ms)

✨ Flow completed successfully in 465ms!
```
