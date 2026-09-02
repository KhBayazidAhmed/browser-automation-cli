---
title: External Data Overview
description: Drive provider-neutral browser workflows from external rows.
---

# ▦ External Data Overview

External data sources transform every row in a dataset into an isolated browser automation run. Workflow steps remain completely provider-neutral, meaning a flow authored against a Google Sheet can easily target another registered provider without modifying any step locators or actions.

```json
{
  "name": "Signup users",
  "data": {
    "source": "users",
    "results": {
      "confirmation_id": "data.confirmationId"
    },
    "sensitiveColumns": ["password", "ssn"]
  },
  "dataSources": {
    "users": {
      "provider": "google-sheets",
      "uri": "google-sheets://SPREADSHEET_ID/Users?range=A:E"
    }
  },
  "steps": [
    { "action": "goto", "url": "https://app.example.com/register" },
    { "action": "type", "selector": "#email", "text": "{{row.email}}" },
    { "action": "type", "selector": "#password", "text": "{{env.DEFAULT_PASSWORD}}" },
    { "action": "click", "selector": "button[type='submit']" },
    { "action": "extract", "selector": ".confirmation-code", "as": "confirmationId" }
  ]
}
```

---

## 🚀 Running Data-Driven Workflows

Run a workflow configured with `data` and `dataSources`:

```bash
# Standalone CLI
bflow workflow run workflows/signup.json

# Monorepo development
bun workflow run workflows/signup.json
```

Or dynamically attach an external dataset to any standard workflow file using `--data`:

```bash
bflow flow workflows/signup.json --data='google-sheets://SPREADSHEET_ID/Users?range=A:E'
```

---

## 🛡️ Safe Dry-Run Validation (`--dry-run`)

Always start with `--dry-run` when connecting a new dataset:

```bash
bflow workflow run workflows/signup.json --dry-run
```

**What `--dry-run` Does:**
1. Authenticates against the provider and discovers the spreadsheet/table schema.
2. Validates all `{{row.column}}` references against discovered columns.
3. Evaluates filter conditions (`--where`) and row bounds (`--from-row`, `--to-row`).
4. Generates an execution plan summary in `output/` without launching Chrome or modifying spreadsheet data.

---

## ⚡ Execution Guarantees

- **Streaming Reads**: Rows stream incrementally from the provider without loading massive datasets into memory.
- **Worker Isolation**: Each row receives its own isolated browser context, independent variable scope, and error handling.
- **Bounded Concurrency**: Parallelism is adjustable from 1 to 100 workers (`--parallel=4`).
- **Resilient Checkpointing**: State transitions are saved atomically to `output/.automation-state-<id>.json`. Interrupted workflows resume seamlessly with `--resume`.
- **Fault Isolation**: A failure in row 4 does not prevent row 5 from executing.
- **Data Protection**: Values in columns marked sensitive or matching credential patterns are masked during screenshots/PDFs and redacted from summaries.

---

## 📚 Data Guides Index

- [Data Providers](/data/providers/) — Provider registration and URI format.
- [Google Sheets](/data/google-sheets/) — OAuth authentication, sheet inspection, and CLI tools.
- [Row Variables](/data/variables/) — Referencing columns, nested paths, and variable precedence.
- [Transformations](/data/transformations/) — Chaining transformation pipes (`trim`, `lowercase`, `date`, `uuid`, etc.).
- [Row Execution](/data/row-execution/) — Concurrency, batching, filtering, and execution flags.
- [Result Write-back](/data/result-writeback/) — Writing outputs and status back to spreadsheets.
- [Retry & Resume](/data/retries/) — Checkpoints, transient error recovery, and clean shutdowns.
- [Data Troubleshooting](/data/troubleshooting/) — Diagnosing OAuth, schema, and quota issues.

