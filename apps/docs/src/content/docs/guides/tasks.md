---
title: Built-in Automation Tasks
description: Run ready-to-use automation tasks for scraping, auditing, and form automation.
---

# 🚀 Built-in Automation Tasks

Bflow includes pre-built programmatic tasks for common browser workflows. You can execute them directly without writing JSON flows or scripts.

## 📋 Listing Available Tasks

To view all built-in tasks and their parameters:

```bash
bun tasks
# or
bun task list
```

---

## 🛠️ Built-in Tasks

### 1. `scrape-hn` — Hacker News Scraper
Scrapes the top stories from Hacker News, extracting ranks, titles, points, authors, and link URLs.

```bash
# Run with default limit (30 stories)
bun task scrape-hn

# Customize limit and run headed
bun task scrape-hn --limit=10 --headed
```

**Parameters:**
- `--limit=<number>` (default: `30`): Number of stories to extract.

---

### 2. `site-audit` — Performance & SEO Auditor
Audits a webpage's loading performance, DOM node density, JS heap utilization, layout count, and takes a full-page screenshot.

```bash
bun task site-audit --url=https://github.com --screenshot=output/github-audit.png
```

**Parameters:**
- `--url=<string>` (default: `https://example.com`): Target website URL to audit.
- `--screenshot=<path>` (default: `output/audit-screenshot.png`): Destination path for audit screenshot.

---

### 3. `form-automation` — Automated Form Filler & Tester
Demonstrates automated form filling, field validation, checkbox selection, and submission on a test form.

```bash
bun task form-automation --headed
```

---

## ⚡ Running Tasks from the Interactive Studio

You can also run any built-in task via the [Interactive Studio](/guides/interactive-studio/):

1. Launch `bun cli`.
2. Choose **🚀 Run Programmatic Task**.
3. Select your task and enter parameter values interactively!
