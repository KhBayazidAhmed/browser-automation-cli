---
title: Workflow Execution
description: Execute, replay, and customize declarative JSON workflows.
---

# 🌊 Workflow Execution

Workflows in Bflow are declarative, version-controllable JSON files. You can execute them in headless mode for CI/CD automation or in headed mode directly on your desktop.

---

## 🚀 Running a Workflow

### Headless Execution (Default / CI Mode)

Headless mode runs Chrome invisibly in the background. It is blazing fast and ideal for automated testing, cron jobs, and CI/CD pipelines:

```bash
# Standalone CLI
bflow flow workflows/hn-top-stories.json

# Monorepo development
bun flow workflows/hn-top-stories.json
```

### Headed Execution (Visible Chrome Window)

Headed mode launches a visible Chrome window so you can watch each step execute live in real time:

```bash
# Standalone CLI
bflow flow workflows/hn-top-stories.json --headed

# Monorepo development
bun flow workflows/hn-top-stories.json --headed
```

---

## 👤 Using Browser Profiles

Replay workflows using existing browser sessions, authenticated accounts, and cookies:

```bash
# Clone an existing profile into a safe automation sandbox (Recommended)
bflow flow workflows/user-profile.json --profile=work-chrome

# Use an explicit Chrome user-data directory
bflow flow workflows/user-profile.json --user-data-dir="/Users/me/ChromeDevProfile" --profile-directory="Default"

# Use the profile directory directly without cloning (Requires normal browser closed)
bflow flow workflows/user-profile.json --profile=work-chrome --direct-profile
```

---

## 🔄 Dynamic Variable Overrides

Pass dynamic variables into any workflow via CLI arguments. Numbers (`10`), booleans (`true`/`false`), and strings are parsed automatically:

```bash
bflow flow workflows/search-workflow.json --query="Bun runtime" --limit=10 --headless=false
```

Inside your workflow JSON, use `{{variableName}}` syntax:

```json
{
  "name": "Search Workflow",
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

Nested paths and transformation pipelines are also supported:

```json
{
  "action": "type",
  "selector": "#email",
  "text": "{{row.contact.email | trim | lowercase}}"
}
```

### Variable Precedence Hierarchy

When the same variable name exists in multiple scopes, the resolution order (highest to lowest precedence) is:
1. **System Variables** (`__sensitiveValues`, `outputDir`)
2. **CLI Overrides** (`--query="value"`)
3. **Workflow Variables** (`variables: { ... }`)
4. **Row / Data Variables** (`{{row.column}}`)
5. **Step-Local Variables** (`step.variables`)

Use `{{env.SECRET_NAME}}` for credentials. Missing environment references fail validation rather than typing raw placeholders.

---

## 🧾 Running Once Per External Row

To stream rows from Google Sheets or an external provider into isolated workflow executions:

```bash
# Standalone CLI
bflow workflow run workflows/signup.json \
  --data='google-sheets://SPREADSHEET_ID/Users?range=A:E' \
  --dry-run

# Monorepo development
bun workflow run workflows/signup.json \
  --data='google-sheets://SPREADSHEET_ID/Users?range=A:E' \
  --dry-run
```

After verifying the dry run plan, remove `--dry-run` to execute live. You can control concurrency with `--parallel=4`, batch size with `--batch-size=25`, and recover with `--resume --retry-failed`. See the [External Data Guide](/data/overview/) for full configuration options.

---

## 📄 Example Workflow: Hacker News Scraper

Here is a complete workflow example (`workflows/hn-top-stories.json`):

```json
{
  "name": "Hacker News Top Stories",
  "description": "Scrapes top stories from Hacker News",
  "version": "1.0.0",
  "variables": {
    "limit": 10
  },
  "steps": [
    {
      "name": "Navigate to Hacker News",
      "action": "goto",
      "url": "https://news.ycombinator.com",
      "waitUntil": "domcontentloaded"
    },
    {
      "name": "Verify page title",
      "action": "assert",
      "text": "Hacker News",
      "contains": "Hacker News"
    },
    {
      "name": "Extract top stories list",
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
      "name": "Save visual screenshot",
      "action": "screenshot",
      "path": "output/hn-top.png",
      "fullPage": true
    },
    {
      "name": "Persist extracted stories",
      "action": "save",
      "path": "output/hn-stories.json",
      "format": "json"
    }
  ]
}
```

---

## 📊 Workflow Execution Output

When a workflow runs, the CLI logs real-time step progress and durations:

```text
🌊 Starting flow: Hacker News Top Stories (5 steps)
  [1/5] 🌐 Navigate to Hacker News ... ✓ (284ms)
  [2/5] 🔎 Verify page title ... ✓ (12ms)
  [3/5] 📊 Extract top stories list (.athing) -> topStories (10 items) ... ✓ (45ms)
  [4/5] 📷 Save visual screenshot -> output/hn-top.png ... ✓ (120ms)
  [5/5] 💾 Persist extracted stories -> output/hn-stories.json ... ✓ (4ms)

✨ Flow completed successfully in 465ms!
```

Output artifacts (`output/`) are resolved relative to your current working directory. Single flow runs generate structured JSON/CSV files and audit logs. Data-driven row runs generate an aggregated summary file `output/workflow-<run-id>-summary.json` and a resumable state checkpoint.

