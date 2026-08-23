---
title: External Data Overview
description: Drive provider-neutral browser workflows from external rows.
---

# External Data

External data sources turn every row into an isolated workflow execution context. Workflow steps remain provider-neutral, so changing a source from Google Sheets to another registered provider does not require step changes.

```json
{
  "name": "Signup users",
  "data": { "source": "users" },
  "dataSources": {
    "users": {
      "provider": "google-sheets",
      "uri": "google-sheets://SPREADSHEET_ID/Users?range=A:E"
    }
  },
  "steps": [
    { "action": "type", "selector": "#email", "text": "{{row.email}}" }
  ]
}
```

Run a configured source with `bun workflow run workflows/signup.json`, or override it with `--data=google-sheets://SPREADSHEET_ID/Users`.

Always start with `--dry-run` for a new dataset. It authenticates, discovers the schema, validates variables, applies row filters, and previews the execution plan without launching Chrome or changing provider data. A redacted local summary is still written beneath `output/`.

## Execution guarantees

- Rows stream incrementally instead of loading the full source into memory.
- Each row receives isolated variables, browser execution, result data, and failure handling.
- Browser parallelism is bounded from 1 to 100 workers; provider write-back remains controlled and batched.
- Checkpoints are written atomically so interrupted workflows can resume.
- One row failure does not stop unrelated rows.
- Sensitive values are redacted from logs, summaries, saved extracts, screenshots, and PDFs.

Continue with [Providers](/data/providers/), [Row Variables](/data/variables/), [Row Execution](/data/row-execution/), and [Result Write-back](/data/result-writeback/).
