---
title: Built-in Automation Tasks
description: Run ready-to-use automation tasks for scraping, auditing, and form automation.
---

# 🚀 Built-in Automation Tasks

Bflow includes pre-packaged, programmatic automation tasks for high-frequency workflows. You can execute them directly from the CLI without authoring JSON flows or writing custom scripts.

---

## 📋 Listing Available Tasks

To view all registered tasks and their accepted CLI parameters:

```bash
# Standalone CLI
bflow tasks

# Monorepo development
bun tasks
```

---

## 🛠️ Built-in Task Catalog

### 1. `scrape-hn` — Hacker News Top Stories Scraper
Scrapes current front-page submissions from Hacker News, extracting rank numbers, article titles, point totals, author usernames, comment counts, and link URLs.

```bash
# Standalone CLI
bflow task scrape-hn --limit=15

# Monorepo development
bun task scrape-hn --limit=15
```

**Parameters & Flags:**
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--limit` | Number | `30` | Number of top stories to extract. |
| `--headed` | Flag | `false` | Launch visibly in a desktop Chrome window. |
| `--profile` | String | `none` | Attach a cloned browser profile. |

**Output:** Saves structured results to `output/hn-stories-<timestamp>.json`.

---

### 2. `site-audit` — Performance & SEO Auditor
Audits a webpage's loading metrics, DOM node density, JavaScript heap memory usage, layout reflow counts, and captures a timestamped full-page screenshot.

```bash
# Standalone CLI
bflow task site-audit --url=https://github.com --screenshot=output/github-audit.png

# Monorepo development
bun task site-audit --url=https://github.com --screenshot=output/github-audit.png
```

**Parameters & Flags:**
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--url` | String | `https://example.com` | Target URL to audit. |
| `--screenshot` | Path | `output/audit-screenshot.png` | Destination filepath for the full-page screenshot. |
| `--headed` | Flag | `false` | Launch visibly in a desktop Chrome window. |

---

### 3. `form-automation` — Automated Form Submission
Demonstrates automated input filling, field validation, checkbox toggling, select dropdowns, and form submission on a test form suite.

```bash
# Standalone CLI
bflow task form-automation --headed

# Monorepo development
bun task form-automation --headed
```

**Parameters & Flags:**
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--headed` | Flag | `false` | Run visibly in an active Chrome window. |
| `--profile` | String | `none` | Attach an existing browser profile. |

---

## ⚡ Running Tasks from the Interactive Studio

You can also run any built-in task interactively without remembering CLI parameters:

1. Launch `bflow` (or `bun cli`).
2. Select **🚀 Run Programmatic Task**.
3. Choose your task from the interactive menu and enter parameter values when prompted!

