---
title: Result Write-back
description: Map workflow outputs and execution state into spreadsheet columns.
---

# Result Write-back

Map workflow result paths to columns in the workflow:

```json
{
  "data": {
    "source": "users",
    "results": {
      "created_user_id": "data.userId",
      "confirmation": "data.confirmationText"
    }
  }
}
```

The runner also maintains reserved columns: `__automation_status`, `__automation_run_id`, `__automation_started_at`, `__automation_completed_at`, `__automation_duration_ms`, `__automation_attempts`, `__automation_result`, `__automation_error_type`, and `__automation_error`.

Missing result columns are added to the header. Updates are sparse, so workflow write-back does not overwrite source cells.

`data.results` values are nested paths into the row's `FlowExecutionResult`; extracted values normally live under `data.<name>`. Failed rows populate the error columns, while successful rows store the extracted result JSON in `__automation_result`.
